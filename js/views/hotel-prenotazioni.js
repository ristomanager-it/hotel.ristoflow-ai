import { supabase } from "../supabaseClient.js";

const CANALI = ["diretto","booking","airbnb","expedia","whatsapp","telefono","walk_in"];
const STATI  = ["preventivo","confermata","checkin","checkout","cancellata","noshow"];
const STATI_PAGAMENTO = ["non_pagato","acconto","saldato","rimborsato"];
const METODI_PAGAMENTO = ["carta","contanti","bonifico","stripe"];
const DOCUMENTI = ["carta_identita","passaporto","patente"];

export async function render(container) {
  const az = window.state.azienda;
  const params = new URLSearchParams(window.location.hash.split("?")[1] || "");
  const openNew = params.get("new") === "1";
  const openId  = params.get("id");

  container.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">📋 Prenotazioni</div>
        <div class="page-sub">Gestione prenotazioni e soggiorni</div>
      </div>
      <button class="btn btn-primary" id="btn-nuova">+ Nuova prenotazione</button>
    </div>

    <!-- Filtri -->
    <div class="card" style="margin-bottom:16px;">
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;">
        <div style="flex:1;min-width:160px;">
          <label style="font-size:11px;font-weight:600;color:var(--muted);">Dal</label>
          <input id="f-dal" class="input" type="date" value="${primoMese()}">
        </div>
        <div style="flex:1;min-width:160px;">
          <label style="font-size:11px;font-weight:600;color:var(--muted);">Al</label>
          <input id="f-al" class="input" type="date" value="${ultimoMese()}">
        </div>
        <div style="flex:1;min-width:140px;">
          <label style="font-size:11px;font-weight:600;color:var(--muted);">Stato</label>
          <select id="f-stato" class="input">
            <option value="">Tutti</option>
            ${STATI.map(s => `<option value="${s}">${s}</option>`).join("")}
          </select>
        </div>
        <div style="flex:1;min-width:140px;">
          <label style="font-size:11px;font-weight:600;color:var(--muted);">Canale</label>
          <select id="f-canale" class="input">
            <option value="">Tutti</option>
            ${CANALI.map(c => `<option value="${c}">${c}</option>`).join("")}
          </select>
        </div>
        <div style="flex:2;min-width:180px;">
          <label style="font-size:11px;font-weight:600;color:var(--muted);">Cerca ospite</label>
          <input id="f-cerca" class="input" placeholder="Nome, cognome, email...">
        </div>
        <button class="btn btn-primary" id="btn-filtra">Filtra</button>
      </div>
    </div>

    <div id="pren-list"></div>
    <div id="pren-editor" style="margin-top:16px;"></div>
  `;

  const az_id = az.id;

  // Carica camere per uso nell'editor
  const { data: camere } = await supabase
    .from("hotel_camere")
    .select("id,nome,prezzo_base,ospiti_max,tipologia")
    .eq("azienda_id", az_id)
    .eq("attiva", true)
    .order("nome");
  container._camere = camere || [];

  const { data: pacchetti } = await supabase
    .from("hotel_pacchetti")
    .select("id,nome,notti_minime,notti_massime,sconto_perc,servizi_inclusi")
    .eq("azienda_id", az_id)
    .eq("attivo", true);
  container._pacchetti = pacchetti || [];

  container.querySelector("#btn-nuova").onclick = () => renderEditor(null, az_id, container);
  container.querySelector("#btn-filtra").onclick = () => caricaPrenotazioni(az_id, container);

  // Ricerca live
  let searchTimer;
  container.querySelector("#f-cerca").oninput = () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => caricaPrenotazioni(az_id, container), 400);
  };

  await caricaPrenotazioni(az_id, container);

  // Apri direttamente se params
  if (openNew) renderEditor(null, az_id, container);
  if (openId) {
    const { data: p } = await supabase.from("hotel_prenotazioni").select("*").eq("id", openId).single();
    if (p) renderEditor(p, az_id, container);
  }
}

async function caricaPrenotazioni(aziendaId, container) {
  const dal    = container.querySelector("#f-dal").value;
  const al     = container.querySelector("#f-al").value;
  const stato  = container.querySelector("#f-stato").value;
  const canale = container.querySelector("#f-canale").value;
  const cerca  = container.querySelector("#f-cerca").value.trim();

  let q = supabase
    .from("hotel_prenotazioni")
    .select("*, hotel_camere(nome,tipologia)")
    .eq("azienda_id", aziendaId)
    .order("data_checkin", { ascending: false })
    .limit(100);

  if (dal)    q = q.gte("data_checkin", dal);
  if (al)     q = q.lte("data_checkin", al);
  if (stato)  q = q.eq("stato", stato);
  if (canale) q = q.eq("canale", canale);
  if (cerca)  q = q.or(`ospite_nome.ilike.%${cerca}%,ospite_cognome.ilike.%${cerca}%,ospite_email.ilike.%${cerca}%`);

  const { data, error } = await q;
  const list = container.querySelector("#pren-list");

  if (error) { list.innerHTML = `<div class="card" style="color:var(--danger);">${error.message}</div>`; return; }

  if (!data || data.length === 0) {
    list.innerHTML = `<div class="card" style="text-align:center;padding:32px;"><div style="font-size:40px;margin-bottom:10px;">📋</div><div class="text-muted">Nessuna prenotazione trovata</div></div>`;
    return;
  }

  // Totale revenue filtrata
  const revenue = data.filter(p => !["cancellata","noshow"].includes(p.stato))
    .reduce((s,p) => s + (p.prezzo_totale || 0), 0);

  list.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;padding:0 4px;">
      <div class="text-muted text-small">${data.length} prenotazioni</div>
      <div style="font-weight:700;color:var(--primary);">Revenue: € ${revenue.toLocaleString("it-IT",{minimumFractionDigits:2})}</div>
    </div>
    ${data.map(p => rigaPrenotazione(p)).join("")}
  `;

  list.querySelectorAll(".btn-open-pren").forEach(btn => {
    btn.onclick = async () => {
      const { data: pr } = await supabase.from("hotel_prenotazioni").select("*").eq("id", btn.dataset.id).single();
      if (pr) renderEditor(pr, aziendaId, container);
    };
  });

  list.querySelectorAll(".btn-checkin").forEach(btn => {
    btn.onclick = () => { window.location.hash = `#/hotel-checkin?id=${btn.dataset.id}`; };
  });

  list.querySelectorAll(".btn-delete-pren").forEach(btn => {
    btn.onclick = async () => {
      if (!confirm(`Elimina prenotazione di ${btn.dataset.nome}?`)) return;
      await supabase.from("hotel_prenotazioni").delete().eq("id", btn.dataset.id);
      await caricaPrenotazioni(aziendaId, container);
    };
  });
}

function rigaPrenotazione(p) {
  const notti = p.notti || ((new Date(p.data_checkout) - new Date(p.data_checkin)) / 86400000);
  return `
  <div class="card" style="margin-bottom:10px;">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;">
      <div style="flex:1;">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px;">
          <span style="font-weight:800;font-size:15px;">${p.ospite_nome} ${p.ospite_cognome}</span>
          <span class="badge ${badgeStato(p.stato)}">${p.stato}</span>
          <span class="badge ${badgePagamento(p.stato_pagamento)}">${p.stato_pagamento?.replace(/_/g," ") || "—"}</span>
          <span class="badge badge-gray">${p.canale || "diretto"}</span>
        </div>
        <div style="display:flex;gap:14px;flex-wrap:wrap;font-size:13px;color:var(--muted);">
          <span>🛏️ ${p.hotel_camere?.nome || "—"}</span>
          <span>📅 ${formatData(p.data_checkin)} → ${formatData(p.data_checkout)} (${notti} notti)</span>
          <span>👥 ${p.adulti || 1} adulti${p.bambini > 0 ? ` + ${p.bambini} bambini` : ""}</span>
          ${p.prezzo_totale ? `<span style="font-weight:700;color:var(--primary);">€ ${p.prezzo_totale.toFixed(2)}</span>` : ""}
        </div>
        ${p.note_ospite ? `<div style="font-size:12px;color:var(--muted);margin-top:4px;font-style:italic;">"${p.note_ospite}"</div>` : ""}
      </div>
      <div style="display:flex;gap:6px;flex-shrink:0;flex-wrap:wrap;">
        <button class="btn btn-ghost btn-sm btn-open-pren" data-id="${p.id}">✏️</button>
        ${["confermata","preventivo"].includes(p.stato)
          ? `<button class="btn btn-primary btn-sm btn-checkin" data-id="${p.id}">Check-in</button>`
          : p.stato === "checkin"
          ? `<button class="btn btn-accent btn-sm btn-checkin" data-id="${p.id}">Check-out</button>`
          : ""
        }
        <button class="btn btn-danger btn-sm btn-delete-pren" data-id="${p.id}" data-nome="${p.ospite_nome} ${p.ospite_cognome}">🗑</button>
      </div>
    </div>
  </div>`;
}

function renderEditor(prenotazione, aziendaId, container) {
  const isEdit = !!prenotazione?.id;
  const p = prenotazione || {};
  const camere = container._camere || [];
  const pacchetti = container._pacchetti || [];

  const editor = container.querySelector("#pren-editor");
  editor.innerHTML = `
    <div class="card" style="border:2px solid var(--primary);">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
        <div style="font-weight:800;font-size:16px;">${isEdit ? `Prenotazione — ${p.ospite_nome} ${p.ospite_cognome}` : "Nuova prenotazione"}</div>
        <button class="btn btn-ghost btn-sm" id="btn-chiudi">✕ Chiudi</button>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">

        <!-- COL SX: Ospite + Soggiorno -->
        <div>
          <div style="font-weight:700;font-size:13px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px;">Ospite</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="form-group">
              <label>Nome *</label>
              <input id="ed-nome" class="input" value="${p.ospite_nome || ""}">
            </div>
            <div class="form-group">
              <label>Cognome *</label>
              <input id="ed-cognome" class="input" value="${p.ospite_cognome || ""}">
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="form-group">
              <label>Email</label>
              <input id="ed-email" class="input" type="email" value="${p.ospite_email || ""}">
            </div>
            <div class="form-group">
              <label>Telefono</label>
              <input id="ed-tel" class="input" value="${p.ospite_telefono || ""}">
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="form-group">
              <label>Nazione</label>
              <input id="ed-nazione" class="input" value="${p.ospite_nazione || "IT"}">
            </div>
            <div class="form-group">
              <label>Documento</label>
              <select id="ed-doc-tipo" class="input">
                <option value="">Seleziona...</option>
                ${DOCUMENTI.map(d => `<option value="${d}" ${p.ospite_documento_tipo === d ? "selected" : ""}>${d.replace(/_/g," ")}</option>`).join("")}
              </select>
            </div>
          </div>
          <div class="form-group">
            <label>Numero documento</label>
            <input id="ed-doc-num" class="input" value="${p.ospite_documento_num || ""}">
          </div>

          <div style="font-weight:700;font-size:13px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin:16px 0 10px;">Soggiorno</div>
          <div class="form-group">
            <label>Camera *</label>
            <select id="ed-camera" class="input">
              <option value="">Seleziona camera...</option>
              ${camere.map(c => `<option value="${c.id}" data-prezzo="${c.prezzo_base || 0}" ${p.camera_id === c.id ? "selected" : ""}>${c.nome} ${c.tipologia ? `(${c.tipologia})` : ""} — € ${c.prezzo_base || 0}/notte</option>`).join("")}
            </select>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="form-group">
              <label>Check-in *</label>
              <input id="ed-checkin" class="input" type="date" value="${p.data_checkin || oggi()}">
            </div>
            <div class="form-group">
              <label>Check-out *</label>
              <input id="ed-checkout" class="input" type="date" value="${p.data_checkout || domani()}">
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="form-group">
              <label>Ora check-in prevista</label>
              <input id="ed-ora-in" class="input" type="time" value="${p.ora_checkin_prevista || "14:00"}">
            </div>
            <div class="form-group">
              <label>Ora check-out prevista</label>
              <input id="ed-ora-out" class="input" type="time" value="${p.ora_checkout_prevista || "11:00"}">
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="form-group">
              <label>Adulti</label>
              <input id="ed-adulti" class="input" type="number" min="1" value="${p.adulti || 1}">
            </div>
            <div class="form-group">
              <label>Bambini</label>
              <input id="ed-bambini" class="input" type="number" min="0" value="${p.bambini || 0}">
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="form-group">
              <label>Canale</label>
              <select id="ed-canale" class="input">
                ${CANALI.map(c => `<option value="${c}" ${p.canale === c ? "selected" : ""}>${c}</option>`).join("")}
              </select>
            </div>
            <div class="form-group">
              <label>Stato prenotazione</label>
              <select id="ed-stato" class="input">
                ${STATI.map(s => `<option value="${s}" ${(p.stato || "confermata") === s ? "selected" : ""}>${s}</option>`).join("")}
              </select>
            </div>
          </div>
          <div class="form-group">
            <label>Codice OTA (se applicabile)</label>
            <input id="ed-ota" class="input" value="${p.ota_codice || ""}" placeholder="Es. BK-12345678">
          </div>
        </div>

        <!-- COL DX: Prezzi + Pagamento -->
        <div>
          <div style="font-weight:700;font-size:13px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px;">Prezzi</div>

          <div class="form-group">
            <label>Pacchetto</label>
            <select id="ed-pacchetto" class="input">
              <option value="">Nessun pacchetto</option>
              ${pacchetti.map(pk => `<option value="${pk.id}" data-sconto="${pk.sconto_perc || 0}" ${p.pacchetto_id === pk.id ? "selected" : ""}>${pk.nome} (-${pk.sconto_perc || 0}%)</option>`).join("")}
            </select>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="form-group">
              <label>Prezzo / notte (€)</label>
              <input id="ed-prezzo-notte" class="input" type="number" step="0.01" value="${p.prezzo_notte || ""}">
            </div>
            <div class="form-group">
              <label>Sconto (€)</label>
              <input id="ed-sconto" class="input" type="number" step="0.01" value="${p.sconto_importo || 0}">
            </div>
          </div>

          <div class="form-group">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
              <input type="checkbox" id="ed-colazione" ${p.colazione_inclusa ? "checked" : ""}> Colazione inclusa
            </label>
            <div id="box-colazione" style="${p.colazione_inclusa ? "" : "display:none;"}margin-top:8px;">
              <input id="ed-prezzo-col" class="input" type="number" step="0.01" value="${p.prezzo_colazione_notte || ""}" placeholder="€ colazione/persona/notte">
            </div>
          </div>

          <!-- Riepilogo prezzi -->
          <div id="riepilogo-prezzi" style="background:var(--bg);border-radius:12px;padding:14px;margin-bottom:14px;">
            <div style="font-weight:700;margin-bottom:8px;">🧮 Riepilogo</div>
            <div id="calc-dettaglio" style="font-size:13px;color:var(--muted);"></div>
            <div style="border-top:1px solid var(--border);margin-top:8px;padding-top:8px;display:flex;justify-content:space-between;">
              <span style="font-weight:700;">Totale</span>
              <span id="calc-totale" style="font-weight:800;font-size:16px;color:var(--primary);">€ 0,00</span>
            </div>
          </div>

          <div class="form-group">
            <label>Totale prenotazione (€) — confermato</label>
            <input id="ed-totale" class="input" type="number" step="0.01" value="${p.prezzo_totale || ""}">
          </div>

          <div style="font-weight:700;font-size:13px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin:16px 0 10px;">Pagamento</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="form-group">
              <label>Stato pagamento</label>
              <select id="ed-stato-pag" class="input">
                ${STATI_PAGAMENTO.map(s => `<option value="${s}" ${(p.stato_pagamento || "non_pagato") === s ? "selected" : ""}>${s.replace(/_/g," ")}</option>`).join("")}
              </select>
            </div>
            <div class="form-group">
              <label>Metodo pagamento</label>
              <select id="ed-metodo" class="input">
                <option value="">—</option>
                ${METODI_PAGAMENTO.map(m => `<option value="${m}" ${p.metodo_pagamento === m ? "selected" : ""}>${m}</option>`).join("")}
              </select>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="form-group">
              <label>Acconto (€)</label>
              <input id="ed-acconto" class="input" type="number" step="0.01" value="${p.acconto || 0}">
            </div>
            <div class="form-group">
              <label>Saldo (€)</label>
              <input id="ed-saldo" class="input" type="number" step="0.01" value="${p.saldo || 0}">
            </div>
          </div>

          <div style="font-weight:700;font-size:13px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin:16px 0 10px;">Note</div>
          <div class="form-group">
            <label>Richieste speciali ospite</label>
            <textarea id="ed-richieste" class="input" rows="2">${p.richieste_speciali || ""}</textarea>
          </div>
          <div class="form-group">
            <label>Note interne staff</label>
            <textarea id="ed-note" class="input" rows="2">${p.note_interne || ""}</textarea>
          </div>

          ${isEdit ? `
          <div style="background:#f0fdf4;border-radius:10px;padding:12px;font-size:12px;margin-top:8px;">
            <div style="font-weight:700;margin-bottom:4px;">🔗 Check-in online</div>
            <div style="word-break:break-all;color:var(--muted);">
              ${window.location.origin.replace("hotel.ristoflow-ai.com","hotel.ristoflow-ai.com")}/public/checkin.html?token=${p.checkin_online_token || "—"}
            </div>
            <button class="btn btn-ghost btn-sm" style="margin-top:6px;" onclick="navigator.clipboard.writeText('https://hotel.ristoflow-ai.com/public/checkin.html?token=${p.checkin_online_token}').then(()=>alert('Link copiato ✓'))">
              📋 Copia link
            </button>
          </div>` : ""}
        </div>

      </div>

      <div id="ed-error" style="color:var(--danger);font-size:13px;margin-top:12px;"></div>
      <div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap;">
        <button class="btn btn-primary" id="btn-salva">💾 ${isEdit ? "Salva modifiche" : "Crea prenotazione"}</button>
        ${isEdit && ["confermata","preventivo"].includes(p.stato)
          ? `<button class="btn btn-success" onclick="window.location.hash='#/hotel-checkin?id=${p.id}'">🛎️ Vai a Check-in</button>`
          : ""
        }
      </div>
    </div>
  `;

  // Calcolo automatico prezzi
  function ricalcola() {
    const camOpt  = editor.querySelector("#ed-camera").selectedOptions[0];
    const prezzoBase = parseFloat(camOpt?.dataset.prezzo || 0);
    const ci      = editor.querySelector("#ed-checkin").value;
    const co      = editor.querySelector("#ed-checkout").value;
    const adulti  = parseInt(editor.querySelector("#ed-adulti").value) || 1;
    const colaz   = editor.querySelector("#ed-colazione").checked;
    const prezzoCol = parseFloat(editor.querySelector("#ed-prezzo-col")?.value) || 0;
    const sconto  = parseFloat(editor.querySelector("#ed-sconto").value) || 0;
    const paccOpt = editor.querySelector("#ed-pacchetto").selectedOptions[0];
    const scontoPacc = parseFloat(paccOpt?.dataset.sconto || 0);

    if (!ci || !co) return;
    const notti = Math.max(0, (new Date(co) - new Date(ci)) / 86400000);
    if (notti <= 0) return;

    // Prendo prezzo notte da input (può essere modificato manualmente)
    let prezzoNotte = parseFloat(editor.querySelector("#ed-prezzo-notte").value) || prezzoBase;
    const totNotti  = prezzoNotte * notti;
    const totColaz  = colaz ? prezzoCol * adulti * notti : 0;
    const totLordo  = totNotti + totColaz;
    const scontoTot = sconto + (totLordo * scontoPacc / 100);
    const totale    = Math.max(0, totLordo - scontoTot);

    let dettaglio = `${notti} notti × € ${prezzoNotte.toFixed(2)} = € ${totNotti.toFixed(2)}`;
    if (colaz && totColaz > 0) dettaglio += `<br>Colazione: ${adulti} × ${notti} notti × € ${prezzoCol.toFixed(2)} = € ${totColaz.toFixed(2)}`;
    if (scontoPacc > 0) dettaglio += `<br>Sconto pacchetto: -${scontoPacc}%`;
    if (sconto > 0) dettaglio += `<br>Sconto manuale: -€ ${sconto.toFixed(2)}`;

    editor.querySelector("#calc-dettaglio").innerHTML = dettaglio;
    editor.querySelector("#calc-totale").textContent  = `€ ${totale.toFixed(2)}`;
    editor.querySelector("#ed-totale").value = totale.toFixed(2);
  }

  // Auto-fill prezzo notte dalla camera selezionata
  editor.querySelector("#ed-camera").onchange = () => {
    const opt = editor.querySelector("#ed-camera").selectedOptions[0];
    const prezzo = opt?.dataset.prezzo;
    if (prezzo && !editor.querySelector("#ed-prezzo-notte").value) {
      editor.querySelector("#ed-prezzo-notte").value = prezzo;
    }
    ricalcola();
  };

  ["#ed-checkin","#ed-checkout","#ed-adulti","#ed-prezzo-notte","#ed-sconto","#ed-pacchetto","#ed-prezzo-col"].forEach(sel => {
    const el = editor.querySelector(sel);
    if (el) { el.oninput = ricalcola; el.onchange = ricalcola; }
  });

  // Toggle colazione
  editor.querySelector("#ed-colazione").onchange = () => {
    const box = editor.querySelector("#box-colazione");
    box.style.display = editor.querySelector("#ed-colazione").checked ? "" : "none";
    ricalcola();
  };

  ricalcola();

  editor.querySelector("#btn-chiudi").onclick = () => { editor.innerHTML = ""; };
  editor.querySelector("#btn-salva").onclick  = () => salvaPrenotazione(prenotazione?.id, aziendaId, editor, container);
  editor.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function salvaPrenotazione(prenId, aziendaId, editor, container) {
  const errEl = editor.querySelector("#ed-error");
  errEl.textContent = "";

  const nome    = editor.querySelector("#ed-nome").value.trim();
  const cognome = editor.querySelector("#ed-cognome").value.trim();
  const camera  = editor.querySelector("#ed-camera").value;
  const checkin = editor.querySelector("#ed-checkin").value;
  const checkout = editor.querySelector("#ed-checkout").value;

  if (!nome)    { errEl.textContent = "Inserisci il nome dell'ospite"; return; }
  if (!cognome) { errEl.textContent = "Inserisci il cognome dell'ospite"; return; }
  if (!camera)  { errEl.textContent = "Seleziona una camera"; return; }
  if (!checkin) { errEl.textContent = "Inserisci la data di check-in"; return; }
  if (!checkout){ errEl.textContent = "Inserisci la data di check-out"; return; }
  if (checkout <= checkin) { errEl.textContent = "Il check-out deve essere successivo al check-in"; return; }

  const payload = {
    azienda_id:            aziendaId,
    camera_id:             camera,
    pacchetto_id:          editor.querySelector("#ed-pacchetto").value || null,
    canale:                editor.querySelector("#ed-canale").value || "diretto",
    stato:                 editor.querySelector("#ed-stato").value || "confermata",
    ospite_nome:           nome,
    ospite_cognome:        cognome,
    ospite_email:          editor.querySelector("#ed-email").value.trim() || null,
    ospite_telefono:       editor.querySelector("#ed-tel").value.trim() || null,
    ospite_nazione:        editor.querySelector("#ed-nazione").value.trim() || "IT",
    ospite_documento_tipo: editor.querySelector("#ed-doc-tipo").value || null,
    ospite_documento_num:  editor.querySelector("#ed-doc-num").value.trim() || null,
    data_checkin:          checkin,
    data_checkout:         checkout,
    ora_checkin_prevista:  editor.querySelector("#ed-ora-in").value || "14:00",
    ora_checkout_prevista: editor.querySelector("#ed-ora-out").value || "11:00",
    adulti:                parseInt(editor.querySelector("#ed-adulti").value) || 1,
    bambini:               parseInt(editor.querySelector("#ed-bambini").value) || 0,
    prezzo_notte:          parseFloat(editor.querySelector("#ed-prezzo-notte").value) || null,
    prezzo_totale:         parseFloat(editor.querySelector("#ed-totale").value) || null,
    sconto_importo:        parseFloat(editor.querySelector("#ed-sconto").value) || 0,
    colazione_inclusa:     editor.querySelector("#ed-colazione").checked,
    prezzo_colazione_notte: parseFloat(editor.querySelector("#ed-prezzo-col")?.value) || null,
    stato_pagamento:       editor.querySelector("#ed-stato-pag").value || "non_pagato",
    metodo_pagamento:      editor.querySelector("#ed-metodo").value || null,
    acconto:               parseFloat(editor.querySelector("#ed-acconto").value) || 0,
    saldo:                 parseFloat(editor.querySelector("#ed-saldo").value) || 0,
    ota_codice:            editor.querySelector("#ed-ota").value.trim() || null,
    richieste_speciali:    editor.querySelector("#ed-richieste").value.trim() || null,
    note_interne:          editor.querySelector("#ed-note").value.trim() || null,
    updated_at:            new Date().toISOString(),
  };

  const btn = editor.querySelector("#btn-salva");
  btn.disabled = true;
  btn.textContent = "Salvataggio...";

  const { error } = prenId
    ? await supabase.from("hotel_prenotazioni").update(payload).eq("id", prenId)
    : await supabase.from("hotel_prenotazioni").insert(payload);

  if (error) {
    errEl.textContent = error.message;
    btn.disabled = false;
    btn.textContent = "💾 Salva";
    return;
  }

  editor.innerHTML = "";
  await caricaPrenotazioni(aziendaId, container);
}

// ── Helpers ──
function badgeStato(stato) {
  const map = { preventivo:"badge-gray", confermata:"badge-blue", checkin:"badge-green", checkout:"badge-gold", cancellata:"badge-red", noshow:"badge-red" };
  return map[stato] || "badge-gray";
}
function badgePagamento(stato) {
  const map = { non_pagato:"badge-red", acconto:"badge-yellow", saldato:"badge-green", rimborsato:"badge-gray" };
  return map[stato] || "badge-gray";
}
function formatData(d) {
  if (!d) return "—";
  const [y,m,g] = d.split("-");
  return `${g}/${m}/${y}`;
}
function oggi() { return new Date().toISOString().split("T")[0]; }
function domani() {
  const d = new Date(); d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}
function primoMese() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-01`;
}
function ultimoMese() {
  const d = new Date(new Date().getFullYear(), new Date().getMonth()+1, 0);
  return d.toISOString().split("T")[0];
}

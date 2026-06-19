import { supabase } from "../supabaseClient.js";

// Tipi di regola tariffa
const TIPI_REGOLA = [
  { id: "periodo",  label: "📅 Periodo specifico",    desc: "Alta/bassa stagione, festività, eventi" },
  { id: "weekend",  label: "📆 Weekend",              desc: "Venerdì-sabato-domenica automatico" },
  { id: "giornata", label: "📌 Giorno settimana",     desc: "Es. sempre -10% il lunedì e martedì" },
  { id: "lastminute", label: "⚡ Last minute",        desc: "Sconto se prenoti entro X giorni" },
  { id: "anticipo", label: "🔮 Prenotazione anticipo", desc: "Sconto se prenoti con X giorni di anticipo" },
];

const GIORNI = ["Lunedì","Martedì","Mercoledì","Giovedì","Venerdì","Sabato","Domenica"];

export async function render(container) {
  const az = window.state.azienda;

  container.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">💶 Tariffe & Regole prezzo</div>
        <div class="page-sub">Definisci il prezzo base e regole automatiche per weekend, stagioni e promozioni</div>
      </div>
      <button class="btn btn-primary" id="btn-nuova">+ Nuova regola</button>
    </div>

    <!-- Prezzi base per camera -->
    <div class="card" style="margin-bottom:16px;">
      <div class="card-title">🛏️ Prezzi base camere</div>
      <div id="prezzi-base"><p class="text-muted text-small">Caricamento...</p></div>
    </div>

    <!-- Regole tariffe -->
    <div class="card-title" style="margin-bottom:8px;">📋 Regole tariffe attive</div>
    <div id="tariffe-list"></div>
    <div id="tariffa-editor" style="margin-top:16px;"></div>

    <!-- Simulatore prezzi -->
    <div class="card" style="margin-top:16px;background:linear-gradient(135deg,#EBF5FB,#f0f9ff);">
      <div class="card-title">🧮 Simulatore — calcola prezzo per una data</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;align-items:end;">
        <div class="form-group">
          <label>Camera</label>
          <select id="sim-camera" class="input"></select>
        </div>
        <div class="form-group">
          <label>Data check-in</label>
          <input id="sim-data" class="input" type="date" value="${oggi()}">
        </div>
        <div class="form-group">
          <label>Notti</label>
          <input id="sim-notti" class="input" type="number" value="2" min="1">
        </div>
        <button class="btn btn-primary" id="btn-simula">Calcola</button>
      </div>
      <div id="sim-result" style="margin-top:12px;"></div>
    </div>
  `;

  const { data: camere } = await supabase
    .from("hotel_camere")
    .select("id,nome,prezzo_base,tipologia")
    .eq("azienda_id", az.id)
    .eq("attiva", true)
    .order("nome");

  container._camere = camere || [];

  // Popola select simulatore
  const simSel = container.querySelector("#sim-camera");
  simSel.innerHTML = (camere || []).map(c =>
    `<option value="${c.id}" data-prezzo="${c.prezzo_base || 0}">${c.nome} — € ${c.prezzo_base || 0}/notte</option>`
  ).join("");

  // Prezzi base
  renderPrezziBase(camere || [], az.id, container);

  container.querySelector("#btn-nuova").onclick = () => renderEditor(null, az.id, container);
  container.querySelector("#btn-simula").onclick = () => simulaPrezzo(az.id, container);

  await caricaTariffe(az.id, container);
}

function renderPrezziBase(camere, aziendaId, container) {
  const el = container.querySelector("#prezzi-base");
  if (!camere.length) {
    el.innerHTML = `<p class="text-muted text-small">Nessuna camera — <a href="#" onclick="window.location.hash='#/hotel-camere'">crea le camere prima</a></p>`;
    return;
  }

  el.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;">
      ${camere.map(c => `
        <div style="border:1px solid var(--border);border-radius:10px;padding:12px;display:flex;justify-content:space-between;align-items:center;">
          <div>
            <div style="font-weight:700;font-size:13px;">${c.nome}</div>
            <div style="font-size:11px;color:var(--muted);">${c.tipologia || ""}</div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <input class="input prezzo-base-input" data-id="${c.id}"
              type="number" step="0.01" value="${c.prezzo_base || ""}"
              style="width:80px;text-align:right;padding:6px 8px;"
              placeholder="€/notte">
            <button class="btn btn-ghost btn-sm btn-salva-prezzo" data-id="${c.id}">💾</button>
          </div>
        </div>
      `).join("")}
    </div>
    <div style="font-size:11px;color:var(--muted);margin-top:8px;">Il prezzo base è il punto di partenza — le regole sotto applicano variazioni % automatiche.</div>
  `;

  el.querySelectorAll(".btn-salva-prezzo").forEach(btn => {
    btn.onclick = async () => {
      const input = el.querySelector(`.prezzo-base-input[data-id="${btn.dataset.id}"]`);
      const prezzo = parseFloat(input.value);
      if (!prezzo) return;
      await supabase.from("hotel_camere").update({ prezzo_base: prezzo }).eq("id", btn.dataset.id);
      // Aggiorna anche il simulatore
      const opt = container.querySelector(`#sim-camera option[value="${btn.dataset.id}"]`);
      if (opt) { opt.dataset.prezzo = prezzo; opt.textContent = `${opt.textContent.split("—")[0].trim()} — € ${prezzo}/notte`; }
      btn.textContent = "✓";
      setTimeout(() => btn.textContent = "💾", 1500);
    };
  });
}

async function caricaTariffe(aziendaId, container) {
  const { data: tariffe } = await supabase
    .from("hotel_tariffe")
    .select("*, hotel_camere(nome)")
    .eq("azienda_id", aziendaId)
    .order("priorita", { ascending: false })
    .order("data_inizio");

  const list = container.querySelector("#tariffe-list");

  if (!tariffe || tariffe.length === 0) {
    list.innerHTML = `
      <div class="card" style="text-align:center;padding:32px;">
        <div style="font-size:40px;margin-bottom:10px;">💶</div>
        <div class="text-muted">Nessuna regola tariffa — clicca "+ Nuova regola" per iniziare</div>
        <div style="font-size:12px;color:var(--muted);margin-top:8px;">Esempio: weekend +20%, agosto +30%, last minute -10%</div>
      </div>`;
    return;
  }

  const oggi = new Date().toISOString().split("T")[0];

  list.innerHTML = tariffe.map(t => {
    const tipoInfo  = TIPI_REGOLA.find(r => r.id === (t.tipo_regola || "periodo")) || TIPI_REGOLA[0];
    const attiva    = isAttiva(t, oggi);
    const modifica  = t.prezzo_fisso
      ? `€ ${t.prezzo_fisso}/notte`
      : t.modifica_perc > 0 ? `+${t.modifica_perc}%` : `${t.modifica_perc}%`;
    const colore    = t.prezzo_fisso ? "var(--primary)" : t.modifica_perc > 0 ? "var(--danger)" : "var(--success)";

    return `
    <div class="card" style="margin-bottom:10px;${!t.attiva ? "opacity:.55;" : ""}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;">
        <div style="flex:1;">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px;">
            <span style="font-weight:800;font-size:15px;">${t.nome}</span>
            <span class="badge ${attiva ? "badge-green" : "badge-gray"}">${attiva ? "Attiva" : "Non attiva"}</span>
            <span class="badge badge-blue">${tipoInfo.label}</span>
          </div>
          <div style="display:flex;gap:16px;flex-wrap:wrap;font-size:13px;color:var(--muted);">
            ${t.tipo_regola === "periodo" ? `<span>📅 ${formatData(t.data_inizio)} → ${formatData(t.data_fine)}</span>` : ""}
            ${t.tipo_regola === "weekend" ? `<span>📆 Ogni weekend (ven-sab-dom)</span>` : ""}
            ${t.tipo_regola === "giornata" ? `<span>📌 ${(t.giorni_settimana||[]).map(g=>GIORNI[g]).join(", ")}</span>` : ""}
            ${t.tipo_regola === "lastminute" ? `<span>⚡ Entro ${t.giorni_anticipo} giorni dal check-in</span>` : ""}
            ${t.tipo_regola === "anticipo" ? `<span>🔮 Oltre ${t.giorni_anticipo} giorni di anticipo</span>` : ""}
            <span style="font-weight:700;color:${colore};font-size:14px;">${modifica}</span>
            <span>🛏️ ${t.hotel_camere?.nome || "Tutte le camere"}</span>
            <span style="color:var(--muted);">Priorità ${t.priorita || 0}</span>
            ${t.cumulabile !== false ? '<span class="badge badge-blue">Cumulabile</span>' : '<span class="badge badge-yellow">Esclusiva</span>'}
            ${t.supplemento_persona ? `<span class="badge badge-gray">+€${t.supplemento_persona}/pers. agg.</span>` : ""}
          </div>
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0;">
          <button class="btn btn-ghost btn-sm btn-edit" data-id="${t.id}">✏️</button>
          <button class="btn btn-sm ${t.attiva ? "btn-ghost" : "btn-success"} btn-toggle" data-id="${t.id}" data-attiva="${t.attiva}">
            ${t.attiva ? "Disattiva" : "Attiva"}
          </button>
          <button class="btn btn-danger btn-sm btn-delete" data-id="${t.id}" data-nome="${t.nome}">🗑</button>
        </div>
      </div>
    </div>`;
  }).join("");

  list.querySelectorAll(".btn-edit").forEach(btn => {
    btn.onclick = async () => {
      const { data: t } = await supabase.from("hotel_tariffe").select("*").eq("id", btn.dataset.id).single();
      if (t) renderEditor(t, aziendaId, container);
    };
  });
  list.querySelectorAll(".btn-toggle").forEach(btn => {
    btn.onclick = async () => {
      await supabase.from("hotel_tariffe").update({ attiva: btn.dataset.attiva !== "true" }).eq("id", btn.dataset.id);
      await caricaTariffe(aziendaId, container);
    };
  });
  list.querySelectorAll(".btn-delete").forEach(btn => {
    btn.onclick = async () => {
      if (!confirm(`Elimina regola "${btn.dataset.nome}"?`)) return;
      await supabase.from("hotel_tariffe").delete().eq("id", btn.dataset.id);
      await caricaTariffe(aziendaId, container);
    };
  });
}

function renderEditor(tariffa, aziendaId, container) {
  const isEdit = !!tariffa?.id;
  const t = tariffa || {};
  const camere = container._camere || [];
  const tipoAttivo = t.tipo_regola || "periodo";

  const editor = container.querySelector("#tariffa-editor");
  editor.innerHTML = `
    <div class="card" style="border:2px solid var(--primary);">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
        <div style="font-weight:800;font-size:16px;">${isEdit ? `Modifica: ${t.nome}` : "Nuova regola tariffa"}</div>
        <button class="btn btn-ghost btn-sm" id="btn-chiudi">✕</button>
      </div>

      <!-- Nome e camera -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
        <div class="form-group">
          <label>Nome regola *</label>
          <input id="ed-nome" class="input" value="${t.nome || ""}" placeholder="Es. Alta stagione estiva">
        </div>
        <div class="form-group">
          <label>Camera (vuoto = tutte)</label>
          <select id="ed-camera" class="input">
            <option value="">Tutte le camere</option>
            ${camere.map(c => `<option value="${c.id}" ${t.camera_id === c.id ? "selected" : ""}>${c.nome}</option>`).join("")}
          </select>
        </div>
      </div>

      <!-- Tipo regola -->
      <div style="margin-bottom:16px;">
        <label style="font-size:12px;font-weight:600;color:var(--muted);margin-bottom:8px;display:block;">Tipo di regola</label>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;">
          ${TIPI_REGOLA.map(r => `
            <label class="tipo-card" style="
              padding:10px 12px;border-radius:10px;border:2px solid ${tipoAttivo === r.id ? "var(--primary)" : "var(--border)"};
              background:${tipoAttivo === r.id ? "#EBF5FB" : "white"};cursor:pointer;
            ">
              <input type="radio" name="tipo-regola" value="${r.id}" ${tipoAttivo === r.id ? "checked" : ""} style="display:none;">
              <div style="font-weight:700;font-size:12px;">${r.label}</div>
              <div style="font-size:10px;color:var(--muted);margin-top:2px;">${r.desc}</div>
            </label>
          `).join("")}
        </div>
      </div>

      <!-- Opzioni per tipo -->
      <div id="box-periodo" style="${tipoAttivo !== "periodo" ? "display:none;" : ""}margin-bottom:16px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div class="form-group">
            <label>Data inizio *</label>
            <input id="ed-inizio" class="input" type="date" value="${t.data_inizio || ""}">
          </div>
          <div class="form-group">
            <label>Data fine *</label>
            <input id="ed-fine" class="input" type="date" value="${t.data_fine || ""}">
          </div>
        </div>
      </div>

      <div id="box-giornata" style="${tipoAttivo !== "giornata" ? "display:none;" : ""}margin-bottom:16px;">
        <label style="font-size:12px;font-weight:600;color:var(--muted);margin-bottom:8px;display:block;">Giorni della settimana</label>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          ${GIORNI.map((g, i) => `
            <label style="display:flex;align-items:center;gap:6px;padding:8px 12px;border-radius:8px;border:1px solid var(--border);cursor:pointer;font-size:13px;">
              <input type="checkbox" data-giorno="${i}" ${(t.giorni_settimana||[]).includes(i) ? "checked" : ""}> ${g}
            </label>
          `).join("")}
        </div>
      </div>

      <div id="box-anticipo" style="${!["lastminute","anticipo"].includes(tipoAttivo) ? "display:none;" : ""}margin-bottom:16px;">
        <div class="form-group">
          <label id="lbl-anticipo">Giorni</label>
          <input id="ed-giorni-anticipo" class="input" type="number" min="1" value="${t.giorni_anticipo || 7}" style="max-width:150px;">
        </div>
      </div>

      <!-- Variazione prezzo -->
      <div style="background:var(--bg);border-radius:12px;padding:16px;margin-bottom:16px;">
        <div style="font-weight:700;margin-bottom:12px;">Variazione prezzo</div>
        <div style="display:flex;gap:10px;margin-bottom:12px;">
          <label style="flex:1;display:flex;align-items:center;gap:8px;padding:12px;border-radius:10px;border:2px solid var(--border);cursor:pointer;" id="lbl-perc">
            <input type="radio" name="tipo-var" value="percentuale" ${!t.prezzo_fisso ? "checked" : ""}> Variazione %
          </label>
          <label style="flex:1;display:flex;align-items:center;gap:8px;padding:12px;border-radius:10px;border:2px solid var(--border);cursor:pointer;" id="lbl-fisso">
            <input type="radio" name="tipo-var" value="fisso" ${t.prezzo_fisso ? "checked" : ""}> Prezzo fisso
          </label>
        </div>
        <div id="box-perc" ${t.prezzo_fisso ? 'style="display:none"' : ""}>
          <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
            <input id="ed-perc" class="input" type="number" step="0.1" value="${t.modifica_perc || ""}"
              placeholder="Es. +20 o -15" style="max-width:160px;">
            <div style="font-size:13px;color:var(--muted);">
              Positivo = aumento &nbsp;·&nbsp; Negativo = sconto<br>
              Es: <strong>+25</strong> weekend alta stagione &nbsp;·&nbsp; <strong>-15</strong> lunedì/martedì bassa stagione
            </div>
          </div>
        </div>
        <div id="box-fisso" ${!t.prezzo_fisso ? 'style="display:none"' : ""}>
          <input id="ed-fisso" class="input" type="number" step="0.01" value="${t.prezzo_fisso || ""}"
            placeholder="Prezzo fisso per notte (€)" style="max-width:200px;">
        </div>
      </div>

      <!-- Cumulabile + Supplemento persona -->
      <div style="background:#f8fafc;border-radius:12px;padding:14px;margin-bottom:14px;">
        <div style="font-weight:700;margin-bottom:10px;">⚙️ Opzioni avanzate</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
          <div>
            <label style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;padding:10px;border:1.5px solid var(--border);border-radius:10px;">
              <input type="checkbox" id="ed-cumulabile" ${t.cumulabile !== false ? "checked" : ""} style="margin-top:2px;">
              <div>
                <div style="font-weight:700;font-size:13px;">Cumulabile</div>
                <div style="font-size:11px;color:var(--muted);">Si somma ad altre tariffe attive lo stesso giorno. Es. Alta stagione +30% + Weekend +20% = +50%</div>
              </div>
            </label>
          </div>
          <div>
            <label style="font-size:12px;font-weight:600;color:var(--muted);">Supplemento per persona aggiuntiva (€/notte)</label>
            <input id="ed-suppl-persona" class="input" type="number" step="0.01" min="0"
              value="${t.supplemento_persona || ""}" placeholder="Es. 20 — da 3ª persona in su" style="margin-top:4px;">
            <div style="font-size:11px;color:var(--muted);margin-top:4px;">Si applica oltre gli adulti base della camera</div>
          </div>
        </div>
      </div>

      <!-- Priorità e attiva -->
      <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap;margin-bottom:16px;">
        <div class="form-group" style="margin:0;">
          <label>Priorità (vince la più alta se non cumulabile)</label>
          <input id="ed-priorita" class="input" type="number" value="${t.priorita || 0}" style="max-width:100px;">
        </div>
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-top:20px;">
          <input type="checkbox" id="ed-attiva" ${t.attiva !== false ? "checked" : ""}> Regola attiva
        </label>
      </div>

      <div id="ed-error" style="color:var(--danger);font-size:13px;margin-bottom:8px;"></div>
      <button class="btn btn-primary" id="btn-salva">💾 ${isEdit ? "Salva modifiche" : "Crea regola"}</button>
    </div>
  `;

  // Toggle tipo regola
  editor.querySelectorAll("input[name='tipo-regola']").forEach(radio => {
    radio.onchange = () => {
      const tipo = radio.value;
      editor.querySelectorAll(".tipo-card").forEach(c => {
        const r = c.querySelector("input[type='radio']");
        c.style.borderColor = r.checked ? "var(--primary)" : "var(--border)";
        c.style.background  = r.checked ? "#EBF5FB" : "white";
      });
      editor.querySelector("#box-periodo").style.display  = tipo === "periodo" ? "" : "none";
      editor.querySelector("#box-giornata").style.display = tipo === "giornata" ? "" : "none";
      editor.querySelector("#box-anticipo").style.display = ["lastminute","anticipo"].includes(tipo) ? "" : "none";
      const lbl = editor.querySelector("#lbl-anticipo");
      if (lbl) lbl.textContent = tipo === "lastminute" ? "Entro quanti giorni dal check-in" : "Con quanti giorni di anticipo minimo";
    };
  });

  // Toggle tipo variazione
  editor.querySelectorAll("input[name='tipo-var']").forEach(r => {
    r.onchange = () => {
      const isPerc = editor.querySelector("input[name='tipo-var'][value='percentuale']").checked;
      editor.querySelector("#box-perc").style.display  = isPerc ? "" : "none";
      editor.querySelector("#box-fisso").style.display = isPerc ? "none" : "";
      editor.querySelector("#lbl-perc").style.borderColor = isPerc ? "var(--primary)" : "var(--border)";
      editor.querySelector("#lbl-fisso").style.borderColor = isPerc ? "var(--border)" : "var(--primary)";
    };
    r.dispatchEvent(new Event("change"));
  });

  editor.querySelector("#btn-chiudi").onclick = () => { editor.innerHTML = ""; };
  editor.querySelector("#btn-salva").onclick  = () => salvaTariffa(tariffa?.id, aziendaId, editor, container);
  editor.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function salvaTariffa(tariffaId, aziendaId, editor, container) {
  const errEl = editor.querySelector("#ed-error");
  errEl.textContent = "";

  const nome     = editor.querySelector("#ed-nome").value.trim();
  const tipo     = editor.querySelector("input[name='tipo-regola']:checked")?.value || "periodo";
  const isPerc   = editor.querySelector("input[name='tipo-var'][value='percentuale']").checked;

  if (!nome) { errEl.textContent = "Inserisci il nome della regola"; return; }

  if (tipo === "periodo") {
    const inizio = editor.querySelector("#ed-inizio").value;
    const fine   = editor.querySelector("#ed-fine").value;
    if (!inizio || !fine) { errEl.textContent = "Inserisci date inizio e fine"; return; }
    if (fine < inizio)    { errEl.textContent = "La data fine deve essere successiva all'inizio"; return; }
  }

  const giorni = Array.from(editor.querySelectorAll("[data-giorno]:checked")).map(el => parseInt(el.dataset.giorno));
  if (tipo === "giornata" && giorni.length === 0) {
    errEl.textContent = "Seleziona almeno un giorno della settimana"; return;
  }

  const payload = {
    azienda_id:        aziendaId,
    nome,
    tipo_regola:       tipo,
    camera_id:         editor.querySelector("#ed-camera").value || null,
    data_inizio:       tipo === "periodo" ? editor.querySelector("#ed-inizio").value : null,
    data_fine:         tipo === "periodo" ? editor.querySelector("#ed-fine").value : null,
    giorni_settimana:  tipo === "giornata" ? giorni : tipo === "weekend" ? [4,5,6] : null,
    giorni_anticipo:   ["lastminute","anticipo"].includes(tipo) ? parseInt(editor.querySelector("#ed-giorni-anticipo").value) || 7 : null,
    modifica_perc:     isPerc ? (parseFloat(editor.querySelector("#ed-perc").value) || null) : null,
    prezzo_fisso:      !isPerc ? (parseFloat(editor.querySelector("#ed-fisso").value) || null) : null,
    priorita:           parseInt(editor.querySelector("#ed-priorita").value) || 0,
    attiva:             editor.querySelector("#ed-attiva").checked,
    cumulabile:         editor.querySelector("#ed-cumulabile").checked,
    supplemento_persona: parseFloat(editor.querySelector("#ed-suppl-persona").value) || null,
  };

  const btn = editor.querySelector("#btn-salva");
  btn.disabled = true; btn.textContent = "Salvataggio...";

  const { error } = tariffaId
    ? await supabase.from("hotel_tariffe").update(payload).eq("id", tariffaId)
    : await supabase.from("hotel_tariffe").insert(payload);

  if (error) {
    errEl.textContent = error.message;
    btn.disabled = false; btn.textContent = "💾 Salva";
    return;
  }

  editor.innerHTML = "";
  await caricaTariffe(aziendaId, container);
}

async function simulaPrezzo(aziendaId, container) {
  const camOpt  = container.querySelector("#sim-camera").selectedOptions[0];
  const cameraId = camOpt?.value;
  const prezzoBase = parseFloat(camOpt?.dataset.prezzo || 0);
  const dataInizio = container.querySelector("#sim-data").value;
  const notti  = parseInt(container.querySelector("#sim-notti").value) || 1;
  const result = container.querySelector("#sim-result");

  if (!cameraId || !dataInizio || !prezzoBase) {
    result.innerHTML = `<p class="text-muted text-small">Seleziona camera e data</p>`; return;
  }

  const { data: tariffe } = await supabase
    .from("hotel_tariffe")
    .select("*")
    .eq("azienda_id", aziendaId)
    .eq("attiva", true)
    .or(`camera_id.eq.${cameraId},camera_id.is.null`);

  const oggi = new Date(dataInizio);
  let totale = 0;
  const righe = [];

  for (let i = 0; i < notti; i++) {
    const data = new Date(oggi);
    data.setDate(data.getDate() + i);
    const dataStr  = data.toISOString().split("T")[0];
    const giorno   = data.getDay(); // 0=dom,1=lun...6=sab
    const giorno0  = giorno === 0 ? 6 : giorno - 1; // converti a 0=lun..6=dom

    // Trova tariffa applicabile (priorità più alta)
    const applicabili = (tariffe || []).filter(t => tarriffaApplicabile(t, dataStr, giorno0));

    // Separa esclusive (cumulabile=false) e cumulabili
    const esclusive = applicabili.filter(t => t.cumulabile === false);
    const cumulative = applicabili.filter(t => t.cumulabile !== false);

    let prezzo = prezzoBase;
    let nota = "";

    if (esclusive.length > 0) {
      // Vince l'esclusiva con priorità più alta
      esclusive.sort((a,b) => (b.priorita||0) - (a.priorita||0));
      const t = esclusive[0];
      prezzo = t.prezzo_fisso ? t.prezzo_fisso : prezzoBase * (1 + (t.modifica_perc||0)/100);
      nota = `${t.nome} ${t.prezzo_fisso ? "(fisso)" : `(${t.modifica_perc > 0 ? "+" : ""}${t.modifica_perc}%)`} — ESCLUSIVA`;
    } else if (cumulative.length > 0) {
      // Somma tutte le % cumulabili
      const percTot = cumulative.reduce((s,t) => s + (t.modifica_perc||0), 0);
      prezzo = prezzoBase * (1 + percTot/100);
      nota = cumulative.map(t => `${t.nome} (${t.modifica_perc > 0 ? "+" : ""}${t.modifica_perc}%)`).join(" + ");
      if (cumulative.length > 1) nota += ` = ${percTot > 0 ? "+" : ""}${percTot}% tot.`;
    }

    // Supplemento persona aggiuntiva
    const adultiSim = parseInt(container.querySelector("#sim-notti")?.closest(".card")?.querySelector("#sim-adulti")?.value) || 2;
    const supplPerNotte = applicabili.reduce((s,t) => s + (t.supplemento_persona || 0), 0);
    if (supplPerNotte > 0 && adultiSim > 2) {
      const extraPersone = adultiSim - 2;
      prezzo += supplPerNotte * extraPersone;
      nota += nota ? ` + suppl. ${extraPersone} pers.` : `suppl. ${extraPersone} pers.`;
    }

    totale += prezzo;

    righe.push(`
      <tr>
        <td>${data.toLocaleDateString("it-IT",{weekday:"short",day:"numeric",month:"short"})}</td>
        <td style="font-size:12px;">${nota || "Prezzo base"}</td>
        <td style="text-align:right;font-weight:700;">€ ${prezzo.toFixed(2)}</td>
      </tr>
    `);
  }

  result.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Data</th><th>Tariffa applicata</th><th style="text-align:right">Prezzo notte</th></tr></thead>
        <tbody>${righe.join("")}</tbody>
        <tfoot>
          <tr style="border-top:2px solid var(--border);">
            <td colspan="2" style="font-weight:700;padding-top:8px;">Totale ${notti} notti</td>
            <td style="text-align:right;font-weight:800;font-size:16px;color:var(--primary);">€ ${totale.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  `;
}

function tarriffaApplicabile(t, dataStr, giornoSettimana) {
  if (!t.attiva) return false;
  const tipo = t.tipo_regola || "periodo";
  if (tipo === "periodo") return dataStr >= t.data_inizio && dataStr <= t.data_fine;
  if (tipo === "weekend") return [4,5,6].includes(giornoSettimana); // ven=4, sab=5, dom=6
  if (tipo === "giornata") return (t.giorni_settimana || []).includes(giornoSettimana);
  return false;
}

function isAttiva(t, oggi) {
  if (!t.attiva) return false;
  const tipo = t.tipo_regola || "periodo";
  if (tipo === "periodo") return t.data_inizio <= oggi && t.data_fine >= oggi;
  if (tipo === "weekend" || tipo === "giornata") return true;
  if (tipo === "lastminute" || tipo === "anticipo") return true;
  return false;
}

function formatData(d) {
  if (!d) return "—";
  const [y,m,g] = d.split("-"); return `${g}/${m}/${y}`;
}
function oggi() { return new Date().toISOString().split("T")[0]; }

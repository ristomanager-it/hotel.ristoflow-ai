import { supabase } from "../supabaseClient.js";

export async function render(container) {
  const az = window.state.azienda;
  const params = new URLSearchParams(window.location.hash.split("?")[1] || "");
  const prenId   = params.get("id");
  const isCheckout = params.get("checkout") === "1";

  // Se arriva con id specifico apri direttamente
  if (prenId) {
    const { data: p } = await supabase
      .from("hotel_prenotazioni")
      .select("*, hotel_camere(nome,tipologia)")
      .eq("id", prenId)
      .single();
    if (p) {
      renderSchedaOperativa(container, p, az.id, isCheckout);
      return;
    }
  }

  // Altrimenti mostra lista arrivi e partenze di oggi
  const oggi = new Date().toISOString().split("T")[0];

  container.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">🛎️ Check-in / Check-out</div>
        <div class="page-sub">${new Date().toLocaleDateString("it-IT",{weekday:"long",day:"numeric",month:"long"})}</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;" id="grid-checkin">
      <div class="card">
        <div class="card-title">🛬 Arrivi oggi</div>
        <div id="lista-arrivi"><p class="text-muted text-small">Caricamento...</p></div>
      </div>
      <div class="card">
        <div class="card-title">🛫 Partenze oggi</div>
        <div id="lista-partenze"><p class="text-muted text-small">Caricamento...</p></div>
      </div>
    </div>
    <div class="card" style="margin-top:16px;">
      <div class="card-title">🏠 In casa</div>
      <div id="lista-incasa"><p class="text-muted text-small">Caricamento...</p></div>
    </div>
    <div id="scheda-operativa" style="margin-top:16px;"></div>
  `;

  const [{ data: arrivi }, { data: partenze }, { data: inCasa }] = await Promise.all([
    supabase.from("hotel_prenotazioni")
      .select("*, hotel_camere(nome)")
      .eq("azienda_id", az.id)
      .eq("data_checkin", oggi)
      .in("stato", ["confermata","preventivo"]),
    supabase.from("hotel_prenotazioni")
      .select("*, hotel_camere(nome)")
      .eq("azienda_id", az.id)
      .eq("data_checkout", oggi)
      .eq("stato", "checkin"),
    supabase.from("hotel_prenotazioni")
      .select("*, hotel_camere(nome)")
      .eq("azienda_id", az.id)
      .eq("stato", "checkin")
      .lt("data_checkin", oggi)
      .gt("data_checkout", oggi),
  ]);

  renderLista("lista-arrivi", arrivi, false, container, az.id);
  renderLista("lista-partenze", partenze, true, container, az.id);
  renderListaInCasa("lista-incasa", inCasa, container, az.id);
}

function renderLista(id, items, isOut, container, azId) {
  const el = document.getElementById(id);
  if (!items || items.length === 0) {
    el.innerHTML = `<p class="text-muted text-small">Nessuno</p>`; return;
  }
  el.innerHTML = items.map(p => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border);gap:8px;flex-wrap:wrap;">
      <div>
        <div style="font-weight:700;">${p.ospite_nome} ${p.ospite_cognome}</div>
        <div class="text-muted text-small">
          📍 ${p.hotel_camere?.nome || "—"} &nbsp;·&nbsp;
          👥 ${p.adulti} adulti
          &nbsp;·&nbsp; 🕐 ${isOut ? p.ora_checkout_prevista || "11:00" : p.ora_checkin_prevista || "14:00"}
        </div>
      </div>
      <button class="btn btn-${isOut ? "accent" : "primary"} btn-sm btn-apri-scheda" data-id="${p.id}" data-out="${isOut}">
        ${isOut ? "Check-out" : "Check-in"}
      </button>
    </div>
  `).join("");

  el.querySelectorAll(".btn-apri-scheda").forEach(btn => {
    btn.onclick = async () => {
      const { data: p } = await supabase
        .from("hotel_prenotazioni")
        .select("*, hotel_camere(nome,tipologia)")
        .eq("id", btn.dataset.id)
        .single();
      if (p) renderSchedaOperativa(container, p, azId, btn.dataset.out === "true");
    };
  });
}

function renderListaInCasa(id, items, container, azId) {
  const el = document.getElementById(id);
  if (!items || items.length === 0) {
    el.innerHTML = `<p class="text-muted text-small">Nessun ospite in casa</p>`; return;
  }
  el.innerHTML = items.map(p => {
    const co = new Date(p.data_checkout);
    const oggi = new Date();
    const rimanenti = Math.round((co - oggi) / 86400000);
    return `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border);gap:8px;flex-wrap:wrap;">
      <div>
        <div style="font-weight:700;">${p.ospite_nome} ${p.ospite_cognome}</div>
        <div class="text-muted text-small">
          📍 ${p.hotel_camere?.nome || "—"} &nbsp;·&nbsp;
          📅 Checkout: ${formatData(p.data_checkout)} (${rimanenti} notti rimanenti)
        </div>
      </div>
      <button class="btn btn-ghost btn-sm btn-apri-scheda" data-id="${p.id}" data-out="false">Dettaglio</button>
    </div>`;
  }).join("");

  el.querySelectorAll(".btn-apri-scheda").forEach(btn => {
    btn.onclick = async () => {
      const { data: p } = await supabase
        .from("hotel_prenotazioni")
        .select("*, hotel_camere(nome,tipologia)")
        .eq("id", btn.dataset.id).single();
      if (p) renderSchedaOperativa(container, p, azId, false);
    };
  });
}

function renderSchedaOperativa(container, p, azId, isCheckout) {
  const target = document.getElementById("scheda-operativa") || container;
  const notti = p.notti || Math.round((new Date(p.data_checkout) - new Date(p.data_checkin)) / 86400000);
  const totDovuto = p.prezzo_totale || 0;
  const totPagato = (p.acconto || 0) + (p.saldo || 0);
  const residuo   = Math.max(0, totDovuto - totPagato);

  target.innerHTML = `
    <div class="card" style="border:2px solid var(--primary);">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:10px;">
        <div>
          <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;">
            ${isCheckout ? "🛫 Check-out" : p.stato === "checkin" ? "🏠 Soggiorno in corso" : "🛬 Check-in"}
          </div>
          <div style="font-size:20px;font-weight:800;margin-top:2px;">${p.ospite_nome} ${p.ospite_cognome}</div>
        </div>
        <div style="display:flex;gap:8px;align-items:center;">
          <span class="badge ${badgeStato(p.stato)}">${p.stato}</span>
          <span class="badge ${badgePag(p.stato_pagamento)}">${(p.stato_pagamento||"").replace(/_/g," ")}</span>
          <button class="btn btn-ghost btn-sm" id="btn-chiudi-scheda">✕</button>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:20px;">

        <!-- Soggiorno -->
        <div style="background:var(--bg);border-radius:12px;padding:14px;">
          <div style="font-size:11px;font-weight:700;color:var(--muted);margin-bottom:8px;">SOGGIORNO</div>
          <div style="font-size:13px;margin-bottom:4px;">🛏️ <strong>${p.hotel_camere?.nome || "—"}</strong> ${p.hotel_camere?.tipologia ? `(${p.hotel_camere.tipologia})` : ""}</div>
          <div style="font-size:13px;margin-bottom:4px;">📅 ${formatData(p.data_checkin)} → ${formatData(p.data_checkout)}</div>
          <div style="font-size:13px;margin-bottom:4px;">🌙 ${notti} notti</div>
          <div style="font-size:13px;margin-bottom:4px;">👥 ${p.adulti} adulti${p.bambini > 0 ? ` + ${p.bambini} bambini` : ""}</div>
          ${p.colazione_inclusa ? `<div style="font-size:13px;">☕ Colazione inclusa</div>` : ""}
          ${p.richieste_speciali ? `<div style="font-size:12px;color:var(--muted);margin-top:6px;font-style:italic;">"${p.richieste_speciali}"</div>` : ""}
        </div>

        <!-- Documento -->
        <div style="background:var(--bg);border-radius:12px;padding:14px;">
          <div style="font-size:11px;font-weight:700;color:var(--muted);margin-bottom:8px;">DOCUMENTO</div>
          <div class="form-group">
            <label>Tipo documento</label>
            <select id="doc-tipo" class="input">
              <option value="">Seleziona...</option>
              ${["carta_identita","passaporto","patente"].map(d =>
                `<option value="${d}" ${p.ospite_documento_tipo === d ? "selected" : ""}>${d.replace(/_/g," ")}</option>`
              ).join("")}
            </select>
          </div>
          <div class="form-group">
            <label>Numero documento</label>
            <input id="doc-num" class="input" value="${p.ospite_documento_num || ""}" placeholder="Es. AX1234567">
          </div>
          <div class="form-group">
            <label>Scadenza documento</label>
            <input id="doc-scad" class="input" type="date" value="${p.ospite_documento_scad || ""}">
          </div>
          <div class="form-group">
            <label>Nazione</label>
            <input id="doc-nazione" class="input" value="${p.ospite_nazione || "IT"}">
          </div>
        </div>

        <!-- Pagamento -->
        <div style="background:var(--bg);border-radius:12px;padding:14px;">
          <div style="font-size:11px;font-weight:700;color:var(--muted);margin-bottom:8px;">PAGAMENTO</div>
          <div style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:13px;">
            <span>Totale soggiorno</span><span style="font-weight:700;">€ ${totDovuto.toFixed(2)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:13px;color:var(--success);">
            <span>Acconto versato</span><span>€ ${(p.acconto||0).toFixed(2)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:12px;font-size:13px;color:var(--success);">
            <span>Saldo versato</span><span>€ ${(p.saldo||0).toFixed(2)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:10px;background:${residuo > 0 ? "#FEE2E2" : "#DCFCE7"};border-radius:8px;margin-bottom:12px;">
            <span style="font-weight:700;">Residuo</span>
            <span style="font-weight:800;color:${residuo > 0 ? "var(--danger)" : "var(--success)"};">€ ${residuo.toFixed(2)}</span>
          </div>
          ${residuo > 0 ? `
          <div class="form-group">
            <label>Incassa (€)</label>
            <input id="pag-importo" class="input" type="number" step="0.01" value="${residuo.toFixed(2)}">
          </div>
          <div class="form-group">
            <label>Metodo</label>
            <select id="pag-metodo" class="input">
              ${["carta","contanti","bonifico","stripe"].map(m =>
                `<option value="${m}" ${p.metodo_pagamento === m ? "selected" : ""}>${m}</option>`
              ).join("")}
            </select>
          </div>` : `<div style="text-align:center;color:var(--success);font-weight:700;padding:8px;">✅ Saldato</div>`}
        </div>
      </div>

      <!-- Note interne -->
      <div class="form-group">
        <label>Note interne</label>
        <textarea id="note-interne" class="input" rows="2">${p.note_interne || ""}</textarea>
      </div>

      <div id="scheda-error" style="color:var(--danger);font-size:13px;margin-top:8px;"></div>

      <!-- Azioni -->
      <div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap;">
        ${!isCheckout && p.stato !== "checkin" ? `
          <button class="btn btn-primary" id="btn-do-checkin">🛬 Esegui Check-in</button>
        ` : ""}
        ${isCheckout || p.stato === "checkin" ? `
          <button class="btn btn-accent" id="btn-do-checkout">🛫 Esegui Check-out</button>
        ` : ""}
        <button class="btn btn-ghost" id="btn-salva-doc">💾 Salva dati documento</button>
        <button class="btn btn-ghost btn-sm" onclick="window.location.hash='#/hotel-prenotazioni?id=${p.id}'">Vai alla prenotazione →</button>
      </div>
    </div>
  `;

  document.getElementById("btn-chiudi-scheda").onclick = () => { target.innerHTML = ""; };

  // Salva documento
  document.getElementById("btn-salva-doc").onclick = async () => {
    const { error } = await supabase.from("hotel_prenotazioni").update({
      ospite_documento_tipo: document.getElementById("doc-tipo").value || null,
      ospite_documento_num:  document.getElementById("doc-num").value.trim() || null,
      ospite_documento_scad: document.getElementById("doc-scad").value || null,
      ospite_nazione:        document.getElementById("doc-nazione").value.trim() || "IT",
      note_interne:          document.getElementById("note-interne").value.trim() || null,
      updated_at:            new Date().toISOString(),
    }).eq("id", p.id);
    if (error) { document.getElementById("scheda-error").textContent = error.message; return; }
    window.notify?.("Dati salvati ✓", "success");
  };

  // Check-in
  const btnCI = document.getElementById("btn-do-checkin");
  if (btnCI) btnCI.onclick = async () => {
    btnCI.disabled = true; btnCI.textContent = "...";
    const importo = parseFloat(document.getElementById("pag-importo")?.value) || 0;
    const metodo  = document.getElementById("pag-metodo")?.value || null;

    const nuovoSaldo   = (p.saldo || 0) + importo;
    const nuovoTotPag  = (p.acconto || 0) + nuovoSaldo;
    const statoPag     = nuovoTotPag >= totDovuto ? "saldato" : importo > 0 ? "acconto" : p.stato_pagamento;

    const { error } = await supabase.from("hotel_prenotazioni").update({
      stato:                  "checkin",
      ospite_documento_tipo:  document.getElementById("doc-tipo").value || null,
      ospite_documento_num:   document.getElementById("doc-num").value.trim() || null,
      ospite_documento_scad:  document.getElementById("doc-scad").value || null,
      ospite_nazione:         document.getElementById("doc-nazione").value.trim() || "IT",
      saldo:                  nuovoSaldo,
      stato_pagamento:        statoPag,
      metodo_pagamento:       metodo,
      note_interne:           document.getElementById("note-interne").value.trim() || null,
      updated_at:             new Date().toISOString(),
    }).eq("id", p.id);

    if (error) { document.getElementById("scheda-error").textContent = error.message; btnCI.disabled = false; btnCI.textContent = "🛬 Esegui Check-in"; return; }
    window.notify?.("✅ Check-in eseguito!", "success");
    window.location.hash = "#/hotel-checkin";
  };

  // Check-out
  const btnCO = document.getElementById("btn-do-checkout");
  if (btnCO) btnCO.onclick = async () => {
    btnCO.disabled = true; btnCO.textContent = "...";
    const importo = parseFloat(document.getElementById("pag-importo")?.value) || 0;
    const metodo  = document.getElementById("pag-metodo")?.value || null;

    const nuovoSaldo  = (p.saldo || 0) + importo;
    const nuovoTotPag = (p.acconto || 0) + nuovoSaldo;
    const statoPag    = nuovoTotPag >= totDovuto ? "saldato" : p.stato_pagamento;

    const { error } = await supabase.from("hotel_prenotazioni").update({
      stato:           "checkout",
      saldo:           nuovoSaldo,
      stato_pagamento: statoPag,
      metodo_pagamento: metodo || p.metodo_pagamento,
      note_interne:    document.getElementById("note-interne").value.trim() || null,
      updated_at:      new Date().toISOString(),
    }).eq("id", p.id);

    if (error) { document.getElementById("scheda-error").textContent = error.message; btnCO.disabled = false; btnCO.textContent = "🛫 Esegui Check-out"; return; }
    window.notify?.("✅ Check-out eseguito!", "success");
    window.location.hash = "#/hotel-checkin";
  };

  target.scrollIntoView({ behavior: "smooth", block: "start" });
}

function badgeStato(stato) {
  const map = { preventivo:"badge-gray", confermata:"badge-blue", checkin:"badge-green", checkout:"badge-gold", cancellata:"badge-red", noshow:"badge-red" };
  return map[stato] || "badge-gray";
}
function badgePag(stato) {
  const map = { non_pagato:"badge-red", acconto:"badge-yellow", saldato:"badge-green", rimborsato:"badge-gray" };
  return map[stato] || "badge-gray";
}
function formatData(d) {
  if (!d) return "—";
  const [y,m,g] = d.split("-");
  return `${g}/${m}/${y}`;
}

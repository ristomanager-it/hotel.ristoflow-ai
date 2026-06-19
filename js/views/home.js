import { supabase } from "../supabaseClient.js";

export async function render(container) {
  const az = window.state.azienda;
  const aziendaId = az?.id;

  container.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">🏨 Dashboard</div>
        <div class="page-sub">Situazione di oggi — ${new Date().toLocaleDateString("it-IT", { weekday:"long", day:"numeric", month:"long" })}</div>
      </div>
      <button class="btn btn-primary" id="btn-nuova-pren">+ Nuova prenotazione</button>
    </div>

    <!-- STAT CARDS -->
    <div class="stat-grid" id="stat-grid">
      <div class="stat-card"><div class="stat-label">Camere totali</div><div class="stat-value" id="s-camere">—</div></div>
      <div class="stat-card"><div class="stat-label">Occupate oggi</div><div class="stat-value" id="s-occupate">—</div><div class="stat-sub" id="s-occ-perc"></div></div>
      <div class="stat-card"><div class="stat-label">Arrivi oggi</div><div class="stat-value" id="s-arrivi">—</div></div>
      <div class="stat-card"><div class="stat-label">Partenze oggi</div><div class="stat-value" id="s-partenze">—</div></div>
      <div class="stat-card"><div class="stat-label">Revenue mese</div><div class="stat-value" id="s-revenue">—</div></div>
      <div class="stat-card"><div class="stat-label">Tasso occupazione</div><div class="stat-value" id="s-occ-mese">—</div><div class="stat-sub">mese corrente</div></div>
    </div>

    <!-- ARRIVI E PARTENZE OGGI -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;" id="grid-ap">
      <div class="card">
        <div class="card-title">🛬 Arrivi oggi</div>
        <div id="lista-arrivi"><p class="text-muted text-small">Caricamento...</p></div>
      </div>
      <div class="card">
        <div class="card-title">🛫 Partenze oggi</div>
        <div id="lista-partenze"><p class="text-muted text-small">Caricamento...</p></div>
      </div>
    </div>

    <!-- IN CASA OGGI -->
    <div class="card">
      <div class="card-title">🏠 Ospiti in casa</div>
      <div id="lista-incasa"><p class="text-muted text-small">Caricamento...</p></div>
    </div>
  `;

  container.querySelector("#btn-nuova-pren").onclick = () => {
    window.location.hash = "#/hotel-prenotazioni?new=1";
  };

  await caricaDashboard(aziendaId);
}

async function caricaDashboard(aziendaId) {
  const oggi = new Date().toISOString().split("T")[0];
  const inizioMese = oggi.substring(0, 7) + "-01";

  // Parallelo
  const [
    { data: camere },
    { data: arrivi },
    { data: partenze },
    { data: inCasa },
    { data: revenueMese },
  ] = await Promise.all([
    supabase.from("hotel_camere").select("id").eq("azienda_id", aziendaId).eq("attiva", true),
    supabase.from("hotel_prenotazioni")
      .select("id, ospite_nome, ospite_cognome, camera_id, adulti, bambini, ora_checkin_prevista, stato_pagamento, hotel_camere(nome)")
      .eq("azienda_id", aziendaId)
      .eq("data_checkin", oggi)
      .in("stato", ["confermata", "checkin"]),
    supabase.from("hotel_prenotazioni")
      .select("id, ospite_nome, ospite_cognome, camera_id, adulti, ora_checkout_prevista, stato_pagamento, hotel_camere(nome)")
      .eq("azienda_id", aziendaId)
      .eq("data_checkout", oggi)
      .eq("stato", "checkin"),
    supabase.from("hotel_prenotazioni")
      .select("id, ospite_nome, ospite_cognome, camera_id, data_checkin, data_checkout, adulti, hotel_camere(nome)")
      .eq("azienda_id", aziendaId)
      .eq("stato", "checkin")
      .lt("data_checkin", oggi)
      .gt("data_checkout", oggi),
    supabase.from("hotel_prenotazioni")
      .select("prezzo_totale")
      .eq("azienda_id", aziendaId)
      .in("stato", ["checkin", "checkout"])
      .gte("data_checkin", inizioMese),
  ]);

  const nCamere   = camere?.length || 0;
  const nOccupate = (inCasa?.length || 0) + (arrivi?.length || 0);
  const occPerc   = nCamere > 0 ? Math.round((nOccupate / nCamere) * 100) : 0;
  const revenue   = (revenueMese || []).reduce((s, r) => s + (r.prezzo_totale || 0), 0);

  // Stat mese — calcola tasso occupazione
  const giorniMese = new Date(oggi.substring(0,4), oggi.substring(5,7), 0).getDate();
  const giornoOggi = parseInt(oggi.substring(8,10));

  document.getElementById("s-camere").textContent    = nCamere;
  document.getElementById("s-occupate").textContent  = nOccupate;
  document.getElementById("s-occ-perc").textContent  = nCamere > 0 ? `${occPerc}% occupazione` : "";
  document.getElementById("s-arrivi").textContent    = arrivi?.length || 0;
  document.getElementById("s-partenze").textContent  = partenze?.length || 0;
  document.getElementById("s-revenue").textContent   = "€ " + revenue.toLocaleString("it-IT", { minimumFractionDigits: 0 });

  // Tasso occupazione mese (stima su giorni passati)
  const { data: presMese } = await supabase
    .from("hotel_prenotazioni")
    .select("data_checkin, data_checkout")
    .eq("azienda_id", aziendaId)
    .in("stato", ["checkin", "checkout", "confermata"])
    .gte("data_checkin", inizioMese)
    .lte("data_checkin", oggi);

  let nottiOccupate = 0;
  (presMese || []).forEach(p => {
    const ci = new Date(p.data_checkin);
    const co = new Date(p.data_checkout);
    const fine = new Date(Math.min(co, new Date(oggi)));
    const inizio = new Date(Math.max(ci, new Date(inizioMese)));
    const notti = Math.max(0, (fine - inizio) / (1000 * 60 * 60 * 24));
    nottiOccupate += notti;
  });

  const nottiTotaliMese = nCamere * giornoOggi;
  const occMese = nottiTotaliMese > 0 ? Math.round((nottiOccupate / nottiTotaliMese) * 100) : 0;
  document.getElementById("s-occ-mese").textContent = occMese + "%";

  // Liste arrivi
  renderLista("lista-arrivi", arrivi, (p) => `
    <div class="checkin-card arrivo">
      <div>
        <div style="font-weight:700;">${p.ospite_nome} ${p.ospite_cognome}</div>
        <div class="text-muted text-small">
          📍 ${p.hotel_camere?.nome || "—"} &nbsp;·&nbsp;
          👥 ${p.adulti} adulti
          ${p.bambini > 0 ? ` + ${p.bambini} bambini` : ""}
          &nbsp;·&nbsp; 🕐 ${p.ora_checkin_prevista || "14:00"}
        </div>
      </div>
      <div style="display:flex;gap:6px;align-items:center;">
        ${badgePagamento(p.stato_pagamento)}
        <button class="btn btn-primary btn-sm" onclick="window.location.hash='#/hotel-checkin?id=${p.id}'">Check-in</button>
      </div>
    </div>
  `);

  // Liste partenze
  renderLista("lista-partenze", partenze, (p) => `
    <div class="checkin-card partenza">
      <div>
        <div style="font-weight:700;">${p.ospite_nome} ${p.ospite_cognome}</div>
        <div class="text-muted text-small">
          📍 ${p.hotel_camere?.nome || "—"} &nbsp;·&nbsp;
          🕐 ${p.ora_checkout_prevista || "11:00"}
        </div>
      </div>
      <div style="display:flex;gap:6px;align-items:center;">
        ${badgePagamento(p.stato_pagamento)}
        <button class="btn btn-accent btn-sm" onclick="window.location.hash='#/hotel-checkin?id=${p.id}&checkout=1'">Check-out</button>
      </div>
    </div>
  `);

  // In casa
  renderLista("lista-incasa", inCasa, (p) => {
    const ci = new Date(p.data_checkin);
    const co = new Date(p.data_checkout);
    const notti = Math.round((co - ci) / (1000 * 60 * 60 * 24));
    const nottiRimanenti = Math.round((co - new Date()) / (1000 * 60 * 60 * 24));
    return `
    <div class="checkin-card in-casa">
      <div>
        <div style="font-weight:700;">${p.ospite_nome} ${p.ospite_cognome}</div>
        <div class="text-muted text-small">
          📍 ${p.hotel_camere?.nome || "—"} &nbsp;·&nbsp;
          👥 ${p.adulti} adulti &nbsp;·&nbsp;
          📅 ${notti} notti (${nottiRimanenti} rimanenti)
        </div>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="window.location.hash='#/hotel-prenotazioni?id=${p.id}'">Dettaglio</button>
    </div>
  `});
}

function renderLista(id, items, template) {
  const el = document.getElementById(id);
  if (!items || items.length === 0) {
    el.innerHTML = `<p class="text-muted text-small" style="padding:8px 0;">Nessuno</p>`;
    return;
  }
  el.innerHTML = items.map(template).join("");
}

function badgePagamento(stato) {
  const map = {
    non_pagato: ["badge-red",    "Non pagato"],
    acconto:    ["badge-yellow", "Acconto"],
    saldato:    ["badge-green",  "Saldato"],
  };
  const [cls, label] = map[stato] || ["badge-gray", stato || "—"];
  return `<span class="badge ${cls}">${label}</span>`;
}

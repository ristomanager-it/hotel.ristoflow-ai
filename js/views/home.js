import { supabase } from "../supabaseClient.js";

const SUPABASE_URL  = "https://cuhcscpvhypoaplcmtjk.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1aGNzY3B2aHlwb2FwbGNtdGprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4MjY4MjgsImV4cCI6MjA3OTQwMjgyOH0.q9zAs0oh8F1-whtORHBIORF5jIn1NTS3LvSMWleP0a0";

export async function render(container) {
  const az        = window.state.azienda;
  const aziendaId = az?.id;
  const oggi      = new Date().toISOString().split("T")[0];
  const ora       = new Date().getHours();
  const saluto    = ora < 12 ? "Buongiorno" : ora < 18 ? "Buon pomeriggio" : "Buonasera";
  const dataFmt   = new Date().toLocaleDateString("it-IT", { weekday:"long", day:"numeric", month:"long" });

  container.innerHTML = `
    <style>
      .home-hero { background:linear-gradient(135deg,#0E5A7A,#1a7a9f); border-radius:20px; padding:24px; color:white; margin-bottom:20px; }
      .hero-saluto { font-size:22px; font-weight:800; margin-bottom:4px; }
      .hero-sub { font-size:14px; opacity:.85; margin-bottom:16px; }
      .hero-meteo { display:flex; align-items:center; gap:10px; background:rgba(255,255,255,.15); border-radius:12px; padding:12px 16px; font-size:14px; }
      .hero-kpi { display:grid; grid-template-columns:repeat(auto-fit,minmax(100px,1fr)); gap:10px; margin-top:16px; }
      .hero-kpi-item { background:rgba(255,255,255,.15); border-radius:12px; padding:12px; text-align:center; }
      .hero-kpi-val { font-size:24px; font-weight:800; }
      .hero-kpi-lbl { font-size:11px; opacity:.8; margin-top:2px; }
      .home-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:16px; }
      @media(max-width:700px) { .home-grid { grid-template-columns:1fr; } }
      .checkin-card { display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid #f1f5f9; gap:10px; flex-wrap:wrap; }
      .checkin-card:last-child { border-bottom:none; }
      /* TONY */
      .tony-wrap { background:white; border:1px solid #e5e7eb; border-radius:16px; padding:16px; margin-bottom:16px; }
      .tony-header { display:flex; align-items:center; gap:10px; margin-bottom:14px; }
      .tony-avatar { width:36px; height:36px; background:linear-gradient(135deg,#0E5A7A,#1a7a9f); border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:16px; flex-shrink:0; }
      .tony-msgs { max-height:280px; overflow-y:auto; display:flex; flex-direction:column; gap:8px; margin-bottom:12px; }
      .tony-msg { padding:10px 14px; border-radius:14px; font-size:13px; line-height:1.5; max-width:85%; }
      .tony-msg.tony { background:#f0f9ff; color:#0f172a; align-self:flex-start; border-bottom-left-radius:4px; }
      .tony-msg.user { background:#0E5A7A; color:white; align-self:flex-end; border-bottom-right-radius:4px; }
      .tony-input-wrap { display:flex; gap:8px; }
      .tony-input { flex:1; padding:10px 14px; border:1px solid #e5e7eb; border-radius:10px; font-size:13px; }
      .tony-send { background:#0E5A7A; color:white; border:none; padding:10px 16px; border-radius:10px; cursor:pointer; font-size:16px; }
      /* BACHECA */
      .bacheca-wrap { background:white; border:1px solid #e5e7eb; border-radius:16px; padding:16px; margin-bottom:16px; }
      .post-card { background:#f8fafc; border-radius:12px; padding:12px 14px; margin-bottom:10px; }
      .post-autore { font-size:12px; font-weight:700; color:#0E5A7A; margin-bottom:4px; }
      .post-testo { font-size:13px; color:#1e293b; line-height:1.5; }
      .post-meta { font-size:11px; color:#94a3b8; margin-top:6px; }
      .post-tag { display:inline-block; background:#f0f9ff; color:#0E5A7A; padding:2px 8px; border-radius:20px; font-size:10px; font-weight:700; margin-right:4px; }
    </style>

    <!-- HERO -->
    <div class="home-hero">
      <div class="hero-saluto" id="hero-saluto">${saluto}, ${az?.nome || "Hotel"} 👋</div>
      <div class="hero-sub">${dataFmt}</div>
      <div class="hero-meteo" id="hero-meteo">
        <span style="font-size:24px;">🌤️</span>
        <div id="meteo-testo" style="font-size:13px;opacity:.9;">Caricamento meteo...</div>
      </div>
      <div class="hero-kpi" id="hero-kpi">
        <div class="hero-kpi-item"><div class="hero-kpi-val" id="k-arrivi">—</div><div class="hero-kpi-lbl">Arrivi</div></div>
        <div class="hero-kpi-item"><div class="hero-kpi-val" id="k-partenze">—</div><div class="hero-kpi-lbl">Partenze</div></div>
        <div class="hero-kpi-item"><div class="hero-kpi-val" id="k-incasa">—</div><div class="hero-kpi-lbl">In casa</div></div>
        <div class="hero-kpi-item"><div class="hero-kpi-val" id="k-task">—</div><div class="hero-kpi-lbl">Task oggi</div></div>
        <div class="hero-kpi-item"><div class="hero-kpi-val" id="k-occ">—</div><div class="hero-kpi-lbl">Occupazione</div></div>
      </div>
    </div>

    <!-- TONY AI -->
    <div class="tony-wrap">
      <div class="tony-header">
        <div class="tony-avatar">🤖</div>
        <div>
          <div style="font-weight:700;font-size:14px;">Tony — Assistente Hotel</div>
          <div style="font-size:11px;color:#64748b;">AI operativa · conosce la tua struttura</div>
        </div>
        <button id="tony-memoria-btn" style="margin-left:auto;background:#f1f5f9;border:none;padding:6px 12px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:600;">🧠 Memoria</button>
      </div>
      <div class="tony-msgs" id="tony-msgs">
        <div class="tony-msg tony" id="tony-benvenuto">⏳ Caricamento contesto...</div>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;" id="tony-suggerimenti"></div>
      <div class="tony-input-wrap">
        <input class="tony-input" id="tony-input" placeholder="Chiedi qualcosa..." />
        <button class="tony-send" id="tony-send">➤</button>
      </div>
    </div>

    <!-- BACHECA STAFF -->
    <div class="bacheca-wrap">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px;">
        <div>
          <div style="font-size:15px;font-weight:700;">📌 Bacheca staff</div>
          <div style="font-size:12px;color:#64748b;">Comunicazioni operative del team</div>
        </div>
        <div style="display:flex;gap:8px;">
          <a href="https://social.ristoflow-ai.com?a=${aziendaId}" target="_blank"
            style="background:#f0f9ff;color:#0E5A7A;border:1px solid #bae6fd;padding:7px 14px;border-radius:8px;text-decoration:none;font-size:12px;font-weight:600;">
            🌐 Bacheca pubblica
          </a>
          <button id="btn-nuovo-post" style="background:#0E5A7A;color:white;border:none;padding:7px 14px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:600;">+ Post</button>
        </div>
      </div>
      <div id="bacheca-posts"><div style="color:#94a3b8;font-size:13px;">Caricamento...</div></div>
      <!-- FORM NUOVO POST -->
      <div id="form-post-wrap" style="display:none;background:#f8fafc;border-radius:12px;padding:14px;margin-top:12px;">
        <div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap;">
          ${['📋 Operativo','🔧 Manutenzione','☕ Colazione','🛏️ Camere','⚠️ Urgente'].map(t=>`
            <button class="tag-btn" data-tag="${t}" style="background:white;border:1px solid #e5e7eb;padding:5px 12px;border-radius:20px;cursor:pointer;font-size:12px;font-weight:600;">${t}</button>
          `).join('')}
        </div>
        <textarea id="post-testo" placeholder="Scrivi un messaggio per il team..." style="width:100%;border:1px solid #e5e7eb;border-radius:10px;padding:10px;font-size:13px;resize:none;box-sizing:border-box;" rows="3"></textarea>
        <div style="display:flex;gap:8px;margin-top:8px;">
          <button id="btn-invia-post" style="background:#0E5A7A;color:white;border:none;padding:8px 18px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:700;">Invia</button>
          <button id="btn-annulla-post" style="background:#f1f5f9;border:none;padding:8px 14px;border-radius:8px;cursor:pointer;font-size:13px;">Annulla</button>
        </div>
      </div>
    </div>

    <!-- ARRIVI E PARTENZE -->
    <div class="home-grid">
      <div class="card">
        <div class="card-title">🛬 Arrivi oggi</div>
        <div id="lista-arrivi"><p class="text-muted text-small">Caricamento...</p></div>
      </div>
      <div class="card">
        <div class="card-title">🛫 Partenze oggi</div>
        <div id="lista-partenze"><p class="text-muted text-small">Caricamento...</p></div>
      </div>
    </div>

    <!-- IN CASA -->
    <div class="card" style="margin-bottom:16px;">
      <div class="card-title">🏠 Ospiti in casa</div>
      <div id="lista-incasa"><p class="text-muted text-small">Caricamento...</p></div>
    </div>

    <!-- BOTTONE NUOVA PRENOTAZIONE -->
    <div style="text-align:right;margin-bottom:24px;">
      <button class="btn btn-primary" id="btn-nuova-pren">+ Nuova prenotazione</button>
    </div>
  `;

  container.querySelector("#btn-nuova-pren").onclick = () => {
    window.location.hash = "#/hotel-prenotazioni?new=1";
  };

  // Carica tutto in parallelo
  await Promise.all([
    caricaMeteo(az),
    caricaDashboard(aziendaId),
    caricaTony(aziendaId),
    caricaBacheca(aziendaId),
  ]);

  // Tony bindings
  initTony(aziendaId);
  initBacheca(aziendaId);
}

// ════════════════════════════════════════════════════════════════
// METEO
// ════════════════════════════════════════════════════════════════
async function caricaMeteo(az) {
  try {
    // Usa coordinate dell'azienda o default Italia
    const lat = az?.lat || 39.3;
    const lon = az?.lon || 16.2;
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weathercode,windspeed_10m&timezone=Europe/Rome`
    );
    const data = await res.json();
    const temp = Math.round(data.current?.temperature_2m);
    const code = data.current?.weathercode;
    const wind = Math.round(data.current?.windspeed_10m);
    const icona = meteoIcona(code);
    const desc  = meteoDescrizione(code);
    document.getElementById('meteo-testo').innerHTML =
      `<strong>${temp}°C</strong> · ${desc} · 💨 ${wind} km/h`;
    document.querySelector('.hero-meteo span').textContent = icona;
  } catch {
    document.getElementById('meteo-testo').textContent = 'Meteo non disponibile';
  }
}

function meteoIcona(code) {
  if (code === 0) return '☀️';
  if (code <= 2) return '⛅';
  if (code <= 3) return '☁️';
  if (code <= 48) return '🌫️';
  if (code <= 57) return '🌧️';
  if (code <= 67) return '🌨️';
  if (code <= 77) return '❄️';
  if (code <= 82) return '🌧️';
  if (code <= 86) return '🌨️';
  if (code <= 99) return '⛈️';
  return '🌤️';
}

function meteoDescrizione(code) {
  if (code === 0) return 'Sereno';
  if (code <= 2) return 'Parzialmente nuvoloso';
  if (code <= 3) return 'Nuvoloso';
  if (code <= 48) return 'Nebbia';
  if (code <= 57) return 'Pioggia leggera';
  if (code <= 67) return 'Pioggia';
  if (code <= 77) return 'Neve';
  if (code <= 82) return 'Rovesci';
  if (code <= 99) return 'Temporale';
  return 'Variabile';
}

// ════════════════════════════════════════════════════════════════
// DASHBOARD KPI
// ════════════════════════════════════════════════════════════════
async function caricaDashboard(aziendaId) {
  const oggi = new Date().toISOString().split("T")[0];
  const inizioMese = oggi.substring(0, 7) + "-01";

  const [
    { data: camere },
    { data: arrivi },
    { data: partenze },
    { data: inCasa },
    { data: revenueMese },
    { data: taskOggi },
  ] = await Promise.all([
    supabase.from("hotel_camere").select("id").eq("azienda_id", aziendaId).eq("attiva", true),
    supabase.from("hotel_prenotazioni")
      .select("id, ospite_nome, ospite_cognome, camera_id, adulti, bambini, ora_checkin_prevista, stato_pagamento, hotel_camere(nome)")
      .eq("azienda_id", aziendaId).eq("data_checkin", oggi).in("stato", ["confermata", "checkin"]),
    supabase.from("hotel_prenotazioni")
      .select("id, ospite_nome, ospite_cognome, camera_id, adulti, ora_checkout_prevista, stato_pagamento, hotel_camere(nome)")
      .eq("azienda_id", aziendaId).eq("data_checkout", oggi).eq("stato", "checkin"),
    supabase.from("hotel_prenotazioni")
      .select("id, ospite_nome, ospite_cognome, camera_id, data_checkin, data_checkout, adulti, hotel_camere(nome)")
      .eq("azienda_id", aziendaId).eq("stato", "checkin").lt("data_checkin", oggi).gt("data_checkout", oggi),
    supabase.from("hotel_prenotazioni")
      .select("prezzo_totale").eq("azienda_id", aziendaId)
      .in("stato", ["checkin", "checkout"]).gte("data_checkin", inizioMese),
    supabase.from("hotel_operations_task")
      .select("id, stato").eq("azienda_id", aziendaId).eq("data", oggi),
  ]);

  const nCamere   = camere?.length || 0;
  const nOccupate = (inCasa?.length || 0) + (arrivi?.length || 0);
  const occPerc   = nCamere > 0 ? Math.round((nOccupate / nCamere) * 100) : 0;
  const taskDaFare = (taskOggi||[]).filter(t => t.stato !== 'fatto' && t.stato !== 'saltato').length;

  // KPI hero
  document.getElementById('k-arrivi').textContent   = arrivi?.length || 0;
  document.getElementById('k-partenze').textContent = partenze?.length || 0;
  document.getElementById('k-incasa').textContent   = inCasa?.length || 0;
  document.getElementById('k-task').textContent     = taskDaFare > 0 ? `${taskDaFare} ⚠️` : '✅';
  document.getElementById('k-occ').textContent      = occPerc + '%';

  // Liste
  renderLista("lista-arrivi", arrivi, (p) => `
    <div class="checkin-card">
      <div>
        <div style="font-weight:700;">${p.ospite_nome} ${p.ospite_cognome || ''}</div>
        <div class="text-muted text-small">📍 ${p.hotel_camere?.nome || "—"} · 👥 ${p.adulti} adulti${p.bambini > 0 ? ` + ${p.bambini} bambini` : ""} · 🕐 ${p.ora_checkin_prevista || "14:00"}</div>
      </div>
      <div style="display:flex;gap:6px;align-items:center;">
        ${badgePagamento(p.stato_pagamento)}
        <button class="btn btn-primary btn-sm" onclick="window.location.hash='#/hotel-checkin?id=${p.id}'">Check-in</button>
      </div>
    </div>
  `);

  renderLista("lista-partenze", partenze, (p) => `
    <div class="checkin-card">
      <div>
        <div style="font-weight:700;">${p.ospite_nome} ${p.ospite_cognome || ''}</div>
        <div class="text-muted text-small">📍 ${p.hotel_camere?.nome || "—"} · 🕐 ${p.ora_checkout_prevista || "11:00"}</div>
      </div>
      <div style="display:flex;gap:6px;align-items:center;">
        ${badgePagamento(p.stato_pagamento)}
        <button class="btn btn-accent btn-sm" onclick="window.location.hash='#/hotel-checkin?id=${p.id}&checkout=1'">Check-out</button>
      </div>
    </div>
  `);

  renderLista("lista-incasa", inCasa, (p) => {
    const notti = Math.round((new Date(p.data_checkout) - new Date(p.data_checkin)) / 864e5);
    const rimanenti = Math.round((new Date(p.data_checkout) - new Date()) / 864e5);
    return `
    <div class="checkin-card">
      <div>
        <div style="font-weight:700;">${p.ospite_nome} ${p.ospite_cognome || ''}</div>
        <div class="text-muted text-small">📍 ${p.hotel_camere?.nome || "—"} · 👥 ${p.adulti} adulti · 📅 ${notti} notti (${rimanenti} rimanenti)</div>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="window.location.hash='#/hotel-prenotazioni?id=${p.id}'">Dettaglio</button>
    </div>
  `});
}

// ════════════════════════════════════════════════════════════════
// TONY AI HOTEL
// ════════════════════════════════════════════════════════════════
let tonyContesto = '';
let tonyHistory  = [];

async function caricaTony(aziendaId) {
  const oggi = new Date().toISOString().split('T')[0];

  // Carica contesto dinamico in parallelo
  const [
    { data: prenotazioni },
    { data: task },
    { data: memoria },
    { data: kb },
  ] = await Promise.all([
    supabase.from('hotel_prenotazioni').select('ospite_nome,ospite_cognome,data_checkin,data_checkout,stato,hotel_camere(nome),adulti,bambini,note_ospite')
      .eq('azienda_id', aziendaId).not('stato','in','(cancellata,noshow)')
      .gte('data_checkout', oggi).lte('data_checkin', new Date(new Date(oggi).getTime()+7*864e5).toISOString().split('T')[0]),
    supabase.from('hotel_operations_task').select('nome,tipo,stato,priorita,camera_numero,assegnato_nome')
      .eq('azienda_id', aziendaId).eq('data', oggi),
    supabase.from('tony_memoria').select('contenuto,categoria').eq('azienda_id', aziendaId).order('created_at', {ascending:false}).limit(10),
    supabase.from('tony_knowledge_base').select('titolo,contenuto').in('categoria',['piattaforma','hotel']).limit(20),
  ]);

  const oggi_pren    = (prenotazioni||[]).filter(p => p.data_checkin === oggi);
  const checkout_pren= (prenotazioni||[]).filter(p => p.data_checkout === oggi);
  const in_casa      = (prenotazioni||[]).filter(p => p.data_checkin < oggi && p.data_checkout > oggi);
  const task_da_fare = (task||[]).filter(t => t.stato === 'da_fare');
  const task_fatti   = (task||[]).filter(t => t.stato === 'fatto');

  tonyContesto = `
Sei Tony, l'assistente AI operativo di ${window.state.azienda?.nome || 'questo hotel'}.
Oggi è ${new Date().toLocaleDateString('it-IT', {weekday:'long',day:'numeric',month:'long',year:'numeric'})}.

SITUAZIONE DI OGGI:
- Arrivi: ${oggi_pren.length} (${oggi_pren.map(p=>`${p.ospite_nome} ${p.ospite_cognome||''} - ${p.hotel_camere?.nome||'?'}`).join(', ') || 'nessuno'})
- Partenze: ${checkout_pren.length} (${checkout_pren.map(p=>`${p.ospite_nome} ${p.ospite_cognome||''}`).join(', ') || 'nessuno'})
- In casa: ${in_casa.length} ospiti
- Task operativi: ${task_da_fare.length} da fare, ${task_fatti.length} completati
${task_da_fare.length > 0 ? '- Task in sospeso: ' + task_da_fare.map(t=>`${t.nome} (${t.camera_numero||'generale'}, ${t.assegnato_nome||'non assegnato'})`).join('; ') : ''}

PROSSIMI 7 GIORNI:
${(prenotazioni||[]).filter(p=>p.data_checkin>oggi).slice(0,5).map(p=>`- ${p.data_checkin}: ${p.ospite_nome} ${p.ospite_cognome||''} (${p.hotel_camere?.nome||'?'}, ${p.adulti} adulti)`).join('\n') || '- Nessuna prenotazione futura nei prossimi 7 giorni'}

${memoria?.length ? 'MEMORIA (note dell\'admin):\n' + memoria.map(m=>`- ${m.contenuto}`).join('\n') : ''}

${kb?.length ? 'CONOSCENZE HOTEL:\n' + kb.slice(0,5).map(k=>`- ${k.titolo}: ${k.contenuto?.substring(0,100)}`).join('\n') : ''}

Rispondi sempre in italiano, in modo conciso e operativo. Suggerisci azioni concrete quando utile.
  `.trim();

  // Messaggio di benvenuto contestuale
  let benvenuto = '👋 Ciao! Sono Tony, il tuo assistente operativo.';
  if (oggi_pren.length > 0 || checkout_pren.length > 0 || task_da_fare.length > 0) {
    const parti = [];
    if (oggi_pren.length)    parti.push(`${oggi_pren.length} arriv${oggi_pren.length===1?'o':'i'}`);
    if (checkout_pren.length) parti.push(`${checkout_pren.length} partenz${checkout_pren.length===1?'a':'e'}`);
    if (task_da_fare.length)  parti.push(`${task_da_fare.length} task da completare`);
    benvenuto = `👋 Oggi hai ${parti.join(', ')}. Come posso aiutarti?`;
  } else {
    benvenuto = '👋 Tutto tranquillo oggi! Nessun arrivo, partenza o task in sospeso. Come posso aiutarti?';
  }

  document.getElementById('tony-benvenuto').textContent = benvenuto;

  // Suggerimenti rapidi contestuali
  const sugg = [];
  if (oggi_pren.length)     sugg.push('Chi arriva oggi?');
  if (checkout_pren.length) sugg.push('Chi parte oggi?');
  if (task_da_fare.length)  sugg.push('Task in sospeso');
  sugg.push('Occupazione settimana');
  sugg.push('Suggerimenti operativi');

  document.getElementById('tony-suggerimenti').innerHTML = sugg.slice(0,4).map(s => `
    <button class="tony-sugg" data-sugg="${s}" style="background:#f0f9ff;color:#0E5A7A;border:1px solid #bae6fd;padding:5px 12px;border-radius:20px;cursor:pointer;font-size:12px;font-weight:600;">${s}</button>
  `).join('');
}

function initTony(aziendaId) {
  const input  = document.getElementById('tony-input');
  const send   = document.getElementById('tony-send');
  const msgs   = document.getElementById('tony-msgs');
  const memBtn = document.getElementById('tony-memoria-btn');

  async function invia(testo) {
    if (!testo.trim()) return;
    input.value = '';

    // Messaggio utente
    tonyHistory.push({ role:'user', content: testo });
    aggiungiMessaggio(testo, 'user');

    // Indicatore caricamento
    const loadId = 'tony-load-' + Date.now();
    msgs.innerHTML += `<div class="tony-msg tony" id="${loadId}">⏳</div>`;
    msgs.scrollTop = msgs.scrollHeight;

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 600,
          system: tonyContesto,
          messages: tonyHistory,
        })
      });
      const data = await res.json();
      const risposta = data.content?.[0]?.text || 'Scusa, non ho capito.';
      tonyHistory.push({ role:'assistant', content: risposta });

      document.getElementById(loadId)?.remove();
      aggiungiMessaggio(risposta, 'tony');

      // Salva in memoria se contiene parole chiave
      const trigger = ['ricorda', 'tieni a mente', 'nota che', 'importante:', 'memo:'];
      if (trigger.some(t => testo.toLowerCase().includes(t))) {
        await supabase.from('tony_memoria').insert({
          azienda_id: aziendaId,
          contenuto:  testo,
          categoria:  'hotel',
          fonte:      'chat',
        });
      }
    } catch(e) {
      document.getElementById(loadId)?.remove();
      aggiungiMessaggio('Errore di connessione. Riprova.', 'tony');
    }
  }

  function aggiungiMessaggio(testo, tipo) {
    const msgs = document.getElementById('tony-msgs');
    const div = document.createElement('div');
    div.className = `tony-msg ${tipo}`;
    div.textContent = testo;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }

  send.onclick  = () => invia(input.value);
  input.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); invia(input.value); } };

  // Suggerimenti
  document.getElementById('tony-suggerimenti')?.addEventListener('click', e => {
    const btn = e.target.closest('.tony-sugg');
    if (btn) invia(btn.dataset.sugg);
  });

  // Memoria
  memBtn.onclick = async () => {
    const { data: memoria } = await supabase.from('tony_memoria')
      .select('*').eq('azienda_id', aziendaId)
      .order('created_at', {ascending:false}).limit(20);

    document.getElementById('tony-modal-mem')?.remove();
    const modal = document.createElement('div');
    modal.id = 'tony-modal-mem';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;';
    modal.innerHTML = `
      <div style="background:white;border-radius:16px;padding:24px;width:100%;max-width:480px;max-height:80vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.3);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <div style="font-size:16px;font-weight:800;">🧠 Memoria Tony Hotel</div>
          <button id="chiudi-mem" style="background:#f1f5f9;border:none;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:16px;">✕</button>
        </div>
        ${!(memoria?.length) ? '<div style="color:#94a3b8;font-size:13px;">Nessuna memoria salvata. Di\' a Tony "ricorda che..." per salvare.</div>' :
          memoria.map(m => `
            <div style="background:#f8fafc;border-radius:10px;padding:10px 14px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
              <div>
                <div style="font-size:13px;">${esc(m.contenuto)}</div>
                <div style="font-size:11px;color:#94a3b8;margin-top:3px;">${new Date(m.created_at).toLocaleDateString('it-IT')}</div>
              </div>
              <button data-del-mem="${m.id}" style="background:#fee2e2;border:none;width:24px;height:24px;border-radius:6px;cursor:pointer;font-size:11px;color:#dc2626;flex-shrink:0;">✕</button>
            </div>
          `).join('')
        }
      </div>
    `;
    document.body.appendChild(modal);
    modal.onclick = e => { if(e.target===modal) modal.remove(); };
    modal.querySelector('#chiudi-mem').onclick = () => modal.remove();
    modal.querySelectorAll('[data-del-mem]').forEach(btn => {
      btn.onclick = async () => {
        await supabase.from('tony_memoria').delete().eq('id', btn.dataset.delMem);
        btn.closest('div[style]').remove();
      };
    });
  };
}

// ════════════════════════════════════════════════════════════════
// BACHECA STAFF
// ════════════════════════════════════════════════════════════════
async function caricaBacheca(aziendaId) {
  const { data: posts } = await supabase
    .from('hotel_bacheca')
    .select('*, dipendenti(nome,cognome,foto_url)')
    .eq('azienda_id', aziendaId)
    .order('created_at', { ascending: false })
    .limit(10);

  const box = document.getElementById('bacheca-posts');
  if (!posts?.length) {
    box.innerHTML = '<div style="color:#94a3b8;font-size:13px;">Nessun post. Scrivi il primo messaggio al team!</div>';
    return;
  }

  box.innerHTML = posts.map(p => `
    <div class="post-card">
      <div class="post-autore">
        ${p.dipendenti?.foto_url ? `<img src="${p.dipendenti.foto_url}" style="width:20px;height:20px;border-radius:50%;object-fit:cover;vertical-align:middle;margin-right:4px;">` : ''}
        ${esc(p.dipendenti?.nome||'Staff')} ${esc(p.dipendenti?.cognome||'')}
        ${p.tag ? `<span class="post-tag">${esc(p.tag)}</span>` : ''}
      </div>
      <div class="post-testo">${esc(p.testo)}</div>
      <div class="post-meta">${new Date(p.created_at).toLocaleString('it-IT', {day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</div>
    </div>
  `).join('');
}

function initBacheca(aziendaId) {
  const btnNuovo  = document.getElementById('btn-nuovo-post');
  const formWrap  = document.getElementById('form-post-wrap');
  const btnInvia  = document.getElementById('btn-invia-post');
  const btnAnnulla= document.getElementById('btn-annulla-post');
  let tagSelezionato = '';

  btnNuovo.onclick  = () => { formWrap.style.display = formWrap.style.display==='none'?'':'none'; };
  btnAnnulla.onclick= () => { formWrap.style.display='none'; };

  // Selezione tag
  formWrap.querySelectorAll('.tag-btn').forEach(btn => {
    btn.onclick = () => {
      formWrap.querySelectorAll('.tag-btn').forEach(b => { b.style.background='white'; b.style.borderColor='#e5e7eb'; });
      btn.style.background = '#f0f9ff'; btn.style.borderColor = '#0E5A7A';
      tagSelezionato = btn.dataset.tag;
    };
  });

  btnInvia.onclick = async () => {
    const testo = document.getElementById('post-testo').value.trim();
    if (!testo) return;

    // Recupera dipendente loggato
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    const { data: dip } = userId ? await supabase.from('dipendenti')
      .select('id').eq('user_id', userId).eq('azienda_id', aziendaId).maybeSingle() : { data: null };

    const { error } = await supabase.from('hotel_bacheca').insert({
      azienda_id:   aziendaId,
      dipendente_id: dip?.id || null,
      testo,
      tag:          tagSelezionato || null,
      pubblica:     true,
    });

    if (error) { alert('Errore: ' + error.message); return; }
    document.getElementById('post-testo').value = '';
    tagSelezionato = '';
    formWrap.style.display = 'none';
    await caricaBacheca(aziendaId);
  };
}

// ════════════════════════════════════════════════════════════════
// UTILS
// ════════════════════════════════════════════════════════════════
function renderLista(id, items, template) {
  const el = document.getElementById(id);
  if (!items?.length) { el.innerHTML = `<p class="text-muted text-small" style="padding:8px 0;">Nessuno</p>`; return; }
  el.innerHTML = items.map(template).join("");
}

function badgePagamento(stato) {
  const map = { non_pagato:["badge-red","Non pagato"], acconto:["badge-yellow","Acconto"], saldato:["badge-green","Saldato"] };
  const [cls, label] = map[stato] || ["badge-gray", stato || "—"];
  return `<span class="badge ${cls}">${label}</span>`;
}

function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }

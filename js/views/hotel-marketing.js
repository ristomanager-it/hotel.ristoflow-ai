import { supabase } from "../supabaseClient.js";

export async function render(container) {
  const az = window.state.azienda;

  container.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">📣 Marketing</div>
        <div class="page-sub">Analisi canali, occupazione e strategie di vendita</div>
      </div>
    </div>

    <div id="mkt-content"><p class="text-muted">Caricamento...</p></div>
  `;

  await caricaMarketing(az.id, container);
}

async function caricaMarketing(aziendaId, container) {
  const oggi = new Date();
  const inizioAnno = `${oggi.getFullYear()}-01-01`;
  const inizioMese = `${oggi.getFullYear()}-${String(oggi.getMonth()+1).padStart(2,"0")}-01`;

  const { data: prenotazioni } = await supabase
    .from("hotel_prenotazioni")
    .select("canale, stato, prezzo_totale, data_checkin, data_checkout, notti, ota_commissione")
    .eq("azienda_id", aziendaId)
    .not("stato", "in", "(cancellata,noshow)")
    .gte("data_checkin", inizioAnno);

  const pren = prenotazioni || [];

  // ── Analisi per canale ──
  const canali = {};
  pren.forEach(p => {
    const c = p.canale || "diretto";
    if (!canali[c]) canali[c] = { count: 0, revenue: 0, commissioni: 0, notti: 0 };
    canali[c].count++;
    canali[c].revenue    += p.prezzo_totale || 0;
    canali[c].commissioni+= p.ota_commissione || 0;
    canali[c].notti      += p.notti || 0;
  });

  const totaleRevenue = Object.values(canali).reduce((s,c) => s + c.revenue, 0);
  const totaleCount   = Object.values(canali).reduce((s,c) => s + c.count, 0);

  // ── Mese corrente ──
  const prenMese = pren.filter(p => p.data_checkin >= inizioMese);
  const revenueMese = prenMese.reduce((s,p) => s + (p.prezzo_totale||0), 0);

  // ── Revenue per mese (ultimi 6 mesi) ──
  const mesiData = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(oggi.getFullYear(), oggi.getMonth() - i, 1);
    const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
    mesiData[k] = { label: d.toLocaleDateString("it-IT",{month:"short",year:"2-digit"}), revenue: 0, count: 0 };
  }
  pren.forEach(p => {
    const k = p.data_checkin?.substring(0,7);
    if (mesiData[k]) {
      mesiData[k].revenue += p.prezzo_totale || 0;
      mesiData[k].count++;
    }
  });

  const maxRevenueMese = Math.max(...Object.values(mesiData).map(m => m.revenue), 1);

  const el = container.querySelector("#mkt-content");

  el.innerHTML = `
    <!-- KPI principali -->
    <div class="stat-grid" style="margin-bottom:20px;">
      <div class="stat-card">
        <div class="stat-label">Revenue anno</div>
        <div class="stat-value">€ ${Math.round(totaleRevenue).toLocaleString("it-IT")}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Revenue mese</div>
        <div class="stat-value">€ ${Math.round(revenueMese).toLocaleString("it-IT")}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Prenotazioni anno</div>
        <div class="stat-value">${totaleCount}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Valore medio</div>
        <div class="stat-value">€ ${totaleCount > 0 ? Math.round(totaleRevenue/totaleCount) : 0}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Commissioni OTA</div>
        <div class="stat-value" style="color:var(--danger);">€ ${Math.round(Object.values(canali).reduce((s,c)=>s+c.commissioni,0)).toLocaleString("it-IT")}</div>
        <div class="stat-sub">da rientrare sul diretto</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">

      <!-- Canali -->
      <div class="card">
        <div class="card-title">📊 Revenue per canale (anno)</div>
        ${Object.entries(canali).sort((a,b)=>b[1].revenue-a[1].revenue).map(([nome,c]) => {
          const perc = totaleRevenue > 0 ? Math.round(c.revenue/totaleRevenue*100) : 0;
          const colore = coloreCanale(nome);
          const revNetto = c.revenue - c.commissioni;
          return `
          <div style="margin-bottom:14px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
              <span style="font-weight:700;font-size:13px;">${icona(nome)} ${nome}</span>
              <span style="font-size:13px;">
                <strong>€ ${Math.round(c.revenue).toLocaleString("it-IT")}</strong>
                <span class="text-muted"> (${perc}%)</span>
              </span>
            </div>
            <div style="background:var(--bg);border-radius:999px;height:8px;overflow:hidden;">
              <div style="width:${perc}%;height:100%;background:${colore};border-radius:999px;transition:width .5s;"></div>
            </div>
            <div style="display:flex;gap:16px;font-size:11px;color:var(--muted);margin-top:4px;">
              <span>${c.count} prenotazioni</span>
              <span>${c.notti} notti</span>
              ${c.commissioni > 0 ? `<span style="color:var(--danger);">-€${Math.round(c.commissioni)} commissioni</span>` : ""}
              ${c.commissioni > 0 ? `<span style="color:var(--success);">netto € ${Math.round(revNetto)}</span>` : ""}
            </div>
          </div>`;
        }).join("")}
      </div>

      <!-- Trend mensile -->
      <div class="card">
        <div class="card-title">📈 Trend revenue (ultimi 6 mesi)</div>
        <div style="display:flex;align-items:flex-end;gap:8px;height:160px;padding-bottom:8px;">
          ${Object.values(mesiData).map(m => {
            const h = Math.max(4, Math.round((m.revenue / maxRevenueMese) * 140));
            return `
            <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;">
              <div style="font-size:10px;font-weight:700;color:var(--primary);">€${Math.round(m.revenue/1000)}k</div>
              <div style="width:100%;height:${h}px;background:var(--primary);border-radius:6px 6px 0 0;opacity:.85;"></div>
              <div style="font-size:10px;color:var(--muted);text-align:center;">${m.label}</div>
              <div style="font-size:10px;color:var(--muted);">${m.count} pren.</div>
            </div>`;
          }).join("")}
        </div>
      </div>
    </div>

    <!-- Consigli strategici -->
    <div class="card">
      <div class="card-title">💡 Consigli strategici</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;">
        ${generaConsigli(canali, totaleRevenue, totaleCount).map(c => `
          <div style="background:${c.bg};border-radius:12px;padding:14px;">
            <div style="font-size:18px;margin-bottom:6px;">${c.icon}</div>
            <div style="font-weight:700;font-size:13px;margin-bottom:4px;">${c.titolo}</div>
            <div style="font-size:12px;color:var(--muted);line-height:1.5;">${c.testo}</div>
          </div>
        `).join("")}
        <div style="background:#f0fdf4;border-radius:12px;padding:14px;">
          <div style="font-size:18px;margin-bottom:6px;">💬</div>
          <div style="font-weight:700;font-size:13px;margin-bottom:4px;">Messaggia i tuoi ospiti</div>
          <div style="font-size:12px;color:var(--muted);line-height:1.5;">Invia offerte personalizzate agli ospiti passati per aumentare i ritorni.</div>
          <button class="btn btn-success btn-sm" style="margin-top:8px;" onclick="window.location.hash='#/hotel-messaggi'">Vai a Messaggistica →</button>
        </div>
      </div>
    </div>
  `;
}

function generaConsigli(canali, totale, count) {
  const consigli = [];
  const percDiretto = canali.diretto ? Math.round(canali.diretto.revenue / totale * 100) : 0;
  const commissioni = Object.values(canali).reduce((s,c)=>s+c.commissioni,0);

  if (percDiretto < 30) {
    consigli.push({
      icon: "🎯", bg: "#FEF3C7",
      titolo: "Aumenta le prenotazioni dirette",
      testo: `Solo il ${percDiretto}% delle prenotazioni arriva direttamente. Promuovi il tuo sito con offerte esclusive per chi prenota diretto.`
    });
  }
  if (commissioni > 0) {
    consigli.push({
      icon: "💰", bg: "#FEE2E2",
      titolo: `Hai pagato € ${Math.round(commissioni)} di commissioni`,
      testo: "Ogni prenotazione diretta risparmia il 15-20% di commissioni OTA. Considera campagne email e WhatsApp ai clienti abituali."
    });
  }
  if (count > 0) {
    consigli.push({
      icon: "⭐", bg: "#EDE9FE",
      titolo: "Chiedi recensioni post-stay",
      testo: "Invia un messaggio automatico dopo il check-out per raccogliere recensioni Google. Migliorano il ranking e attirano prenotazioni dirette."
    });
  }
  consigli.push({
    icon: "🎁", bg: "#F0FDF4",
    titolo: "Crea pacchetti stagionali",
    testo: "I pacchetti con servizi inclusi (colazione, spa, tour) aumentano il valore medio della prenotazione del 20-35%."
  });

  return consigli;
}

function coloreCanale(c) {
  const m = { diretto:"#1B4F72", booking:"#003580", airbnb:"#FF5A5F", expedia:"#FFC72C", whatsapp:"#25D366", telefono:"#6B7280", walk_in:"#9CA3AF" };
  return m[c] || "#64748B";
}
function icona(c) {
  const m = { diretto:"🏨", booking:"📘", airbnb:"🏠", expedia:"✈️", whatsapp:"💬", telefono:"📞", walk_in:"🚶" };
  return m[c] || "📋";
}

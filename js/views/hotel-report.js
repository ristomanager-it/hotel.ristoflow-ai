// js/visualizzazioni/hotel-report.js
// Report & KPI Hotel — Occupazione, Ricavi, Canali, Ospiti, Minibar

import { supabase } from "../supabaseClient.js";

export async function render(container) {
  const aziendaId = window.state?.azienda?.id;
  if (!aziendaId) { container.innerHTML = '<div class="card">Azienda non selezionata</div>'; return; }

  // ── Periodo default: mese corrente ──────────────────────────
  const oggi = new Date();
  const primoMese = new Date(oggi.getFullYear(), oggi.getMonth(), 1).toISOString().split('T')[0];
  const ultimoMese = new Date(oggi.getFullYear(), oggi.getMonth() + 1, 0).toISOString().split('T')[0];

  let dal  = primoMese;
  let al   = ultimoMese;
  let tabAttivo = 'panoramica';

  container.innerHTML = `
    <div style="padding:16px;max-width:1000px;margin:0 auto;">

      <!-- HEADER -->
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;flex-wrap:wrap;gap:12px;">
        <div>
          <div style="font-size:20px;font-weight:700;color:#0f172a;">📊 Report Hotel</div>
          <div style="font-size:13px;color:#64748b;">KPI, occupazione, ricavi e analisi ospiti</div>
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
          <div style="display:flex;gap:6px;align-items:center;">
            <label style="font-size:12px;font-weight:600;color:#64748b;">Dal</label>
            <input type="date" id="rpt-dal" value="${dal}" style="padding:7px 10px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;">
          </div>
          <div style="display:flex;gap:6px;align-items:center;">
            <label style="font-size:12px;font-weight:600;color:#64748b;">Al</label>
            <input type="date" id="rpt-al" value="${al}" style="padding:7px 10px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;">
          </div>
          <button id="btn-aggiorna" style="background:#0E5A7A;color:white;border:none;padding:8px 16px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;">Aggiorna</button>
          <button id="btn-esporta" style="background:#f1f5f9;color:#374151;border:none;padding:8px 14px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;">⬇️ CSV</button>
        </div>
      </div>

      <!-- SCORCIATOIE PERIODO -->
      <div style="display:flex;gap:6px;margin-bottom:20px;flex-wrap:wrap;">
        ${[
          { label:'Questo mese', id:'mese' },
          { label:'Mese scorso',  id:'mese_prec' },
          { label:'Ultimi 30gg',  id:'30gg' },
          { label:'Ultimi 90gg',  id:'90gg' },
          { label:'Anno corrente',id:'anno' },
        ].map(s => `
          <button data-shortcut="${s.id}" style="background:${s.id==='mese'?'#0E5A7A':'#f1f5f9'};color:${s.id==='mese'?'white':'#374151'};border:none;padding:6px 14px;border-radius:20px;cursor:pointer;font-size:12px;font-weight:600;">${s.label}</button>
        `).join('')}
      </div>

      <!-- TAB NAV -->
      <div style="display:flex;gap:2px;border-bottom:2px solid #e5e7eb;margin-bottom:24px;overflow-x:auto;">
        ${[
          { id:'panoramica', icon:'🏠', label:'Panoramica' },
          { id:'occupazione', icon:'🛏️', label:'Occupazione' },
          { id:'ricavi',      icon:'💶', label:'Ricavi' },
          { id:'canali',      icon:'📡', label:'Canali' },
          { id:'ospiti',      icon:'👥', label:'Ospiti' },
          { id:'minibar',     icon:'🍾', label:'Minibar' },
        ].map(t => `
          <button data-tab="${t.id}" style="
            padding:10px 16px;border:none;background:none;cursor:pointer;
            font-size:13px;font-weight:600;white-space:nowrap;
            color:${t.id==='panoramica'?'#0E5A7A':'#64748b'};
            border-bottom:3px solid ${t.id==='panoramica'?'#0E5A7A':'transparent'};
            margin-bottom:-2px;
          ">${t.icon} ${t.label}</button>
        `).join('')}
      </div>

      <div id="rpt-content">
        <div style="color:#94a3b8;padding:20px;text-align:center;">⏳ Caricamento...</div>
      </div>
    </div>
  `;

  // ── Scorciatoie periodo ──────────────────────────────────────
  container.querySelectorAll('[data-shortcut]').forEach(btn => {
    btn.onclick = () => {
      const n = new Date();
      let d, a;
      switch(btn.dataset.shortcut) {
        case 'mese':
          d = new Date(n.getFullYear(), n.getMonth(), 1);
          a = new Date(n.getFullYear(), n.getMonth()+1, 0);
          break;
        case 'mese_prec':
          d = new Date(n.getFullYear(), n.getMonth()-1, 1);
          a = new Date(n.getFullYear(), n.getMonth(), 0);
          break;
        case '30gg':
          d = new Date(n - 30*864e5); a = n;
          break;
        case '90gg':
          d = new Date(n - 90*864e5); a = n;
          break;
        case 'anno':
          d = new Date(n.getFullYear(), 0, 1);
          a = new Date(n.getFullYear(), 11, 31);
          break;
      }
      dal = d.toISOString().split('T')[0];
      al  = a.toISOString().split('T')[0];
      container.querySelector('#rpt-dal').value = dal;
      container.querySelector('#rpt-al').value  = al;
      container.querySelectorAll('[data-shortcut]').forEach(b => {
        b.style.background = b === btn ? '#0E5A7A' : '#f1f5f9';
        b.style.color      = b === btn ? 'white'   : '#374151';
      });
      aggiornaReport();
    };
  });

  container.querySelector('#btn-aggiorna').onclick = () => {
    dal = container.querySelector('#rpt-dal').value;
    al  = container.querySelector('#rpt-al').value;
    aggiornaReport();
  };

  // ── Switch tab ───────────────────────────────────────────────
  function switchTab(id) {
    tabAttivo = id;
    container.querySelectorAll('[data-tab]').forEach(btn => {
      const att = btn.dataset.tab === id;
      btn.style.color = att ? '#0E5A7A' : '#64748b';
      btn.style.borderBottomColor = att ? '#0E5A7A' : 'transparent';
    });
    aggiornaReport();
  }
  container.querySelectorAll('[data-tab]').forEach(btn => btn.onclick = () => switchTab(btn.dataset.tab));

  // ── Carica dati ──────────────────────────────────────────────
  async function caricaDati() {
    const [{ data: prenotazioni }, { data: camere }, { data: consumi }] = await Promise.all([
      supabase.from('hotel_prenotazioni')
        .select('*')
        .eq('azienda_id', aziendaId)
        .gte('data_checkin', dal)
        .lte('data_checkin', al)
        .order('data_checkin'),
      supabase.from('hotel_camere')
        .select('id, numero, nome, tipo, capacita, prezzo_base')
        .eq('azienda_id', aziendaId),
      supabase.from('hotel_minibar_consumi')
        .select('*, hotel_minibar_prodotti(nome,categoria), hotel_camere(numero)')
        .eq('azienda_id', aziendaId)
        .gte('data_consumo', dal)
        .lte('data_consumo', al),
    ]);
    return { prenotazioni: prenotazioni||[], camere: camere||[], consumi: consumi||[] };
  }

  async function aggiornaReport() {
    const box = container.querySelector('#rpt-content');
    box.innerHTML = '<div style="color:#94a3b8;padding:20px;text-align:center;">⏳ Caricamento...</div>';
    const dati = await caricaDati();
    switch(tabAttivo) {
      case 'panoramica':  renderPanoramica(box, dati); break;
      case 'occupazione': renderOccupazione(box, dati); break;
      case 'ricavi':      renderRicavi(box, dati); break;
      case 'canali':      renderCanali(box, dati); break;
      case 'ospiti':      renderOspiti(box, dati); break;
      case 'minibar':     renderMinibar(box, dati); break;
    }
  }

  // ── Esporta CSV ──────────────────────────────────────────────
  container.querySelector('#btn-esporta').onclick = async () => {
    const { prenotazioni } = await caricaDati();
    const header = ['Data checkin','Data checkout','Ospite','Camera','Notti','Adulti','Bambini','Prezzo totale','Stato pagamento','Canale','Stato'];
    const rows = prenotazioni.map(p => [
      p.data_checkin, p.data_checkout,
      `${p.ospite_nome||''} ${p.ospite_cognome||''}`.trim(),
      p.camera_id||'',
      p.notti||'',
      p.adulti||1, p.bambini||0,
      p.prezzo_totale||0,
      p.stato_pagamento||'',
      p.canale||'',
      p.stato||''
    ]);
    const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `hotel-report-${dal}-${al}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  // ════════════════════════════════════════════════════════════
  // TAB 1 — PANORAMICA
  // ════════════════════════════════════════════════════════════
  function renderPanoramica(box, { prenotazioni, camere, consumi }) {
    const confermate = prenotazioni.filter(p => !['annullata','no_show'].includes(p.stato));
    const ricavoTotale = confermate.reduce((s,p) => s + (Number(p.prezzo_totale)||0), 0);
    const ricavoColazione = confermate.filter(p=>p.colazione_inclusa).reduce((s,p) => s+(Number(p.prezzo_colazione)||0),0);
    const ricavoMinibar = consumi.reduce((s,c) => s+(Number(c.importo)||0), 0);
    const nottiVendute = confermate.reduce((s,p) => s+(Number(p.notti)||0), 0);
    const numCamere = camere.length || 1;
    const giorni = Math.max(1, Math.round((new Date(al) - new Date(dal)) / 864e5) + 1);
    const occupazione = Math.min(100, Math.round((nottiVendute / (numCamere * giorni)) * 100));
    const revPar = ricavoTotale / (numCamere * giorni);
    const adr = nottiVendute > 0 ? ricavoTotale / nottiVendute : 0;
    const annullate = prenotazioni.filter(p=>p.stato==='annullata').length;
    const noShow = prenotazioni.filter(p=>p.stato==='no_show').length;

    box.innerHTML = `
      <!-- KPI PRINCIPALI -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:24px;">
        ${[
          { icon:'🛏️', label:'Prenotazioni',    val:confermate.length,              sub:'nel periodo', color:'#0E5A7A' },
          { icon:'💶', label:'Ricavo totale',    val:'€'+fmt(ricavoTotale),          sub:'camere+colazione', color:'#059669' },
          { icon:'📊', label:'Occupazione',      val:occupazione+'%',                sub:`${nottiVendute} notti vendute`, color:'#7c3aed' },
          { icon:'🏷️', label:'ADR',             val:'€'+fmt(adr),                   sub:'tariffa media giornaliera', color:'#0891b2' },
          { icon:'📈', label:'RevPAR',           val:'€'+fmt(revPar),                sub:'ricavo per camera disponibile', color:'#db2777' },
          { icon:'☕', label:'Ricavo colazione', val:'€'+fmt(ricavoColazione),        sub:'colazioni incluse', color:'#d97706' },
          { icon:'🍾', label:'Ricavo minibar',   val:'€'+fmt(ricavoMinibar),          sub:'consumi periodo', color:'#dc2626' },
          { icon:'❌', label:'Annullate',         val:annullate+(noShow?` (+${noShow} NS)`:''), sub:'cancellazioni', color:'#64748b' },
        ].map(k => `
          <div style="background:white;border:1px solid #e5e7eb;border-radius:14px;padding:16px;">
            <div style="font-size:22px;margin-bottom:6px;">${k.icon}</div>
            <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.04em;">${k.label}</div>
            <div style="font-size:22px;font-weight:800;color:${k.color};margin-top:4px;">${k.val}</div>
            <div style="font-size:11px;color:#94a3b8;margin-top:2px;">${k.sub}</div>
          </div>
        `).join('')}
      </div>

      <!-- BARRA OCCUPAZIONE VISIVA -->
      <div style="background:white;border:1px solid #e5e7eb;border-radius:14px;padding:20px;margin-bottom:16px;">
        <div style="font-size:14px;font-weight:700;margin-bottom:12px;">🏨 Tasso di occupazione</div>
        <div style="background:#f1f5f9;border-radius:999px;height:24px;overflow:hidden;position:relative;">
          <div style="background:${occupazione>=80?'#059669':occupazione>=50?'#0E5A7A':'#f59e0b'};height:100%;width:${occupazione}%;border-radius:999px;transition:width .5s;display:flex;align-items:center;justify-content:center;">
            <span style="color:white;font-size:12px;font-weight:800;">${occupazione}%</span>
          </div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:11px;color:#94a3b8;margin-top:6px;">
          <span>0%</span><span>Obiettivo: 80%</span><span>100%</span>
        </div>
      </div>

      <!-- SPLIT RICAVI -->
      <div style="background:white;border:1px solid #e5e7eb;border-radius:14px;padding:20px;margin-bottom:16px;">
        <div style="font-size:14px;font-weight:700;margin-bottom:14px;">💶 Composizione ricavi</div>
        ${buildBarChart([
          { label:'Camere',    val:ricavoTotale - ricavoColazione, color:'#0E5A7A' },
          { label:'Colazione', val:ricavoColazione,                color:'#d97706' },
          { label:'Minibar',   val:ricavoMinibar,                  color:'#7c3aed' },
        ])}
      </div>

      <!-- PRENOTAZIONI PER STATO -->
      <div style="background:white;border:1px solid #e5e7eb;border-radius:14px;padding:20px;">
        <div style="font-size:14px;font-weight:700;margin-bottom:14px;">📋 Prenotazioni per stato</div>
        ${buildBarChart(
          Object.entries(
            prenotazioni.reduce((acc,p) => { acc[p.stato||'?']=(acc[p.stato||'?']||0)+1; return acc; }, {})
          ).map(([stato, n]) => ({ label:statoLabel(stato), val:n, color:statoColor(stato) }))
        )}
      </div>
    `;
  }

  // ════════════════════════════════════════════════════════════
  // TAB 2 — OCCUPAZIONE
  // ════════════════════════════════════════════════════════════
  function renderOccupazione(box, { prenotazioni, camere }) {
    const confermate = prenotazioni.filter(p => !['annullata','no_show'].includes(p.stato));
    const numCamere = camere.length || 1;

    // Raggruppa per settimana
    const perSettimana = {};
    confermate.forEach(p => {
      const d = new Date(p.data_checkin);
      const lunedi = new Date(d);
      lunedi.setDate(d.getDate() - ((d.getDay()+6)%7));
      const key = lunedi.toISOString().split('T')[0];
      if (!perSettimana[key]) perSettimana[key] = { notti:0, pren:0 };
      perSettimana[key].notti += Number(p.notti)||0;
      perSettimana[key].pren++;
    });

    // Occupazione per camera
    const perCamera = {};
    camere.forEach(c => { perCamera[c.id] = { camera:c, notti:0, ricavo:0, pren:0 }; });
    confermate.forEach(p => {
      if (p.camera_id && perCamera[p.camera_id]) {
        perCamera[p.camera_id].notti  += Number(p.notti)||0;
        perCamera[p.camera_id].ricavo += Number(p.prezzo_totale)||0;
        perCamera[p.camera_id].pren++;
      }
    });

    const giorni = Math.max(1, Math.round((new Date(al) - new Date(dal)) / 864e5) + 1);

    box.innerHTML = `
      <div style="background:white;border:1px solid #e5e7eb;border-radius:14px;padding:20px;margin-bottom:16px;">
        <div style="font-size:14px;font-weight:700;margin-bottom:14px;">📅 Occupazione settimanale (notti vendute)</div>
        ${buildBarChart(
          Object.entries(perSettimana)
            .sort(([a],[b]) => a.localeCompare(b))
            .map(([k,v]) => ({ label:'Sett. '+formatDataBreve(k), val:v.notti, color:'#0E5A7A' }))
        )}
      </div>

      <div style="background:white;border:1px solid #e5e7eb;border-radius:14px;padding:20px;margin-bottom:16px;">
        <div style="font-size:14px;font-weight:700;margin-bottom:14px;">🛏️ Performance per camera</div>
        <div style="overflow-x:auto;">
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <thead>
              <tr style="background:#f8fafc;">
                <th style="padding:10px 12px;text-align:left;font-weight:700;color:#374151;border-bottom:1px solid #e5e7eb;">Camera</th>
                <th style="padding:10px 12px;text-align:right;font-weight:700;color:#374151;border-bottom:1px solid #e5e7eb;">Prenotazioni</th>
                <th style="padding:10px 12px;text-align:right;font-weight:700;color:#374151;border-bottom:1px solid #e5e7eb;">Notti</th>
                <th style="padding:10px 12px;text-align:right;font-weight:700;color:#374151;border-bottom:1px solid #e5e7eb;">Occupazione</th>
                <th style="padding:10px 12px;text-align:right;font-weight:700;color:#374151;border-bottom:1px solid #e5e7eb;">Ricavo</th>
                <th style="padding:10px 12px;text-align:right;font-weight:700;color:#374151;border-bottom:1px solid #e5e7eb;">ADR</th>
              </tr>
            </thead>
            <tbody>
              ${Object.values(perCamera).sort((a,b)=>b.notti-a.notti).map(r => {
                const occ = Math.min(100, Math.round((r.notti / giorni) * 100));
                const adr = r.notti > 0 ? r.ricavo / r.notti : 0;
                return `
                  <tr style="border-bottom:1px solid #f1f5f9;">
                    <td style="padding:10px 12px;font-weight:600;">${esc(r.camera.numero||r.camera.nome||'—')} <span style="font-size:11px;color:#94a3b8;">${esc(r.camera.tipo||'')}</span></td>
                    <td style="padding:10px 12px;text-align:right;">${r.pren}</td>
                    <td style="padding:10px 12px;text-align:right;">${r.notti}</td>
                    <td style="padding:10px 12px;text-align:right;">
                      <div style="display:flex;align-items:center;justify-content:flex-end;gap:8px;">
                        <div style="width:60px;background:#f1f5f9;border-radius:999px;height:6px;">
                          <div style="background:${occ>=70?'#059669':'#0E5A7A'};width:${occ}%;height:100%;border-radius:999px;"></div>
                        </div>
                        <span style="font-weight:700;color:${occ>=70?'#059669':'#374151'}">${occ}%</span>
                      </div>
                    </td>
                    <td style="padding:10px 12px;text-align:right;font-weight:700;color:#059669;">€${fmt(r.ricavo)}</td>
                    <td style="padding:10px 12px;text-align:right;color:#0E5A7A;font-weight:600;">€${fmt(adr)}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- DURATA MEDIA SOGGIORNO -->
      <div style="background:white;border:1px solid #e5e7eb;border-radius:14px;padding:20px;">
        <div style="font-size:14px;font-weight:700;margin-bottom:14px;">🌙 Distribuzione durata soggiorno</div>
        ${buildBarChart(
          Object.entries(
            confermate.reduce((acc,p) => {
              const n = Number(p.notti)||1;
              const k = n===1?'1 notte':n<=3?'2-3 notti':n<=7?'4-7 notti':'8+ notti';
              acc[k]=(acc[k]||0)+1; return acc;
            }, {})
          ).map(([k,v]) => ({ label:k, val:v, color:'#7c3aed' }))
        )}
      </div>
    `;
  }

  // ════════════════════════════════════════════════════════════
  // TAB 3 — RICAVI
  // ════════════════════════════════════════════════════════════
  function renderRicavi(box, { prenotazioni, consumi }) {
    const confermate = prenotazioni.filter(p => !['annullata','no_show'].includes(p.stato));

    // Ricavi per mese
    const perMese = {};
    confermate.forEach(p => {
      const m = (p.data_checkin||'').slice(0,7);
      if (!perMese[m]) perMese[m] = { camere:0, colazione:0, totale:0 };
      perMese[m].camere   += Number(p.prezzo_totale)||0;
      perMese[m].colazione+= Number(p.prezzo_colazione)||0;
      perMese[m].totale   += Number(p.prezzo_totale)||0;
    });

    const ricavoTotale   = confermate.reduce((s,p) => s+(Number(p.prezzo_totale)||0), 0);
    const ricavoColazione= confermate.reduce((s,p) => s+(Number(p.prezzo_colazione)||0), 0);
    const ricavoMinibar  = consumi.reduce((s,c) => s+(Number(c.importo)||0), 0);
    const commissioni    = confermate.reduce((s,p) => s+(Number(p.ota_commissione)||0), 0);
    const sconti         = confermate.reduce((s,p) => s+(Number(p.sconto_importo)||0), 0);
    const ricavoNetto    = ricavoTotale + ricavoMinibar - commissioni;

    // Metodi pagamento
    const perMetodo = {};
    confermate.forEach(p => {
      const m = p.metodo_pagamento||'non specificato';
      perMetodo[m] = (perMetodo[m]||0) + (Number(p.prezzo_totale)||0);
    });

    box.innerHTML = `
      <!-- KPI RICAVI -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:20px;">
        ${[
          { label:'Ricavo lordo',    val:'€'+fmt(ricavoTotale),              color:'#059669' },
          { label:'+ Minibar',       val:'€'+fmt(ricavoMinibar),             color:'#7c3aed' },
          { label:'- Commissioni OTA',val:'−€'+fmt(commissioni),             color:'#dc2626' },
          { label:'- Sconti',        val:'−€'+fmt(sconti),                   color:'#f59e0b' },
          { label:'Ricavo netto',    val:'€'+fmt(ricavoNetto),               color:'#0E5A7A' },
          { label:'Di cui colazione',val:'€'+fmt(ricavoColazione),           color:'#d97706' },
        ].map(k => `
          <div style="background:white;border:1px solid #e5e7eb;border-radius:14px;padding:14px;">
            <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">${k.label}</div>
            <div style="font-size:20px;font-weight:800;color:${k.color};margin-top:6px;">${k.val}</div>
          </div>
        `).join('')}
      </div>

      <!-- RICAVI PER MESE -->
      <div style="background:white;border:1px solid #e5e7eb;border-radius:14px;padding:20px;margin-bottom:16px;">
        <div style="font-size:14px;font-weight:700;margin-bottom:14px;">📅 Ricavi per mese</div>
        ${buildBarChart(
          Object.entries(perMese).sort(([a],[b])=>a.localeCompare(b))
            .map(([m,v]) => ({ label:formatMese(m), val:v.totale, color:'#059669' }))
        , true)}
      </div>

      <!-- METODI PAGAMENTO -->
      <div style="background:white;border:1px solid #e5e7eb;border-radius:14px;padding:20px;margin-bottom:16px;">
        <div style="font-size:14px;font-weight:700;margin-bottom:14px;">💳 Ricavi per metodo di pagamento</div>
        ${buildBarChart(
          Object.entries(perMetodo).map(([m,v]) => ({ label:m, val:v, color:'#0891b2' }))
        , true)}
      </div>

      <!-- TABELLA DETTAGLIO -->
      <div style="background:white;border:1px solid #e5e7eb;border-radius:14px;padding:20px;">
        <div style="font-size:14px;font-weight:700;margin-bottom:14px;">📋 Dettaglio prenotazioni</div>
        <div style="overflow-x:auto;max-height:400px;overflow-y:auto;">
          <table style="width:100%;border-collapse:collapse;font-size:12px;">
            <thead style="position:sticky;top:0;background:#f8fafc;z-index:1;">
              <tr>
                ${['Check-in','Check-out','Ospite','Notti','Prezzo','Colazione','Stato pag.','Canale'].map(h=>`
                  <th style="padding:8px 10px;text-align:left;font-weight:700;color:#374151;border-bottom:1px solid #e5e7eb;white-space:nowrap;">${h}</th>
                `).join('')}
              </tr>
            </thead>
            <tbody>
              ${confermate.map(p => `
                <tr style="border-bottom:1px solid #f1f5f9;">
                  <td style="padding:8px 10px;">${formatDataBreve(p.data_checkin)}</td>
                  <td style="padding:8px 10px;">${formatDataBreve(p.data_checkout)}</td>
                  <td style="padding:8px 10px;font-weight:600;">${esc((p.ospite_nome||'')+(p.ospite_cognome?' '+p.ospite_cognome:''))}</td>
                  <td style="padding:8px 10px;text-align:center;">${p.notti||'—'}</td>
                  <td style="padding:8px 10px;font-weight:700;color:#059669;">€${fmt(p.prezzo_totale)}</td>
                  <td style="padding:8px 10px;">${p.colazione_inclusa?'✅':'—'}</td>
                  <td style="padding:8px 10px;"><span style="background:${pagColor(p.stato_pagamento)};color:white;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700;">${p.stato_pagamento||'—'}</span></td>
                  <td style="padding:8px 10px;color:#64748b;">${p.canale||'—'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // ════════════════════════════════════════════════════════════
  // TAB 4 — CANALI
  // ════════════════════════════════════════════════════════════
  function renderCanali(box, { prenotazioni }) {
    const confermate = prenotazioni.filter(p => !['annullata'].includes(p.stato));

    const perCanale = {};
    confermate.forEach(p => {
      const c = p.canale||'diretto';
      if (!perCanale[c]) perCanale[c] = { pren:0, ricavo:0, commissioni:0, notti:0 };
      perCanale[c].pren++;
      perCanale[c].ricavo      += Number(p.prezzo_totale)||0;
      perCanale[c].commissioni += Number(p.ota_commissione)||0;
      perCanale[c].notti       += Number(p.notti)||0;
    });

    const totPren = Object.values(perCanale).reduce((s,v)=>s+v.pren, 0) || 1;

    box.innerHTML = `
      <div style="background:white;border:1px solid #e5e7eb;border-radius:14px;padding:20px;margin-bottom:16px;">
        <div style="font-size:14px;font-weight:700;margin-bottom:14px;">📡 Prenotazioni per canale</div>
        ${buildBarChart(
          Object.entries(perCanale).sort(([,a],[,b])=>b.pren-a.pren)
            .map(([c,v]) => ({ label:c, val:v.pren, color:canaleColor(c) }))
        )}
      </div>

      <div style="background:white;border:1px solid #e5e7eb;border-radius:14px;padding:20px;margin-bottom:16px;">
        <div style="font-size:14px;font-weight:700;margin-bottom:14px;">💶 Ricavo per canale</div>
        ${buildBarChart(
          Object.entries(perCanale).sort(([,a],[,b])=>b.ricavo-a.ricavo)
            .map(([c,v]) => ({ label:c, val:v.ricavo, color:canaleColor(c) }))
        , true)}
      </div>

      <div style="background:white;border:1px solid #e5e7eb;border-radius:14px;padding:20px;">
        <div style="font-size:14px;font-weight:700;margin-bottom:14px;">📊 Dettaglio canali</div>
        <div style="overflow-x:auto;">
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <thead>
              <tr style="background:#f8fafc;">
                ${['Canale','Prenotazioni','%','Notti','Ricavo lordo','Commissioni','Ricavo netto'].map(h=>`
                  <th style="padding:10px 12px;text-align:${h==='Canale'?'left':'right'};font-weight:700;color:#374151;border-bottom:1px solid #e5e7eb;">${h}</th>
                `).join('')}
              </tr>
            </thead>
            <tbody>
              ${Object.entries(perCanale).sort(([,a],[,b])=>b.pren-a.pren).map(([c,v]) => `
                <tr style="border-bottom:1px solid #f1f5f9;">
                  <td style="padding:10px 12px;font-weight:600;"><span style="display:inline-block;width:10px;height:10px;background:${canaleColor(c)};border-radius:50%;margin-right:6px;"></span>${esc(c)}</td>
                  <td style="padding:10px 12px;text-align:right;">${v.pren}</td>
                  <td style="padding:10px 12px;text-align:right;color:#64748b;">${Math.round(v.pren/totPren*100)}%</td>
                  <td style="padding:10px 12px;text-align:right;">${v.notti}</td>
                  <td style="padding:10px 12px;text-align:right;font-weight:700;">€${fmt(v.ricavo)}</td>
                  <td style="padding:10px 12px;text-align:right;color:#dc2626;">−€${fmt(v.commissioni)}</td>
                  <td style="padding:10px 12px;text-align:right;font-weight:700;color:#059669;">€${fmt(v.ricavo-v.commissioni)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // ════════════════════════════════════════════════════════════
  // TAB 5 — OSPITI
  // ════════════════════════════════════════════════════════════
  function renderOspiti(box, { prenotazioni }) {
    const confermate = prenotazioni.filter(p => !['annullata'].includes(p.stato));

    // Nazioni
    const perNazione = {};
    confermate.forEach(p => {
      const n = p.ospite_nazione||'Non specificata';
      perNazione[n] = (perNazione[n]||0)+1;
    });

    // Ospiti adulti/bambini
    const totAdulti  = confermate.reduce((s,p)=>s+(Number(p.adulti)||1),0);
    const totBambini = confermate.reduce((s,p)=>s+(Number(p.bambini)||0),0);

    // Colazione
    const conColazione = confermate.filter(p=>p.colazione_inclusa).length;

    // Checkin online
    const checkinOnline = confermate.filter(p=>p.checkin_online_completato).length;

    // Repeat guests (stessa email)
    const emailCount = {};
    confermate.forEach(p => { if(p.ospite_email) emailCount[p.ospite_email]=(emailCount[p.ospite_email]||0)+1; });
    const repeatGuests = Object.values(emailCount).filter(c=>c>1).length;

    box.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:20px;">
        ${[
          { icon:'👥', label:'Ospiti totali',    val:totAdulti+totBambini, sub:`${totAdulti} adulti, ${totBambini} bambini` },
          { icon:'☕', label:'Con colazione',     val:conColazione,         sub:`${Math.round(conColazione/(confermate.length||1)*100)}% delle prenotazioni` },
          { icon:'📱', label:'Check-in online',  val:checkinOnline,        sub:`${Math.round(checkinOnline/(confermate.length||1)*100)}% completato` },
          { icon:'🔄', label:'Ospiti abituali',  val:repeatGuests,         sub:'più di 1 prenotazione' },
        ].map(k => `
          <div style="background:white;border:1px solid #e5e7eb;border-radius:14px;padding:16px;">
            <div style="font-size:24px;">${k.icon}</div>
            <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;margin-top:8px;">${k.label}</div>
            <div style="font-size:22px;font-weight:800;color:#0E5A7A;margin-top:4px;">${k.val}</div>
            <div style="font-size:11px;color:#94a3b8;margin-top:2px;">${k.sub}</div>
          </div>
        `).join('')}
      </div>

      <div style="background:white;border:1px solid #e5e7eb;border-radius:14px;padding:20px;margin-bottom:16px;">
        <div style="font-size:14px;font-weight:700;margin-bottom:14px;">🌍 Provenienza ospiti</div>
        ${buildBarChart(
          Object.entries(perNazione).sort(([,a],[,b])=>b-a).slice(0,10)
            .map(([n,v]) => ({ label:n, val:v, color:'#0891b2' }))
        )}
      </div>

      <!-- LISTA OSPITI -->
      <div style="background:white;border:1px solid #e5e7eb;border-radius:14px;padding:20px;">
        <div style="font-size:14px;font-weight:700;margin-bottom:14px;">📋 Lista ospiti periodo</div>
        <div style="overflow-x:auto;max-height:400px;overflow-y:auto;">
          <table style="width:100%;border-collapse:collapse;font-size:12px;">
            <thead style="position:sticky;top:0;background:#f8fafc;z-index:1;">
              <tr>
                ${['Ospite','Email','Telefono','Nazione','Check-in','Notti','Colazione'].map(h=>`
                  <th style="padding:8px 10px;text-align:left;font-weight:700;color:#374151;border-bottom:1px solid #e5e7eb;white-space:nowrap;">${h}</th>
                `).join('')}
              </tr>
            </thead>
            <tbody>
              ${confermate.map(p => `
                <tr style="border-bottom:1px solid #f1f5f9;">
                  <td style="padding:8px 10px;font-weight:600;">${esc((p.ospite_nome||'')+(p.ospite_cognome?' '+p.ospite_cognome:''))}</td>
                  <td style="padding:8px 10px;color:#64748b;">${esc(p.ospite_email||'—')}</td>
                  <td style="padding:8px 10px;color:#64748b;">${esc(p.ospite_telefono||'—')}</td>
                  <td style="padding:8px 10px;">${esc(p.ospite_nazione||'—')}</td>
                  <td style="padding:8px 10px;">${formatDataBreve(p.data_checkin)}</td>
                  <td style="padding:8px 10px;text-align:center;">${p.notti||'—'}</td>
                  <td style="padding:8px 10px;text-align:center;">${p.colazione_inclusa?'✅':'—'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // ════════════════════════════════════════════════════════════
  // TAB 6 — MINIBAR
  // ════════════════════════════════════════════════════════════
  function renderMinibar(box, { consumi }) {
    const totRicavo = consumi.reduce((s,c)=>s+(Number(c.importo)||0),0);

    // Per prodotto
    const perProdotto = {};
    consumi.forEach(c => {
      const n = c.hotel_minibar_prodotti?.nome||'—';
      if (!perProdotto[n]) perProdotto[n] = { qty:0, importo:0, cat:c.hotel_minibar_prodotti?.categoria||'—' };
      perProdotto[n].qty     += Number(c.quantita)||1;
      perProdotto[n].importo += Number(c.importo)||0;
    });

    // Per categoria
    const perCat = {};
    consumi.forEach(c => {
      const cat = c.hotel_minibar_prodotti?.categoria||'Altro';
      perCat[cat] = (perCat[cat]||0) + (Number(c.importo)||0);
    });

    // Per camera
    const perCamera = {};
    consumi.forEach(c => {
      const cam = c.hotel_camere?.numero||'?';
      if (!perCamera[cam]) perCamera[cam] = { qty:0, importo:0 };
      perCamera[cam].qty     += Number(c.quantita)||1;
      perCamera[cam].importo += Number(c.importo)||0;
    });

    box.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:20px;">
        ${[
          { label:'Ricavo minibar',  val:'€'+fmt(totRicavo),          color:'#7c3aed' },
          { label:'Consumi totali',  val:consumi.reduce((s,c)=>s+(Number(c.quantita)||1),0), color:'#0E5A7A' },
          { label:'Prodotti diversi',val:Object.keys(perProdotto).length, color:'#059669' },
          { label:'Camere con consumi',val:Object.keys(perCamera).length, color:'#d97706' },
        ].map(k=>`
          <div style="background:white;border:1px solid #e5e7eb;border-radius:14px;padding:16px;">
            <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">${k.label}</div>
            <div style="font-size:22px;font-weight:800;color:${k.color};margin-top:6px;">${k.val}</div>
          </div>
        `).join('')}
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
        <div style="background:white;border:1px solid #e5e7eb;border-radius:14px;padding:20px;">
          <div style="font-size:14px;font-weight:700;margin-bottom:14px;">🏆 Top prodotti (quantità)</div>
          ${buildBarChart(
            Object.entries(perProdotto).sort(([,a],[,b])=>b.qty-a.qty).slice(0,8)
              .map(([n,v])=>({ label:n, val:v.qty, color:'#7c3aed' }))
          )}
        </div>
        <div style="background:white;border:1px solid #e5e7eb;border-radius:14px;padding:20px;">
          <div style="font-size:14px;font-weight:700;margin-bottom:14px;">💶 Ricavo per categoria</div>
          ${buildBarChart(
            Object.entries(perCat).sort(([,a],[,b])=>b-a)
              .map(([c,v])=>({ label:c, val:v, color:'#0891b2' }))
          , true)}
        </div>
      </div>

      <div style="background:white;border:1px solid #e5e7eb;border-radius:14px;padding:20px;">
        <div style="font-size:14px;font-weight:700;margin-bottom:14px;">🛏️ Consumi per camera</div>
        ${buildBarChart(
          Object.entries(perCamera).sort(([,a],[,b])=>b.importo-a.importo)
            .map(([c,v])=>({ label:'Cam. '+c, val:v.importo, color:'#d97706' }))
        , true)}
      </div>
    `;
  }

  // ════════════════════════════════════════════════════════════
  // COMPONENTI UI
  // ════════════════════════════════════════════════════════════
  function buildBarChart(items, isEuro = false) {
    if (!items.length) return '<div style="color:#94a3b8;font-size:13px;">Nessun dato disponibile.</div>';
    const max = Math.max(...items.map(i=>i.val), 1);
    return items.map(item => `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
        <div style="width:110px;flex-shrink:0;font-size:12px;color:#374151;font-weight:600;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${esc(String(item.label))}">${esc(String(item.label))}</div>
        <div style="flex:1;background:#f1f5f9;border-radius:999px;height:20px;overflow:hidden;">
          <div style="background:${item.color};width:${Math.round(item.val/max*100)}%;height:100%;border-radius:999px;min-width:${item.val>0?'4px':'0'};"></div>
        </div>
        <div style="width:70px;flex-shrink:0;font-size:12px;font-weight:700;color:#374151;">
          ${isEuro ? '€'+fmt(item.val) : item.val}
        </div>
      </div>
    `).join('');
  }

  // ════════════════════════════════════════════════════════════
  // UTILS
  // ════════════════════════════════════════════════════════════
  function fmt(n) { return Number(n||0).toLocaleString('it-IT', {minimumFractionDigits:0, maximumFractionDigits:2}); }
  function formatDataBreve(d) { if(!d) return '—'; const p=d.split('-'); return `${p[2]}/${p[1]}`; }
  function formatMese(m) { if(!m) return '—'; const [y,mo]=m.split('-'); const mesi=['','Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic']; return `${mesi[+mo]} ${y}`; }
  function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }
  function statoLabel(s) { const m={confermata:'Confermata',in_attesa:'In attesa',annullata:'Annullata',no_show:'No show',checkin:'Check-in',checkout:'Check-out'}; return m[s]||s; }
  function statoColor(s) { const m={confermata:'#059669',in_attesa:'#d97706',annullata:'#dc2626',no_show:'#7c3aed',checkin:'#0E5A7A',checkout:'#64748b'}; return m[s]||'#94a3b8'; }
  function pagColor(s) { const m={pagato:'#059669',paid:'#059669',pending:'#d97706',failed:'#dc2626',non_pagato:'#dc2626',non_richiesto:'#94a3b8'}; return m[s]||'#94a3b8'; }
  function canaleColor(c) { const m={diretto:'#0E5A7A','booking.com':'#003580',airbnb:'#FF5A5F',expedia:'#FFD700',telefono:'#059669',email:'#7c3aed',walk_in:'#d97706'}; return m[c?.toLowerCase()]||'#64748b'; }

  // ── Avvio ────────────────────────────────────────────────────
  aggiornaReport();
}

// js/visualizzazioni/hotel-operations.js
// Hotel Operations — Regole, Task giornalieri, Turni, Produttività

import { supabase } from "../supabaseClient.js";

const TIPI = [
  { id:'pulizia',      icon:'🧹', label:'Pulizia'           },
  { id:'biancheria',   icon:'🛏️', label:'Biancheria'        },
  { id:'minibar',      icon:'🍾', label:'Minibar'           },
  { id:'manutenzione', icon:'🔧', label:'Manutenzione'      },
  { id:'colazione',    icon:'☕', label:'Colazione'         },
  { id:'custom',       icon:'📋', label:'Personalizzato'    },
];
const FREQUENZE = [
  { id:'ogni_giorno',   label:'Ogni giorno'         },
  { id:'ogni_N_giorni', label:'Ogni N giorni'        },
  { id:'checkout',      label:'Ad ogni check-out'   },
  { id:'checkin',       label:'Ad ogni check-in'    },
  { id:'settimanale',   label:'Settimanale'         },
];
const PRIORITA = [
  { id:'alta',  label:'Alta',  color:'#dc2626' },
  { id:'media', label:'Media', color:'#d97706' },
  { id:'bassa', label:'Bassa', color:'#64748b' },
];
const RUOLI = ['cameriera','manutentore','receptionist','qualsiasi'];
const GIORNI_SETT = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];

export async function render(container) {
  const aziendaId = window.state?.azienda?.id;
  if (!aziendaId) { container.innerHTML = '<div class="card">Azienda non selezionata</div>'; return; }

  let tabAttivo = 'task';

  container.innerHTML = `
    <div style="padding:16px;max-width:1000px;margin:0 auto;">
      <div style="margin-bottom:20px;">
        <div style="font-size:20px;font-weight:700;color:#0f172a;">⚙️ Operations Hotel</div>
        <div style="font-size:13px;color:#64748b;">Gestione task operativi, turni e produttività</div>
      </div>

      <div style="display:flex;gap:4px;border-bottom:2px solid #e5e7eb;margin-bottom:24px;overflow-x:auto;">
        ${[
          { id:'task',         icon:'📋', label:'Task del giorno'  },
          { id:'regole',       icon:'⚙️', label:'Regole'           },
          { id:'turni',        icon:'👥', label:'Turni'            },
          { id:'produttivita', icon:'📊', label:'Produttività'     },
        ].map(t => `
          <button data-tab="${t.id}" style="
            padding:10px 16px;border:none;background:none;cursor:pointer;
            font-size:13px;font-weight:600;white-space:nowrap;
            color:${t.id==='task'?'#0E5A7A':'#64748b'};
            border-bottom:3px solid ${t.id==='task'?'#0E5A7A':'transparent'};
            margin-bottom:-2px;
          ">${t.icon} ${t.label}</button>
        `).join('')}
      </div>

      <div id="ops-content"></div>
    </div>
  `;

  function switchTab(id) {
    tabAttivo = id;
    container.querySelectorAll('[data-tab]').forEach(btn => {
      const att = btn.dataset.tab === id;
      btn.style.color = att ? '#0E5A7A' : '#64748b';
      btn.style.borderBottomColor = att ? '#0E5A7A' : 'transparent';
    });
    const box = container.querySelector('#ops-content');
    switch(id) {
      case 'task':         renderTabTask(box);         break;
      case 'regole':       renderTabRegole(box);       break;
      case 'turni':        renderTabTurni(box);        break;
      case 'produttivita': renderTabProduttivita(box); break;
    }
  }

  container.querySelectorAll('[data-tab]').forEach(btn => btn.onclick = () => switchTab(btn.dataset.tab));
  switchTab('task');
}

// ════════════════════════════════════════════════════════════════
// TAB 1 — TASK DEL GIORNO
// ════════════════════════════════════════════════════════════════
async function renderTabTask(box) {
  const aziendaId = window.state?.azienda?.id;
  const oggi = new Date().toISOString().split('T')[0];

  box.innerHTML = '<div style="color:#94a3b8;padding:20px;">Caricamento...</div>';

  async function caricaTask(data) {
    const [{ data: tasks }, { data: dipendenti }, { data: camere }] = await Promise.all([
      supabase.from('hotel_operations_task')
        .select('*, dipendenti(nome,cognome,foto_url)')
        .eq('azienda_id', aziendaId)
        .eq('data', data)
        .order('priorita').order('camera_numero'),
      supabase.from('dipendenti')
        .select('id,nome,cognome,ruolo,foto_url,token_operatore,telefono')
        .eq('azienda_id', aziendaId)
        .eq('attivo', true),
      supabase.from('hotel_camere')
        .select('id,nome,tipologia')
        .eq('azienda_id', aziendaId),
    ]);
    return { tasks: tasks||[], dipendenti: dipendenti||[], camere: camere||[] };
  }

  let dataSelezionata = oggi;
  let dati = await caricaTask(dataSelezionata);

  function render({ tasks, dipendenti, camere }) {
    const totale   = tasks.length;
    const daFare   = tasks.filter(t=>t.stato==='da_fare').length;
    const inCorso  = tasks.filter(t=>t.stato==='in_corso').length;
    const fatti    = tasks.filter(t=>t.stato==='fatto').length;
    const saltati  = tasks.filter(t=>t.stato==='saltato').length;
    const minStimati  = tasks.reduce((s,t)=>s+(t.durata_stimata_min||0),0);
    const minEffettivi= tasks.filter(t=>t.durata_effettiva_min).reduce((s,t)=>s+(t.durata_effettiva_min||0),0);

    box.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
        <div style="display:flex;gap:8px;align-items:center;">
          <input type="date" id="task-data" value="${dataSelezionata}" style="padding:7px 10px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;">
          <button id="btn-task-oggi" style="background:#f1f5f9;border:none;padding:8px 14px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:600;">Oggi</button>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button id="btn-genera-task" style="background:#059669;color:white;border:none;padding:9px 16px;border-radius:10px;cursor:pointer;font-size:13px;font-weight:600;">⚡ Genera task automatici</button>
          <button id="btn-nuovo-task" style="background:#0E5A7A;color:white;border:none;padding:9px 16px;border-radius:10px;cursor:pointer;font-size:13px;font-weight:600;">+ Aggiungi task</button>
        </div>
      </div>

      <!-- KPI RAPIDI -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:10px;margin-bottom:20px;">
        ${[
          { label:'Da fare',  val:daFare,  color:'#d97706', bg:'#fffbeb' },
          { label:'In corso', val:inCorso, color:'#0E5A7A', bg:'#f0f9ff' },
          { label:'Fatti',    val:fatti,   color:'#059669', bg:'#f0fdf4' },
          { label:'Saltati',  val:saltati, color:'#dc2626', bg:'#fee2e2' },
          { label:'Ore stimate', val:Math.round(minStimati/60*10)/10+'h', color:'#7c3aed', bg:'#faf5ff' },
        ].map(k=>`
          <div style="background:${k.bg};border-radius:12px;padding:12px;text-align:center;">
            <div style="font-size:22px;font-weight:800;color:${k.color};">${k.val}</div>
            <div style="font-size:11px;color:#64748b;font-weight:600;margin-top:2px;">${k.label}</div>
          </div>
        `).join('')}
      </div>

      <!-- LISTA TASK -->
      <div id="lista-task-oggi">
        ${!tasks.length ? `
          <div style="background:white;border:1px solid #e5e7eb;border-radius:14px;padding:32px;text-align:center;color:#94a3b8;">
            <div style="font-size:32px;margin-bottom:8px;">📋</div>
            <div style="font-weight:600;">Nessun task per il ${formatData(dataSelezionata)}</div>
            <div style="font-size:12px;margin-top:4px;">Clicca "Genera task automatici" per crearli dalle regole</div>
          </div>
        ` : tasks.map(t => renderTaskCard(t, dipendenti)).join('')}
      </div>

      <!-- FORM NUOVO TASK (nascosto) -->
      <div id="form-task-wrap" style="display:none;background:white;border:1px solid #e5e7eb;border-radius:14px;padding:20px;margin-top:16px;">
        ${formTaskHTML(dipendenti, camere, dataSelezionata)}
      </div>
    `;

    // Binding data
    box.querySelector('#task-data').onchange = async function() {
      dataSelezionata = this.value;
      dati = await caricaTask(dataSelezionata);
      render(dati);
    };
    box.querySelector('#btn-task-oggi').onclick = async () => {
      dataSelezionata = oggi;
      box.querySelector('#task-data').value = oggi;
      dati = await caricaTask(oggi);
      render(dati);
    };

    // Genera automatici
    box.querySelector('#btn-genera-task').onclick = async () => {
      const btn = box.querySelector('#btn-genera-task');
      btn.disabled = true; btn.textContent = '⏳ Generazione...';
      await generaTaskAutomatici(aziendaId, dataSelezionata);
      dati = await caricaTask(dataSelezionata);
      render(dati);
    };

    // Nuovo task manuale
    box.querySelector('#btn-nuovo-task').onclick = () => {
      box.querySelector('#form-task-wrap').style.display = '';
      box.querySelector('#form-task-wrap').scrollIntoView({ behavior:'smooth' });
    };
    const btnAnnullaTask = box.querySelector('#btn-annulla-task');
    if (btnAnnullaTask) btnAnnullaTask.onclick = () => {
      box.querySelector('#form-task-wrap').style.display = 'none';
    };
    const btnSalvaTask = box.querySelector('#btn-salva-task');
    if (btnSalvaTask) btnSalvaTask.onclick = () => salvaTask(box, dataSelezionata, dipendenti, camere, async () => {
      dati = await caricaTask(dataSelezionata);
      render(dati);
    });

    // Azioni task
    box.querySelectorAll('[data-task-stato]').forEach(btn => {
      btn.onclick = async () => {
        const id    = btn.dataset.taskId;
        const stato = btn.dataset.taskStato;
        const upd   = { stato };
        if (stato === 'in_corso')  upd.ora_inizio_effettiva = new Date().toISOString();
        if (stato === 'fatto')     upd.ora_fine_effettiva   = new Date().toISOString();
        await supabase.from('hotel_operations_task').update(upd).eq('id', id);
        dati = await caricaTask(dataSelezionata);
        render(dati);
      };
    });

    // Assegna dipendente
    box.querySelectorAll('[data-assegna]').forEach(sel => {
      sel.onchange = async () => {
        const id  = sel.dataset.assegna;
        const dip = dipendenti.find(d=>d.id===sel.value);
        await supabase.from('hotel_operations_task').update({
          assegnato_a:   sel.value || null,
          assegnato_nome: dip ? `${dip.nome} ${dip.cognome||''}`.trim() : null,
        }).eq('id', id);
      };
    });

    // Elimina task
    box.querySelectorAll('[data-del-task]').forEach(btn => {
      btn.onclick = async () => {
        if (!confirm('Eliminare questo task?')) return;
        await supabase.from('hotel_operations_task').delete().eq('id', btn.dataset.delTask);
        dati = await caricaTask(dataSelezionata);
        render(dati);
      };
    });

    // Invia link WhatsApp operatore
    box.querySelectorAll('[data-wa-operatore]').forEach(btn => {
      btn.onclick = () => {
        const token = btn.dataset.waOperatore;
        const tel   = btn.dataset.waTel;
        if (!tel) { alert('Telefono non configurato per questo operatore'); return; }
        const url = `https://hotel.ristoflow-ai.com/operatore.html?token=${token}`;
        const msg = encodeURIComponent(`Ciao! Ecco il tuo link per i task di oggi:\n${url}`);
        window.open(`https://wa.me/${tel.replace(/\D/g,'')}?text=${msg}`, '_blank');
      };
    });
  }

  render(dati);
}

function renderTaskCard(t, dipendenti) {
  const statoStyle = {
    da_fare:  { bg:'#fffbeb', border:'#fde68a', badge:'#92400e', badgeBg:'#fef3c7' },
    in_corso: { bg:'#f0f9ff', border:'#bae6fd', badge:'#0E5A7A', badgeBg:'#e0f2fe' },
    fatto:    { bg:'#f0fdf4', border:'#86efac', badge:'#166534', badgeBg:'#dcfce7' },
    saltato:  { bg:'#f9fafb', border:'#e5e7eb', badge:'#374151', badgeBg:'#f1f5f9' },
  }[t.stato] || { bg:'white', border:'#e5e7eb', badge:'#374151', badgeBg:'#f1f5f9' };

  const priColor = { alta:'#dc2626', media:'#d97706', bassa:'#64748b' }[t.priorita] || '#64748b';
  const tipo = TIPI.find(x=>x.id===t.tipo);
  const dipAssegnato = t.assegnato_a;

  return `
    <div style="background:${statoStyle.bg};border:1px solid ${statoStyle.border};border-radius:14px;padding:16px;margin-bottom:10px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;margin-bottom:12px;">
        <div style="display:flex;align-items:center;gap:10px;flex:1;min-width:200px;">
          <div style="font-size:28px;">${t.icona||tipo?.icon||'📋'}</div>
          <div>
            <div style="font-weight:700;font-size:15px;">${esc(t.nome)}</div>
            <div style="font-size:12px;color:#64748b;margin-top:2px;">
              ${t.camera_numero?`🛏️ Camera ${esc(t.camera_numero)} · `:''}
              ⏱️ ${t.durata_stimata_min||'?'} min stimati
              ${t.durata_effettiva_min?` · ✅ ${t.durata_effettiva_min} min effettivi`:''}
              ${t.scostamento_min!=null?` <span style="color:${t.scostamento_min>0?'#dc2626':'#059669'};font-weight:700;">(${t.scostamento_min>0?'+':''}${t.scostamento_min} min)</span>`:''}
            </div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
          <span style="background:${statoStyle.badgeBg};color:${statoStyle.badge};padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;">${t.stato.replace('_',' ')}</span>
          <span style="color:${priColor};font-size:11px;font-weight:700;">● ${t.priorita}</span>
          <button data-del-task="${t.id}" style="background:#fee2e2;border:none;width:26px;height:26px;border-radius:6px;cursor:pointer;font-size:12px;color:#dc2626;">🗑</button>
        </div>
      </div>

      ${t.istruzioni?`<div style="background:rgba(255,255,255,.7);border-radius:8px;padding:8px 12px;font-size:12px;color:#374151;margin-bottom:10px;">${esc(t.istruzioni)}</div>`:''}

      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
        <!-- Assegna dipendente -->
        <select data-assegna="${t.id}" style="padding:6px 10px;border:1px solid #e5e7eb;border-radius:8px;font-size:12px;flex:1;min-width:140px;max-width:200px;">
          <option value="">— Non assegnato —</option>
          ${dipendenti.map(d=>`<option value="${d.id}" ${t.assegnato_a===d.id?'selected':''}>${esc(d.nome)} ${esc(d.cognome||'')}</option>`).join('')}
        </select>

        <!-- Invia WA se assegnato -->
        ${t.assegnato_a ? (() => {
          const dip = dipendenti.find(d=>d.id===t.assegnato_a);
          return dip?.telefono && dip?.token_operatore ? `
            <button data-wa-operatore="${dip.token_operatore}" data-wa-tel="${dip.telefono}"
              style="background:#25D366;color:white;border:none;padding:6px 12px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:600;white-space:nowrap;">
              📲 Invia link
            </button>
          ` : '';
        })() : ''}

        <!-- Azioni stato -->
        <div style="display:flex;gap:6px;margin-left:auto;">
          ${t.stato==='da_fare'  ? `<button data-task-id="${t.id}" data-task-stato="in_corso" style="background:#0E5A7A;color:white;border:none;padding:7px 14px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700;">▶ Inizia</button>` : ''}
          ${t.stato==='in_corso' ? `<button data-task-id="${t.id}" data-task-stato="fatto"    style="background:#059669;color:white;border:none;padding:7px 14px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700;">✓ Completa</button>` : ''}
          ${t.stato!=='fatto'&&t.stato!=='saltato' ? `<button data-task-id="${t.id}" data-task-stato="saltato"  style="background:#f1f5f9;color:#64748b;border:none;padding:7px 12px;border-radius:8px;cursor:pointer;font-size:12px;">Salta</button>` : ''}
        </div>
      </div>

      ${t.note_operatore?`<div style="font-size:12px;color:#92400e;background:#fffbeb;border-radius:8px;padding:6px 10px;margin-top:8px;">📝 ${esc(t.note_operatore)}</div>`:''}
    </div>
  `;
}

function formTaskHTML(dipendenti, camere, data) {
  return `
    <div style="font-size:15px;font-weight:700;margin-bottom:16px;">+ Nuovo task manuale</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;">
      <div>
        <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Tipo</label>
        <select id="nt-tipo" class="input">
          ${TIPI.map(t=>`<option value="${t.id}">${t.icon} ${t.label}</option>`).join('')}
        </select>
      </div>
      <div>
        <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Nome task *</label>
        <input id="nt-nome" class="input" placeholder="Es. Pulizia camera 12">
      </div>
      <div>
        <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Camera</label>
        <select id="nt-camera" class="input">
          <option value="">— Nessuna —</option>
          ${camere.map(c=>`<option value="${c.id}" data-num="${esc(c.nome)}">${esc(c.nome)}</option>`).join('')}
        </select>
      </div>
      <div>
        <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Priorità</label>
        <select id="nt-priorita" class="input">
          ${PRIORITA.map(p=>`<option value="${p.id}">${p.label}</option>`).join('')}
        </select>
      </div>
      <div>
        <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Durata stimata (min)</label>
        <input type="number" id="nt-durata" class="input" min="5" step="5" value="30">
      </div>
      <div>
        <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Assegna a</label>
        <select id="nt-dipendente" class="input">
          <option value="">— Non assegnato —</option>
          ${dipendenti.map(d=>`<option value="${d.id}">${esc(d.nome)} ${esc(d.cognome||'')}</option>`).join('')}
        </select>
      </div>
    </div>
    <div style="margin-top:14px;">
      <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Istruzioni</label>
      <textarea id="nt-istruzioni" class="input" rows="2" placeholder="Dettagli su cosa fare..."></textarea>
    </div>
    <div id="nt-esito" style="font-size:13px;min-height:14px;margin-top:10px;"></div>
    <div style="display:flex;gap:10px;margin-top:14px;">
      <button id="btn-salva-task" style="background:#0E5A7A;color:white;border:none;padding:10px 22px;border-radius:10px;cursor:pointer;font-size:14px;font-weight:600;">💾 Salva task</button>
      <button id="btn-annulla-task" style="background:#f1f5f9;color:#374151;border:none;padding:10px 16px;border-radius:10px;cursor:pointer;">Annulla</button>
    </div>
  `;
}

async function salvaTask(box, data, dipendenti, camere, onSuccess) {
  const esito = box.querySelector('#nt-esito');
  const aziendaId = window.state?.azienda?.id;
  const camSel = box.querySelector('#nt-camera');
  const dipSel = box.querySelector('#nt-dipendente');
  const camOpt = camSel.options[camSel.selectedIndex];
  const dipOpt = dipendenti.find(d=>d.id===dipSel.value);
  const tipoSel = box.querySelector('#nt-tipo');
  const tipo = TIPI.find(t=>t.id===tipoSel.value);

  const payload = {
    azienda_id:        aziendaId,
    data,
    tipo:              tipoSel.value,
    nome:              box.querySelector('#nt-nome').value.trim(),
    icona:             tipo?.icon || '📋',
    priorita:          box.querySelector('#nt-priorita').value,
    durata_stimata_min:parseInt(box.querySelector('#nt-durata').value)||30,
    istruzioni:        box.querySelector('#nt-istruzioni').value.trim()||null,
    camera_id:         camSel.value||null,
    camera_numero:     camSel.value ? camOpt.dataset.num : null,
    assegnato_a:       dipSel.value||null,
    assegnato_nome:    dipOpt ? `${dipOpt.nome} ${dipOpt.cognome||''}`.trim() : null,
    stato:             'da_fare',
    generato_automatico: false,
  };

  if (!payload.nome) { esito.innerHTML='<span style="color:#dc2626;">Nome obbligatorio</span>'; return; }

  const { error } = await supabase.from('hotel_operations_task').insert(payload);
  if (error) { esito.innerHTML=`<span style="color:#dc2626;">❌ ${esc(error.message)}</span>`; return; }
  esito.innerHTML='<span style="color:#059669;">✅ Task aggiunto!</span>';
  box.querySelector('#form-task-wrap').style.display = 'none';
  if (onSuccess) await onSuccess();
}

// ── Generazione automatica task dalle regole ──────────────────
async function generaTaskAutomatici(aziendaId, data) {
  const [{ data: regole }, { data: prenotazioni }, { data: camere }] = await Promise.all([
    supabase.from('hotel_operations_regole').select('*').eq('azienda_id', aziendaId).eq('attiva', true),
    supabase.from('hotel_prenotazioni').select('id,camera_id,data_checkin,data_checkout,notti,ospite_nome')
      .eq('azienda_id', aziendaId)
      .not('stato','in','(cancellata,noshow)')
      .lte('data_checkin', data)
      .gte('data_checkout', data),
    supabase.from('hotel_camere').select('id,nome,tipologia').eq('azienda_id', aziendaId),
  ]);

  const dataD = new Date(data);
  const tasks = [];

  for (const cam of (camere||[])) {
    const pren = (prenotazioni||[]).find(p=>p.camera_id===cam.id);

    for (const regola of (regole||[])) {
      // Filtro per tipo camera
      if (regola.applicabile_a === 'tipo_camera' && regola.tipo_camera !== cam.tipologia) continue;

      let generaTask = false;

      switch(regola.frequenza) {
        case 'ogni_giorno':
          generaTask = !!pren;
          break;
        case 'ogni_N_giorni':
          if (pren) {
            const checkin = new Date(pren.data_checkin);
            const ggDaCheckin = Math.round((dataD - checkin) / 86400000);
            generaTask = ggDaCheckin % (regola.ogni_n_giorni||1) === 0;
          }
          break;
        case 'checkout':
          generaTask = pren && pren.data_checkout === data;
          break;
        case 'checkin':
          generaTask = pren && pren.data_checkin === data;
          break;
        case 'settimanale':
          generaTask = dataD.getDay() === (regola.giorno_settimana||1);
          break;
      }

      if (!generaTask) continue;

      tasks.push({
        azienda_id:          aziendaId,
        data,
        camera_id:           cam.id,
        camera_numero:       cam.nome,
        prenotazione_id:     pren?.id || null,
        regola_id:           regola.id,
        tipo:                regola.tipo,
        nome:                regola.nome,
        icona:               regola.icona,
        istruzioni:          regola.istruzioni,
        priorita:            regola.priorita,
        durata_stimata_min:  regola.durata_stimata_min,
        stato:               'da_fare',
        generato_automatico: true,
      });
    }
  }

  if (tasks.length) {
    // Evita duplicati: elimina task auto già esistenti per questa data
    await supabase.from('hotel_operations_task')
      .delete()
      .eq('azienda_id', aziendaId)
      .eq('data', data)
      .eq('generato_automatico', true)
      .eq('stato', 'da_fare');

    await supabase.from('hotel_operations_task').insert(tasks);
  }
}

// ════════════════════════════════════════════════════════════════
// TAB 2 — REGOLE
// ════════════════════════════════════════════════════════════════
async function renderTabRegole(box) {
  const aziendaId = window.state?.azienda?.id;
  box.innerHTML = '<div style="color:#94a3b8;padding:20px;">Caricamento...</div>';

  const { data: regole } = await supabase
    .from('hotel_operations_regole')
    .select('*')
    .eq('azienda_id', aziendaId)
    .order('tipo').order('ordine');

  let editingId = null;

  box.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
      <div>
        <div style="font-size:16px;font-weight:700;">⚙️ Regole operations</div>
        <div style="font-size:12px;color:#64748b;">Le regole generano automaticamente i task giornalieri</div>
      </div>
      <button id="btn-nuova-regola" style="background:#0E5A7A;color:white;border:none;padding:9px 18px;border-radius:10px;cursor:pointer;font-size:13px;font-weight:600;">+ Nuova regola</button>
    </div>

    <!-- REGOLE RAPIDE PREDEFINITE -->
    <div id="regole-predefinite-wrap" style="${regole?.length?'display:none':''}">
      <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:14px;padding:16px;margin-bottom:20px;">
        <div style="font-size:13px;font-weight:700;color:#0E5A7A;margin-bottom:12px;">💡 Regole predefinite — clicca per aggiungere</div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;">
          ${[
            { nome:'Pulizia giornaliera',   tipo:'pulizia',    freq:'ogni_giorno',   durata:25, icona:'🧹', priorita:'alta' },
            { nome:'Cambio asciugamani',     tipo:'biancheria', freq:'ogni_giorno',   durata:10, icona:'🛁', priorita:'media' },
            { nome:'Cambio lenzuola',        tipo:'biancheria', freq:'ogni_N_giorni', durata:20, icona:'🛏️', priorita:'media', ogni_n:3 },
            { nome:'Controllo minibar',      tipo:'minibar',    freq:'ogni_giorno',   durata:5,  icona:'🍾', priorita:'bassa' },
            { nome:'Pulizia completa checkout', tipo:'pulizia', freq:'checkout',      durata:45, icona:'✨', priorita:'alta' },
            { nome:'Preparazione checkin',   tipo:'pulizia',    freq:'checkin',       durata:20, icona:'🎯', priorita:'alta' },
            { nome:'Taglio siepe',           tipo:'manutenzione',freq:'ogni_N_giorni',durata:60, icona:'✂️', priorita:'bassa', ogni_n:7 },
            { nome:'Controllo generale',     tipo:'manutenzione',freq:'settimanale',  durata:30, icona:'🔧', priorita:'media' },
          ].map(r=>`
            <button data-preset='${JSON.stringify(r)}' style="background:white;border:1px solid #e5e7eb;padding:8px 14px;border-radius:10px;cursor:pointer;font-size:12px;font-weight:600;display:flex;align-items:center;gap:6px;">
              ${r.icona} ${r.nome}
            </button>
          `).join('')}
        </div>
      </div>
    </div>

    <div id="lista-regole">
      ${!(regole?.length) ? '<div style="color:#94a3b8;font-size:13px;">Nessuna regola. Aggiungine una o usa quelle predefinite.</div>' :
        Object.entries(
          (regole||[]).reduce((acc,r) => { if(!acc[r.tipo]) acc[r.tipo]=[]; acc[r.tipo].push(r); return acc; }, {})
        ).map(([tipo, lista]) => {
          const t = TIPI.find(x=>x.id===tipo);
          return `
            <div style="margin-bottom:20px;">
              <div style="font-size:12px;font-weight:800;color:#0E5A7A;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px;">${t?.icon||'📋'} ${t?.label||tipo}</div>
              ${lista.map(r=>`
                <div style="background:white;border:1px solid ${r.attiva?'#e5e7eb':'#f1f5f9'};border-radius:12px;padding:14px;margin-bottom:8px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;opacity:${r.attiva?1:0.6};">
                  <div style="font-size:24px;">${r.icona||'📋'}</div>
                  <div style="flex:1;min-width:160px;">
                    <div style="font-weight:700;font-size:14px;">${esc(r.nome)}</div>
                    <div style="font-size:12px;color:#64748b;margin-top:2px;">
                      ${FREQUENZE.find(f=>f.id===r.frequenza)?.label||r.frequenza}
                      ${r.ogni_n_giorni>1?` (ogni ${r.ogni_n_giorni} giorni)`:''}
                      · ⏱️ ${r.durata_stimata_min} min
                      · ${r.ruolo_assegnazione}
                      · <span style="color:${{alta:'#dc2626',media:'#d97706',bassa:'#64748b'}[r.priorita]};">●</span> ${r.priorita}
                    </div>
                  </div>
                  <div style="display:flex;gap:6px;align-items:center;">
                    <label style="cursor:pointer;display:flex;align-items:center;gap:4px;font-size:12px;">
                      <input type="checkbox" ${r.attiva?'checked':''} data-toggle-regola="${r.id}" style="accent-color:#0E5A7A;">
                      Attiva
                    </label>
                    <button data-edit-regola="${r.id}" style="background:#f0f9ff;border:1px solid #bae6fd;padding:6px 12px;border-radius:8px;cursor:pointer;font-size:12px;color:#0E5A7A;">✏️</button>
                    <button data-del-regola="${r.id}" style="background:#fee2e2;border:none;padding:6px 10px;border-radius:8px;cursor:pointer;font-size:12px;color:#dc2626;">🗑</button>
                  </div>
                </div>
              `).join('')}
            </div>
          `;
        }).join('')
      }
    </div>

    <!-- FORM REGOLA -->
    <div id="form-regola-wrap" style="display:none;background:white;border:1px solid #e5e7eb;border-radius:14px;padding:20px;margin-top:16px;">
      ${formRegolaHTML()}
    </div>
  `;

  // Bind preset
  box.querySelectorAll('[data-preset]').forEach(btn => {
    btn.onclick = async () => {
      const r = JSON.parse(btn.dataset.preset);
      await supabase.from('hotel_operations_regole').insert({
        azienda_id:         aziendaId,
        nome:               r.nome,
        tipo:               r.tipo,
        icona:              r.icona,
        frequenza:          r.freq,
        ogni_n_giorni:      r.ogni_n || 1,
        durata_stimata_min: r.durata,
        priorita:           r.priorita,
        attiva:             true,
      });
      renderTabRegole(box);
    };
  });

  box.querySelector('#btn-nuova-regola').onclick = () => {
    editingId = null;
    box.querySelector('#form-regola-wrap').style.display = '';
    box.querySelector('#form-regola-wrap').scrollIntoView({ behavior:'smooth' });
  };
  const _bar = box.querySelector('#btn-annulla-regola'); if (_bar) _bar.onclick = () => { box.querySelector('#form-regola-wrap').style.display='none'; };

  box.querySelectorAll('[data-toggle-regola]').forEach(chk => {
    chk.onchange = async () => {
      await supabase.from('hotel_operations_regole').update({ attiva: chk.checked }).eq('id', chk.dataset.toggleRegola);
    };
  });

  box.querySelectorAll('[data-del-regola]').forEach(btn => {
    btn.onclick = async () => {
      if (!confirm('Eliminare questa regola?')) return;
      await supabase.from('hotel_operations_regole').delete().eq('id', btn.dataset.delRegola);
      renderTabRegole(box);
    };
  });

  box.querySelectorAll('[data-edit-regola]').forEach(btn => {
    btn.onclick = () => {
      const r = (regole||[]).find(x=>x.id===btn.dataset.editRegola);
      if (!r) return;
      editingId = r.id;
      const f = box.querySelector('#form-regola-wrap');
      f.style.display = '';
      f.querySelector('#rg-nome').value = r.nome||'';
      f.querySelector('#rg-tipo').value = r.tipo||'pulizia';
      f.querySelector('#rg-icona').value = r.icona||'';
      f.querySelector('#rg-frequenza').value = r.frequenza||'ogni_giorno';
      f.querySelector('#rg-ogni-n').value = r.ogni_n_giorni||1;
      f.querySelector('#rg-giorno-sett').value = r.giorno_settimana||1;
      f.querySelector('#rg-durata').value = r.durata_stimata_min||30;
      f.querySelector('#rg-priorita').value = r.priorita||'media';
      f.querySelector('#rg-ruolo').value = r.ruolo_assegnazione||'qualsiasi';
      f.querySelector('#rg-istruzioni').value = r.istruzioni||'';
      aggiornaVisibilitaFreq(f, r.frequenza);
      f.scrollIntoView({ behavior:'smooth' });
    };
  });

  box.querySelector('#rg-frequenza')?.addEventListener('change', function() {
    aggiornaVisibilitaFreq(box.querySelector('#form-regola-wrap'), this.value);
  });

  const _bsr = box.querySelector('#btn-salva-regola');
  if (_bsr) _bsr.onclick = async () => {
    const f = box.querySelector('#form-regola-wrap');
    const esito = f.querySelector('#rg-esito');
    const payload = {
      azienda_id:         aziendaId,
      nome:               f.querySelector('#rg-nome').value.trim(),
      tipo:               f.querySelector('#rg-tipo').value,
      icona:              f.querySelector('#rg-icona').value.trim() || TIPI.find(t=>t.id===f.querySelector('#rg-tipo').value)?.icon || '📋',
      frequenza:          f.querySelector('#rg-frequenza').value,
      ogni_n_giorni:      parseInt(f.querySelector('#rg-ogni-n').value)||1,
      giorno_settimana:   parseInt(f.querySelector('#rg-giorno-sett').value)||1,
      durata_stimata_min: parseInt(f.querySelector('#rg-durata').value)||30,
      priorita:           f.querySelector('#rg-priorita').value,
      ruolo_assegnazione: f.querySelector('#rg-ruolo').value,
      istruzioni:         f.querySelector('#rg-istruzioni').value.trim()||null,
      attiva:             true,
    };
    if (!payload.nome) { esito.innerHTML='<span style="color:#dc2626;">Nome obbligatorio</span>'; return; }
    let error;
    if (editingId) {
      ({ error } = await supabase.from('hotel_operations_regole').update(payload).eq('id', editingId));
    } else {
      ({ error } = await supabase.from('hotel_operations_regole').insert(payload));
    }
    if (error) { esito.innerHTML=`<span style="color:#dc2626;">❌ ${esc(error.message)}</span>`; return; }
    renderTabRegole(box);
  };
}

function formRegolaHTML() {
  return `
    <div style="font-size:15px;font-weight:700;margin-bottom:16px;" id="form-regola-title">Nuova regola</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;">
      <div>
        <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Nome *</label>
        <input id="rg-nome" class="input" placeholder="Es. Cambio lenzuola">
      </div>
      <div>
        <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Tipo</label>
        <select id="rg-tipo" class="input">
          ${TIPI.map(t=>`<option value="${t.id}">${t.icon} ${t.label}</option>`).join('')}
        </select>
      </div>
      <div>
        <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Emoji / Icona</label>
        <input id="rg-icona" class="input" placeholder="🧹" style="max-width:80px;">
      </div>
      <div>
        <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Frequenza</label>
        <select id="rg-frequenza" class="input">
          ${FREQUENZE.map(f=>`<option value="${f.id}">${f.label}</option>`).join('')}
        </select>
      </div>
      <div id="rg-ogni-n-wrap" style="display:none;">
        <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Ogni N giorni</label>
        <input type="number" id="rg-ogni-n" class="input" min="2" max="30" value="3">
      </div>
      <div id="rg-giorno-sett-wrap" style="display:none;">
        <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Giorno settimana</label>
        <select id="rg-giorno-sett" class="input">
          ${GIORNI_SETT.map((g,i)=>`<option value="${i}">${g}</option>`).join('')}
        </select>
      </div>
      <div>
        <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Durata stimata (min)</label>
        <input type="number" id="rg-durata" class="input" min="5" step="5" value="30">
      </div>
      <div>
        <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Priorità</label>
        <select id="rg-priorita" class="input">
          ${PRIORITA.map(p=>`<option value="${p.id}">${p.label}</option>`).join('')}
        </select>
      </div>
      <div>
        <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Ruolo assegnazione</label>
        <select id="rg-ruolo" class="input">
          ${RUOLI.map(r=>`<option value="${r}">${r}</option>`).join('')}
        </select>
      </div>
    </div>
    <div style="margin-top:14px;">
      <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Istruzioni per l'operatore</label>
      <textarea id="rg-istruzioni" class="input" rows="2" placeholder="Cosa fare esattamente, cosa portare..."></textarea>
    </div>
    <div id="rg-esito" style="font-size:13px;min-height:14px;margin-top:10px;"></div>
    <div style="display:flex;gap:10px;margin-top:14px;">
      <button id="btn-salva-regola" style="background:#0E5A7A;color:white;border:none;padding:10px 22px;border-radius:10px;cursor:pointer;font-size:14px;font-weight:600;">💾 Salva regola</button>
      <button id="btn-annulla-regola" style="background:#f1f5f9;color:#374151;border:none;padding:10px 16px;border-radius:10px;cursor:pointer;">Annulla</button>
    </div>
  `;
}

function aggiornaVisibilitaFreq(form, freq) {
  if (!form) return;
  form.querySelector('#rg-ogni-n-wrap').style.display    = freq==='ogni_N_giorni' ? '' : 'none';
  form.querySelector('#rg-giorno-sett-wrap').style.display = freq==='settimanale'   ? '' : 'none';
}

// ════════════════════════════════════════════════════════════════
// TAB 3 — TURNI
// ════════════════════════════════════════════════════════════════
async function renderTabTurni(box) {
  const aziendaId = window.state?.azienda?.id;
  box.innerHTML = '<div style="color:#94a3b8;padding:20px;">Caricamento...</div>';

  const oggi = new Date().toISOString().split('T')[0];
  const dal  = oggi;
  const al   = new Date(new Date(oggi).getTime() + 7*864e5).toISOString().split('T')[0];

  const [{ data: dipendenti }, { data: turni }] = await Promise.all([
    supabase.from('dipendenti').select('id,nome,cognome,ruolo,foto_url,token_operatore,telefono').eq('azienda_id', aziendaId).eq('attivo', true),
    supabase.from('hotel_turni').select('*').eq('azienda_id', aziendaId).gte('data', dal).lte('data', al),
  ]);

  // Genera 7 giorni
  const giorni = [];
  for (let i=0; i<7; i++) {
    const d = new Date(oggi);
    d.setDate(d.getDate()+i);
    giorni.push(d.toISOString().split('T')[0]);
  }

  box.innerHTML = `
    <div style="font-size:16px;font-weight:700;margin-bottom:16px;">👥 Turni prossimi 7 giorni</div>

    <div style="overflow-x:auto;">
      <table style="width:100%;border-collapse:collapse;font-size:12px;min-width:700px;">
        <thead>
          <tr style="background:#f8fafc;">
            <th style="padding:10px 12px;text-align:left;font-weight:700;color:#374151;border-bottom:1px solid #e5e7eb;min-width:130px;">Operatore</th>
            ${giorni.map(g=>`
              <th style="padding:10px 8px;text-align:center;font-weight:700;color:${g===oggi?'#0E5A7A':'#374151'};border-bottom:1px solid #e5e7eb;min-width:90px;background:${g===oggi?'#f0f9ff':''};">
                ${formatDataBreve(g)}<br><span style="font-size:10px;color:#94a3b8;">${GIORNI_SETT[new Date(g).getDay()]}</span>
              </th>
            `).join('')}
          </tr>
        </thead>
        <tbody>
          ${(dipendenti||[]).map(d => `
            <tr style="border-bottom:1px solid #f1f5f9;">
              <td style="padding:10px 12px;">
                <div style="font-weight:600;">${esc(d.nome)} ${esc(d.cognome||'')}</div>
                <div style="font-size:11px;color:#94a3b8;">${esc(d.ruolo||'')}</div>
                ${d.token_operatore && d.telefono ? `
                  <button data-wa-link="${d.token_operatore}" data-wa-tel="${d.telefono}"
                    style="background:#25D366;color:white;border:none;padding:3px 8px;border-radius:6px;cursor:pointer;font-size:10px;margin-top:4px;">
                    📲 Link WA
                  </button>
                ` : ''}
              </td>
              ${giorni.map(g => {
                const turno = (turni||[]).find(t=>t.dipendente_id===d.id && t.data===g);
                return `
                  <td style="padding:6px 8px;text-align:center;background:${g===oggi?'#f0f9ff':''};">
                    ${turno ? `
                      <div style="background:#0E5A7A;color:white;border-radius:8px;padding:5px 8px;font-size:11px;cursor:pointer;" data-edit-turno="${turno.id}" data-dip="${d.id}" data-data="${g}">
                        ${turno.ora_inizio?.slice(0,5)}–${turno.ora_fine?.slice(0,5)}
                        ${turno.ruolo_turno?`<br><span style="opacity:.8;font-size:10px;">${turno.ruolo_turno}</span>`:''}
                      </div>
                    ` : `
                      <button data-add-turno data-dip="${d.id}" data-data="${g}"
                        style="width:100%;background:#f1f5f9;border:1.5px dashed #cbd5e1;border-radius:8px;padding:8px 4px;cursor:pointer;font-size:18px;color:#94a3b8;">+</button>
                    `}
                  </td>
                `;
              }).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  // Invia link WA
  box.querySelectorAll('[data-wa-link]').forEach(btn => {
    btn.onclick = () => {
      const url = `https://hotel.ristoflow-ai.com/operatore.html?token=${btn.dataset.waLink}`;
      const msg = encodeURIComponent(`Ciao! Ecco il tuo link operatore Ristoflow Hotel:\n${url}\nUsa il tuo PIN per accedere.`);
      window.open(`https://wa.me/${btn.dataset.waTel.replace(/\D/g,'')}?text=${msg}`, '_blank');
    };
  });

  // Aggiungi/modifica turno
  const apriModalTurno = (dipId, data, turnoEsistente=null) => {
    document.getElementById('modal-turno')?.remove();
    const modal = document.createElement('div');
    modal.id = 'modal-turno';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;';
    const dip = (dipendenti||[]).find(d=>d.id===dipId);
    modal.innerHTML = `
      <div style="background:white;border-radius:16px;padding:24px;width:100%;max-width:380px;box-shadow:0 20px 60px rgba(0,0,0,.3);">
        <div style="font-weight:800;font-size:16px;margin-bottom:4px;">${turnoEsistente?'Modifica':'Aggiungi'} turno</div>
        <div style="font-size:13px;color:#64748b;margin-bottom:16px;">${esc(dip?.nome||'')} ${esc(dip?.cognome||'')} — ${formatData(data)}</div>
        <div style="display:grid;gap:12px;">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
            <div>
              <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Inizio</label>
              <input type="time" id="turno-inizio" class="input" value="${turnoEsistente?.ora_inizio?.slice(0,5)||'08:00'}">
            </div>
            <div>
              <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Fine</label>
              <input type="time" id="turno-fine" class="input" value="${turnoEsistente?.ora_fine?.slice(0,5)||'16:00'}">
            </div>
          </div>
          <div>
            <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Ruolo turno</label>
            <select id="turno-ruolo" class="input">
              ${RUOLI.filter(r=>r!=='qualsiasi').map(r=>`<option value="${r}" ${turnoEsistente?.ruolo_turno===r?'selected':''}>${r}</option>`).join('')}
            </select>
          </div>
          <div>
            <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Note</label>
            <input id="turno-note" class="input" placeholder="Opzionale" value="${esc(turnoEsistente?.note||'')}">
          </div>
        </div>
        <div id="turno-esito" style="font-size:13px;min-height:14px;margin-top:10px;"></div>
        <div style="display:flex;gap:8px;margin-top:16px;">
          <button id="btn-salva-turno" style="flex:1;background:#0E5A7A;color:white;border:none;padding:11px;border-radius:10px;cursor:pointer;font-weight:700;">💾 Salva</button>
          ${turnoEsistente?`<button id="btn-del-turno" style="background:#fee2e2;color:#dc2626;border:none;padding:11px 14px;border-radius:10px;cursor:pointer;font-weight:700;">🗑</button>`:''}
          <button id="btn-chiudi-turno" style="background:#f1f5f9;border:none;padding:11px 14px;border-radius:10px;cursor:pointer;">✕</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('#btn-chiudi-turno').onclick = () => modal.remove();
    modal.onclick = e => { if(e.target===modal) modal.remove(); };

    modal.querySelector('#btn-salva-turno').onclick = async () => {
      const payload = {
        azienda_id:   aziendaId,
        dipendente_id: dipId,
        data,
        ora_inizio:   modal.querySelector('#turno-inizio').value,
        ora_fine:     modal.querySelector('#turno-fine').value,
        ruolo_turno:  modal.querySelector('#turno-ruolo').value,
        note:         modal.querySelector('#turno-note').value.trim()||null,
      };
      let error;
      if (turnoEsistente) {
        ({ error } = await supabase.from('hotel_turni').update(payload).eq('id', turnoEsistente.id));
      } else {
        ({ error } = await supabase.from('hotel_turni').upsert(payload, { onConflict:'dipendente_id,data' }));
      }
      if (error) { modal.querySelector('#turno-esito').innerHTML=`<span style="color:#dc2626;">${error.message}</span>`; return; }
      modal.remove();
      renderTabTurni(box);
    };

    const _bdt = modal.querySelector('#btn-del-turno');
    if (_bdt) _bdt.onclick = async () => {
      await supabase.from('hotel_turni').delete().eq('id', turnoEsistente.id);
      modal.remove();
      renderTabTurni(box);
    };
  };

  box.querySelectorAll('[data-add-turno]').forEach(btn => btn.onclick = () => apriModalTurno(btn.dataset.dip, btn.dataset.data));
  box.querySelectorAll('[data-edit-turno]').forEach(el => {
    el.onclick = () => {
      const t = (turni||[]).find(x=>x.id===el.dataset.editTurno);
      apriModalTurno(el.dataset.dip, el.dataset.data, t);
    };
  });
}

// ════════════════════════════════════════════════════════════════
// TAB 4 — PRODUTTIVITÀ
// ════════════════════════════════════════════════════════════════
async function renderTabProduttivita(box) {
  const aziendaId = window.state?.azienda?.id;
  box.innerHTML = '<div style="color:#94a3b8;padding:20px;">Caricamento...</div>';

  const oggi = new Date();
  const dal  = new Date(oggi.getFullYear(), oggi.getMonth(), 1).toISOString().split('T')[0];
  const al   = oggi.toISOString().split('T')[0];

  const { data: log } = await supabase
    .from('hotel_operations_log')
    .select('*')
    .eq('azienda_id', aziendaId)
    .gte('data', dal)
    .lte('data', al)
    .order('data', { ascending:false });

  const entries = log || [];

  // Per operatore
  const perOp = {};
  entries.forEach(e => {
    const k = e.dipendente_nome||'Non assegnato';
    if (!perOp[k]) perOp[k] = { task:0, minStimati:0, minEffettivi:0, costo:0 };
    perOp[k].task++;
    perOp[k].minStimati   += e.durata_stimata_min||0;
    perOp[k].minEffettivi += e.durata_effettiva_min||0;
    perOp[k].costo        += Number(e.costo_effettivo)||0;
  });

  // Per tipo task
  const perTipo = {};
  entries.forEach(e => {
    const k = e.tipo||'altro';
    if (!perTipo[k]) perTipo[k] = { task:0, minStimati:0, minEffettivi:0 };
    perTipo[k].task++;
    perTipo[k].minStimati   += e.durata_stimata_min||0;
    perTipo[k].minEffettivi += e.durata_effettiva_min||0;
  });

  // Per camera
  const perCamera = {};
  entries.forEach(e => {
    if (!e.camera_numero) return;
    const k = e.camera_numero;
    if (!perCamera[k]) perCamera[k] = { task:0, min:0 };
    perCamera[k].task++;
    perCamera[k].min += e.durata_effettiva_min||0;
  });

  const totMin     = entries.reduce((s,e)=>s+(e.durata_effettiva_min||0), 0);
  const totStimati = entries.reduce((s,e)=>s+(e.durata_stimata_min||0), 0);
  const scostMedio = entries.filter(e=>e.scostamento_min!=null).length ?
    Math.round(entries.filter(e=>e.scostamento_min!=null).reduce((s,e)=>s+(e.scostamento_min||0),0) / entries.filter(e=>e.scostamento_min!=null).length) : 0;

  box.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:10px;">
      <div style="font-size:16px;font-weight:700;">📊 Produttività — ${formatMese(dal.slice(0,7))}</div>
      <button id="btn-esporta-log" style="background:#f1f5f9;border:none;padding:8px 14px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;">⬇️ CSV</button>
    </div>

    <!-- KPI -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:24px;">
      ${[
        { icon:'✅', label:'Task completati', val:entries.length,          color:'#059669' },
        { icon:'⏱️', label:'Ore lavorate',    val:Math.round(totMin/60*10)/10+'h', color:'#0E5A7A' },
        { icon:'📊', label:'Efficienza',      val:totStimati>0?Math.round(totMin/totStimati*100)+'%':'—', color:'#7c3aed' },
        { icon:'⚡', label:'Scostamento medio',val:(scostMedio>0?'+':'')+scostMedio+' min', color:scostMedio>5?'#dc2626':scostMedio<-5?'#059669':'#d97706' },
      ].map(k=>`
        <div style="background:white;border:1px solid #e5e7eb;border-radius:14px;padding:16px;">
          <div style="font-size:22px;">${k.icon}</div>
          <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;margin-top:8px;">${k.label}</div>
          <div style="font-size:22px;font-weight:800;color:${k.color};margin-top:4px;">${k.val}</div>
        </div>
      `).join('')}
    </div>

    <!-- PER OPERATORE -->
    <div style="background:white;border:1px solid #e5e7eb;border-radius:14px;padding:20px;margin-bottom:16px;">
      <div style="font-size:14px;font-weight:700;margin-bottom:14px;">👥 Performance per operatore</div>
      ${!Object.keys(perOp).length ? '<div style="color:#94a3b8;font-size:13px;">Nessun dato</div>' : `
        <div style="overflow-x:auto;">
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <thead>
              <tr style="background:#f8fafc;">
                ${['Operatore','Task','Ore stimate','Ore effettive','Efficienza','Scostamento medio'].map(h=>`
                  <th style="padding:8px 12px;text-align:${h==='Operatore'?'left':'right'};font-weight:700;color:#374151;border-bottom:1px solid #e5e7eb;">${h}</th>
                `).join('')}
              </tr>
            </thead>
            <tbody>
              ${Object.entries(perOp).sort(([,a],[,b])=>b.task-a.task).map(([nome,v])=>{
                const eff = v.minStimati>0 ? Math.round(v.minEffettivi/v.minStimati*100) : 100;
                const scost = v.task>0 ? Math.round((v.minEffettivi-v.minStimati)/v.task) : 0;
                return `
                  <tr style="border-bottom:1px solid #f1f5f9;">
                    <td style="padding:8px 12px;font-weight:600;">${esc(nome)}</td>
                    <td style="padding:8px 12px;text-align:right;">${v.task}</td>
                    <td style="padding:8px 12px;text-align:right;">${Math.round(v.minStimati/60*10)/10}h</td>
                    <td style="padding:8px 12px;text-align:right;">${Math.round(v.minEffettivi/60*10)/10}h</td>
                    <td style="padding:8px 12px;text-align:right;font-weight:700;color:${eff<=100?'#059669':'#dc2626'}">${eff}%</td>
                    <td style="padding:8px 12px;text-align:right;font-weight:700;color:${scost>5?'#dc2626':scost<-5?'#059669':'#d97706'}">${scost>0?'+':''}${scost} min</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `}
    </div>

    <!-- PER TIPO -->
    <div style="background:white;border:1px solid #e5e7eb;border-radius:14px;padding:20px;margin-bottom:16px;">
      <div style="font-size:14px;font-weight:700;margin-bottom:14px;">📋 Tempo medio per tipo lavorazione</div>
      ${Object.entries(perTipo).map(([tipo,v])=>{
        const t = TIPI.find(x=>x.id===tipo);
        const mediaEff = v.task>0 ? Math.round(v.minEffettivi/v.task) : 0;
        const mediaStim = v.task>0 ? Math.round(v.minStimati/v.task) : 0;
        return `
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;flex-wrap:wrap;">
            <div style="width:28px;text-align:center;font-size:18px;">${t?.icon||'📋'}</div>
            <div style="width:140px;font-size:13px;font-weight:600;">${t?.label||tipo}</div>
            <div style="flex:1;background:#f1f5f9;border-radius:999px;height:16px;overflow:hidden;min-width:80px;">
              <div style="background:#0E5A7A;width:${Math.min(100,Math.round(mediaEff/(mediaStim||mediaEff||1)*100))}%;height:100%;border-radius:999px;"></div>
            </div>
            <div style="font-size:12px;font-weight:700;min-width:120px;">
              ${mediaEff} min eff. <span style="color:#94a3b8;">(${mediaStim} stim.)</span>
            </div>
            <div style="font-size:11px;color:#64748b;">${v.task} task</div>
          </div>
        `;
      }).join('')}
    </div>

    <!-- CAMERE PIÙ IMPEGNATIVE -->
    ${Object.keys(perCamera).length ? `
      <div style="background:white;border:1px solid #e5e7eb;border-radius:14px;padding:20px;">
        <div style="font-size:14px;font-weight:700;margin-bottom:14px;">🛏️ Camere più impegnative</div>
        ${Object.entries(perCamera).sort(([,a],[,b])=>b.min-a.min).slice(0,8).map(([cam,v])=>`
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
            <div style="width:80px;font-size:13px;font-weight:600;">Camera ${esc(cam)}</div>
            <div style="flex:1;background:#f1f5f9;border-radius:999px;height:14px;overflow:hidden;">
              <div style="background:#7c3aed;width:${Math.round(v.min/Math.max(...Object.values(perCamera).map(x=>x.min))*100)}%;height:100%;border-radius:999px;"></div>
            </div>
            <div style="font-size:12px;font-weight:700;width:70px;text-align:right;">${Math.round(v.min/60*10)/10}h · ${v.task} task</div>
          </div>
        `).join('')}
      </div>
    ` : ''}
  `;

  const _bel = box.querySelector('#btn-esporta-log');
  if (_bel) _bel.onclick = () => {
    const header = ['Data','Operatore','Camera','Tipo','Task','Stim.(min)','Effettivo(min)','Scostamento','Costo €'];
    const rows = entries.map(e=>[e.data, e.dipendente_nome||'', e.camera_numero||'', e.tipo||'', e.nome_task||'', e.durata_stimata_min||0, e.durata_effettiva_min||0, e.scostamento_min||0, Number(e.costo_effettivo||0).toFixed(2)]);
    const csv = [header,...rows].map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv],{type:'text/csv;charset=utf-8;'});
    const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`operations-${dal}.csv`; a.click();
  };
}

// ════════════════════════════════════════════════════════════════
// UTILS
// ════════════════════════════════════════════════════════════════
function formatData(d) { if(!d) return '—'; const p=d.split('-'); return `${p[2]}/${p[1]}/${p[0]}`; }
function formatDataBreve(d) { if(!d) return '—'; const p=d.split('-'); return `${p[2]}/${p[1]}`; }
function formatMese(m) { if(!m) return '—'; const [y,mo]=m.split('-'); const mesi=['','Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic']; return `${mesi[+mo]} ${y}`; }
function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }

// js/visualizzazioni/hotel-colazione.js
// Modulo Colazione Hotel — Configurazione, Menu, Ordini del giorno, Minibar

import { supabase } from "../supabaseClient.js";

const ALLERGENI_LIST = [
  { id:'glutine',     label:'Glutine',      emoji:'🌾' },
  { id:'lattosio',    label:'Lattosio',     emoji:'🥛' },
  { id:'uova',        label:'Uova',         emoji:'🥚' },
  { id:'arachidi',    label:'Arachidi',     emoji:'🥜' },
  { id:'frutta_guscio',label:'Frutta a guscio',emoji:'🌰' },
  { id:'pesce',       label:'Pesce',        emoji:'🐟' },
  { id:'soia',        label:'Soia',         emoji:'🫘' },
  { id:'sedano',      label:'Sedano',       emoji:'🥬' },
  { id:'senape',      label:'Senape',       emoji:'🌿' },
  { id:'sesamo',      label:'Sesamo',       emoji:'🌱' },
  { id:'anidride',    label:'Anidride solforosa',emoji:'🍷' },
  { id:'lupini',      label:'Lupini',       emoji:'🌻' },
  { id:'molluschi',   label:'Molluschi',    emoji:'🦑' },
  { id:'crostacei',   label:'Crostacei',    emoji:'🦐' },
];

const CATEGORIE_MENU = ['Dolce','Salato','Frutta','Bevande','Uova & Proteine','Senza glutine','Vegano','Altro'];
const CATEGORIE_MINIBAR = ['Bibite','Alcolici','Snack','Acqua','Altro'];

export async function render(container) {
  const aziendaId = window.state?.azienda?.id;
  if (!aziendaId) { container.innerHTML = '<div class="card">Azienda non selezionata</div>'; return; }

  let tabAttivo = 'config';

  container.innerHTML = `
    <div style="padding:16px;max-width:960px;margin:0 auto;">
      <div style="margin-bottom:20px;">
        <div style="font-size:20px;font-weight:700;color:#0f172a;">☕ Colazione & Minibar</div>
        <div style="font-size:13px;color:#64748b;">Configura il servizio colazione e il minibar camere</div>
      </div>

      <div style="display:flex;gap:4px;border-bottom:2px solid #e5e7eb;margin-bottom:24px;overflow-x:auto;">
        ${[
          { id:'config',  icon:'⚙️',  label:'Configurazione' },
          { id:'menu',    icon:'📋',  label:'Menu alla carta' },
          { id:'ordini',  icon:'🌅',  label:'Ordini del giorno' },
          { id:'minibar', icon:'🍾',  label:'Minibar' },
        ].map(t => `
          <button data-tab="${t.id}" style="
            padding:10px 16px;border:none;background:none;cursor:pointer;
            font-size:13px;font-weight:600;color:#64748b;white-space:nowrap;
            border-bottom:3px solid transparent;margin-bottom:-2px;
          ">${t.icon} ${t.label}</button>
        `).join('')}
      </div>

      <div id="tab-content"></div>
    </div>
  `;

  function switchTab(id) {
    tabAttivo = id;
    container.querySelectorAll('[data-tab]').forEach(btn => {
      const att = btn.dataset.tab === id;
      btn.style.color = att ? '#0E5A7A' : '#64748b';
      btn.style.borderBottomColor = att ? '#0E5A7A' : 'transparent';
    });
    const box = container.querySelector('#tab-content');
    switch(id) {
      case 'config':  renderTabConfig(box);  break;
      case 'menu':    renderTabMenu(box);    break;
      case 'ordini':  renderTabOrdini(box);  break;
      case 'minibar': renderTabMinibar(box); break;
    }
  }

  container.querySelectorAll('[data-tab]').forEach(btn => btn.onclick = () => switchTab(btn.dataset.tab));
  switchTab('config');
}

// ════════════════════════════════════════════════════════════════
// TAB 1 — CONFIGURAZIONE
// ════════════════════════════════════════════════════════════════
async function renderTabConfig(box) {
  const aziendaId = window.state?.azienda?.id;
  box.innerHTML = '<div style="color:#94a3b8;padding:20px;">Caricamento...</div>';

  const { data: cfg } = await supabase
    .from('hotel_colazione_config')
    .select('*')
    .eq('azienda_id', aziendaId)
    .maybeSingle();

  const c = cfg || {};

  // Genera slot orari
  function slotOrari(from = '06:00', to = '11:00', step = 30) {
    const slots = [];
    let [h, m] = from.split(':').map(Number);
    const [eh, em] = to.split(':').map(Number);
    while (h < eh || (h === eh && m <= em)) {
      slots.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`);
      m += step; if (m >= 60) { h++; m -= 60; }
    }
    return slots;
  }

  box.innerHTML = `
    <div style="display:grid;gap:20px;">

      <!-- TIPO SERVIZIO -->
      <div style="background:white;border:1px solid #e5e7eb;border-radius:14px;padding:20px;">
        <div style="font-size:15px;font-weight:700;margin-bottom:16px;">🍽️ Tipo servizio colazione</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          ${[
            { v:'buffet', icon:'🥐', label:'Solo Buffet',        desc:'Menu fisso esposto, nessun ordine digitale' },
            { v:'carta',  icon:'📋', label:'Solo Alla carta',    desc:'Il cliente ordina i piatti dal menu digitale' },
            { v:'misto',  icon:'⭐', label:'Misto',              desc:'Buffet base + ordinazione piatti extra' },
          ].map(t => `
            <label style="flex:1;min-width:160px;cursor:pointer;">
              <input type="radio" name="tipo_servizio" value="${t.v}" ${(c.tipo_servizio||'carta')===t.v?'checked':''} style="display:none;">
              <div class="tipo-card" data-v="${t.v}" style="
                border:2px solid ${(c.tipo_servizio||'carta')===t.v?'#0E5A7A':'#e5e7eb'};
                background:${(c.tipo_servizio||'carta')===t.v?'#f0f9ff':'#fff'};
                border-radius:12px;padding:14px;transition:all .15s;
              ">
                <div style="font-size:24px;">${t.icon}</div>
                <div style="font-weight:700;font-size:13px;margin-top:6px;">${t.label}</div>
                <div style="font-size:11px;color:#94a3b8;margin-top:3px;">${t.desc}</div>
              </div>
            </label>
          `).join('')}
        </div>
      </div>

      <!-- ORARI -->
      <div style="background:white;border:1px solid #e5e7eb;border-radius:14px;padding:20px;">
        <div style="font-size:15px;font-weight:700;margin-bottom:16px;">🕐 Orari servizio</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px;">
          <div>
            <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Inizio servizio</label>
            <input type="time" id="cfg-orario-inizio" class="input" value="${c.orario_inizio||'07:00'}">
          </div>
          <div>
            <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Fine servizio</label>
            <input type="time" id="cfg-orario-fine" class="input" value="${c.orario_fine||'10:30'}">
          </div>
          <div>
            <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Slot prenotazione (min)</label>
            <select id="cfg-slot" class="input">
              ${[15,30,45,60].map(s => `<option value="${s}" ${(c.slot_minuti||30)===s?'selected':''}>${s} min</option>`).join('')}
            </select>
          </div>
          <div>
            <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Ordine entro (ore prima)</label>
            <input type="number" id="cfg-ordine-entro" class="input" min="1" max="48" value="${c.ordine_entro_ore||20}">
            <div style="font-size:11px;color:#94a3b8;margin-top:3px;">Es. 20 = ordine entro le 20:00 del giorno prima</div>
          </div>
        </div>
      </div>

      <!-- PREZZO -->
      <div style="background:white;border:1px solid #e5e7eb;border-radius:14px;padding:20px;">
        <div style="font-size:15px;font-weight:700;margin-bottom:16px;">💶 Prezzo</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;align-items:center;">
          <label style="display:flex;align-items:center;gap:10px;cursor:pointer;">
            <input type="checkbox" id="cfg-inclusa" ${c.inclusa_nel_prezzo!==false?'checked':''} style="width:18px;height:18px;accent-color:#0E5A7A;">
            <span style="font-size:14px;font-weight:600;">Colazione inclusa nel prezzo camera</span>
          </label>
          <div id="cfg-prezzo-wrap" style="display:${c.inclusa_nel_prezzo===false?'':'none'};">
            <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Prezzo per persona (€)</label>
            <input type="number" id="cfg-prezzo" class="input" min="0" step="0.50" value="${c.prezzo_per_persona||0}">
          </div>
        </div>
      </div>

      <!-- SEZIONE BUFFET (visibile se buffet o misto) -->
      <div id="cfg-buffet-section" style="display:${['buffet','misto'].includes(c.tipo_servizio||'carta')?'':'none'};">
        <div style="background:white;border:1px solid #e5e7eb;border-radius:14px;padding:20px;">
          <div style="font-size:15px;font-weight:700;margin-bottom:16px;">🥐 Configurazione Buffet</div>

          <div style="margin-bottom:14px;">
            <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Descrizione buffet (visibile agli ospiti)</label>
            <textarea id="cfg-buffet-desc" class="input" rows="3" placeholder="Es. Ogni mattina ti aspetta un ricco buffet con...">${esc(c.buffet_descrizione||'')}</textarea>
          </div>

          <div style="margin-bottom:14px;">
            <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">PDF Menu Buffet</label>
            <div style="display:flex;gap:8px;align-items:center;">
              <input id="cfg-buffet-pdf" class="input" style="flex:1;" placeholder="URL PDF menu buffet" value="${esc(c.buffet_pdf_url||'')}">
              <label style="background:#f0f9ff;color:#0E5A7A;border:1px solid #bae6fd;padding:8px 14px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:600;white-space:nowrap;">
                📄 Carica PDF
                <input type="file" id="cfg-buffet-pdf-file" accept="application/pdf" style="display:none;">
              </label>
            </div>
            <div id="cfg-pdf-progress" style="display:none;font-size:12px;color:#64748b;margin-top:4px;">⏳ Caricamento...</div>
          </div>

          <div>
            <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:8px;">Foto buffet (galleria)</label>
            <div id="buffet-foto-grid" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px;"></div>
            <label style="background:#f1f5f9;border:1.5px dashed #cbd5e1;border-radius:10px;padding:10px 16px;cursor:pointer;font-size:12px;color:#64748b;display:inline-flex;align-items:center;gap:6px;">
              📷 Aggiungi foto
              <input type="file" id="cfg-buffet-foto-input" accept="image/*" multiple style="display:none;">
            </label>
            <div id="cfg-foto-progress" style="display:none;font-size:12px;color:#64748b;margin-top:4px;">⏳ Caricamento...</div>
          </div>
        </div>
      </div>

      <div id="cfg-esito" style="font-size:13px;min-height:16px;"></div>
      <button id="btn-salva-config" style="background:#0E5A7A;color:white;border:none;padding:12px 28px;border-radius:10px;cursor:pointer;font-size:14px;font-weight:700;">
        💾 Salva configurazione
      </button>
    </div>
  `;

  // Stato foto buffet
  let buffetFoto = Array.isArray(c.buffet_foto) ? [...c.buffet_foto] : [];
  renderBuffetFoto();

  function renderBuffetFoto() {
    const grid = box.querySelector('#buffet-foto-grid');
    if (!grid) return;
    grid.innerHTML = buffetFoto.map((url, i) => `
      <div style="position:relative;width:80px;height:80px;">
        <img src="${esc(url)}" style="width:80px;height:80px;object-fit:cover;border-radius:8px;border:1px solid #e5e7eb;">
        <button data-del-foto="${i}" style="position:absolute;top:-6px;right:-6px;background:#dc2626;border:none;color:white;width:20px;height:20px;border-radius:50%;cursor:pointer;font-size:11px;display:flex;align-items:center;justify-content:center;">✕</button>
      </div>
    `).join('');
    grid.querySelectorAll('[data-del-foto]').forEach(btn => {
      btn.onclick = () => { buffetFoto.splice(+btn.dataset.delFoto, 1); renderBuffetFoto(); };
    });
  }

  // Upload foto buffet
  box.querySelector('#cfg-buffet-foto-input').onchange = async function() {
    const files = Array.from(this.files);
    const prog = box.querySelector('#cfg-foto-progress');
    prog.style.display = '';
    for (const file of files) {
      const url = await uploadFile(file, 'colazione-buffet');
      if (url) buffetFoto.push(url);
    }
    prog.style.display = 'none';
    renderBuffetFoto();
  };

  // Upload PDF
  box.querySelector('#cfg-buffet-pdf-file').onchange = async function() {
    const file = this.files[0]; if (!file) return;
    const prog = box.querySelector('#cfg-pdf-progress');
    prog.style.display = '';
    const url = await uploadFile(file, 'colazione-pdf');
    prog.style.display = 'none';
    if (url) box.querySelector('#cfg-buffet-pdf').value = url;
  };

  // Toggle tipo servizio
  box.querySelectorAll('.tipo-card').forEach(card => {
    card.onclick = () => {
      box.querySelectorAll('.tipo-card').forEach(c => {
        c.style.borderColor = '#e5e7eb'; c.style.background = '#fff';
      });
      card.style.borderColor = '#0E5A7A'; card.style.background = '#f0f9ff';
      const v = card.dataset.v;
      box.querySelector(`input[value="${v}"]`).checked = true;
      const showBuffet = ['buffet','misto'].includes(v);
      box.querySelector('#cfg-buffet-section').style.display = showBuffet ? '' : 'none';
    };
  });

  // Toggle prezzo incluso
  box.querySelector('#cfg-inclusa').onchange = function() {
    box.querySelector('#cfg-prezzo-wrap').style.display = this.checked ? 'none' : '';
  };

  // Salva
  box.querySelector('#btn-salva-config').onclick = async () => {
    const esito = box.querySelector('#cfg-esito');
    esito.innerHTML = '<span style="color:#64748b;">⏳ Salvataggio...</span>';

    const tipo = box.querySelector('input[name="tipo_servizio"]:checked')?.value || 'carta';
    const payload = {
      azienda_id:          aziendaId,
      tipo_servizio:       tipo,
      orario_inizio:       box.querySelector('#cfg-orario-inizio').value,
      orario_fine:         box.querySelector('#cfg-orario-fine').value,
      slot_minuti:         parseInt(box.querySelector('#cfg-slot').value),
      ordine_entro_ore:    parseInt(box.querySelector('#cfg-ordine-entro').value),
      inclusa_nel_prezzo:  box.querySelector('#cfg-inclusa').checked,
      prezzo_per_persona:  parseFloat(box.querySelector('#cfg-prezzo').value) || 0,
      buffet_descrizione:  box.querySelector('#cfg-buffet-desc')?.value.trim() || null,
      buffet_pdf_url:      box.querySelector('#cfg-buffet-pdf')?.value.trim() || null,
      buffet_foto:         buffetFoto,
      attivo:              true,
    };

    const { error } = await supabase
      .from('hotel_colazione_config')
      .upsert(payload, { onConflict: 'azienda_id' });

    if (error) {
      esito.innerHTML = `<span style="color:#dc2626;">❌ ${esc(error.message)}</span>`;
    } else {
      esito.innerHTML = '<span style="color:#059669;">✅ Configurazione salvata!</span>';
      setTimeout(() => esito.textContent = '', 3000);
    }
  };
}

// ════════════════════════════════════════════════════════════════
// TAB 2 — MENU ALLA CARTA
// ════════════════════════════════════════════════════════════════
async function renderTabMenu(box) {
  const aziendaId = window.state?.azienda?.id;
  box.innerHTML = '<div style="color:#94a3b8;padding:20px;">Caricamento...</div>';

  const { data: items } = await supabase
    .from('hotel_colazione_menu')
    .select('*')
    .eq('azienda_id', aziendaId)
    .order('categoria').order('ordine');

  let editingId = null;

  box.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
      <div>
        <div style="font-size:16px;font-weight:700;">📋 Menu alla carta</div>
        <div style="font-size:12px;color:#64748b;">Piatti ordinabili dagli ospiti per la colazione</div>
      </div>
      <button id="btn-nuovo-piatto" style="background:#0E5A7A;color:white;border:none;padding:9px 18px;border-radius:10px;cursor:pointer;font-size:13px;font-weight:600;">+ Nuovo piatto</button>
    </div>

    <div id="lista-menu"></div>

    <div id="form-piatto-wrap" style="display:none;background:white;border:1px solid #e5e7eb;border-radius:14px;padding:20px;margin-top:16px;">
      <div style="font-size:15px;font-weight:700;margin-bottom:16px;" id="form-piatto-title">Nuovo piatto</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;">
        <div>
          <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Nome piatto *</label>
          <input id="piatto-nome" class="input" placeholder="Es. Uova strapazzate">
        </div>
        <div>
          <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Categoria</label>
          <select id="piatto-cat" class="input">
            ${CATEGORIE_MENU.map(c => `<option value="${c}">${c}</option>`).join('')}
          </select>
        </div>
        <div>
          <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Emoji</label>
          <input id="piatto-emoji" class="input" placeholder="🥚" style="max-width:80px;">
        </div>
        <div>
          <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Prezzo (€)</label>
          <input type="number" id="piatto-prezzo" class="input" min="0" step="0.50" value="0">
        </div>
      </div>
      <div style="margin-top:14px;">
        <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Descrizione</label>
        <textarea id="piatto-desc" class="input" rows="2" placeholder="Ingredienti, preparazione..."></textarea>
      </div>
      <div style="margin-top:14px;">
        <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:8px;">Allergeni</label>
        <div style="display:flex;flex-wrap:wrap;gap:8px;" id="allergeni-wrap">
          ${ALLERGENI_LIST.map(a => `
            <label style="display:flex;align-items:center;gap:4px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;padding:5px 10px;cursor:pointer;font-size:12px;">
              <input type="checkbox" class="chk-allergene" value="${a.id}" style="accent-color:#0E5A7A;">
              ${a.emoji} ${a.label}
            </label>
          `).join('')}
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:10px;margin-top:14px;">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;">
          <input type="checkbox" id="piatto-solo-buffet" style="accent-color:#0E5A7A;">
          Solo nel buffet (non ordinabile)
        </label>
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;margin-left:16px;">
          <input type="checkbox" id="piatto-disponibile" checked style="accent-color:#0E5A7A;">
          Disponibile
        </label>
      </div>
      <div style="margin-top:14px;">
        <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Foto</label>
        <div style="display:flex;gap:8px;align-items:center;">
          <input id="piatto-foto" class="input" style="flex:1;" placeholder="URL foto">
          <label style="background:#f0f9ff;color:#0E5A7A;border:1px solid #bae6fd;padding:8px 14px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:600;white-space:nowrap;">
            📷 Carica
            <input type="file" id="piatto-foto-file" accept="image/*" style="display:none;">
          </label>
        </div>
      </div>
      <div id="piatto-esito" style="font-size:13px;min-height:16px;margin-top:10px;"></div>
      <div style="display:flex;gap:10px;margin-top:16px;">
        <button id="btn-salva-piatto" style="background:#0E5A7A;color:white;border:none;padding:10px 24px;border-radius:10px;cursor:pointer;font-size:14px;font-weight:600;">💾 Salva</button>
        <button id="btn-annulla-piatto" style="background:#f1f5f9;color:#374151;border:none;padding:10px 18px;border-radius:10px;cursor:pointer;">Annulla</button>
      </div>
    </div>
  `;

  function renderLista(lista) {
    const el = box.querySelector('#lista-menu');
    if (!lista?.length) {
      el.innerHTML = '<div style="color:#94a3b8;font-size:13px;padding:12px 0;">Nessun piatto nel menu. Clicca "+ Nuovo piatto" per iniziare.</div>';
      return;
    }
    // Raggruppa per categoria
    const gruppi = {};
    lista.forEach(p => { if (!gruppi[p.categoria||'Altro']) gruppi[p.categoria||'Altro'] = []; gruppi[p.categoria||'Altro'].push(p); });
    el.innerHTML = Object.entries(gruppi).map(([cat, piatti]) => `
      <div style="margin-bottom:20px;">
        <div style="font-size:12px;font-weight:800;color:#0E5A7A;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px;">${esc(cat)}</div>
        ${piatti.map(p => `
          <div style="background:white;border:1px solid #e5e7eb;border-radius:12px;padding:14px;margin-bottom:8px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
            ${p.foto_url ? `<img src="${esc(p.foto_url)}" style="width:56px;height:56px;object-fit:cover;border-radius:10px;flex-shrink:0;">` : `<div style="width:56px;height:56px;background:#f1f5f9;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0;">${p.emoji||'🍽️'}</div>`}
            <div style="flex:1;min-width:140px;">
              <div style="font-weight:700;font-size:14px;">${esc(p.nome)} ${p.disponibile===false?'<span style="color:#dc2626;font-size:11px;">(non disponibile)</span>':''}</div>
              ${p.descrizione?`<div style="font-size:12px;color:#64748b;margin-top:2px;">${esc(p.descrizione)}</div>`:''}
              ${p.allergeni?.length?`<div style="font-size:11px;color:#92400e;margin-top:3px;">${p.allergeni.map(a=>ALLERGENI_LIST.find(x=>x.id===a)?.emoji||'').join(' ')}</div>`:''}
            </div>
            <div style="font-weight:700;color:#0E5A7A;">${p.prezzo>0?'€'+Number(p.prezzo).toFixed(2):'Incluso'}</div>
            <div style="display:flex;gap:6px;">
              <button data-edit="${p.id}" style="background:#f0f9ff;border:1px solid #bae6fd;padding:6px 12px;border-radius:8px;cursor:pointer;font-size:12px;color:#0E5A7A;">✏️</button>
              <button data-del="${p.id}" style="background:#fee2e2;border:none;padding:6px 10px;border-radius:8px;cursor:pointer;font-size:12px;color:#dc2626;">🗑</button>
            </div>
          </div>
        `).join('')}
      </div>
    `).join('');

    el.querySelectorAll('[data-edit]').forEach(btn => apriFormPiatto(lista.find(p=>p.id===btn.dataset.edit)));
    el.querySelectorAll('[data-del]').forEach(btn => {
      btn.onclick = async () => {
        if (!confirm('Eliminare questo piatto?')) return;
        await supabase.from('hotel_colazione_menu').delete().eq('id', btn.dataset.del);
        location.reload();
      };
    });
  }

  function apriFormPiatto(piatto = null) {
    editingId = piatto?.id || null;
    box.querySelector('#form-piatto-title').textContent = piatto ? 'Modifica piatto' : 'Nuovo piatto';
    box.querySelector('#piatto-nome').value = piatto?.nome || '';
    box.querySelector('#piatto-cat').value = piatto?.categoria || 'Dolce';
    box.querySelector('#piatto-emoji').value = piatto?.emoji || '';
    box.querySelector('#piatto-prezzo').value = piatto?.prezzo || 0;
    box.querySelector('#piatto-desc').value = piatto?.descrizione || '';
    box.querySelector('#piatto-foto').value = piatto?.foto_url || '';
    box.querySelector('#piatto-solo-buffet').checked = !!piatto?.solo_buffet;
    box.querySelector('#piatto-disponibile').checked = piatto?.disponibile !== false;
    box.querySelectorAll('.chk-allergene').forEach(chk => {
      chk.checked = piatto?.allergeni?.includes(chk.value) || false;
    });
    box.querySelector('#form-piatto-wrap').style.display = '';
    box.querySelector('#form-piatto-wrap').scrollIntoView({ behavior:'smooth' });
  }

  box.querySelector('#btn-nuovo-piatto').onclick = () => apriFormPiatto(null);
  box.querySelector('#btn-annulla-piatto').onclick = () => { box.querySelector('#form-piatto-wrap').style.display='none'; editingId=null; };

  box.querySelector('#piatto-foto-file').onchange = async function() {
    if (!this.files[0]) return;
    const url = await uploadFile(this.files[0], 'colazione-menu');
    if (url) box.querySelector('#piatto-foto').value = url;
  };

  box.querySelector('#btn-salva-piatto').onclick = async () => {
    const esito = box.querySelector('#piatto-esito');
    const allergeni = Array.from(box.querySelectorAll('.chk-allergene:checked')).map(c=>c.value);
    const payload = {
      azienda_id:   aziendaId,
      nome:         box.querySelector('#piatto-nome').value.trim(),
      categoria:    box.querySelector('#piatto-cat').value,
      emoji:        box.querySelector('#piatto-emoji').value.trim(),
      prezzo:       parseFloat(box.querySelector('#piatto-prezzo').value)||0,
      descrizione:  box.querySelector('#piatto-desc').value.trim()||null,
      foto_url:     box.querySelector('#piatto-foto').value.trim()||null,
      allergeni,
      solo_buffet:  box.querySelector('#piatto-solo-buffet').checked,
      disponibile:  box.querySelector('#piatto-disponibile').checked,
    };
    if (!payload.nome) { esito.innerHTML='<span style="color:#dc2626;">Nome obbligatorio</span>'; return; }

    let error;
    if (editingId) {
      ({ error } = await supabase.from('hotel_colazione_menu').update(payload).eq('id', editingId));
    } else {
      ({ error } = await supabase.from('hotel_colazione_menu').insert(payload));
    }
    if (error) { esito.innerHTML=`<span style="color:#dc2626;">❌ ${esc(error.message)}</span>`; return; }
    esito.innerHTML='<span style="color:#059669;">✅ Salvato!</span>';
    setTimeout(() => renderTabMenu(box), 800);
  };

  renderLista(items);
}

// ════════════════════════════════════════════════════════════════
// TAB 3 — ORDINI DEL GIORNO
// ════════════════════════════════════════════════════════════════
async function renderTabOrdini(box) {
  const aziendaId = window.state?.azienda?.id;
  const oggi = new Date().toISOString().split('T')[0];
  box.innerHTML = '<div style="color:#94a3b8;padding:20px;">Caricamento...</div>';

  async function caricaOrdini(data) {
    const { data: ordini } = await supabase
      .from('hotel_colazione_ordini')
      .select(`*, hotel_prenotazioni(cliente_nome, camera_numero)`)
      .eq('azienda_id', aziendaId)
      .eq('data_colazione', data)
      .order('ora_consegna');
    return ordini || [];
  }

  let dataSelezionata = oggi;
  let ordini = await caricaOrdini(dataSelezionata);

  function render(ords) {
    const statoColor = { in_attesa:'#fef3c7', preparato:'#dbeafe', consegnato:'#dcfce7', annullato:'#fee2e2' };
    const statoText  = { in_attesa:'#92400e', preparato:'#1d4ed8', consegnato:'#166534', annullato:'#991b1b' };

    box.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
        <div style="font-size:16px;font-weight:700;">🌅 Ordini colazione</div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
          <input type="date" id="data-sel" value="${dataSelezionata}" class="input" style="max-width:160px;">
          <button id="btn-oggi" style="background:#f1f5f9;border:none;padding:8px 14px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:600;">Oggi</button>
        </div>
      </div>

      ${!ords.length ? `
        <div style="background:white;border:1px solid #e5e7eb;border-radius:12px;padding:32px;text-align:center;color:#94a3b8;">
          <div style="font-size:32px;margin-bottom:8px;">☕</div>
          <div style="font-weight:600;">Nessun ordine per il ${formatData(dataSelezionata)}</div>
        </div>
      ` : `
        <!-- RIEPILOGO RAPIDO -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin-bottom:20px;">
          ${[
            { label:'Totale ordini', val:ords.length, color:'#0E5A7A' },
            { label:'In attesa',     val:ords.filter(o=>o.stato==='in_attesa').length,  color:'#92400e' },
            { label:'Preparati',     val:ords.filter(o=>o.stato==='preparato').length,  color:'#1d4ed8' },
            { label:'Consegnati',    val:ords.filter(o=>o.stato==='consegnato').length, color:'#166534' },
          ].map(s => `
            <div style="background:white;border:1px solid #e5e7eb;border-radius:12px;padding:14px;text-align:center;">
              <div style="font-size:24px;font-weight:800;color:${s.color};">${s.val}</div>
              <div style="font-size:11px;color:#64748b;font-weight:600;">${s.label}</div>
            </div>
          `).join('')}
        </div>

        <!-- ALERT INTOLLERANZE -->
        ${ords.some(o=>o.intolleranze?.length) ? `
          <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:12px;padding:14px;margin-bottom:16px;">
            <div style="font-size:13px;font-weight:700;color:#92400e;margin-bottom:8px;">⚠️ Intolleranze segnalate oggi</div>
            ${ords.filter(o=>o.intolleranze?.length).map(o => `
              <div style="font-size:12px;color:#78350f;margin-bottom:4px;">
                <strong>${esc(o.camera_numero||o.hotel_prenotazioni?.camera_numero||'Camera ?')}</strong> —
                ${esc(o.ospite_nome||o.hotel_prenotazioni?.cliente_nome||'Ospite')} —
                ${o.intolleranze.map(i=>ALLERGENI_LIST.find(a=>a.id===i)?.emoji+' '+ALLERGENI_LIST.find(a=>a.id===i)?.label||i).join(', ')}
              </div>
            `).join('')}
          </div>
        ` : ''}

        <!-- LISTA ORDINI -->
        ${ords.map(o => `
          <div style="background:white;border:1px solid #e5e7eb;border-radius:14px;padding:16px;margin-bottom:12px;">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;margin-bottom:12px;">
              <div>
                <div style="font-weight:700;font-size:15px;">
                  🛏️ ${esc(o.camera_numero||o.hotel_prenotazioni?.camera_numero||'Camera ?')}
                  — ${esc(o.ospite_nome||o.hotel_prenotazioni?.cliente_nome||'Ospite')}
                </div>
                <div style="font-size:12px;color:#64748b;margin-top:2px;">
                  🕐 ${o.ora_consegna||'--'} · ${o.num_persone||1} persona${(o.num_persone||1)>1?'e':''}
                  · ${esc(o.tipo_servizio||'carta')}
                </div>
                ${o.intolleranze?.length ? `
                  <div style="font-size:12px;color:#dc2626;margin-top:3px;font-weight:600;">
                    ⚠️ ${o.intolleranze.map(i=>ALLERGENI_LIST.find(a=>a.id===i)?.emoji+' '+ALLERGENI_LIST.find(a=>a.id===i)?.label||i).join(', ')}
                  </div>
                ` : ''}
              </div>
              <span style="background:${statoColor[o.stato]||'#f1f5f9'};color:${statoText[o.stato]||'#374151'};padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;">
                ${o.stato||'in_attesa'}
              </span>
            </div>

            <!-- Items ordinati -->
            ${o.items?.length ? `
              <div style="background:#f8fafc;border-radius:10px;padding:10px;margin-bottom:12px;">
                ${o.items.map(item => `
                  <div style="display:flex;justify-content:space-between;font-size:13px;padding:3px 0;">
                    <span>${esc(item.nome||item.label||'—')} ${item.qty>1?`×${item.qty}`:''}</span>
                    ${item.prezzo>0?`<span style="color:#0E5A7A;font-weight:600;">€${(item.prezzo*(item.qty||1)).toFixed(2)}</span>`:''}
                  </div>
                `).join('')}
                ${o.importo_totale>0?`<div style="border-top:1px solid #e5e7eb;margin-top:6px;padding-top:6px;font-weight:700;display:flex;justify-content:space-between;"><span>Totale</span><span>€${Number(o.importo_totale).toFixed(2)}</span></div>`:''}
              </div>
            ` : ''}

            ${o.note?`<div style="font-size:12px;color:#92400e;background:#fffbeb;border-radius:8px;padding:8px;margin-bottom:10px;">📝 ${esc(o.note)}</div>`:''}

            <!-- Azioni stato -->
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              ${o.stato==='in_attesa'?`<button data-set-stato="${o.id}" data-stato="preparato" style="background:#dbeafe;color:#1d4ed8;border:none;padding:7px 14px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700;">✓ Segna preparato</button>`:''}
              ${o.stato==='preparato'?`<button data-set-stato="${o.id}" data-stato="consegnato" style="background:#dcfce7;color:#166534;border:none;padding:7px 14px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700;">✓ Segna consegnato</button>`:''}
              ${o.stato!=='annullato'&&o.stato!=='consegnato'?`<button data-set-stato="${o.id}" data-stato="annullato" style="background:#fee2e2;color:#dc2626;border:none;padding:7px 14px;border-radius:8px;cursor:pointer;font-size:12px;">Annulla</button>`:''}
            </div>
          </div>
        `).join('')}
      `}
    `;

    box.querySelector('#data-sel').onchange = async function() {
      dataSelezionata = this.value;
      const nuovi = await caricaOrdini(dataSelezionata);
      render(nuovi);
    };
    box.querySelector('#btn-oggi').onclick = async () => {
      dataSelezionata = oggi;
      box.querySelector('#data-sel').value = oggi;
      const nuovi = await caricaOrdini(oggi);
      render(nuovi);
    };
    box.querySelectorAll('[data-set-stato]').forEach(btn => {
      btn.onclick = async () => {
        await supabase.from('hotel_colazione_ordini')
          .update({ stato: btn.dataset.stato, ...(btn.dataset.stato==='consegnato'?{consegnato_il:new Date().toISOString()}:{}) })
          .eq('id', btn.dataset.setStato);
        const nuovi = await caricaOrdini(dataSelezionata);
        render(nuovi);
      };
    });
  }

  render(ordini);
}

// ════════════════════════════════════════════════════════════════
// TAB 4 — MINIBAR
// ════════════════════════════════════════════════════════════════
async function renderTabMinibar(box) {
  const aziendaId = window.state?.azienda?.id;
  box.innerHTML = '<div style="color:#94a3b8;padding:20px;">Caricamento...</div>';

  const [{ data: prodotti }, { data: camere }] = await Promise.all([
    supabase.from('hotel_minibar_prodotti').select('*').eq('azienda_id', aziendaId).order('categoria').order('ordine'),
    supabase.from('hotel_camere').select('id,numero,nome').eq('azienda_id', aziendaId).order('numero'),
  ]);

  let subTab = 'prodotti';
  let editingId = null;

  box.innerHTML = `
    <div style="display:flex;gap:8px;margin-bottom:20px;border-bottom:1px solid #e5e7eb;padding-bottom:0;">
      <button data-sub="prodotti" style="padding:8px 16px;border:none;background:none;cursor:pointer;font-size:13px;font-weight:600;color:#0E5A7A;border-bottom:2px solid #0E5A7A;">🍾 Prodotti</button>
      <button data-sub="consumi" style="padding:8px 16px;border:none;background:none;cursor:pointer;font-size:13px;font-weight:600;color:#64748b;border-bottom:2px solid transparent;">📊 Consumi</button>
    </div>
    <div id="minibar-content"></div>
  `;

  function switchSub(id) {
    subTab = id;
    box.querySelectorAll('[data-sub]').forEach(btn => {
      const att = btn.dataset.sub === id;
      btn.style.color = att ? '#0E5A7A' : '#64748b';
      btn.style.borderBottomColor = att ? '#0E5A7A' : 'transparent';
    });
    if (id === 'prodotti') renderProdotti();
    else renderConsumi();
  }

  box.querySelectorAll('[data-sub]').forEach(btn => btn.onclick = () => switchSub(btn.dataset.sub));

  // ── Prodotti ────────────────────────────────────────────────
  function renderProdotti() {
    const mc = box.querySelector('#minibar-content');
    const gruppi = {};
    (prodotti||[]).forEach(p => { if (!gruppi[p.categoria||'Altro']) gruppi[p.categoria||'Altro'] = []; gruppi[p.categoria||'Altro'].push(p); });

    mc.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
        <div style="font-size:15px;font-weight:700;">🍾 Prodotti minibar</div>
        <button id="btn-nuovo-prod" style="background:#0E5A7A;color:white;border:none;padding:9px 18px;border-radius:10px;cursor:pointer;font-size:13px;font-weight:600;">+ Nuovo prodotto</button>
      </div>

      <div id="lista-prod">
        ${!(prodotti?.length) ? '<div style="color:#94a3b8;font-size:13px;">Nessun prodotto. Aggiungi i prodotti del minibar.</div>' :
          Object.entries(gruppi).map(([cat, prods]) => `
            <div style="margin-bottom:16px;">
              <div style="font-size:11px;font-weight:800;color:#0E5A7A;text-transform:uppercase;margin-bottom:8px;">${esc(cat)}</div>
              ${prods.map(p => `
                <div style="background:white;border:1px solid #e5e7eb;border-radius:12px;padding:12px;margin-bottom:6px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
                  ${p.foto_url?`<img src="${esc(p.foto_url)}" style="width:44px;height:44px;object-fit:cover;border-radius:8px;">`:`<div style="width:44px;height:44px;background:#f1f5f9;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:20px;">🍾</div>`}
                  <div style="flex:1;">
                    <div style="font-weight:700;font-size:14px;">${esc(p.nome)}</div>
                    <div style="font-size:12px;color:#0E5A7A;font-weight:600;">€${Number(p.prezzo).toFixed(2)}</div>
                  </div>
                  <span style="background:${p.attivo?'#dcfce7':'#fee2e2'};color:${p.attivo?'#166534':'#dc2626'};padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;">${p.attivo?'Attivo':'Inattivo'}</span>
                  <button data-edit-prod="${p.id}" style="background:#f0f9ff;border:1px solid #bae6fd;padding:6px 12px;border-radius:8px;cursor:pointer;font-size:12px;color:#0E5A7A;">✏️</button>
                </div>
              `).join('')}
            </div>
          `).join('')
        }
      </div>

      <div id="form-prod-wrap" style="display:none;background:white;border:1px solid #e5e7eb;border-radius:14px;padding:20px;margin-top:16px;">
        <div style="font-size:15px;font-weight:700;margin-bottom:16px;" id="form-prod-title">Nuovo prodotto</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;">
          <div>
            <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Nome *</label>
            <input id="prod-nome" class="input" placeholder="Es. Acqua minerale 50cl">
          </div>
          <div>
            <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Categoria</label>
            <select id="prod-cat" class="input">
              ${CATEGORIE_MINIBAR.map(c=>`<option>${c}</option>`).join('')}
            </select>
          </div>
          <div>
            <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Prezzo (€)</label>
            <input type="number" id="prod-prezzo" class="input" min="0" step="0.10" value="0">
          </div>
          <div style="display:flex;align-items:center;gap:8px;padding-top:22px;">
            <input type="checkbox" id="prod-attivo" checked style="accent-color:#0E5A7A;">
            <label for="prod-attivo" style="font-size:13px;cursor:pointer;">Attivo</label>
          </div>
        </div>
        <div style="margin-top:14px;">
          <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Foto</label>
          <div style="display:flex;gap:8px;align-items:center;">
            <input id="prod-foto" class="input" style="flex:1;" placeholder="URL foto">
            <label style="background:#f0f9ff;color:#0E5A7A;border:1px solid #bae6fd;padding:8px 14px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:600;">
              📷 Carica
              <input type="file" id="prod-foto-file" accept="image/*" style="display:none;">
            </label>
          </div>
        </div>
        <div id="prod-esito" style="font-size:13px;min-height:14px;margin-top:10px;"></div>
        <div style="display:flex;gap:10px;margin-top:14px;">
          <button id="btn-salva-prod" style="background:#0E5A7A;color:white;border:none;padding:10px 22px;border-radius:10px;cursor:pointer;font-size:14px;font-weight:600;">💾 Salva</button>
          <button id="btn-annulla-prod" style="background:#f1f5f9;color:#374151;border:none;padding:10px 16px;border-radius:10px;cursor:pointer;">Annulla</button>
        </div>
      </div>
    `;

    mc.querySelector('#btn-nuovo-prod').onclick = () => apriFormProd();
    mc.querySelector('#btn-annulla-prod').onclick = () => { mc.querySelector('#form-prod-wrap').style.display='none'; editingId=null; };

    mc.querySelectorAll('[data-edit-prod]').forEach(btn => {
      btn.onclick = () => apriFormProd((prodotti||[]).find(p=>p.id===btn.dataset.editProd));
    });

    mc.querySelector('#prod-foto-file').onchange = async function() {
      if (!this.files[0]) return;
      const url = await uploadFile(this.files[0], 'minibar');
      if (url) mc.querySelector('#prod-foto').value = url;
    };

    mc.querySelector('#btn-salva-prod').onclick = async () => {
      const esito = mc.querySelector('#prod-esito');
      const payload = {
        azienda_id: aziendaId,
        nome:       mc.querySelector('#prod-nome').value.trim(),
        categoria:  mc.querySelector('#prod-cat').value,
        prezzo:     parseFloat(mc.querySelector('#prod-prezzo').value)||0,
        foto_url:   mc.querySelector('#prod-foto').value.trim()||null,
        attivo:     mc.querySelector('#prod-attivo').checked,
      };
      if (!payload.nome) { esito.innerHTML='<span style="color:#dc2626;">Nome obbligatorio</span>'; return; }
      let error;
      if (editingId) {
        ({ error } = await supabase.from('hotel_minibar_prodotti').update(payload).eq('id', editingId));
      } else {
        ({ error } = await supabase.from('hotel_minibar_prodotti').insert(payload));
      }
      if (error) { esito.innerHTML=`<span style="color:#dc2626;">❌ ${esc(error.message)}</span>`; return; }
      esito.innerHTML='<span style="color:#059669;">✅ Salvato!</span>';
      setTimeout(() => renderTabMinibar(box), 800);
    };
  }

  function apriFormProd(prod = null) {
    editingId = prod?.id || null;
    const mc = box.querySelector('#minibar-content');
    mc.querySelector('#form-prod-title').textContent = prod ? 'Modifica prodotto' : 'Nuovo prodotto';
    mc.querySelector('#prod-nome').value = prod?.nome || '';
    mc.querySelector('#prod-cat').value = prod?.categoria || 'Bibite';
    mc.querySelector('#prod-prezzo').value = prod?.prezzo || 0;
    mc.querySelector('#prod-foto').value = prod?.foto_url || '';
    mc.querySelector('#prod-attivo').checked = prod?.attivo !== false;
    mc.querySelector('#form-prod-wrap').style.display = '';
    mc.querySelector('#form-prod-wrap').scrollIntoView({ behavior:'smooth' });
  }

  // ── Consumi ─────────────────────────────────────────────────
  async function renderConsumi() {
    const mc = box.querySelector('#minibar-content');
    mc.innerHTML = '<div style="color:#94a3b8;padding:12px;">Caricamento consumi...</div>';

    const oggi = new Date().toISOString().split('T')[0];
    const { data: consumi } = await supabase
      .from('hotel_minibar_consumi')
      .select(`*, hotel_minibar_prodotti(nome,prezzo), hotel_camere(numero)`)
      .eq('azienda_id', aziendaId)
      .gte('data_consumo', oggi)
      .order('created_at', { ascending: false });

    // Raggruppa per camera
    const perCamera = {};
    (consumi||[]).forEach(c => {
      const cam = c.hotel_camere?.numero || '?';
      if (!perCamera[cam]) perCamera[cam] = { totale:0, items:[] };
      perCamera[cam].items.push(c);
      perCamera[cam].totale += c.importo || 0;
    });

    mc.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
        <div style="font-size:15px;font-weight:700;">📊 Consumi minibar oggi</div>
        <button id="btn-registra-consumo" style="background:#0E5A7A;color:white;border:none;padding:9px 18px;border-radius:10px;cursor:pointer;font-size:13px;font-weight:600;">+ Registra consumo</button>
      </div>

      ${!Object.keys(perCamera).length ? '<div style="color:#94a3b8;font-size:13px;">Nessun consumo registrato oggi.</div>' :
        Object.entries(perCamera).map(([cam, data]) => `
          <div style="background:white;border:1px solid #e5e7eb;border-radius:14px;padding:16px;margin-bottom:12px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
              <div style="font-weight:700;font-size:15px;">🛏️ Camera ${esc(cam)}</div>
              <div style="font-weight:700;color:#0E5A7A;">€${Number(data.totale).toFixed(2)}</div>
            </div>
            ${data.items.map(c => `
              <div style="display:flex;justify-content:space-between;font-size:13px;padding:4px 0;border-bottom:1px solid #f1f5f9;">
                <span>${esc(c.hotel_minibar_prodotti?.nome||'—')} ×${c.quantita||1}</span>
                <span style="color:#0E5A7A;font-weight:600;">€${Number(c.importo||0).toFixed(2)}</span>
              </div>
            `).join('')}
          </div>
        `).join('')
      }

      <!-- FORM REGISTRA CONSUMO -->
      <div id="form-consumo-wrap" style="display:none;background:white;border:1px solid #e5e7eb;border-radius:14px;padding:20px;margin-top:16px;">
        <div style="font-size:15px;font-weight:700;margin-bottom:16px;">Registra consumo</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;">
          <div>
            <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Camera</label>
            <select id="cons-camera" class="input">
              <option value="">-- Seleziona --</option>
              ${(camere||[]).map(c=>`<option value="${c.id}">${esc(c.numero||c.nome)}</option>`).join('')}
            </select>
          </div>
          <div>
            <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Prodotto</label>
            <select id="cons-prodotto" class="input">
              <option value="">-- Seleziona --</option>
              ${(prodotti||[]).filter(p=>p.attivo).map(p=>`<option value="${p.id}" data-prezzo="${p.prezzo}">${esc(p.nome)} — €${Number(p.prezzo).toFixed(2)}</option>`).join('')}
            </select>
          </div>
          <div>
            <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Quantità</label>
            <input type="number" id="cons-qty" class="input" min="1" value="1">
          </div>
        </div>
        <div style="margin-top:14px;">
          <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Note</label>
          <input id="cons-note" class="input" placeholder="Opzionale">
        </div>
        <div id="cons-esito" style="font-size:13px;min-height:14px;margin-top:10px;"></div>
        <div style="display:flex;gap:10px;margin-top:14px;">
          <button id="btn-salva-consumo" style="background:#0E5A7A;color:white;border:none;padding:10px 22px;border-radius:10px;cursor:pointer;font-size:14px;font-weight:600;">💾 Registra</button>
          <button id="btn-annulla-consumo" style="background:#f1f5f9;color:#374151;border:none;padding:10px 16px;border-radius:10px;cursor:pointer;">Annulla</button>
        </div>
      </div>
    `;

    mc.querySelector('#btn-registra-consumo').onclick = () => {
      mc.querySelector('#form-consumo-wrap').style.display = '';
    };
    mc.querySelector('#btn-annulla-consumo').onclick = () => {
      mc.querySelector('#form-consumo-wrap').style.display = 'none';
    };

    mc.querySelector('#btn-salva-consumo').onclick = async () => {
      const esito = mc.querySelector('#cons-esito');
      const cameraId  = mc.querySelector('#cons-camera').value;
      const prodId    = mc.querySelector('#cons-prodotto').value;
      const qty       = parseInt(mc.querySelector('#cons-qty').value)||1;
      const note      = mc.querySelector('#cons-note').value.trim()||null;
      if (!cameraId || !prodId) { esito.innerHTML='<span style="color:#dc2626;">Seleziona camera e prodotto</span>'; return; }

      const sel = mc.querySelector('#cons-prodotto');
      const prezzoUnit = parseFloat(sel.options[sel.selectedIndex].dataset.prezzo)||0;
      const importo = prezzoUnit * qty;

      const { error } = await supabase.from('hotel_minibar_consumi').insert({
        azienda_id:     aziendaId,
        camera_id:      cameraId,
        prodotto_id:    prodId,
        quantita:       qty,
        prezzo_unitario: prezzoUnit,
        importo,
        note,
        data_consumo:   oggi,
      });
      if (error) { esito.innerHTML=`<span style="color:#dc2626;">❌ ${esc(error.message)}</span>`; return; }
      esito.innerHTML='<span style="color:#059669;">✅ Consumo registrato!</span>';
      setTimeout(() => renderConsumi(), 800);
    };
  }

  switchSub('prodotti');
}

// ════════════════════════════════════════════════════════════════
// UTILS
// ════════════════════════════════════════════════════════════════
async function uploadFile(file, prefix) {
  const aziendaId = window.state?.azienda?.id;
  const ext = file.name.split('.').pop();
  const path = `${aziendaId}/${prefix}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('media-aziende').upload(path, file, { upsert:true, contentType:file.type });
  if (error) { console.error('Upload error:', error); return null; }
  const { data } = supabase.storage.from('media-aziende').getPublicUrl(path);
  return data.publicUrl;
}

function formatData(d) {
  if (!d) return '--';
  const p = d.split('-');
  return `${p[2]}/${p[1]}/${p[0]}`;
}

function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

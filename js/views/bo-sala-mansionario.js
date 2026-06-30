// js/views/bo-sala-mansionario.js
// Mansionario di Sala — procedure operative per manager e admin
// Struttura: lista procedure → editor con fasi → Tony vocale per compilare

import { supabase as supabaseHotelClient } from "../supabaseClient.js";

// Fallback locali per createPageLayout/createCard — l'hotel non ha pageLayout.js
function createPageLayout({ title, subtitle, content }) {
  return `
    <div class="page-header">
      <div>
        <div class="page-title">${title}</div>
        ${subtitle ? `<div class="page-sub">${subtitle}</div>` : ""}
      </div>
    </div>
    <div class="page-body">${content}</div>
  `;
}
function createCard({ title, body }) {
  return `
    <div class="card" style="background:white;border:1px solid #e5e7eb;border-radius:14px;padding:18px;margin-bottom:16px;">
      ${title ? `<div style="font-weight:700;font-size:14px;margin-bottom:12px;">${title}</div>` : ""}
      ${body}
    </div>
  `;
}

const supa = () => window.supabaseClient || window.supabase || supabaseHotelClient;

const CATEGORIE = [
  { id: "mise_en_place", label: "Mise en Place",     icon: "🍽️" },
  { id: "accoglienza",   label: "Accoglienza",        icon: "🤝" },
  { id: "servizio",      label: "Servizio al Tavolo", icon: "🫗" },
  { id: "vendita",       label: "Vendita & Upselling",icon: "💬" },
  { id: "operativo",     label: "Operativo Turno",    icon: "📋" },
  { id: "igiene",        label: "Igiene & HACCP",     icon: "🧹" },
];

const DIFFICOLTA = [
  { id: "base",     label: "Base",     color: "#16a34a" },
  { id: "medio",    label: "Medio",    color: "#d97706" },
  { id: "avanzato", label: "Avanzato", color: "#dc2626" },
];


// ═══════════════════════════════════════════════════════════════
// CONTESTI — stesso modulo per sala, cucina, hotel, tasting
// ═══════════════════════════════════════════════════════════════
const CONTESTI = {
  sala:     { label: "Sala",    icon: "🪑", colore: "#0E5A7A" },
  cucina:   { label: "Cucina",  icon: "👨‍🍳", colore: "#b45309" },
  hotel:    { label: "Hotel",   icon: "🏨", colore: "#7c3aed" },
  tasting:  { label: "Tasting", icon: "🍷", colore: "#b91c1c" },
  generale: { label: "Generale",icon: "📋", colore: "#374151" },
};

function getContesto() {
  // 1. Legge ?contesto= dall'hash
  const hash = window.location.hash || "";
  const mParam = hash.match(/[?&]contesto=([^&]+)/);
  if (mParam) return mParam[1];

  // 2. Estrae il contesto dal nome della route
  //    #/mansionario-cucina → cucina
  //    #/mansionario-tasting → tasting
  //    #/mansionario-sala → sala
  const mRoute = hash.match(/#\/mansionario-([^/?&]+)/);
  if (mRoute && mRoute[1] !== "controllo" && mRoute[1] !== "operatore") {
    return mRoute[1]; // cucina | tasting | sala | hotel
  }

  // 3. Legge dal search param
  const sp = new URLSearchParams(window.location.search);
  if (sp.get("contesto")) return sp.get("contesto");

  // 4. Fallback referrer hotel
  if (document.referrer?.includes("hotel.ristoflow-ai")) return "hotel";

  return "sala"; // default
}

const EDGE_TONY = "https://cuhcscpvhypoaplcmtjk.supabase.co/functions/v1/assistente-ai";

let procedureCache = [];
let dipendentiCache = [];
let editingId = null;
let fasiLocali = [];

function getAziendaId() { return window.state?.azienda?.id || null; }
function getSedeId()    { return window.state?.sedeAttiva?.id || null; }
function esc(s)         { return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }

// ═══════════════════════════════════════════════════════════════
// LOAD
// ═══════════════════════════════════════════════════════════════
async function loadProcedure() {
  const contesto = getContesto();
  let query = supa()
    .from("procedure_sala")
    .select("*")
    .eq("azienda_id", getAziendaId())
    .eq("attivo", true);
  // Filtra per contesto (generale è visibile ovunque)
  if (contesto && contesto !== "generale") {
    query = query.in("contesto", [contesto, "generale"]);
  }
  const { data } = await query.order("categoria").order("nome");
  procedureCache = data || [];
}

async function loadFasi(proceduraId) {
  const { data } = await supa()
    .from("procedure_sala_fasi")
    .select("*")
    .eq("procedura_id", proceduraId)
    .order("ordine");
  return data || [];
}

async function loadDipendenti() {
  const { data } = await supa()
    .from("dipendenti")
    .select("id, nome, cognome, mansione")
    .eq("azienda_id", getAziendaId())
    .eq("attivo", true)
    .order("nome");
  dipendentiCache = data || [];
}

// ═══════════════════════════════════════════════════════════════
// RENDER LISTA
// ═══════════════════════════════════════════════════════════════
function renderLista(filtroCategoria = "", filtroTesto = "") {
  const wrap = document.getElementById("ms-lista");
  if (!wrap) return;

  let lista = procedureCache;
  if (filtroCategoria) lista = lista.filter(p => p.categoria === filtroCategoria);
  if (filtroTesto) {
    const q = filtroTesto.toLowerCase();
    lista = lista.filter(p => (p.nome||"").toLowerCase().includes(q) || (p.obiettivo||"").toLowerCase().includes(q));
  }

  // Raggruppa per categoria
  const perCat = {};
  for (const cat of CATEGORIE) perCat[cat.id] = [];
  lista.forEach(p => {
    if (perCat[p.categoria]) perCat[p.categoria].push(p);
    else perCat["servizio"].push(p);
  });

  if (!lista.length) {
    wrap.innerHTML = `<div style="color:#94a3b8;padding:20px;text-align:center;">
      Nessuna procedura trovata.<br>
      <button class="app-button small" style="margin-top:12px;" onclick="document.getElementById('ms-btn-nuova').click()">
        + Crea la prima procedura
      </button>
    </div>`;
    return;
  }

  wrap.innerHTML = CATEGORIE
    .filter(cat => perCat[cat.id]?.length > 0)
    .map(cat => `
      <div style="margin-bottom:24px;">
        <div style="font-size:13px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px;">
          ${cat.icon} ${cat.label}
        </div>
        <div style="display:grid;gap:10px;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));">
          ${perCat[cat.id].map(p => renderCardProcedura(p)).join("")}
        </div>
      </div>
    `).join("");

  // Bind click cards
  wrap.querySelectorAll("[data-open-proc]").forEach(el => {
    el.onclick = () => apriEditor(el.dataset.openProc);
  });
  wrap.querySelectorAll("[data-del-proc]").forEach(el => {
    el.onclick = async (e) => {
      e.stopPropagation();
      if (!confirm(`Eliminare la procedura "${el.dataset.delNome}"?`)) return;
      await supa().from("procedure_sala").update({ attivo: false }).eq("id", el.dataset.delProc);
      await loadProcedure(); renderLista(filtroCategoria, filtroTesto);
    };
  });
  wrap.querySelectorAll("[data-valuta-proc]").forEach(el => {
    el.onclick = (e) => { e.stopPropagation(); apriModalValutazione(el.dataset.valutaProc, el.dataset.valutaNome); };
  });
}

function renderCardProcedura(p) {
  const cat = CATEGORIE.find(c => c.id === p.categoria) || CATEGORIE[2];
  const diff = DIFFICOLTA.find(d => d.id === p.difficolta) || DIFFICOLTA[0];
  return `
    <div data-open-proc="${esc(p.id)}" style="
      background:white;border:1px solid #e5e7eb;border-radius:14px;
      padding:16px;cursor:pointer;position:relative;
      transition:box-shadow .2s;
    "
    onmouseover="this.style.boxShadow='0 4px 20px rgba(0,0,0,.08)'"
    onmouseout="this.style.boxShadow='none'">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:8px;">
        <div style="font-weight:700;font-size:14px;flex:1;">${esc(p.nome)}</div>
        <div style="display:flex;gap:4px;flex-shrink:0;">
          <button data-valuta-proc="${esc(p.id)}" data-valuta-nome="${esc(p.nome)}"
            style="background:#f0fdf4;border:none;border-radius:6px;padding:3px 7px;cursor:pointer;font-size:11px;color:#16a34a;"
            title="Valuta esecuzione">⭐</button>
          <button data-del-proc="${esc(p.id)}" data-del-nome="${esc(p.nome)}"
            style="background:#fee2e2;border:none;border-radius:6px;padding:3px 7px;cursor:pointer;font-size:11px;color:#dc2626;"
            title="Elimina">🗑</button>
        </div>
      </div>
      ${p.obiettivo ? `<div style="font-size:12px;color:#6b7280;margin-bottom:8px;line-height:1.4;">${esc(p.obiettivo.substring(0,80))}${p.obiettivo.length>80?"...":""}</div>` : ""}
      <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
        <span style="background:#f1f5f9;border-radius:20px;padding:2px 8px;font-size:11px;color:#374151;">${cat.icon} ${cat.label}</span>
        <span style="background:${diff.color}20;color:${diff.color};border-radius:20px;padding:2px 8px;font-size:11px;font-weight:600;">${diff.label}</span>
        ${p.durata_min ? `<span style="font-size:11px;color:#6b7280;">⏱ ${p.durata_min} min</span>` : ""}
        ${p.creato_da_tony ? `<span style="font-size:11px;color:#0E5A7A;">🤖 Tony</span>` : ""}
      </div>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════════
// EDITOR PROCEDURA
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// UPLOAD MEDIA (foto/video) — bucket "mansionario"
// ═══════════════════════════════════════════════════════════════
async function uploadMedia(file, percorso) {
  const ext = file.name.split(".").pop().toLowerCase();
  const nome = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const path = `${percorso}/${nome}`;
  const { error } = await supa().storage.from("media").upload(path, file, { upsert: false });
  if (error) throw new Error(error.message);
  const { data } = supa().storage.from("media").getPublicUrl(path);
  return data.publicUrl;
}

function isVideo(url) {
  const ext = (url || "").split("?")[0].split(".").pop().toLowerCase();
  return ["mp4","mov","webm"].includes(ext);
}

function renderMediaPreview(urls, onRemove) {
  if (!urls.length) return '<div style="color:#94a3b8;font-size:12px;">Nessun media</div>';
  const items = urls.map((url, idx) => {
    const tag = isVideo(url)
      ? '<video src="' + esc(url) + '" style="height:70px;border-radius:8px;" controls></video>'
      : '<img src="' + esc(url) + '" style="height:70px;width:70px;object-fit:cover;border-radius:8px;">';
    return '<div style="position:relative;display:inline-block;">'
      + tag
      + '<button onclick="' + onRemove + '(' + idx + ')" style="position:absolute;top:-6px;right:-6px;background:#dc2626;color:white;border:none;width:18px;height:18px;border-radius:50%;cursor:pointer;font-size:10px;line-height:1;">✕</button>'
      + '</div>';
  }).join("");
  return '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">' + items + '</div>';
}

async function apriEditor(id = null) {
  editingId = id;
  fasiLocali = [];

  const overlay = document.getElementById("ms-editor-overlay");
  if (!overlay) return;

  // Reset form
  document.getElementById("ms-f-nome").value = "";
  document.getElementById("ms-f-categoria").value = "servizio";
  document.getElementById("ms-f-difficolta").value = "base";
  document.getElementById("ms-f-durata").value = "";
  document.getElementById("ms-f-contesto").value = getContesto() || "sala";
  document.getElementById("ms-f-obiettivo").value = "";
  document.getElementById("ms-f-errori").value = "";
  document.getElementById("ms-f-standard").value = "";
  document.getElementById("ms-f-materiali").value = "";
  document.getElementById("ms-editor-title").textContent = id ? "Modifica procedura" : "Nuova procedura";

  if (id) {
    const proc = procedureCache.find(p => p.id === id);
    if (proc) {
      document.getElementById("ms-f-nome").value = proc.nome || "";
      document.getElementById("ms-f-categoria").value = proc.categoria || "servizio";
      document.getElementById("ms-f-difficolta").value = proc.difficolta || "base";
      document.getElementById("ms-f-durata").value = proc.durata_min || "";
      document.getElementById("ms-f-contesto").value = proc.contesto || getContesto() || "sala";
      document.getElementById("ms-f-obiettivo").value = proc.obiettivo || "";
      document.getElementById("ms-f-errori").value = proc.errori_comuni || "";
      document.getElementById("ms-f-standard").value = proc.standard_qualita || "";
      document.getElementById("ms-f-materiali").value = (proc.materiali||[]).join(", ");
    }
    fasiLocali = await loadFasi(id);
  }

  renderFasiEditor();
  overlay.style.display = "flex";
  document.getElementById("ms-f-nome").focus();

  // Binding pulsanti editor — qui il DOM è visibile
  const btnSalva = document.getElementById("ms-btn-salva");
  if (btnSalva) btnSalva.onclick = salvaProcedura;
  const btnAddFase = document.getElementById("ms-btn-add-fase");
  if (btnAddFase) btnAddFase.onclick = () => {
    fasiLocali.push({ titolo:"", descrizione_operativa:"", durata_min:0, check_qualita:"", tip_pro:"", errori_comuni:"" });
    renderFasiEditor();
    document.getElementById("ms-fasi-container")?.lastElementChild?.scrollIntoView({ behavior:"smooth" });
  };
  const btnTonyFasi = document.getElementById("ms-btn-tony-fasi");
  if (btnTonyFasi) btnTonyFasi.onclick = () => apriModalTonyProcedura();
}

function chiudiEditor() {
  document.getElementById("ms-editor-overlay").style.display = "none";
  editingId = null;
  fasiLocali = [];
}

function renderFasiEditor() {
  const wrap = document.getElementById("ms-fasi-container");
  if (!wrap) {
    // Container non nel DOM (editor chiuso) — salva solo in memoria
    return;
  }

  if (!fasiLocali.length) {
    wrap.innerHTML = `<div style="color:#94a3b8;font-size:13px;padding:10px 0;">
      Nessuna fase ancora. Aggiungine una manualmente o usa Tony.
    </div>`;
    return;
  }

  wrap.innerHTML = fasiLocali.map((f, idx) => `
    <div class="azienda-card" data-fase-idx="${idx}"
      style="margin-bottom:10px;padding:14px;border-left:4px solid #0E5A7A;">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:10px;">
        <strong style="font-size:14px;">Step ${idx+1}${f.titolo ? " — "+esc(f.titolo) : ""}</strong>
        <div style="display:flex;gap:4px;">
          <button type="button" onclick="msSpostaSu(${idx})" style="background:#f1f5f9;border:none;border-radius:6px;padding:3px 8px;cursor:pointer;">↑</button>
          <button type="button" onclick="msSposta(${idx},1)" style="background:#f1f5f9;border:none;border-radius:6px;padding:3px 8px;cursor:pointer;">↓</button>
          <button type="button" onclick="msElimFase(${idx})" style="background:#fee2e2;border:none;border-radius:6px;padding:3px 8px;cursor:pointer;color:#dc2626;">🗑</button>
        </div>
      </div>
      <div style="display:grid;gap:8px;">
        <input class="input ms-fase-titolo" placeholder="Titolo step *" value="${esc(f.titolo||"")}" style="font-weight:600;">
        <textarea class="input ms-fase-desc" rows="2" placeholder="Descrizione operativa...">${esc(f.descrizione_operativa||"")}</textarea>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <input class="input ms-fase-durata" type="number" placeholder="Durata (min)" value="${f.durata_min||""}">
          <input class="input ms-fase-check" placeholder="Autocontrollo..." value="${esc(f.check_qualita||"")}">
        </div>
        <input class="input ms-fase-tip" placeholder="💡 Tip pro..." value="${esc(f.tip_pro||"")}">
        <div style="margin-top:6px;">
          <div class="ms-fase-media-preview" data-fase-idx="${idx}"></div>
          <label style="display:inline-flex;align-items:center;gap:4px;background:#f8fafc;border:1px dashed #d1d5db;border-radius:8px;padding:6px 10px;cursor:pointer;font-size:11px;color:#6b7280;margin-top:4px;">
            📎 Foto/video step
            <input type="file" class="ms-fase-media-input" data-fase-idx="${idx}" accept="image/*,video/*" multiple style="display:none;">
          </label>
        </div>
        <input class="input ms-fase-errori" placeholder="⚠️ Errori comuni..." value="${esc(f.errori_comuni||"")}">
      </div>
    </div>
  `).join("");

  // Bind input changes — selettore specifico sulle card fase (non sui div media)
  wrap.querySelectorAll(".azienda-card[data-fase-idx]").forEach(card => {
    const idx = Number(card.dataset.faseIdx);
    const bind = (sel, fn) => { const el = card.querySelector(sel); if (el) el.oninput = fn; };
    bind(".ms-fase-titolo",  e => { fasiLocali[idx].titolo = e.target.value; });
    bind(".ms-fase-desc",    e => { fasiLocali[idx].descrizione_operativa = e.target.value; });
    bind(".ms-fase-durata",  e => { fasiLocali[idx].durata_min = Number(e.target.value)||0; });
    bind(".ms-fase-check",   e => { fasiLocali[idx].check_qualita = e.target.value; });
    bind(".ms-fase-tip",     e => { fasiLocali[idx].tip_pro = e.target.value; });
    bind(".ms-fase-errori",  e => { fasiLocali[idx].errori_comuni = e.target.value; });
  });
}

// Espose globalmente per i pulsanti inline
window.msSpostaSu  = (idx) => { if(idx<=0) return; [fasiLocali[idx-1],fasiLocali[idx]]=[fasiLocali[idx],fasiLocali[idx-1]]; renderFasiEditor(); };
window.msSposta    = (idx) => { if(idx>=fasiLocali.length-1) return; [fasiLocali[idx+1],fasiLocali[idx]]=[fasiLocali[idx],fasiLocali[idx+1]]; renderFasiEditor(); };
window.msElimFase  = (idx) => { fasiLocali.splice(idx,1); renderFasiEditor(); };

// ═══════════════════════════════════════════════════════════════
// SAVE
// ═══════════════════════════════════════════════════════════════
async function salvaProcedura() {
  const aziendaId = getAziendaId();
  const nome = document.getElementById("ms-f-nome").value.trim();
  if (!nome) return alert("Inserisci il nome della procedura.");

  const materialiRaw = document.getElementById("ms-f-materiali").value;
  const materiali = materialiRaw ? materialiRaw.split(",").map(s=>s.trim()).filter(Boolean) : [];

  const payload = {
    azienda_id: aziendaId,
    sede_id: getSedeId(),
    nome,
    categoria: document.getElementById("ms-f-categoria").value,
    difficolta: document.getElementById("ms-f-difficolta").value,
    durata_min: Number(document.getElementById("ms-f-durata").value)||0,
    obiettivo: document.getElementById("ms-f-obiettivo").value.trim() || null,
    errori_comuni: document.getElementById("ms-f-errori").value.trim() || null,
    standard_qualita: document.getElementById("ms-f-standard").value.trim() || null,
    materiali: materiali.length ? materiali : null,
    attivo: true,
    aggiornato_il: new Date().toISOString(),
    media_urls: (window._getProcMediaUrls ? window._getProcMediaUrls() : []) || [],
    contesto: document.getElementById("ms-f-contesto")?.value || getContesto() || "sala",
  };

  let procId = editingId;

  if (editingId) {
    const { error } = await supa().from("procedure_sala").update(payload).eq("id", editingId).eq("azienda_id", aziendaId);
    if (error) return alert("Errore aggiornamento: " + error.message);
  } else {
    const { data, error } = await supa().from("procedure_sala").insert(payload).select("id").single();
    if (error) return alert("Errore creazione: " + error.message);
    procId = data.id;
  }

  // Salva fasi
  await supa().from("procedure_sala_fasi").delete().eq("procedura_id", procId).eq("azienda_id", aziendaId);

  if (fasiLocali.length) {
    const righe = fasiLocali.map((f, idx) => ({
      procedura_id: procId,
      azienda_id: aziendaId,
      ordine: idx + 1,
      titolo: f.titolo || `Step ${idx+1}`,
      descrizione_operativa: f.descrizione_operativa || null,
      durata_min: f.durata_min || 0,
      check_qualita: f.check_qualita || null,
      tip_pro: f.tip_pro || null,
      errori_comuni: f.errori_comuni || null,
    }));
    const { error } = await supa().from("procedure_sala_fasi").insert(righe);
    if (error) console.warn("Errore fasi:", error.message);
  }

  await loadProcedure();
  renderLista();
  chiudiEditor();
}

// ═══════════════════════════════════════════════════════════════
// TONY — compila procedura da voce/testo
// ═══════════════════════════════════════════════════════════════

let _msMicRecorder = null, _msMicChunks = [], _msMicRecording = false;

async function msStartMic(btnEl, statusEl) {
  if (_msMicRecording) return;
  if (!navigator.mediaDevices?.getUserMedia) { alert("Browser non supporta microfono."); return false; }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    _msMicChunks = [];
    let mime = "audio/webm;codecs=opus";
    if (!MediaRecorder.isTypeSupported(mime)) mime = "audio/webm";
    if (!MediaRecorder.isTypeSupported(mime)) mime = "audio/mp4";
    _msMicRecorder = new MediaRecorder(stream, { mimeType: mime });
    _msMicRecorder._mimeType = mime;
    _msMicRecorder.ondataavailable = e => { if (e.data.size>0) _msMicChunks.push(e.data); };
    _msMicRecorder.start(100);
    _msMicRecording = true;
    if (btnEl) { btnEl.textContent="⏹ Stop"; btnEl.style.background="#dc2626"; btnEl.style.color="white"; }
    if (statusEl) statusEl.innerHTML = `<span style="color:#dc2626;">🔴 Registrazione... premi Stop</span>`;
    return true;
  } catch(e) { alert("Microfono non accessibile: "+e.message); return false; }
}

function msStopMic(btnEl) {
  return new Promise(resolve => {
    if (!_msMicRecorder || _msMicRecorder.state==="inactive") { resolve(null); return; }
    _msMicRecorder.onstop = () => {
      const mime = _msMicRecorder._mimeType || "audio/webm";
      const blob = new Blob(_msMicChunks, { type: mime });
      _msMicRecorder.stream?.getTracks().forEach(t=>t.stop());
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    };
    _msMicRecorder.stop();
    _msMicRecording = false;
    if (btnEl) { btnEl.textContent="🎤 Vocale"; btnEl.style.background=""; btnEl.style.color=""; }
  });
}

async function apriModalTonyProcedura() {
  const overlay = document.createElement("div");
  overlay.style.cssText = "position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:flex-end;justify-content:center;";
  overlay.innerHTML = `
    <div style="background:white;border-radius:20px 20px 0 0;width:100%;max-width:600px;padding:24px;box-shadow:0 -8px 40px rgba(0,0,0,.2);max-height:85vh;overflow-y:auto;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
        <span style="font-size:26px;">🤖</span>
        <div>
          <div style="font-weight:700;font-size:16px;">Tony AI — Crea procedura di sala</div>
          <div style="font-size:12px;color:#6b7280;">Descrivi la procedura a voce o per testo. Tony struttura tutto.</div>
        </div>
      </div>
      <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:10px 14px;margin-bottom:12px;font-size:12px;color:#0369a1;line-height:1.5;">
        💡 <strong>Esempi:</strong><br>
        "Come si apparecchia un tavolo per 4 persone a cena: prima la tovaglia, poi i piatti, poi le posate dall'esterno verso l'interno, poi i bicchieri..."<br>
        "Come si fa un caffè espresso: calibrare la macchina, macinatura corretta, pressare il filtro, verificare la crema, servire con zucchero e cucchiaino"
      </div>
      <textarea id="ms-tony-input" placeholder="Descrivi la procedura..." rows="5"
        style="width:100%;box-sizing:border-box;border:2px solid #e5e7eb;border-radius:12px;padding:12px;font-size:14px;resize:vertical;font-family:inherit;outline:none;margin-bottom:8px;"></textarea>
      <div id="ms-tony-status" style="font-size:13px;min-height:18px;color:#6b7280;margin-bottom:12px;"></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button id="ms-tony-mic" type="button"
          style="background:#f3f4f6;border:none;border-radius:12px;padding:12px 16px;font-size:14px;cursor:pointer;">
          🎤 Vocale
        </button>
        <button id="ms-tony-go" type="button"
          style="flex:1;background:#0E5A7A;color:white;border:none;border-radius:12px;padding:14px;font-size:15px;font-weight:600;cursor:pointer;">
          🚀 Crea procedura con Tony
        </button>
        <button id="ms-tony-close" type="button"
          style="background:#f3f4f6;border:none;border-radius:12px;padding:14px 18px;font-size:15px;cursor:pointer;">✕</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);
  document.getElementById("ms-tony-input").focus();

  const status = overlay.querySelector("#ms-tony-status");
  const btnMic = overlay.querySelector("#ms-tony-mic");
  const btnGo  = overlay.querySelector("#ms-tony-go");
  overlay.querySelector("#ms-tony-close").onclick = () => overlay.remove();
  overlay.onclick = e => { if (e.target===overlay) overlay.remove(); };

  btnMic.onclick = async () => {
    if (!_msMicRecording) {
      await msStartMic(btnMic, status);
    } else {
      btnGo.disabled=true; btnMic.disabled=true;
      const audio = await msStopMic(btnMic);
      if (!audio) { status.innerHTML=`<span style="color:#dc2626;">❌ Audio non registrato</span>`; btnGo.disabled=false; btnMic.disabled=false; return; }
      status.innerHTML = `<span style="color:#0E5A7A;">⏳ Trascrizione...</span>`;
      try {
        const s = await supa().auth.getSession();
        const tok = s?.data?.session?.access_token||"";
        const r = await fetch(EDGE_TONY, { method:"POST",
          headers:{"Content-Type":"application/json","Authorization":"Bearer "+tok,"apikey":tok},
          body: JSON.stringify({ azienda_id:getAziendaId(), audio_base64:audio, messages:[{role:"user",content:"trascrivi"}] })
        });
        const d = await r.json();
        const txt = d.voice_input || "";
        if (txt) { overlay.querySelector("#ms-tony-input").value = txt; status.innerHTML=`<span style="color:#16a34a;">✍️ Trascritto — premi Crea</span>`; }
        else { status.innerHTML=`<span style="color:#f59e0b;">⚠️ Trascrizione vuota — scrivi manualmente</span>`; }
      } catch(e) { status.innerHTML=`<span style="color:#dc2626;">❌ ${e.message}</span>`; }
      btnGo.disabled=false; btnMic.disabled=false;
    }
  };

  btnGo.onclick = async () => {
    const testo = overlay.querySelector("#ms-tony-input").value.trim();
    if (!testo) return;
    btnGo.disabled=true; btnGo.textContent="⏳ Tony sta pensando...";
    status.innerHTML=`<span style="color:#0E5A7A;">Analisi in corso...</span>`;

    const contesto = getContesto();
    const ctxInfo = CONTESTI[contesto] || CONTESTI.sala;
    const identita = window.state?.azienda?.identita || "";
    const gcWhy = window.state?.azienda?.gc_why || "";
    const prompt = `Sei un assistente per la ristorazione italiana. Stai creando una procedura per l'area ${ctxInfo.label.toUpperCase()} di un locale.
${gcWhy ? "VISION DEL LOCALE (WHY): " + gcWhy : ""}
Analizza questa descrizione e restituisci SOLO un oggetto JSON con questa struttura esatta:
{"reply":{"nome":"titolo breve procedura","categoria":"mise_en_place o accoglienza o servizio o vendita o operativo o igiene","difficolta":"base o medio o avanzato","durata_min":5,"obiettivo":"risultato atteso in una frase","materiali":["materiale1","materiale2"],"errori_comuni":"errori da evitare","standard_qualita":"come si verifica che sia fatto bene","fasi":[{"titolo":"step 1","descrizione_operativa":"istruzioni dettagliate","durata_min":2,"check_qualita":"domanda autocontrollo","tip_pro":"consiglio esperto","errori_comuni":"errore frequente"}]},"action":null}

DESCRIZIONE: "${testo}"`;

    try {
      const s = await supa().auth.getSession();
      const tok = s?.data?.session?.access_token||"";
      const r = await fetch(EDGE_TONY, { method:"POST",
        headers:{"Content-Type":"application/json","Authorization":"Bearer "+tok,"apikey":tok},
        body: JSON.stringify({ azienda_id:getAziendaId(), messages:[{role:"user",content:prompt}] })
      });
      const data = await r.json();

      // Estrai JSON dalla reply
      // Regex estratte da template literal per evitare SyntaxError
      const RE_JSON_FENCE1 = new RegExp("^```json\\s*", "i");
      const RE_JSON_FENCE2 = new RegExp("^```\\s*", "i");
      const RE_JSON_FENCE3 = new RegExp("```\\s*$", "i");
      const RE_JSON_OBJ    = new RegExp("\\{[\\s\\S]*\\}");
      const raw = (data.reply||"").trim()
        .replace(RE_JSON_FENCE1, "")
        .replace(RE_JSON_FENCE2, "")
        .replace(RE_JSON_FENCE3, "")
        .trim();
      let parsed;
      try { parsed = JSON.parse(raw); } catch {
        const m = RE_JSON_OBJ.exec(raw);
        if (m) parsed = JSON.parse(m[0]);
        else throw new Error("JSON non valido nella risposta");
      }
      const d = parsed.reply || parsed;

      // Assegna le fasi in memoria prima di aprire l'editor
      if (Array.isArray(d.fasi) && d.fasi.length) {
        fasiLocali = d.fasi.map((f,i) => ({
          titolo: f.titolo||("Step " + (i+1)),
          descrizione_operativa: f.descrizione_operativa||"",
          durata_min: f.durata_min||0,
          check_qualita: f.check_qualita||"",
          tip_pro: f.tip_pro||"",
          errori_comuni: f.errori_comuni||"",
        }));
      } else {
        fasiLocali = [];
      }

      // Apri l'editor solo se non è già aperto
      const _overlay = document.getElementById("ms-editor-overlay");
      const _editorGiaAperto = _overlay && _overlay.style.display !== "none";
      if (!_editorGiaAperto) {
        await apriEditor(null);
      }

      // Ora i campi esistono — popola i valori da Tony
      const setVal = (id, val) => { const el = document.getElementById(id); if (el && val) el.value = val; };
      setVal("ms-f-nome",      d.nome);
      setVal("ms-f-categoria", d.categoria);
      setVal("ms-f-difficolta",d.difficolta);
      setVal("ms-f-obiettivo", d.obiettivo);
      setVal("ms-f-errori",    d.errori_comuni);
      setVal("ms-f-standard",  d.standard_qualita);
      if (d.durata_min) setVal("ms-f-durata", String(d.durata_min));
      if (d.materiali?.length) setVal("ms-f-materiali", d.materiali.join(", "));

      // Ora il DOM c'è — renderizza le fasi
      renderFasiEditor();

      status.innerHTML = "<span style='color:#16a34a;'>✅ Procedura strutturata! Controlla e salva.</span>";
      setTimeout(() => overlay.remove(), 800);

    } catch(e) {
      status.innerHTML=`<span style="color:#dc2626;">❌ ${e.message}</span>`;
      btnGo.disabled=false; btnGo.textContent="🚀 Crea procedura con Tony";
    }
  };
}

// ═══════════════════════════════════════════════════════════════
// MODAL VALUTAZIONE
// ═══════════════════════════════════════════════════════════════
function apriModalValutazione(proceduraId, proceduraNome) {
  const overlay = document.createElement("div");
  overlay.style.cssText = "position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;";
  overlay.innerHTML = `
    <div style="background:white;border-radius:16px;padding:24px;width:100%;max-width:440px;box-shadow:0 20px 60px rgba(0,0,0,.2);">
      <h3 style="margin:0 0 16px;font-size:16px;">⭐ Valuta esecuzione</h3>
      <div style="font-size:13px;font-weight:600;color:#374151;margin-bottom:14px;">${esc(proceduraNome)}</div>
      <div style="margin-bottom:12px;">
        <label style="font-size:13px;display:block;margin-bottom:4px;">Dipendente *</label>
        <select id="val-dipendente" class="input" style="width:100%;">
          <option value="">— Seleziona —</option>
          ${dipendentiCache.map(d => `<option value="${d.id}">${esc(d.nome)} ${esc(d.cognome||"")} ${d.mansione?"("+esc(d.mansione)+")":""}</option>`).join("")}
        </select>
      </div>
      <div style="margin-bottom:12px;">
        <label style="font-size:13px;display:block;margin-bottom:6px;">Punteggio *</label>
        <div style="display:flex;gap:8px;">
          ${[1,2,3,4,5].map(n=>`<button type="button" data-punteggio="${n}"
            style="flex:1;padding:10px;border:2px solid #e5e7eb;border-radius:8px;cursor:pointer;font-size:18px;background:white;"
            onclick="msSelPunteggio(${n})">${"⭐".repeat(n)}</button>`).join("")}
        </div>
        <input type="hidden" id="val-punteggio" value="">
      </div>
      <div style="margin-bottom:12px;">
        <label style="font-size:13px;display:block;margin-bottom:4px;">Eseguito correttamente?</label>
        <div style="display:flex;gap:8px;">
          <button type="button" id="val-si" onclick="msSelCorretto(true)"
            style="flex:1;padding:10px;border:2px solid #e5e7eb;border-radius:8px;cursor:pointer;background:white;">✅ Sì</button>
          <button type="button" id="val-no" onclick="msSelCorretto(false)"
            style="flex:1;padding:10px;border:2px solid #e5e7eb;border-radius:8px;cursor:pointer;background:white;">❌ No</button>
        </div>
        <input type="hidden" id="val-corretto" value="">
      </div>
      <div style="margin-bottom:16px;">
        <label style="font-size:13px;display:block;margin-bottom:4px;">Note (opz.)</label>
        <textarea id="val-note" class="input" rows="2" style="width:100%;box-sizing:border-box;" placeholder="Osservazioni del valutatore..."></textarea>
      </div>
      <div id="val-msg" style="font-size:12px;min-height:16px;margin-bottom:10px;"></div>
      <div style="display:flex;gap:8px;">
        <button id="val-salva" type="button" class="app-button" style="flex:1;">Salva valutazione</button>
        <button type="button" onclick="this.closest('[style*=position]').remove()" class="app-button secondary">Annulla</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);
  overlay.onclick = e => { if (e.target===overlay) overlay.remove(); };

  let corretto = null;
  window.msSelPunteggio = (n) => {
    document.getElementById("val-punteggio").value = n;
    overlay.querySelectorAll("[data-punteggio]").forEach(b => {
      b.style.borderColor = Number(b.dataset.punteggio)<=n ? "#f59e0b" : "#e5e7eb";
      b.style.background  = Number(b.dataset.punteggio)<=n ? "#fef3c7" : "white";
    });
  };
  window.msSelCorretto = (val) => {
    corretto = val;
    document.getElementById("val-corretto").value = val ? "true" : "false";
    document.getElementById("val-si").style.background = val ? "#dcfce7" : "white";
    document.getElementById("val-si").style.borderColor = val ? "#16a34a" : "#e5e7eb";
    document.getElementById("val-no").style.background = !val ? "#fee2e2" : "white";
    document.getElementById("val-no").style.borderColor = !val ? "#dc2626" : "#e5e7eb";
  };

  overlay.querySelector("#val-salva").onclick = async () => {
    const dipId = document.getElementById("val-dipendente").value;
    const punteggio = Number(document.getElementById("val-punteggio").value);
    const correttoVal = document.getElementById("val-corretto").value;
    const msg = document.getElementById("val-msg");

    if (!dipId) { msg.innerHTML=`<span style="color:#dc2626;">Seleziona il dipendente</span>`; return; }
    if (!punteggio) { msg.innerHTML=`<span style="color:#dc2626;">Inserisci il punteggio</span>`; return; }

    const dip = dipendentiCache.find(d=>d.id===dipId);
    const { error } = await supa().from("procedure_sala_valutazioni").insert({
      procedura_id: proceduraId,
      azienda_id: getAziendaId(),
      dipendente_id: dipId,
      dipendente_nome: dip ? `${dip.nome} ${dip.cognome||""}`.trim() : "",
      punteggio,
      eseguito_correttamente: correttoVal==="" ? null : correttoVal==="true",
      note_valutatore: document.getElementById("val-note").value.trim() || null,
      valutato_da: window.state?.user?.id || null,
    });
    if (error) { msg.innerHTML=`<span style="color:#dc2626;">Errore: ${error.message}</span>`; return; }
    msg.innerHTML=`<span style="color:#16a34a;">✅ Valutazione salvata!</span>`;
    setTimeout(()=>overlay.remove(), 1000);
  };
}

// ═══════════════════════════════════════════════════════════════
// SHELL HTML
// ═══════════════════════════════════════════════════════════════
function renderShell(contesto = "sala", ctxInfo = CONTESTI.sala) {
  return createPageLayout({
    title: ctxInfo.icon + " Mansionario " + ctxInfo.label,
    subtitle: "Procedure operative, standard di servizio, formazione staff",
    content: `
      <div style="margin-bottom:16px;display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
        <button id="ms-btn-nuova" class="app-button" style="display:flex;align-items:center;gap:6px;">
          + Nuova procedura
        </button>
        <button id="ms-btn-tony" class="app-button" style="background:#0E5A7A;display:flex;align-items:center;gap:6px;">
          🤖 Crea con Tony
        </button>
      </div>

      ${createCard({
        title: "Cerca e filtra",
        body: `
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <input id="ms-search" class="input-pill tb-search" placeholder="Cerca procedura..." style="flex:1;min-width:160px;">
            <select id="ms-filter-cat" class="input-pill">
              <option value="">Tutte le categorie</option>
              ${CATEGORIE.map(c=>`<option value="${c.id}">${c.icon} ${c.label}</option>`).join("")}
            </select>
          </div>
        `
      })}

      ${createCard({
        title: "Procedure",
        body: `<div id="ms-lista"><div style="color:#94a3b8;padding:16px;text-align:center;">Caricamento...</div></div>`
      })}

      <!-- OVERLAY EDITOR -->
      <div id="ms-editor-overlay" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9000;overflow-y:auto;padding:20px;box-sizing:border-box;">
        <div style="background:white;border-radius:20px;max-width:700px;margin:0 auto;padding:28px;box-shadow:0 20px 60px rgba(0,0,0,.2);">

          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
            <h2 id="ms-editor-title" style="margin:0;font-size:18px;">Nuova procedura</h2>
            <button onclick="window.msChiudiEditor()" style="background:#f1f5f9;border:none;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:16px;">✕</button>
          </div>

          <!-- ANAGRAFICA -->
          <div style="display:grid;gap:12px;margin-bottom:20px;">
            <div>
              <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">Nome procedura *</label>
              <input id="ms-f-nome" class="input" placeholder="Es. Come si apparecchia un tavolo da 4 persone">
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">
              <div>
                <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">Categoria</label>
                <select id="ms-f-categoria" class="input">
                  ${CATEGORIE.map(c=>`<option value="${c.id}">${c.icon} ${c.label}</option>`).join("")}
                </select>
              </div>
              <div>
                <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">Difficoltà</label>
                <select id="ms-f-difficolta" class="input">
                  ${DIFFICOLTA.map(d=>`<option value="${d.id}">${d.label}</option>`).join("")}
                </select>
              </div>
              <div>
                <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">Durata (min)</label>
                <input id="ms-f-durata" class="input" type="number" min="0" placeholder="5">
              </div>
              <div>
                <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">Contesto</label>
                <select id="ms-f-contesto" class="input">
                  <option value="sala">🪑 Sala</option>
                  <option value="cucina">👨‍🍳 Cucina</option>
                  <option value="hotel">🏨 Hotel</option>
                  <option value="tasting">🍷 Tasting</option>
                  <option value="generale">📋 Generale (tutti)</option>
                </select>
              </div>
            </div>
            <div>
              <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">Obiettivo / risultato atteso</label>
              <textarea id="ms-f-obiettivo" class="input" rows="2" placeholder="Es. Il cliente deve essere accolto entro 30 secondi dall'ingresso"></textarea>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
              <div>
                <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">Materiali necessari</label>
                <input id="ms-f-materiali" class="input" placeholder="tovaglia, posate, bicchieri (separati da virgola)">
              </div>
              <div>
                <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">Standard di qualità</label>
                <input id="ms-f-standard" class="input" placeholder="Come si verifica che sia fatto bene?">
              </div>
            </div>
            <div>
              <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">⚠️ Errori comuni da evitare</label>
              <input id="ms-f-errori" class="input" placeholder="Es. Non dimenticare il segnaposto, non incrociare le posate...">
            </div>
          </div>

          <!-- MEDIA PROCEDURA -->
          <div style="margin-bottom:16px;">
            <label style="font-size:13px;font-weight:600;display:block;margin-bottom:8px;">📸 Foto & Video procedura</label>
            <div id="ms-media-preview" style="margin-bottom:8px;"></div>
            <label style="display:inline-flex;align-items:center;gap:6px;background:#f1f5f9;border:2px dashed #d1d5db;border-radius:10px;padding:10px 16px;cursor:pointer;font-size:13px;color:#374151;">
              📎 Aggiungi foto/video
              <input type="file" id="ms-media-input" accept="image/*,video/*" multiple style="display:none;">
            </label>
            <div id="ms-media-status" style="font-size:12px;color:#6b7280;margin-top:6px;"></div>
          </div>

          <!-- FASI -->
          <div style="margin-bottom:16px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
              <h3 style="margin:0;font-size:15px;">📋 Fasi operative</h3>
              <div style="display:flex;gap:8px;">
                <button id="ms-btn-tony-fasi" type="button" class="app-button small"
                  style="background:#0E5A7A;display:flex;align-items:center;gap:4px;">
                  🤖 Tony
                </button>
                <button id="ms-btn-add-fase" type="button" class="app-button small secondary">+ Aggiungi</button>
              </div>
            </div>
            <div id="ms-fasi-container"></div>
          </div>

          <!-- AZIONI -->
          <div style="display:flex;gap:10px;justify-content:flex-end;">
            <button onclick="window.msChiudiEditor()" class="app-button secondary">Annulla</button>
            <button id="ms-btn-salva" type="button" class="app-button">💾 Salva procedura</button>
          </div>
        </div>
      </div>
    `
  });
}

// ═══════════════════════════════════════════════════════════════
// RENDER PRINCIPALE
// ═══════════════════════════════════════════════════════════════
export async function render(container) {
  const aziendaId = getAziendaId();
  if (!aziendaId) {
    container.innerHTML = `<div class="card"><h3>Azienda non selezionata</h3></div>`;
    return;
  }

  const contesto = getContesto();
  const ctxInfo = CONTESTI[contesto] || CONTESTI.sala;
  container.innerHTML = renderShell(contesto, ctxInfo);

  await Promise.all([loadProcedure(), loadDipendenti()]);
  renderLista();

  // Esponi funzioni globali per pulsanti inline
  window.msChiudiEditor = chiudiEditor;

  // Bind pulsanti principali
  document.getElementById("ms-btn-nuova").onclick = () => apriEditor(null);
  document.getElementById("ms-btn-tony").onclick = () => {
    // Non aprire l'editor subito — lo aprirà Tony dopo aver strutturato la procedura
    apriModalTonyProcedura();
  };

  document.getElementById("ms-search").addEventListener("input", e => {
    renderLista(document.getElementById("ms-filter-cat").value, e.target.value);
  });
  document.getElementById("ms-filter-cat").addEventListener("change", e => {
    renderLista(e.target.value, document.getElementById("ms-search").value);
  });

  // Pulsanti editor — binding fatto in apriEditor() quando il DOM è visibile

  // Media procedura — binding ritardato perché l'overlay parte display:none
  let _procMediaUrls = [];
  // Accessori tramite funzione per non catturare elementi null al momento del render
  const getMediaInput   = () => document.getElementById("ms-media-input");
  const getMediaPreview = () => document.getElementById("ms-media-preview");
  const getMediaStatus  = () => document.getElementById("ms-media-status");
  // Alias per retrocompatibilità
  const mediaInput   = { get onchange() {}, set onchange(fn) { const el = getMediaInput(); if(el) el.onchange = fn; } };
  const mediaPreview = null;
  const mediaStatus  = null;
  window._getProcMediaUrls = () => _procMediaUrls;
  window._setProcMediaUrls = (urls) => {
    _procMediaUrls = urls;
    aggiornaMediaPreview();
  };
  window._rimuoviProcMedia = (idx) => {
    _procMediaUrls.splice(idx, 1);
    aggiornaMediaPreview();
  };
  function aggiornaMediaPreview() {
    const el = document.getElementById("ms-media-preview");
    if (!el) return;
    el.innerHTML = renderMediaPreview(_procMediaUrls, "window._rimuoviProcMedia");
  }
  const _mi = getMediaInput ? getMediaInput() : document.getElementById("ms-media-input");
  if (_mi) {
    _mi.onchange = async (e) => {
      const files = [...e.target.files];
      const _ms1 = document.getElementById("ms-media-status"); if(_ms1) _ms1.textContent = "⏳ Caricamento...";
      try {
        for (const f of files) {
          const url = await uploadMedia(f, `procedure/${getAziendaId()}`);
          _procMediaUrls.push(url);
        }
        aggiornaMediaPreview();
        const _ms2 = document.getElementById("ms-media-status"); if(_ms2) _ms2.textContent = "✅ " + files.length + " file caricati";
        setTimeout(() => { const _ms3 = document.getElementById("ms-media-status"); if(_ms3) _ms3.textContent = ""; }, 2000);
      } catch(err) {
        const _ms4 = document.getElementById("ms-media-status"); if(_ms4) _ms4.textContent = "❌ " + err.message;
      }
      e.target.value = "";
    };
  }
  // btn-add-fase e btn-tony-fasi bindati in apriEditor()
}

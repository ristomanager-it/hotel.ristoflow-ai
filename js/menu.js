// js/menu.js — Hotel Ristoflow
// Replica la topbar di Ristoflow: meteo, data, WhatsApp, Tony, Social

import { supabase } from "./supabaseClient.js";

const EDGE_TONY = "https://cuhcscpvhypoaplcmtjk.supabase.co/functions/v1/assistente-ai";

let tonyHistory  = [];
let tonyContesto = "";
let tonyInited   = false;

// Vocale + TTS
let _hotelMicRecorder  = null;
let _hotelMicChunks    = [];
let _hotelMicRecording = false;
let _hotelTtsAttivo    = false;
let _hotelTtsAudio     = null;

export function initMenu() {

  const headerRight = document.getElementById("header-right");
  if (!headerRight) return;

  // ── METEO + DATA ─────────────────────────────────────────────
  if (!document.getElementById("header-meteo")) {
    const meteoEl = document.createElement("div");
    meteoEl.id = "header-meteo";
    meteoEl.style.cssText = `
      display:flex;align-items:center;gap:6px;
      font-size:13px;font-weight:600;color:#374151;
      margin-right:8px;white-space:nowrap;
    `;
    const ora = new Date().getHours();
    const sal = ora < 12 ? "Buongiorno" : ora < 18 ? "Buon pomeriggio" : "Buonasera";
    const profilo = window.state?.userProfile;
    const nomeBreve = profilo?.nome || "info";
    const dataBreve = new Date().toLocaleDateString("it-IT", { weekday:"short", day:"numeric", month:"short" });
    meteoEl.innerHTML = `
      <span style="color:#64748b;font-size:12px;">${sal}, ${nomeBreve}</span>
      <span id="hdr-meteo-icon" style="font-size:16px;">🌤️</span>
      <span id="hdr-meteo-temp" style="font-weight:700;"></span>
      <span style="color:#94a3b8;font-size:11px;">${dataBreve}</span>
    `;
    headerRight.insertBefore(meteoEl, headerRight.firstChild);
    caricaMeteoHeader();
  }

  // ── TONY AI ──────────────────────────────────────────────────
  if (!document.getElementById("tony-btn-header")) {
    const tonyBtn = document.createElement("div");
    tonyBtn.id = "tony-btn-header";
    tonyBtn.title = "Tony AI";
    tonyBtn.style.cssText = `
      cursor:pointer;margin-left:10px;
      display:flex;flex-direction:column;align-items:center;
      justify-content:center;flex-shrink:0;gap:3px;
    `;
    tonyBtn.innerHTML = `
      <img src="https://cuhcscpvhypoaplcmtjk.supabase.co/storage/v1/object/public/Avatar/Tony.png"
        style="width:42px;height:42px;border-radius:50%;object-fit:cover;border:2px solid #0E5A7A;box-shadow:0 2px 8px rgba(14,90,122,0.3);"
        onerror="this.style.display='none';this.nextSibling.style.display='flex'" />
      <div style="display:none;width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,#0E5A7A,#1a7a9f);align-items:center;justify-content:center;font-size:20px;border:2px solid #0E5A7A;">🤖</div>
      <span style="font-size:9px;font-weight:800;color:#0E5A7A;letter-spacing:0.4px;line-height:1;white-space:nowrap;">Tony.AI</span>
    `;
    tonyBtn.onclick = () => toggleTonyPanel();
    headerRight.appendChild(tonyBtn);
  }

  // ── SOCIAL ───────────────────────────────────────────────────
  if (!document.getElementById("social-btn-header")) {
    const socialBtn = document.createElement("div");
    socialBtn.id = "social-btn-header";
    socialBtn.title = "RistoflowBook";
    socialBtn.style.cssText = `
      cursor:pointer;margin-left:10px;
      display:flex;flex-direction:column;align-items:center;
      justify-content:center;flex-shrink:0;gap:3px;
    `;
    socialBtn.innerHTML = `
      <div style="
        width:42px;height:42px;border-radius:50%;
        background:linear-gradient(135deg,#0E5A7A 0%,#22c55e 50%,#f97316 100%);
        display:flex;align-items:center;justify-content:center;
        border:2px solid #e5e7eb;box-shadow:0 2px 8px rgba(0,0,0,.15);
      ">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M8.5 14.5L4 19l1.5 1.5L10 16m5.5-1.5L20 19l-1.5 1.5L14 16" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
          <circle cx="12" cy="8" r="4" stroke="white" stroke-width="1.5"/>
          <path d="M12 4v8M8 8h8" stroke="white" stroke-width="1.2" stroke-linecap="round"/>
        </svg>
      </div>
      <span style="font-size:9px;font-weight:800;color:#0E5A7A;letter-spacing:0.4px;line-height:1;white-space:nowrap;">Social</span>
    `;
    socialBtn.onclick = () => {
      const az = window.state?.azienda;
      window.open("https://social.ristoflow-ai.com" + (az?.id ? "?a="+az.id : ""), "_blank");
    };
    headerRight.appendChild(socialBtn);
  }

  // ── TONY PANEL ───────────────────────────────────────────────
  if (!document.getElementById("tony-panel")) {
    const panel = document.createElement("div");
    panel.id = "tony-panel";
    panel.style.cssText = `
      position:fixed;top:62px;right:16px;width:380px;
      max-width:calc(100vw - 32px);
      background:white;border-radius:16px;
      box-shadow:0 8px 40px rgba(0,0,0,.2);
      z-index:9000;display:none;flex-direction:column;
      max-height:calc(100vh - 90px);
      border:1px solid #e5e7eb;overflow:hidden;
    `;
    panel.innerHTML = `
      <div style="background:linear-gradient(135deg,#0E5A7A,#1a7a9f);color:white;padding:14px 16px;display:flex;align-items:center;gap:10px;flex-shrink:0;">
        <img src="https://cuhcscpvhypoaplcmtjk.supabase.co/storage/v1/object/public/Avatar/Tony.png"
          style="width:32px;height:32px;border-radius:50%;object-fit:cover;flex-shrink:0;"
          onerror="this.textContent='🤖';this.style.fontSize='20px'" />
        <div style="flex:1;">
          <div style="font-weight:700;font-size:14px;">Tony — Assistente Hotel</div>
          <div style="font-size:11px;opacity:.8;" id="tony-status">AI operativa · conosce la tua struttura</div>
        </div>
        <button id="tony-close" style="background:rgba(255,255,255,.2);border:none;color:white;width:28px;height:28px;border-radius:50%;cursor:pointer;font-size:14px;flex-shrink:0;">✕</button>
      </div>
      <div id="tony-msgs" style="flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:8px;min-height:180px;">
        <div id="tony-init-msg" style="padding:10px 14px;border-radius:14px;font-size:13px;line-height:1.5;background:#f0f9ff;color:#0f172a;align-self:flex-start;border-bottom-left-radius:4px;max-width:85%;">⏳ Caricamento contesto...</div>
      </div>
      <div id="tony-sugg" style="padding:0 14px 10px;display:flex;gap:6px;flex-wrap:wrap;flex-shrink:0;"></div>
      <div style="padding:12px 14px;border-top:1px solid #f1f5f9;display:flex;gap:6px;flex-shrink:0;align-items:center;">
        <button id="tony-mic" title="Parla con Tony" style="background:#f1f5f9;border:none;width:36px;height:36px;border-radius:50%;cursor:pointer;font-size:16px;flex-shrink:0;">🎤</button>
        <input id="tony-input" placeholder="Chiedi qualcosa..." style="flex:1;padding:8px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;" />
        <button id="tony-tts" title="Attiva voce Tony" style="background:#f1f5f9;border:none;width:36px;height:36px;border-radius:50%;cursor:pointer;font-size:16px;flex-shrink:0;opacity:0.4;">🔊</button>
        <button id="tony-send" style="background:#0E5A7A;color:white;border:none;padding:8px 14px;border-radius:8px;cursor:pointer;font-size:14px;">➤</button>
      </div>
      <div style="padding:8px 14px;border-top:1px solid #f1f5f9;display:flex;justify-content:space-between;flex-shrink:0;">
        <button id="tony-mem" style="background:none;border:none;font-size:12px;color:#64748b;cursor:pointer;padding:4px 8px;border-radius:6px;">🧠 Memoria</button>
        <button id="tony-clear" style="background:none;border:none;font-size:12px;color:#64748b;cursor:pointer;padding:4px 8px;border-radius:6px;">🗑 Pulisci</button>
      </div>
    `;
    document.body.appendChild(panel);

    // Binding
    panel.querySelector("#tony-close").onclick  = () => closeTonyPanel();
    panel.querySelector("#tony-send").onclick   = () => inviaTony(panel.querySelector("#tony-input").value);
    panel.querySelector("#tony-input").onkeydown = e => { if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();inviaTony(e.target.value);} };
    panel.querySelector("#tony-clear").onclick  = () => {
      tonyHistory = [];
      panel.querySelector("#tony-msgs").innerHTML = '<div style="padding:10px 14px;border-radius:14px;font-size:13px;background:#f0f9ff;color:#0f172a;align-self:flex-start;max-width:85%;">Chat pulita. Come posso aiutarti?</div>';
    };
    panel.querySelector("#tony-mem").onclick = () => apriMemoria();
    panel.querySelector("#tony-mic").onclick = async () => {
      if (!_hotelMicRecording) await hotelStartMic();
      else await hotelSendVoice();
    };
    panel.querySelector("#tony-tts").onclick = () => hotelTtsToggle();

    // Chiudi cliccando fuori
    document.addEventListener("click", e => {
      const p = document.getElementById("tony-panel");
      const b = document.getElementById("tony-btn-header");
      if (p?.style.display==="flex" && !p.contains(e.target) && !b?.contains(e.target)) {
        closeTonyPanel();
      }
    });
  }
}

// ── Toggle panel ─────────────────────────────────────────────────
function toggleTonyPanel() {
  const panel = document.getElementById("tony-panel");
  if (!panel) return;
  const isOpen = panel.style.display === "flex";
  if (isOpen) {
    closeTonyPanel();
  } else {
    panel.style.display = "flex";
    if (!tonyInited) { tonyInited = true; initTonyContesto(); }
  }
}

function closeTonyPanel() {
  const panel = document.getElementById("tony-panel");
  if (panel) panel.style.display = "none";
}

// ── Contesto dinamico ────────────────────────────────────────────
async function initTonyContesto() {
  const az        = window.state?.azienda;
  const aziendaId = az?.id;
  if (!aziendaId) return;

  const status = document.getElementById("tony-status");
  if (status) status.textContent = "Caricamento dati...";

  const oggi = new Date().toISOString().split("T")[0];

  const [
    { data: prenotazioni },
    { data: task },
    { data: memoria },
    { data: kb },
    { data: camere },
  ] = await Promise.all([
    supabase.from("hotel_prenotazioni")
      .select("ospite_nome,ospite_cognome,data_checkin,data_checkout,stato,hotel_camere(nome),adulti,bambini,note_ospite")
      .eq("azienda_id", aziendaId).not("stato","in","(cancellata,noshow)")
      .gte("data_checkout", oggi)
      .lte("data_checkin", new Date(new Date(oggi).getTime()+7*864e5).toISOString().split("T")[0]),
    supabase.from("hotel_operations_task")
      .select("nome,tipo,stato,priorita,camera_numero,assegnato_nome")
      .eq("azienda_id", aziendaId).eq("data", oggi),
    supabase.from("tony_memoria")
      .select("contenuto,tipo").eq("azienda_id", aziendaId)
      .order("created_at",{ascending:false}).limit(15),
    supabase.from("tony_knowledge_base")
      .select("titolo,contenuto").in("categoria",["piattaforma","hotel"]).limit(20),
    supabase.from("hotel_camere")
      .select("id,nome,tipologia,attiva").eq("azienda_id", aziendaId),
  ]);

  const oggi_arr  = (prenotazioni||[]).filter(p=>p.data_checkin===oggi);
  const oggi_dep  = (prenotazioni||[]).filter(p=>p.data_checkout===oggi);
  const in_casa   = (prenotazioni||[]).filter(p=>p.data_checkin<oggi&&p.data_checkout>oggi);
  const task_pend = (task||[]).filter(t=>t.stato==="da_fare"||t.stato==="in_corso");
  const task_done = (task||[]).filter(t=>t.stato==="fatto");
  const cam_att   = (camere||[]).filter(c=>c.attiva);
  const ora       = new Date().toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"});

  tonyContesto = `Sei Tony, l'assistente AI operativo di ${az?.nome||"questo hotel"}.
Oggi è ${new Date().toLocaleDateString("it-IT",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}, ore ${ora}.

STRUTTURA: ${cam_att.length} camere attive${[...new Set(cam_att.map(c=>c.tipologia).filter(Boolean))].length ? " · Tipologie: "+[...new Set(cam_att.map(c=>c.tipologia).filter(Boolean))].join(", ") : ""}

OGGI:
- Arrivi: ${oggi_arr.length}${oggi_arr.length ? " — "+oggi_arr.map(p=>`${p.ospite_nome} ${p.ospite_cognome||""} (${p.hotel_camere?.nome||"?"})`).join(", ") : ""}
- Partenze: ${oggi_dep.length}${oggi_dep.length ? " — "+oggi_dep.map(p=>`${p.ospite_nome} ${p.ospite_cognome||""}`).join(", ") : ""}
- In casa: ${in_casa.length} ospiti
- Task: ${task_pend.length} in sospeso, ${task_done.length} completati${task_pend.length ? "\n  "+task_pend.slice(0,5).map(t=>`• ${t.nome} (${t.camera_numero||"generale"}, ${t.assegnato_nome||"non assegnato"})`).join("\n  ") : ""}

PROSSIMI 7 GIORNI:
${(prenotazioni||[]).filter(p=>p.data_checkin>oggi).slice(0,6).map(p=>`• ${p.data_checkin}: ${p.ospite_nome} ${p.ospite_cognome||""} (${p.hotel_camere?.nome||"?"}, ${p.adulti} adulti)`).join("\n")||"Nessuna prenotazione imminente"}

${(memoria||[]).length ? "MEMORIA:\n"+(memoria||[]).map(m=>`• ${m.contenuto}`).join("\n") : ""}
${(kb||[]).length ? "\nCONOSCENZE:\n"+(kb||[]).slice(0,6).map(k=>`• ${k.titolo}: ${(k.contenuto||"").substring(0,120)}`).join("\n") : ""}

Rispondi in italiano, conciso e operativo. Dai priorità alle info di oggi. Suggerisci azioni concrete.`;

  // Benvenuto
  let msg = "👋 Tutto tranquillo oggi!";
  const parti = [];
  if (oggi_arr.length)  parti.push(`${oggi_arr.length} arriv${oggi_arr.length===1?"o":"i"}`);
  if (oggi_dep.length)  parti.push(`${oggi_dep.length} partenz${oggi_dep.length===1?"a":"e"}`);
  if (task_pend.length) parti.push(`${task_pend.length} task in sospeso`);
  if (parti.length) msg = `👋 Oggi: ${parti.join(", ")}. Come posso aiutarti?`;

  const initEl = document.getElementById("tony-init-msg");
  if (initEl) initEl.textContent = msg;
  if (status) status.textContent = "AI operativa · aggiornato ora";

  // Suggerimenti
  const sugg = [];
  if (oggi_arr.length)  sugg.push("Chi arriva oggi?");
  if (oggi_dep.length)  sugg.push("Chi parte oggi?");
  if (task_pend.length) sugg.push("Task in sospeso");
  sugg.push("Occupazione settimana");
  if (sugg.length < 4)  sugg.push("Suggerimenti operativi");

  const suggEl = document.getElementById("tony-sugg");
  if (suggEl) {
    suggEl.innerHTML = sugg.slice(0,4).map(s =>
      `<button style="background:#f0f9ff;color:#0E5A7A;border:1px solid #bae6fd;padding:4px 10px;border-radius:20px;cursor:pointer;font-size:11px;font-weight:600;">${s}</button>`
    ).join("");
    suggEl.querySelectorAll("button").forEach(btn => {
      btn.onclick = () => inviaTony(btn.textContent);
    });
  }
}

// ── Invia messaggio ───────────────────────────────────────────────
async function inviaTony(testo) {
  if (!testo?.trim()) return;
  const input = document.getElementById("tony-input");
  if (input) input.value = "";

  aggiungiMsg(testo, "user");
  tonyHistory.push({ role:"user", content: testo });

  const panel = document.getElementById("tony-panel");
  const msgs = panel?.querySelector("#tony-msgs");
  const loadId = "tl-" + Date.now();
  const loadEl = document.createElement("div");
  loadEl.id = loadId;
  loadEl.style.cssText = "padding:10px 14px;border-radius:14px;font-size:13px;background:#f0f9ff;color:#0f172a;align-self:flex-start;border-bottom-left-radius:4px;max-width:85%;";
  loadEl.textContent = "⏳";
  msgs?.appendChild(loadEl);
  if (msgs) msgs.scrollTop = msgs.scrollHeight;

  try {
    const { data:{ session } } = await supabase.auth.getSession();
    console.log("TONY: token", session?.access_token ? "OK" : "MANCANTE");
    console.log("TONY: azienda_id", window.state?.azienda?.id);
    console.log("TONY: messages", tonyHistory.slice(-10));

    const res = await fetch(EDGE_TONY, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session?.access_token}`,
        "apikey": session?.access_token || "",
      },
      body: JSON.stringify({
        azienda_id: window.state?.azienda?.id,
        azienda:    window.state?.azienda?.nome || "",
        ruolo:      window.state?.ruolo || "admin",
        messages:   tonyHistory.slice(-10),
      }),
    });

    console.log("TONY: status", res.status);
    const data = await res.json();
    console.log("TONY: response", data);
    const risposta = data.reply || data.risposta || data.content?.[0]?.text || "Nessuna risposta";
    document.getElementById(loadId)?.remove();
    tonyHistory.push({ role:"assistant", content: risposta });
    aggiungiMsg(risposta, "tony");

    // Auto-memoria
    const az = window.state?.azienda;
    if (az && /ricorda|tieni a mente|nota che|importante:/i.test(testo)) {
      await supabase.from("tony_memoria").insert({
        azienda_id: az.id, contenuto: testo, tipo: "hotel",
      });
    }
  } catch(e) {
    console.error("TONY ERROR:", e);
    document.getElementById(loadId)?.remove();
    aggiungiMsg("Errore di connessione. Riprova.", "tony");
  }
}

function aggiungiMsg(testo, tipo) {
  const panel = document.getElementById("tony-panel");
  const msgs = panel?.querySelector("#tony-msgs") || document.getElementById("tony-msgs");
  if (!msgs) return;
  const div = document.createElement("div");
  div.style.cssText = tipo === "user"
    ? "padding:10px 14px;border-radius:14px;font-size:13px;line-height:1.5;background:#0E5A7A;color:white;align-self:flex-end;border-bottom-right-radius:4px;max-width:85%;"
    : "padding:10px 14px;border-radius:14px;font-size:13px;line-height:1.5;background:#f0f9ff;color:#0f172a;align-self:flex-start;border-bottom-left-radius:4px;max-width:85%;";
  div.textContent = testo;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
  // TTS: leggi le risposte di Tony quando voce attiva
  if (tipo === "tony" && _hotelTtsAttivo) hotelTtsParla(testo);
}


/* ============================================================
   🎤 VOCALE — hotel Tony
============================================================ */
async function hotelStartMic() {
  if (_hotelMicRecording) return;
  if (location.protocol !== "https:" && location.hostname !== "localhost") {
    alert("Il microfono richiede HTTPS."); return;
  }
  if (!navigator.mediaDevices?.getUserMedia) { alert("Browser non supporta microfono."); return; }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    _hotelMicChunks = [];
    let mime = "audio/webm;codecs=opus";
    if (!MediaRecorder.isTypeSupported(mime)) mime = "audio/webm";
    if (!MediaRecorder.isTypeSupported(mime)) mime = "audio/mp4";
    _hotelMicRecorder = new MediaRecorder(stream, { mimeType: mime });
    _hotelMicRecorder._mimeType = mime;
    _hotelMicRecorder.ondataavailable = e => { if (e.data.size > 0) _hotelMicChunks.push(e.data); };
    _hotelMicRecorder.start(100);
    _hotelMicRecording = true;
    const btn = document.getElementById("tony-mic");
    if (btn) { btn.textContent = "⏹"; btn.style.background = "#fee2e2"; btn.style.color = "#dc2626"; }
    document.getElementById("tony-status").textContent = "🔴 Registrazione...";
  } catch(e) { alert("Microfono non accessibile: " + e.message); }
}

async function hotelStopMic() {
  return new Promise(resolve => {
    if (!_hotelMicRecorder || _hotelMicRecorder.state === "inactive") { resolve(null); return; }
    _hotelMicRecorder.onstop = () => {
      const mime = _hotelMicRecorder._mimeType || "audio/webm";
      const blob = new Blob(_hotelMicChunks, { type: mime });
      _hotelMicRecorder.stream?.getTracks().forEach(t => t.stop());
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    };
    _hotelMicRecorder.stop();
    _hotelMicRecording = false;
    const btn = document.getElementById("tony-mic");
    if (btn) { btn.textContent = "🎤"; btn.style.background = "#f1f5f9"; btn.style.color = ""; }
  });
}

async function hotelSendVoice() {
  document.getElementById("tony-status").textContent = "⏳ Trascrizione...";
  const audio = await hotelStopMic();
  if (!audio) { document.getElementById("tony-status").textContent = "AI operativa · conosce la tua struttura"; return; }

  const { data:{ session } } = await supabase.auth.getSession();
  const token = session?.access_token || "";

  try {
    // Invia alla EF per trascrizione Whisper
    const res = await fetch(EDGE_TONY, {
      method: "POST",
      headers: { "Content-Type":"application/json", "Authorization":"Bearer "+token, "apikey":token },
      body: JSON.stringify({
        azienda_id: window.state?.azienda?.id,
        audio_base64: audio,
        messages: [{ role:"user", content:"trascrivi" }]
      })
    });
    const data = await res.json();
    const trascritto = data.voice_input || "";
    if (trascritto) {
      document.getElementById("tony-input").value = trascritto;
      document.getElementById("tony-status").textContent = "✍️ Trascritto — invio...";
      setTimeout(() => inviaTony(trascritto), 300);
    } else {
      document.getElementById("tony-status").textContent = "⚠️ Trascrizione vuota — riprova";
    }
  } catch(e) {
    document.getElementById("tony-status").textContent = "❌ Errore vocale";
  }
}

/* ============================================================
   🔊 TTS — hotel Tony (voce OpenAI onyx)
============================================================ */
async function hotelTtsParla(testo) {
  if (!_hotelTtsAttivo || !testo) return;
  if (_hotelTtsAudio) { _hotelTtsAudio.pause(); _hotelTtsAudio = null; }

  const pulito = testo
    .replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1")
    .replace(/^[-•]\s+/gm, "").replace(/^\d+\.\s+/gm, "")
    .replace(/#{1,6}\s+/g, "").replace(/\n{2,}/g, ". ").replace(/\n/g, " ")
    .replace(/€/g, "euro").replace(/\s{2,}/g, " ").trim();

  if (!pulito) return;
  const testo1500 = pulito.length > 1500 ? pulito.substring(0, 1497) + "..." : pulito;

  try {
    const { data:{ session } } = await supabase.auth.getSession();
    const token = session?.access_token || "";
    const res = await fetch(EDGE_TONY, {
      method: "POST",
      headers: { "Content-Type":"application/json", "Authorization":"Bearer "+token, "apikey":token },
      body: JSON.stringify({
        azienda_id: window.state?.azienda?.id,
        tipo_messaggio: "tts",
        tts_testo: testo1500,
        tts_voce: "onyx",
        messages: []
      })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.audio_base64) {
        const audio = new Audio("data:audio/mp3;base64," + data.audio_base64);
        _hotelTtsAudio = audio;
        audio.play();
        audio.onended = () => { _hotelTtsAudio = null; };
        return;
      }
    }
  } catch(e) { console.warn("Hotel TTS fallito:", e.message); }

  // Fallback SpeechSynthesis
  if (window.speechSynthesis) {
    const utt = new SpeechSynthesisUtterance(testo1500);
    utt.lang = "it-IT"; utt.rate = 1.0;
    const voci = window.speechSynthesis.getVoices();
    const voceIt = voci.find(v => v.lang === "it-IT" && v.localService) || voci.find(v => v.lang === "it-IT");
    if (voceIt) utt.voice = voceIt;
    window.speechSynthesis.speak(utt);
  }
}

function hotelTtsToggle() {
  _hotelTtsAttivo = !_hotelTtsAttivo;
  const btn = document.getElementById("tony-tts");
  if (!btn) return;
  btn.style.opacity = _hotelTtsAttivo ? "1" : "0.4";
  btn.title = _hotelTtsAttivo ? "Voce attiva — clicca per disattivare" : "Attiva voce Tony";
  btn.textContent = _hotelTtsAttivo ? "🔊" : "🔇";
  setTimeout(() => { btn.textContent = "🔊"; }, 1000);
  if (!_hotelTtsAttivo) {
    if (_hotelTtsAudio) { _hotelTtsAudio.pause(); _hotelTtsAudio = null; }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  } else {
    hotelTtsParla("Voce attivata. Sono pronto.");
  }
}

// ── Memoria ───────────────────────────────────────────────────────
async function apriMemoria() {
  const az = window.state?.azienda;
  if (!az) return;
  const { data: memoria } = await supabase.from("tony_memoria")
    .select("*").eq("azienda_id", az.id)
    .order("created_at",{ascending:false}).limit(20);

  document.getElementById("tony-modal-mem")?.remove();
  const modal = document.createElement("div");
  modal.id = "tony-modal-mem";
  modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;";
  modal.innerHTML = `
    <div style="background:white;border-radius:16px;padding:24px;width:100%;max-width:480px;max-height:80vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.3);">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <div style="font-size:16px;font-weight:800;">🧠 Memoria Tony Hotel</div>
        <button id="chiudi-mem" style="background:#f1f5f9;border:none;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:16px;">✕</button>
      </div>
      <div style="font-size:12px;color:#64748b;margin-bottom:12px;">Di' "ricorda che..." per salvare nuove note.</div>
      ${!(memoria?.length) ? '<div style="color:#94a3b8;font-size:13px;">Nessuna memoria salvata.</div>' :
        memoria.map(m => `
          <div style="background:#f8fafc;border-radius:10px;padding:10px 14px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
            <div>
              <div style="font-size:13px;">${String(m.contenuto||"").replace(/</g,"&lt;")}</div>
              <div style="font-size:11px;color:#94a3b8;margin-top:3px;">${new Date(m.created_at).toLocaleDateString("it-IT")}</div>
            </div>
            <button data-del="${m.id}" style="background:#fee2e2;border:none;width:24px;height:24px;border-radius:6px;cursor:pointer;font-size:11px;color:#dc2626;flex-shrink:0;">✕</button>
          </div>
        `).join("")
      }
    </div>
  `;
  document.body.appendChild(modal);
  modal.onclick = e => { if(e.target===modal) modal.remove(); };
  modal.querySelector("#chiudi-mem").onclick = () => modal.remove();
  modal.querySelectorAll("[data-del]").forEach(btn => {
    btn.onclick = async () => {
      await supabase.from("tony_memoria").delete().eq("id", btn.dataset.del);
      btn.closest("div[style]").remove();
    };
  });
}

// ── Meteo nell'header ────────────────────────────────────────────
async function caricaMeteoHeader() {
  try {
    const az = window.state?.azienda;
    let lat, lon;

    const indirizzo = [az?.indirizzo, az?.citta].filter(Boolean).join(", ");
    if (indirizzo) {
      try {
        const geo = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(indirizzo)}&format=json&limit=1`,
          { headers: { "Accept-Language": "it", "User-Agent": "Ristoflow/1.0" } }
        );
        const gd = await geo.json();
        if (gd?.[0]) { lat = parseFloat(gd[0].lat); lon = parseFloat(gd[0].lon); }
      } catch {}
    }
    if (!lat) { lat = 41.9; lon = 12.5; }

    const res  = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weathercode&timezone=Europe/Rome`);
    const data = await res.json();
    const temp = Math.round(data.current?.temperature_2m);
    const code = data.current?.weathercode;
    const icona = code===0?"☀️":code<=2?"⛅":code<=3?"☁️":code<=48?"🌫️":code<=67?"🌧️":code<=77?"❄️":"⛈️";

    const iconEl = document.getElementById("hdr-meteo-icon");
    const tempEl = document.getElementById("hdr-meteo-temp");
    if (iconEl) iconEl.textContent = icona;
    if (tempEl) tempEl.textContent = `${temp}°`;
  } catch {}
}
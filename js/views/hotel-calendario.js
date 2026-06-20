import { supabase } from "../supabaseClient.js";

export async function render(container) {
  const az = window.state.azienda;

  container.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">📅 Planning camere</div>
        <div class="page-sub">Trascina per spostare la prenotazione · Clicca per aprire</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
        <button class="btn btn-ghost btn-sm" id="btn-prev">◀</button>
        <span id="label-mese" style="font-weight:700;font-size:15px;min-width:160px;text-align:center;"></span>
        <button class="btn btn-ghost btn-sm" id="btn-next">▶</button>
        <button class="btn btn-ghost btn-sm" id="btn-oggi">Oggi</button>
        <div style="display:flex;gap:2px;background:#f1f5f9;border-radius:8px;padding:2px;">
          <button data-vista="7"  class="btn-vista" style="padding:5px 10px;border:none;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600;background:#0E5A7A;color:white;">7gg</button>
          <button data-vista="14" class="btn-vista" style="padding:5px 10px;border:none;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600;background:none;color:#64748b;">14gg</button>
          <button data-vista="30" class="btn-vista" style="padding:5px 10px;border:none;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600;background:none;color:#64748b;">Mese</button>
          <button data-vista="90" class="btn-vista" style="padding:5px 10px;border:none;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600;background:none;color:#64748b;">3 mesi</button>
        </div>
        <button class="btn btn-primary btn-sm" id="btn-nuova">+ Prenotazione</button>
      </div>
    </div>

    <!-- Legenda -->
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px;font-size:12px;">
      <span style="display:flex;align-items:center;gap:4px;"><span style="width:14px;height:14px;border-radius:3px;background:#3B82F6;display:inline-block;"></span> Confermata</span>
      <span style="display:flex;align-items:center;gap:4px;"><span style="width:14px;height:14px;border-radius:3px;background:#16A34A;display:inline-block;"></span> Check-in</span>
      <span style="display:flex;align-items:center;gap:4px;"><span style="width:14px;height:14px;border-radius:3px;background:#C9A84C;display:inline-block;"></span> Check-out</span>
      <span style="display:flex;align-items:center;gap:4px;"><span style="width:14px;height:14px;border-radius:3px;background:#9CA3AF;display:inline-block;"></span> Preventivo</span>
      <span style="display:flex;align-items:center;gap:4px;"><span style="width:14px;height:14px;border-radius:3px;background:#DC2626;display:inline-block;"></span> Cancellata</span>
    </div>

    <div style="background:white;border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;box-shadow:var(--shadow);">
      <div id="calendario-wrap" style="overflow-x:auto;">
        <div id="calendario"></div>
      </div>
    </div>

    <!-- Tooltip -->
    <div id="cal-tooltip" style="
      position:fixed;display:none;z-index:9999;
      background:#1e293b;color:white;border-radius:10px;
      padding:10px 14px;font-size:13px;pointer-events:none;
      box-shadow:0 4px 20px rgba(0,0,0,0.3);max-width:260px;
    "></div>

    <!-- Modal conferma spostamento -->
    <div id="modal-sposta" style="
      display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);
      z-index:10000;align-items:center;justify-content:center;
    ">
      <div style="background:white;border-radius:16px;padding:24px;width:360px;box-shadow:0 20px 60px rgba(0,0,0,.3);">
        <div style="font-weight:800;font-size:16px;margin-bottom:8px;">Sposta prenotazione?</div>
        <div id="modal-sposta-testo" style="font-size:14px;color:var(--muted);margin-bottom:20px;"></div>
        <div style="display:flex;gap:10px;">
          <button class="btn btn-primary" id="btn-conferma-sposta">Conferma</button>
          <button class="btn btn-ghost" id="btn-annulla-sposta">Annulla</button>
        </div>
      </div>
    </div>
  `;

  let anno  = new Date().getFullYear();
  let mese  = new Date().getMonth(); // 0-based
  let dataInizio = new Date().toISOString().split('T')[0]; // per viste non-mese
  let vistaGiorni = 7; // 7 | 14 | 30 | 90
  let camere = [];
  let prenotazioni = [];
  let dragData = null;

  function getRange() {
    // Per vista mese (30gg) usa logica mese, altrimenti usa dataInizio + n giorni
    if (vistaGiorni === 30) {
      const dal = primoGiornoMese(anno, mese);
      const al  = ultimoGiornoMese(anno, mese);
      return { dal, al };
    }
    const d = new Date(dataInizio);
    const al = new Date(d);
    al.setDate(al.getDate() + vistaGiorni - 1);
    return { dal: dataInizio, al: al.toISOString().split('T')[0] };
  }

  function aggiornaLabelMese() {
    const { dal, al } = getRange();
    if (vistaGiorni === 30) {
      document.getElementById('label-mese').textContent =
        new Date(anno, mese, 1).toLocaleDateString('it-IT', { month:'long', year:'numeric' });
    } else {
      const fmtOpts = { day:'numeric', month:'short' };
      const s = new Date(dal).toLocaleDateString('it-IT', fmtOpts);
      const e = new Date(al).toLocaleDateString('it-IT', fmtOpts);
      document.getElementById('label-mese').textContent = `${s} – ${e}`;
    }
  }

  function giorniRange(dal, al) {
    const giorni = [];
    const d = new Date(dal);
    const end = new Date(al);
    while (d <= end) {
      giorni.push(d.toISOString().split('T')[0]);
      d.setDate(d.getDate() + 1);
    }
    return giorni;
  }

  async function carica() {
    const { dal, al } = getRange();
    const [{ data: c }, { data: p }] = await Promise.all([
      supabase.from("hotel_camere").select("id,nome,tipologia,prezzo_base").eq("azienda_id", az.id).eq("attiva", true).order("ordine").order("nome"),
      supabase.from("hotel_prenotazioni")
        .select("id,camera_id,ospite_nome,ospite_cognome,ospite_telefono,ospite_email,data_checkin,data_checkout,stato,adulti,bambini,prezzo_totale,prezzo_notte,colazione_inclusa,notti,canale,stato_pagamento,note_interne,note_ospite")
        .eq("azienda_id", az.id)
        .not("stato","in","(cancellata,noshow)")
        .gte("data_checkout", dal)
        .lte("data_checkin",  al),
    ]);
    camere = c || [];
    prenotazioni = p || [];
    aggiornaLabelMese();
    renderCalendario();
  }

  function renderCalendario() {
    const { dal, al } = getRange();
    const giorni = giorniRange(dal, al);
    const nGiorni = giorni.length;
    const oggi = new Date().toISOString().split("T")[0];

    const CAMERA_W = 120;
    // Larghezza cella più stretta per viste lunghe
    const GIORNO_W = vistaGiorni <= 14 ? 48 : vistaGiorni <= 30 ? 36 : 28;
    const ROW_H    = 44;
    const HEAD_H   = 48;

    const totW = CAMERA_W + nGiorni * GIORNO_W;
    const totH = HEAD_H + camere.length * ROW_H;

    const cal = document.getElementById("calendario");
    cal.style.position = "relative";
    cal.style.width    = totW + "px";
    cal.style.height   = totH + "px";

    let html = "";

    // ── Header giorni ──
    html += `<div style="position:absolute;top:0;left:0;width:${CAMERA_W}px;height:${HEAD_H}px;background:#f8fafc;border-right:2px solid var(--border);border-bottom:2px solid var(--border);z-index:10;display:flex;align-items:center;justify-content:center;">
      <span style="font-size:11px;font-weight:700;color:var(--muted);">CAMERA</span>
    </div>`;

    giorni.forEach((g, i) => {
      const isOggi = g === oggi;
      const d = new Date(g);
      const dom = d.toLocaleDateString("it-IT", { weekday:"short" });
      const num = d.getDate();
      const isFestivo = d.getDay() === 0 || d.getDay() === 6;
      html += `<div style="
        position:absolute;top:0;left:${CAMERA_W + i * GIORNO_W}px;
        width:${GIORNO_W}px;height:${HEAD_H}px;
        border-right:1px solid var(--border);border-bottom:2px solid var(--border);
        background:${isOggi ? "#EBF5FB" : isFestivo ? "#fafafa" : "white"};
        display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:9;
      ">
        <span style="font-size:9px;color:${isOggi ? "var(--primary)" : "var(--muted)"};text-transform:uppercase;">${dom}</span>
        <span style="font-size:13px;font-weight:${isOggi ? "800" : "600"};color:${isOggi ? "var(--primary)" : isFestivo ? "#94a3b8" : "var(--text)"}">${num}</span>
      </div>`;
    });

    // ── Righe camere ──
    camere.forEach((cam, ri) => {
      const y = HEAD_H + ri * ROW_H;

      // Label camera
      html += `<div style="
        position:absolute;top:${y}px;left:0;
        width:${CAMERA_W}px;height:${ROW_H}px;
        background:#f8fafc;border-right:2px solid var(--border);border-bottom:1px solid var(--border);
        display:flex;align-items:center;padding:0 10px;z-index:8;
      ">
        <div>
          <div style="font-size:12px;font-weight:700;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;max-width:100px;">${cam.nome}</div>
          <div style="font-size:10px;color:var(--muted);">${cam.tipologia || ""}</div>
        </div>
      </div>`;

      // Celle giorno
      giorni.forEach((g, gi) => {
        const isOggi = g === oggi;
        const isFestivo = new Date(g).getDay() === 0 || new Date(g).getDay() === 6;
        html += `<div class="cal-cella"
          data-camera="${cam.id}" data-data="${g}"
          style="
            position:absolute;top:${y}px;left:${CAMERA_W + gi * GIORNO_W}px;
            width:${GIORNO_W}px;height:${ROW_H}px;
            border-right:1px solid #f1f5f9;border-bottom:1px solid var(--border);
            background:${isOggi ? "#f0f9ff" : isFestivo ? "#fafafa" : "white"};
            box-sizing:border-box;
          "
        ></div>`;
      });
    });

    cal.innerHTML = html;

    // ── Barre prenotazioni ──
    prenotazioni.forEach(p => {
      const ri = camere.findIndex(c => c.id === p.camera_id);
      if (ri < 0) return;

      const ci = giorni.indexOf(p.data_checkin);
      const co = giorni.indexOf(p.data_checkout);

      // Gestisci prenotazioni che iniziano prima o finiscono dopo il mese
      const startI = ci >= 0 ? ci : 0;
      const endI   = co >= 0 ? co : giorni.length;
      if (startI >= giorni.length || endI <= 0) return;

      const width = (endI - startI) * GIORNO_W - 4;
      if (width <= 0) return;

      const y = HEAD_H + ri * ROW_H;
      const x = CAMERA_W + startI * GIORNO_W + 2;

      const colore = coloreStato(p.stato);
      const bar = document.createElement("div");
      bar.className = "cal-bar";
      bar.dataset.id = p.id;
      bar.dataset.cameraId = p.camera_id;
      bar.dataset.checkin  = p.data_checkin;
      bar.dataset.checkout = p.data_checkout;
      bar.dataset.nome     = `${p.ospite_nome} ${p.ospite_cognome}`;

      bar.style.cssText = `
        position:absolute;top:${y + 4}px;left:${x}px;
        width:${width}px;height:${ROW_H - 8}px;
        background:${colore};border-radius:6px;
        cursor:grab;z-index:5;overflow:hidden;
        display:flex;align-items:center;padding:0 8px;
        user-select:none;box-shadow:0 2px 6px rgba(0,0,0,.15);
        transition:opacity .15s;
      `;

      bar.innerHTML = `<span style="font-size:11px;font-weight:700;color:white;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
        ${p.ospite_nome} ${p.ospite_cognome}${p.notti ? ` · ${p.notti}n` : ""}
      </span>`;

      // Tooltip
      bar.addEventListener("mouseenter", (e) => {
        const tt = document.getElementById("cal-tooltip");
        tt.innerHTML = `
          <div style="font-weight:700;margin-bottom:4px;">${p.ospite_nome} ${p.ospite_cognome}</div>
          <div>📅 ${formatData(p.data_checkin)} → ${formatData(p.data_checkout)}</div>
          <div>👥 ${p.adulti} adulti</div>
          ${p.prezzo_totale ? `<div>💶 € ${p.prezzo_totale.toFixed(2)}</div>` : ""}
          <div>Stato: ${p.stato}</div>
          ${p.colazione_inclusa ? "<div>☕ Colazione inclusa</div>" : ""}
        `;
        tt.style.display = "block";
        posizionaTooltip(e);
      });

      bar.addEventListener("mousemove", posizionaTooltip);

      bar.addEventListener("mouseleave", () => {
        document.getElementById("cal-tooltip").style.display = "none";
      });

      // Click → apri modale dettaglio
      bar.addEventListener("click", (e) => {
        if (bar._dragDistance > 5) return;
        apriModalDettaglio(p);
      });

      // ── DRAG & DROP ──
      bar.addEventListener("mousedown", (e) => {
        e.preventDefault();
        bar._dragged = false;
        bar._dragDistance = 0;
        const startX   = e.clientX;
        const startY   = e.clientY;
        const origLeft = parseInt(bar.style.left);
        const origTop  = parseInt(bar.style.top);
        const notti    = p.notti || Math.round((new Date(p.data_checkout) - new Date(p.data_checkin)) / 86400000);

        bar.style.opacity  = ".85";
        bar.style.cursor   = "grabbing";
        bar.style.zIndex   = "20";
        bar.style.boxShadow = "0 8px 24px rgba(0,0,0,.25)";

        let targetCamera = p.camera_id;
        let targetCheckin = p.data_checkin;
        let highlightCella = null;

        function onMove(ev) {
          const dx = ev.clientX - startX;
          const dy = ev.clientY - startY;
          bar._dragDistance = Math.abs(dx) + Math.abs(dy);
          if (bar._dragDistance > 5) bar._dragged = true;

          bar.style.left = (origLeft + dx) + "px";
          bar.style.top  = (origTop + dy) + "px";

          // Trova cella sotto
          bar.style.pointerEvents = "none";
          const el = document.elementFromPoint(ev.clientX, ev.clientY);
          bar.style.pointerEvents = "";

          if (highlightCella) { highlightCella.style.background = ""; highlightCella = null; }

          if (el?.classList.contains("cal-cella")) {
            targetCamera  = el.dataset.camera;
            targetCheckin = el.dataset.data;
            el.style.background = "rgba(27,79,114,.15)";
            highlightCella = el;
          }
        }

        function onUp() {
          document.removeEventListener("mousemove", onMove);
          document.removeEventListener("mouseup", onUp);

          bar.style.opacity   = "1";
          bar.style.cursor    = "grab";
          bar.style.zIndex    = "5";
          bar.style.boxShadow = "0 2px 6px rgba(0,0,0,.15)";
          if (highlightCella) { highlightCella.style.background = ""; }

          if (!bar._dragged) return;
          if (targetCheckin === p.data_checkin && targetCamera === p.camera_id) {
            renderCalendario(); return;
          }

          // Calcola nuova data checkout
          const nuovaCI = new Date(targetCheckin);
          const nuovaCO = new Date(nuovaCI);
          nuovaCO.setDate(nuovaCO.getDate() + notti);
          const nuovaCheckout = nuovaCO.toISOString().split("T")[0];

          const camNuova = camere.find(c => c.id === targetCamera);
          const camOld   = camere.find(c => c.id === p.camera_id);

          dragData = {
            id:          p.id,
            camera_id:   targetCamera,
            data_checkin:  targetCheckin,
            data_checkout: nuovaCheckout,
          };

          const testo = `
            <strong>${p.ospite_nome} ${p.ospite_cognome}</strong><br>
            ${camOld?.nome !== camNuova?.nome ? `Camera: <b>${camOld?.nome}</b> → <b>${camNuova?.nome}</b><br>` : ""}
            Date: <b>${formatData(p.data_checkin)}</b> → <b>${formatData(targetCheckin)}</b><br>
            Check-out: <b>${formatData(p.data_checkout)}</b> → <b>${formatData(nuovaCheckout)}</b>
          `;

          document.getElementById("modal-sposta-testo").innerHTML = testo;
          document.getElementById("modal-sposta").style.display = "flex";
        }

        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
      });

      cal.appendChild(bar);
    });

    // Linea oggi
    const oggiIdx = giorni.indexOf(oggi);
    if (oggiIdx >= 0) {
      const line = document.createElement("div");
      line.style.cssText = `
        position:absolute;top:${HEAD_H}px;left:${CAMERA_W + oggiIdx * GIORNO_W + GIORNO_W/2}px;
        width:2px;height:${camere.length * ROW_H}px;
        background:var(--primary);opacity:.4;z-index:6;pointer-events:none;
      `;
      cal.appendChild(line);
    }

    // Scroll all'oggi
    if (oggiIdx >= 0) {
      setTimeout(() => {
        const wrap = document.getElementById("calendario-wrap");
        wrap.scrollLeft = Math.max(0, CAMERA_W + oggiIdx * GIORNO_W - wrap.clientWidth / 2);
      }, 100);
    }

    // ── Click su celle per nuova prenotazione ──
    let selStart = null;
    let selCamera = null;
    let selCells = [];

    cal.querySelectorAll(".cal-cella").forEach(cella => {
      cella.addEventListener("mousedown", (e) => {
        if (e.button !== 0) return;
        selStart = cella.dataset.data;
        selCamera = cella.dataset.camera;
        selCells = [cella];
        cella.style.background = "rgba(27,79,114,.2)";
      });

      cella.addEventListener("mouseenter", (e) => {
        if (!selStart || selCamera !== cella.dataset.camera) return;
        // Evidenzia range
        const startD = selStart < cella.dataset.data ? selStart : cella.dataset.data;
        const endD   = selStart < cella.dataset.data ? cella.dataset.data : selStart;
        cal.querySelectorAll(".cal-cella").forEach(c => {
          if (c.dataset.camera === selCamera && c.dataset.data >= startD && c.dataset.data <= endD) {
            c.style.background = "rgba(27,79,114,.15)";
          } else if (!c.style.background.includes("rgb(27")) {
            c.style.background = "";
          }
        });
      });

      cella.addEventListener("mouseup", (e) => {
        if (!selStart || selCamera !== cella.dataset.camera) { selStart = null; return; }
        const ci = selStart < cella.dataset.data ? selStart : cella.dataset.data;
        const co_raw = selStart < cella.dataset.data ? cella.dataset.data : selStart;
        // checkout = giorno dopo l'ultimo selezionato
        const coDate = new Date(co_raw);
        coDate.setDate(coDate.getDate() + 1);
        const co = coDate.toISOString().split("T")[0];

        // Reset highlight
        cal.querySelectorAll(".cal-cella").forEach(c => c.style.background = "");
        selStart = null;

        // Apri modal nuova prenotazione
        apriModalNuovaPrenotazione(ci, co, selCamera, camere, container);
      });
    });
  }

  // ── Navigazione ──
  document.getElementById("btn-prev").onclick = () => {
    if (vistaGiorni === 30) {
      mese--; if (mese < 0) { mese = 11; anno--; }
    } else {
      const d = new Date(dataInizio);
      d.setDate(d.getDate() - vistaGiorni);
      dataInizio = d.toISOString().split('T')[0];
    }
    carica();
  };
  document.getElementById("btn-next").onclick = () => {
    if (vistaGiorni === 30) {
      mese++; if (mese > 11) { mese = 0; anno++; }
    } else {
      const d = new Date(dataInizio);
      d.setDate(d.getDate() + vistaGiorni);
      dataInizio = d.toISOString().split('T')[0];
    }
    carica();
  };
  document.getElementById("btn-oggi").onclick = () => {
    anno = new Date().getFullYear();
    mese = new Date().getMonth();
    dataInizio = new Date().toISOString().split('T')[0];
    carica();
  };

  // ── Switch vista ──
  container.querySelectorAll('.btn-vista').forEach(btn => {
    btn.onclick = () => {
      vistaGiorni = parseInt(btn.dataset.vista);
      container.querySelectorAll('.btn-vista').forEach(b => {
        b.style.background = b === btn ? '#0E5A7A' : 'none';
        b.style.color      = b === btn ? 'white'   : '#64748b';
      });
      // Per mese: aggiusta dataInizio
      if (vistaGiorni === 30) {
        anno = new Date().getFullYear();
        mese = new Date().getMonth();
      } else {
        dataInizio = new Date().toISOString().split('T')[0];
      }
      carica();
    };
  });

  document.getElementById("btn-nuova").onclick = () => {
    window.location.hash = "#/hotel-prenotazioni?new=1";
  };

  // ── Conferma spostamento ──
  document.getElementById("btn-conferma-sposta").onclick = async () => {
    if (!dragData) return;
    const btn = document.getElementById("btn-conferma-sposta");
    btn.disabled = true;
    btn.textContent = "Salvataggio...";

    const { error } = await supabase
      .from("hotel_prenotazioni")
      .update({
        camera_id:    dragData.camera_id,
        data_checkin: dragData.data_checkin,
        data_checkout: dragData.data_checkout,
        updated_at:   new Date().toISOString(),
      })
      .eq("id", dragData.id);

    document.getElementById("modal-sposta").style.display = "none";
    dragData = null;
    btn.disabled = false;
    btn.textContent = "Conferma";

    if (error) { alert("Errore: " + error.message); }
    await carica();
  };

  document.getElementById("btn-annulla-sposta").onclick = () => {
    document.getElementById("modal-sposta").style.display = "none";
    dragData = null;
    renderCalendario();
  };

  await carica();
}

// ── Helpers ──
function giorniDelMese(anno, mese) {
  const giorni = [];
  const d = new Date(anno, mese, 1);
  while (d.getMonth() === mese) {
    giorni.push(d.toISOString().split("T")[0]);
    d.setDate(d.getDate() + 1);
  }
  return giorni;
}
function primoGiornoMese(anno, mese) { return new Date(anno, mese, 1).toISOString().split("T")[0]; }
function ultimoGiornoMese(anno, mese) { return new Date(anno, mese+1, 0).toISOString().split("T")[0]; }

function coloreStato(stato) {
  const map = {
    preventivo:  "#9CA3AF",
    confermata:  "#3B82F6",
    checkin:     "#16A34A",
    checkout:    "#C9A84C",
    cancellata:  "#DC2626",
    noshow:      "#DC2626",
  };
  return map[stato] || "#3B82F6";
}

function formatData(d) {
  if (!d) return "—";
  const [y,m,g] = d.split("-");
  return `${g}/${m}/${y}`;
}

function posizionaTooltip(e) {
  const tt = document.getElementById("cal-tooltip");
  const margin = 12;
  let x = e.clientX + margin;
  let y = e.clientY + margin;
  if (x + 270 > window.innerWidth)  x = e.clientX - 270 - margin;
  if (y + 150 > window.innerHeight) y = e.clientY - 150 - margin;
  tt.style.left = x + "px";
  tt.style.top  = y + "px";
}

/* ══════════════════════════════════════════════
   MODAL DETTAGLIO PRENOTAZIONE
══════════════════════════════════════════════ */
async function apriModalDettaglio(p) {
  document.getElementById("cal-modal-dettaglio")?.remove();

  const modal = document.createElement("div");
  modal.id = "cal-modal-dettaglio";
  modal.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:10000;
    display:flex;align-items:center;justify-content:center;padding:16px;
  `;

  const statoColori = {
    confermata:'#3B82F6', checkin:'#16A34A', checkout:'#C9A84C',
    preventivo:'#9CA3AF', cancellata:'#DC2626', noshow:'#DC2626'
  };
  const colore = statoColori[p.stato] || '#3B82F6';
  const notti = p.notti || Math.round((new Date(p.data_checkout) - new Date(p.data_checkin)) / 86400000);

  modal.innerHTML = `
    <div style="background:white;border-radius:20px;width:100%;max-width:480px;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.3);">

      <div style="background:linear-gradient(135deg,${colore},${colore}cc);padding:20px 24px;border-radius:20px 20px 0 0;color:white;display:flex;justify-content:space-between;align-items:flex-start;">
        <div>
          <div style="font-weight:800;font-size:18px;">${esc(p.ospite_nome)} ${esc(p.ospite_cognome||'')}</div>
          <div style="font-size:13px;opacity:.85;margin-top:4px;">
            ${p.stato?.toUpperCase()} &nbsp;·&nbsp; ${notti} nott${notti===1?'e':'i'}
          </div>
        </div>
        <button id="det-close" style="background:rgba(255,255,255,.2);border:none;color:white;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;">✕</button>
      </div>

      <div style="padding:20px 24px;">

        <!-- Date -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
          <div style="background:#f0f9ff;border-radius:12px;padding:12px;">
            <div style="font-size:10px;font-weight:800;color:#0E5A7A;text-transform:uppercase;margin-bottom:4px;">Check-in</div>
            <div style="font-size:16px;font-weight:800;">${formatData(p.data_checkin)}</div>
          </div>
          <div style="background:#f0f9ff;border-radius:12px;padding:12px;">
            <div style="font-size:10px;font-weight:800;color:#0E5A7A;text-transform:uppercase;margin-bottom:4px;">Check-out</div>
            <div style="font-size:16px;font-weight:800;">${formatData(p.data_checkout)}</div>
          </div>
        </div>

        <!-- Dettagli -->
        <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px;">
          ${p.ospite_telefono ? `<div style="display:flex;align-items:center;gap:10px;font-size:14px;">📞 <a href="tel:${esc(p.ospite_telefono)}" style="color:#0E5A7A;font-weight:600;">${esc(p.ospite_telefono)}</a></div>` : ''}
          ${p.ospite_email    ? `<div style="display:flex;align-items:center;gap:10px;font-size:14px;">📧 <a href="mailto:${esc(p.ospite_email)}" style="color:#0E5A7A;font-weight:600;">${esc(p.ospite_email)}</a></div>` : ''}
          <div style="font-size:14px;">👥 ${p.adulti||1} adult${(p.adulti||1)===1?'o':'i'}${p.bambini ? ` + ${p.bambini} bambin${p.bambini===1?'o':'i'}` : ''}</div>
          ${p.prezzo_totale   ? `<div style="font-size:14px;">💶 <strong>€${Number(p.prezzo_totale).toFixed(2)}</strong> totale${p.prezzo_notte?` (€${Number(p.prezzo_notte).toFixed(2)}/notte)`:''}` : ''}
          ${p.colazione_inclusa ? `<div style="font-size:14px;">☕ Colazione inclusa</div>` : ''}
          ${p.canale          ? `<div style="font-size:14px;">📡 Canale: <strong>${esc(p.canale)}</strong></div>` : ''}
          ${p.stato_pagamento ? `<div style="font-size:14px;">💳 Pagamento: <strong>${esc(p.stato_pagamento)}</strong></div>` : ''}
        </div>

        ${p.note_ospite  ? `<div style="background:#fffbeb;border-radius:10px;padding:10px 14px;font-size:13px;color:#92400e;margin-bottom:12px;">📝 ${esc(p.note_ospite)}</div>` : ''}
        ${p.note_interne ? `<div style="background:#f1f5f9;border-radius:10px;padding:10px 14px;font-size:13px;color:#374151;margin-bottom:12px;">🔒 ${esc(p.note_interne)}</div>` : ''}

        <!-- Azioni -->
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px;">
          <button id="det-apri-full" style="flex:1;background:#0E5A7A;color:white;border:none;padding:11px;border-radius:10px;cursor:pointer;font-size:13px;font-weight:700;">
            ✏️ Apri e modifica
          </button>
          <button id="det-annulla" style="background:#fee2e2;color:#dc2626;border:none;padding:11px 16px;border-radius:10px;cursor:pointer;font-size:13px;font-weight:700;">
            🗑 Annulla
          </button>
        </div>

        <div id="det-esito" style="font-size:13px;min-height:14px;margin-top:10px;"></div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector('#det-close').onclick = () => modal.remove();
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

  modal.querySelector('#det-apri-full').onclick = () => {
    modal.remove();
    window.location.hash = `#/hotel-prenotazioni?id=${p.id}`;
  };

  modal.querySelector('#det-annulla').onclick = async () => {
    if (!confirm(`Annullare la prenotazione di ${p.ospite_nome} ${p.ospite_cognome||''}?`)) return;
    const btn = modal.querySelector('#det-annulla');
    btn.disabled = true; btn.textContent = 'Annullamento...';
    const { error } = await supabase
      .from('hotel_prenotazioni')
      .update({ stato: 'cancellata', updated_at: new Date().toISOString() })
      .eq('id', p.id);
    if (error) {
      modal.querySelector('#det-esito').innerHTML = `<span style="color:#dc2626;">❌ ${error.message}</span>`;
      btn.disabled = false; btn.textContent = '🗑 Annulla';
      return;
    }
    modal.remove();
    // Ricarica il calendario — trova la funzione carica nel closure globale
    document.getElementById('btn-oggi')?.click();
  };
}

function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }

/* ══════════════════════════════════════════════
   MODAL NUOVA PRENOTAZIONE DAL PLANNING
══════════════════════════════════════════════ */
async function apriModalNuovaPrenotazione(ci, co, cameraId, camere, container) {
  const camera = camere.find(c => c.id === cameraId);
  const notti  = Math.round((new Date(co) - new Date(ci)) / 86400000);

  // Rimuovi modal esistente se c'è
  document.getElementById("cal-modal-pren")?.remove();

  const modal = document.createElement("div");
  modal.id = "cal-modal-pren";
  modal.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:10000;
    display:flex;align-items:center;justify-content:center;padding:16px;
  `;

  modal.innerHTML = `
    <div style="background:white;border-radius:20px;width:100%;max-width:560px;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.3);">

      <!-- Header -->
      <div style="background:linear-gradient(135deg,#1B4F72,#2471A3);padding:20px 24px;border-radius:20px 20px 0 0;color:white;display:flex;justify-content:space-between;align-items:center;">
        <div>
          <div style="font-weight:800;font-size:16px;">+ Nuova prenotazione</div>
          <div style="font-size:13px;opacity:.8;margin-top:2px;">
            🛏️ ${camera?.nome || "Camera"} &nbsp;·&nbsp;
            📅 ${formatData(ci)} → ${formatData(co)} &nbsp;·&nbsp;
            🌙 ${notti} notti
          </div>
        </div>
        <button id="cal-modal-close" style="background:rgba(255,255,255,.2);border:none;color:white;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;">✕</button>
      </div>

      <div style="padding:20px 24px;">

        <!-- Ricerca ospite esistente -->
        <div style="background:#EBF5FB;border-radius:12px;padding:14px;margin-bottom:16px;">
          <div style="font-weight:700;font-size:13px;margin-bottom:8px;color:#1B4F72;">🔍 Cerca ospite esistente</div>
          <input id="cal-cerca-ospite" class="input" placeholder="Cognome, email o telefono...">
          <div id="cal-risultati-ospite" style="margin-top:6px;max-height:150px;overflow-y:auto;"></div>
        </div>

        <!-- Form ospite -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
          <div class="form-group">
            <label>Nome *</label>
            <input id="cal-nome" class="input" placeholder="Mario">
          </div>
          <div class="form-group">
            <label>Cognome *</label>
            <input id="cal-cognome" class="input" placeholder="Rossi">
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
          <div class="form-group">
            <label>Telefono</label>
            <input id="cal-telefono" class="input" placeholder="+39 333...">
          </div>
          <div class="form-group">
            <label>Email</label>
            <input id="cal-email" class="input" type="email" placeholder="mario@email.it">
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:12px;">
          <div class="form-group">
            <label>Adulti</label>
            <input id="cal-adulti" class="input" type="number" value="2" min="1">
          </div>
          <div class="form-group">
            <label>Bambini</label>
            <input id="cal-bambini" class="input" type="number" value="0" min="0">
          </div>
          <div class="form-group">
            <label>Canale</label>
            <select id="cal-canale" class="input">
              <option value="diretto">Diretto</option>
              <option value="telefono">Telefono</option>
              <option value="booking">Booking</option>
              <option value="airbnb">Airbnb</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="walk_in">Walk-in</option>
            </select>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
          <div class="form-group">
            <label>Prezzo/notte (€)</label>
            <input id="cal-prezzo" class="input" type="number" step="0.01" value="${camera?.prezzo_base || ""}">
          </div>
          <div class="form-group">
            <label>Totale (€)</label>
            <input id="cal-totale" class="input" type="number" step="0.01" value="${camera?.prezzo_base ? (camera.prezzo_base * notti).toFixed(2) : ""}">
          </div>
        </div>
        <div class="form-group">
          <label>Note</label>
          <textarea id="cal-note" class="input" rows="2" placeholder="Richieste speciali..."></textarea>
        </div>

        <div id="cal-modal-error" style="color:#DC2626;font-size:13px;margin-bottom:8px;"></div>

        <div style="display:flex;gap:10px;">
          <button id="cal-modal-salva" class="btn btn-primary" style="flex:1;">💾 Crea prenotazione</button>
          <button id="cal-modal-apri-full" class="btn btn-ghost" style="flex:1;">📋 Apri form completo</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Chiudi
  modal.querySelector("#cal-modal-close").onclick = () => modal.remove();
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

  // Calcolo totale automatico
  const prezzoEl  = modal.querySelector("#cal-prezzo");
  const totaleEl  = modal.querySelector("#cal-totale");
  prezzoEl.oninput = () => {
    const p = parseFloat(prezzoEl.value) || 0;
    totaleEl.value = (p * notti).toFixed(2);
  };

  // Ricerca ospite esistente
  let searchTimer;
  modal.querySelector("#cal-cerca-ospite").oninput = () => {
    clearTimeout(searchTimer);
    const q = modal.querySelector("#cal-cerca-ospite").value.trim();
    if (q.length < 2) { modal.querySelector("#cal-risultati-ospite").innerHTML = ""; return; }
    searchTimer = setTimeout(() => cercaOspiteModal(q, modal), 300);
  };

  // Apri form completo
  modal.querySelector("#cal-modal-apri-full").onclick = () => {
    modal.remove();
    window.location.hash = `#/hotel-prenotazioni?new=1&camera=${cameraId}&ci=${ci}&co=${co}`;
  };

  // Salva rapido
  modal.querySelector("#cal-modal-salva").onclick = async () => {
    const nome    = modal.querySelector("#cal-nome").value.trim();
    const cognome = modal.querySelector("#cal-cognome").value.trim();
    const errEl   = modal.querySelector("#cal-modal-error");

    if (!nome)    { errEl.textContent = "Inserisci il nome"; return; }
    if (!cognome) { errEl.textContent = "Inserisci il cognome"; return; }

    const btn = modal.querySelector("#cal-modal-salva");
    btn.disabled = true; btn.textContent = "Salvataggio...";

    const { data: az } = await supabase.from("utenti_aziende")
      .select("azienda_id").eq("user_id", (await supabase.auth.getUser()).data.user?.id).limit(1).single();

    const prezzo = parseFloat(modal.querySelector("#cal-prezzo").value) || null;
    const totale = parseFloat(modal.querySelector("#cal-totale").value) || null;

    const { error } = await supabase.from("hotel_prenotazioni").insert({
      azienda_id:      window.state.azienda.id,
      camera_id:       cameraId,
      canale:          modal.querySelector("#cal-canale").value,
      stato:           "confermata",
      ospite_nome:     nome,
      ospite_cognome:  cognome,
      ospite_telefono: modal.querySelector("#cal-telefono").value.trim() || null,
      ospite_email:    modal.querySelector("#cal-email").value.trim() || null,
      data_checkin:    ci,
      data_checkout:   co,
      adulti:          parseInt(modal.querySelector("#cal-adulti").value) || 1,
      bambini:         parseInt(modal.querySelector("#cal-bambini").value) || 0,
      prezzo_notte:    prezzo,
      prezzo_totale:   totale,
      stato_pagamento: "non_pagato",
      note_interne:    modal.querySelector("#cal-note").value.trim() || null,
    });

    if (error) {
      errEl.textContent = error.message;
      btn.disabled = false; btn.textContent = "💾 Crea prenotazione";
      return;
    }

    modal.remove();
    await carica(); // ricarica il calendario
  };
}

async function cercaOspiteModal(q, modal) {
  const { data } = await supabase
    .from("hotel_prenotazioni")
    .select("ospite_nome, ospite_cognome, ospite_email, ospite_telefono")
    .eq("azienda_id", window.state.azienda.id)
    .or(`ospite_cognome.ilike.%${q}%,ospite_email.ilike.%${q}%,ospite_telefono.ilike.%${q}%`)
    .order("data_checkin", { ascending: false })
    .limit(5);

  const res = modal.querySelector("#cal-risultati-ospite");
  if (!data || data.length === 0) { res.innerHTML = ""; return; }

  // Deduplica per nome+cognome+email
  const visti = new Set();
  const unici = data.filter(p => {
    const k = `${p.ospite_nome}|${p.ospite_cognome}|${p.ospite_email}`;
    if (visti.has(k)) return false;
    visti.add(k); return true;
  });

  res.innerHTML = unici.map((p, i) => `
    <div class="osp-result" data-idx="${i}" style="
      padding:8px 10px;border-radius:8px;cursor:pointer;font-size:13px;
      border:1px solid #e2e8f0;margin-bottom:4px;background:white;
    ">
      <strong>${p.ospite_nome} ${p.ospite_cognome}</strong>
      <span style="color:#64748b;font-size:11px;"> · ${p.ospite_email || p.ospite_telefono || ""}</span>
    </div>
  `).join("");

  res.querySelectorAll(".osp-result").forEach(el => {
    el.onclick = () => {
      const p = unici[parseInt(el.dataset.idx)];
      modal.querySelector("#cal-nome").value     = p.ospite_nome || "";
      modal.querySelector("#cal-cognome").value  = p.ospite_cognome || "";
      modal.querySelector("#cal-email").value    = p.ospite_email || "";
      modal.querySelector("#cal-telefono").value = p.ospite_telefono || "";
      modal.querySelector("#cal-cerca-ospite").value = "";
      res.innerHTML = "";
    };
  });
}

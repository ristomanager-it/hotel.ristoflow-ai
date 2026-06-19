import { supabase } from "../supabaseClient.js";

export async function render(container) {
  const az = window.state.azienda;

  container.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">📅 Planning camere</div>
        <div class="page-sub">Trascina per spostare date o camera</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
        <button class="btn btn-ghost btn-sm" id="btn-prev">◀</button>
        <span id="label-mese" style="font-weight:700;font-size:15px;min-width:140px;text-align:center;"></span>
        <button class="btn btn-ghost btn-sm" id="btn-next">▶</button>
        <button class="btn btn-ghost btn-sm" id="btn-oggi">Oggi</button>
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
  let camere = [];
  let prenotazioni = [];
  let dragData = null;

  async function carica() {
    const [{ data: c }, { data: p }] = await Promise.all([
      supabase.from("hotel_camere").select("id,nome,tipologia,prezzo_base").eq("azienda_id", az.id).eq("attiva", true).order("ordine").order("nome"),
      supabase.from("hotel_prenotazioni")
        .select("id,camera_id,ospite_nome,ospite_cognome,data_checkin,data_checkout,stato,adulti,prezzo_totale,colazione_inclusa,notti")
        .eq("azienda_id", az.id)
        .not("stato","in","(cancellata,noshow)")
        .gte("data_checkout", primoGiornoMese(anno, mese))
        .lte("data_checkin",  ultimoGiornoMese(anno, mese)),
    ]);
    camere = c || [];
    prenotazioni = p || [];
    renderCalendario();
  }

  function renderCalendario() {
    const giorni = giorniDelMese(anno, mese);
    const nGiorni = giorni.length;
    const oggi = new Date().toISOString().split("T")[0];

    document.getElementById("label-mese").textContent =
      new Date(anno, mese, 1).toLocaleDateString("it-IT", { month:"long", year:"numeric" });

    const CAMERA_W = 120;
    const GIORNO_W = 36;
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

      // Click → apri prenotazione
      bar.addEventListener("click", (e) => {
        if (bar._dragged) return;
        window.location.hash = `#/hotel-prenotazioni?id=${p.id}`;
      });

      // ── DRAG & DROP ──
      bar.addEventListener("mousedown", (e) => {
        e.preventDefault();
        bar._dragged = false;
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
          if (Math.abs(dx) > 3 || Math.abs(dy) > 3) bar._dragged = true;

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
  }

  // ── Navigazione mese ──
  document.getElementById("btn-prev").onclick = () => {
    mese--; if (mese < 0) { mese = 11; anno--; }
    carica();
  };
  document.getElementById("btn-next").onclick = () => {
    mese++; if (mese > 11) { mese = 0; anno++; }
    carica();
  };
  document.getElementById("btn-oggi").onclick = () => {
    anno = new Date().getFullYear();
    mese = new Date().getMonth();
    carica();
  };

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

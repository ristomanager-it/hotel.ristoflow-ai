import { supabase } from "../supabaseClient.js";

const TEMPLATE = [
  {
    id: "conferma",
    nome: "✅ Conferma prenotazione",
    canale: "whatsapp",
    testo: `Gentile {nome},\n\nLa sua prenotazione è confermata! 🎉\n\n🏨 {hotel}\n🛏️ Camera: {camera}\n📅 Check-in: {checkin} ore {ora_checkin}\n📅 Check-out: {checkout} ore {ora_checkout}\n🌙 {notti} notti\n💶 Totale: € {totale}\n\nPer il check-in online: {link_checkin}\n\nA presto! 🙏`
  },
  {
    id: "reminder",
    nome: "⏰ Reminder arrivo (1 giorno prima)",
    canale: "whatsapp",
    testo: `Gentile {nome},\n\nDomani ci vediamo! 🏨\n\nRicordiamo che il suo check-in è previsto per domani {checkin} alle ore {ora_checkin}.\n\n📍 {indirizzo}\n\nSe ha bisogno di info o vuole completare il check-in online in anticipo:\n{link_checkin}\n\nA domani! 👋`
  },
  {
    id: "checkin_online",
    nome: "📱 Invito check-in online",
    canale: "whatsapp",
    testo: `Gentile {nome},\n\nPuò velocizzare il suo arrivo completando il check-in online in anticipo:\n\n👇 {link_checkin}\n\nBasterà inserire i dati del documento e firmare il modulo. L'arrivo sarà più rapido e senza attese!\n\nA presto 🙏`
  },
  {
    id: "post_stay",
    nome: "⭐ Post stay - richiesta recensione",
    canale: "whatsapp",
    testo: `Gentile {nome},\n\nSperiamo che il suo soggiorno da noi sia stato piacevole! 😊\n\nSe ha un momento, una recensione ci aiuterebbe moltissimo:\n🌟 Google: {link_google}\n\nGrazie di cuore e speriamo di rivederla presto! 🏨`
  },
  {
    id: "offerta",
    nome: "🎁 Offerta personalizzata",
    canale: "whatsapp",
    testo: `Gentile {nome},\n\nAbbiamo un'offerta speciale per lei! 🎉\n\n{testo_offerta}\n\nPer prenotare: {link_prenotazione}\n\nOfferta valida fino al {scadenza} 📅`
  },
];

export async function render(container) {
  const az = window.state.azienda;
  const params = new URLSearchParams(window.location.hash.split("?")[1] || "");
  const emailParam = params.get("email");

  container.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">💬 Messaggistica</div>
        <div class="page-sub">WhatsApp ed email agli ospiti — template e invii</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">

      <!-- Sinistra: selezione ospiti e template -->
      <div>
        <div class="card" style="margin-bottom:16px;">
          <div class="card-title">👤 Destinatari</div>

          <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;">
            <button class="btn btn-ghost btn-sm tipo-btn active" data-tipo="singolo">Singolo ospite</button>
            <button class="btn btn-ghost btn-sm tipo-btn" data-tipo="arrivi">Arrivi oggi</button>
            <button class="btn btn-ghost btn-sm tipo-btn" data-tipo="domani">Arrivi domani</button>
            <button class="btn btn-ghost btn-sm tipo-btn" data-tipo="incasa">In casa</button>
            <button class="btn btn-ghost btn-sm tipo-btn" data-tipo="checkout">Partenze oggi</button>
          </div>

          <div id="box-singolo">
            <input id="cerca-ospite" class="input" placeholder="Cerca ospite per nome o email..." value="${emailParam || ""}">
            <div id="risultati-ospite" style="margin-top:8px;"></div>
          </div>

          <div id="box-gruppo" style="display:none;">
            <div id="lista-gruppo" style="max-height:200px;overflow-y:auto;"></div>
          </div>

          <div id="ospite-selezionato" style="margin-top:10px;"></div>
        </div>

        <div class="card">
          <div class="card-title">📝 Template messaggio</div>
          ${TEMPLATE.map(t => `
            <div class="template-card" data-id="${t.id}" style="
              padding:10px 12px;border-radius:10px;border:1px solid var(--border);
              margin-bottom:8px;cursor:pointer;transition:all .15s;
            ">
              <div style="font-weight:700;font-size:13px;">${t.nome}</div>
              <div style="font-size:11px;color:var(--muted);">${t.canale}</div>
            </div>
          `).join("")}
        </div>
      </div>

      <!-- Destra: editor messaggio e anteprima -->
      <div>
        <div class="card">
          <div class="card-title">✏️ Messaggio</div>

          <div style="display:flex;gap:8px;margin-bottom:12px;">
            <button class="btn btn-ghost btn-sm canale-btn active" data-canale="whatsapp">📱 WhatsApp</button>
            <button class="btn btn-ghost btn-sm canale-btn" data-canale="email">📧 Email</button>
          </div>

          <div id="box-email-subject" style="display:none;">
            <div class="form-group">
              <label>Oggetto email</label>
              <input id="email-subject" class="input" placeholder="Es. Conferma prenotazione - {hotel}">
            </div>
          </div>

          <div class="form-group">
            <label>Testo messaggio</label>
            <textarea id="msg-testo" class="input" rows="10" placeholder="Seleziona un template o scrivi il messaggio..."></textarea>
          </div>

          <div style="background:var(--bg);border-radius:10px;padding:12px;margin-bottom:12px;font-size:12px;color:var(--muted);">
            <strong>Variabili disponibili:</strong><br>
            {nome} {cognome} {hotel} {camera} {checkin} {checkout} {ora_checkin} {ora_checkout} {notti} {totale} {link_checkin}
          </div>

          <!-- Anteprima -->
          <div style="background:#DCF8C6;border-radius:12px;padding:14px;margin-bottom:14px;display:none;" id="anteprima-box">
            <div style="font-size:11px;font-weight:700;color:#128C7E;margin-bottom:6px;">ANTEPRIMA WhatsApp</div>
            <div id="anteprima-testo" style="font-size:13px;white-space:pre-wrap;word-break:break-word;"></div>
          </div>

          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button class="btn btn-ghost btn-sm" id="btn-anteprima">👁 Anteprima</button>
            <button class="btn btn-primary" id="btn-invia" disabled>📤 Invia</button>
          </div>

          <div id="msg-result" style="margin-top:10px;font-size:13px;"></div>
        </div>
      </div>
    </div>
  `;

  let ospiteSelezionato = null;
  let destinatari = [];
  let canaleAttivo = "whatsapp";

  // ── Tipo destinatari ──
  container.querySelectorAll(".tipo-btn").forEach(btn => {
    btn.onclick = async () => {
      container.querySelectorAll(".tipo-btn").forEach(b => b.classList.remove("active", "btn-primary"));
      btn.classList.add("active", "btn-primary");

      const tipo = btn.dataset.tipo;
      container.querySelector("#box-singolo").style.display = tipo === "singolo" ? "" : "none";
      container.querySelector("#box-gruppo").style.display  = tipo !== "singolo" ? "" : "none";

      if (tipo !== "singolo") await caricaGruppo(tipo, az.id, container);
    };
  });

  // ── Cerca ospite singolo ──
  let timer;
  container.querySelector("#cerca-ospite").oninput = () => {
    clearTimeout(timer);
    timer = setTimeout(() => cercaOspite(az.id, container, (o) => {
      ospiteSelezionato = o;
      destinatari = [o];
      container.querySelector("#btn-invia").disabled = false;
      mostraOspiteSelezionato(o, container);
    }), 300);
  };

  if (emailParam) {
    // Pre-cerca se arriva da anagrafica
    setTimeout(() => container.querySelector("#cerca-ospite").dispatchEvent(new Event("input")), 100);
  }

  // ── Template ──
  container.querySelectorAll(".template-card").forEach(card => {
    card.onclick = () => {
      container.querySelectorAll(".template-card").forEach(c => c.style.background = "");
      card.style.background = "#EBF5FB";
      const t = TEMPLATE.find(t => t.id === card.dataset.id);
      if (t) container.querySelector("#msg-testo").value = t.testo;
    };
  });

  // ── Canale ──
  container.querySelectorAll(".canale-btn").forEach(btn => {
    btn.onclick = () => {
      container.querySelectorAll(".canale-btn").forEach(b => b.classList.remove("active","btn-primary"));
      btn.classList.add("active","btn-primary");
      canaleAttivo = btn.dataset.canale;
      container.querySelector("#box-email-subject").style.display = canaleAttivo === "email" ? "" : "none";
      container.querySelector("#anteprima-box").style.display = "none";
    };
  });

  // ── Anteprima ──
  container.querySelector("#btn-anteprima").onclick = () => {
    const testo = container.querySelector("#msg-testo").value;
    const o = ospiteSelezionato;
    const sostituito = sostituisciVariabili(testo, o, az);
    const box = container.querySelector("#anteprima-box");
    container.querySelector("#anteprima-testo").textContent = sostituito;
    box.style.display = canaleAttivo === "whatsapp" ? "" : "none";
  };

  // ── Invia ──
  container.querySelector("#btn-invia").onclick = async () => {
    const testo = container.querySelector("#msg-testo").value.trim();
    if (!testo) return;

    const btnInvia = container.querySelector("#btn-invia");
    btnInvia.disabled = true;
    btnInvia.textContent = "Invio...";
    const result = container.querySelector("#msg-result");
    result.innerHTML = "";

    let successi = 0;
    let errori = 0;

    for (const dest of destinatari) {
      const testoFin = sostituisciVariabili(testo, dest, az);

      if (canaleAttivo === "whatsapp" && dest.ospite_telefono) {
        // Chiamata Edge Function whatsapp esistente
        const { error } = await supabase.functions.invoke("whatsapp-send", {
          body: { telefono: dest.ospite_telefono, testo: testoFin }
        });
        error ? errori++ : successi++;
      } else if (canaleAttivo === "email" && dest.ospite_email) {
        const subject = sostituisciVariabili(container.querySelector("#email-subject")?.value || "Messaggio da " + az.nome, dest, az);
        const { error } = await supabase.functions.invoke("send-email", {
          body: { to: dest.ospite_email, subject, html: testoFin.replace(/\n/g, "<br>") }
        });
        error ? errori++ : successi++;
      } else {
        errori++;
      }
    }

    btnInvia.disabled = false;
    btnInvia.textContent = "📤 Invia";
    result.innerHTML = `
      ${successi > 0 ? `<span style="color:var(--success);">✅ ${successi} inviati</span>` : ""}
      ${errori > 0 ? `<span style="color:var(--danger);margin-left:8px;">❌ ${errori} falliti</span>` : ""}
    `;
  };
}

async function caricaGruppo(tipo, aziendaId, container) {
  const oggi = new Date().toISOString().split("T")[0];
  const domani = new Date(Date.now() + 86400000).toISOString().split("T")[0];

  let q = supabase.from("hotel_prenotazioni")
    .select("ospite_nome, ospite_cognome, ospite_email, ospite_telefono, data_checkin, data_checkout, hotel_camere(nome)")
    .eq("azienda_id", aziendaId);

  if (tipo === "arrivi")  q = q.eq("data_checkin", oggi).in("stato", ["confermata","preventivo"]);
  if (tipo === "domani")  q = q.eq("data_checkin", domani).in("stato", ["confermata","preventivo"]);
  if (tipo === "incasa")  q = q.eq("stato", "checkin").lt("data_checkin", oggi).gt("data_checkout", oggi);
  if (tipo === "checkout") q = q.eq("data_checkout", oggi).eq("stato", "checkin");

  const { data } = await q.limit(50);
  const lista = container.querySelector("#lista-gruppo");
  const btn   = container.querySelector("#btn-invia");

  if (!data || data.length === 0) {
    lista.innerHTML = `<p class="text-muted text-small">Nessuno</p>`;
    btn.disabled = true;
    return;
  }

  // Salva destinatari globalmente nel container
  container._destinatari = data;
  container.querySelector("#btn-invia").disabled = false;

  lista.innerHTML = data.map(p => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border);font-size:13px;">
      <div>
        <span style="font-weight:700;">${p.ospite_nome} ${p.ospite_cognome}</span>
        <span class="text-muted"> — ${p.hotel_camere?.nome || "—"}</span>
      </div>
      <span class="text-muted text-small">${p.ospite_telefono || p.ospite_email || "—"}</span>
    </div>
  `).join("");

  // Aggiorna destinatari
  container.querySelector("#btn-invia").onclick = async () => {
    const testo = container.querySelector("#msg-testo").value.trim();
    if (!testo) return;
    // usa container._destinatari
  };
}

async function cercaOspite(aziendaId, container, onSelect) {
  const cerca = container.querySelector("#cerca-ospite").value.trim();
  if (cerca.length < 2) { container.querySelector("#risultati-ospite").innerHTML = ""; return; }

  const { data } = await supabase.from("hotel_prenotazioni")
    .select("ospite_nome, ospite_cognome, ospite_email, ospite_telefono, data_checkin, data_checkout, hotel_camere(nome)")
    .eq("azienda_id", aziendaId)
    .or(`ospite_nome.ilike.%${cerca}%,ospite_cognome.ilike.%${cerca}%,ospite_email.ilike.%${cerca}%`)
    .order("data_checkin", { ascending: false })
    .limit(8);

  const el = container.querySelector("#risultati-ospite");
  if (!data || data.length === 0) { el.innerHTML = `<p class="text-muted text-small">Nessun risultato</p>`; return; }

  // Deduplicati per ospite
  const visti = new Set();
  const unici = data.filter(p => {
    const k = `${p.ospite_nome}|${p.ospite_cognome}|${p.ospite_email}`;
    if (visti.has(k)) return false;
    visti.add(k); return true;
  });

  el.innerHTML = unici.map((p, i) => `
    <div class="risultato-ospite" data-idx="${i}" style="
      padding:8px 10px;border-radius:8px;cursor:pointer;font-size:13px;
      border:1px solid var(--border);margin-bottom:4px;transition:background .1s;
    " onmouseenter="this.style.background='var(--bg)'" onmouseleave="this.style.background=''">
      <strong>${p.ospite_nome} ${p.ospite_cognome}</strong>
      ${p.ospite_email ? `<span class="text-muted"> — ${p.ospite_email}</span>` : ""}
      ${p.ospite_telefono ? `<span class="text-muted"> · ${p.ospite_telefono}</span>` : ""}
    </div>
  `).join("");

  el.querySelectorAll(".risultato-ospite").forEach(row => {
    row.onclick = () => {
      const p = unici[parseInt(row.dataset.idx)];
      el.innerHTML = "";
      onSelect(p);
    };
  });
}

function mostraOspiteSelezionato(o, container) {
  const el = container.querySelector("#ospite-selezionato");
  el.innerHTML = `
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:10px 12px;font-size:13px;display:flex;justify-content:space-between;align-items:center;">
      <div>
        ✅ <strong>${o.ospite_nome} ${o.ospite_cognome}</strong>
        ${o.ospite_email ? ` · ${o.ospite_email}` : ""}
        ${o.ospite_telefono ? ` · ${o.ospite_telefono}` : ""}
      </div>
      <button class="btn btn-ghost btn-sm" id="btn-deseleziona">✕</button>
    </div>
  `;
  el.querySelector("#btn-deseleziona").onclick = () => {
    el.innerHTML = "";
    container.querySelector("#btn-invia").disabled = true;
    container.querySelector("#cerca-ospite").value = "";
  };
}

function sostituisciVariabili(testo, ospite, az) {
  if (!ospite) return testo;
  return testo
    .replace(/{nome}/g,        ospite.ospite_nome || "")
    .replace(/{cognome}/g,     ospite.ospite_cognome || "")
    .replace(/{hotel}/g,       az?.nome || "")
    .replace(/{camera}/g,      ospite.hotel_camere?.nome || "")
    .replace(/{checkin}/g,     formatData(ospite.data_checkin))
    .replace(/{checkout}/g,    formatData(ospite.data_checkout))
    .replace(/{ora_checkin}/g, ospite.ora_checkin_prevista || "14:00")
    .replace(/{ora_checkout}/g,ospite.ora_checkout_prevista || "11:00")
    .replace(/{notti}/g,       ospite.notti || "")
    .replace(/{totale}/g,      ospite.prezzo_totale ? ospite.prezzo_totale.toFixed(2) : "")
    .replace(/{link_checkin}/g, `https://hotel.ristoflow-ai.com/public/checkin.html?token=${ospite.checkin_online_token || ""}`);
}

function formatData(d) {
  if (!d) return "—";
  const [y,m,g] = d.split("-"); return `${g}/${m}/${y}`;
}

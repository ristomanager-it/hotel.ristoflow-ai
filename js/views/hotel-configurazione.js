import { supabase } from "../supabaseClient.js";

const FONT_OPTIONS = [
  { id: "system",   label: "System (default)" },
  { id: "georgia",  label: "Georgia (elegante)" },
  { id: "garamond", label: "Garamond (classico)" },
  { id: "montserrat", label: "Montserrat (moderno)" },
  { id: "playfair", label: "Playfair Display (lusso)" },
];

const TEMPLATE_DEFAULTS = {
  conferma_wa: `Gentile {nome},\n\nLa sua prenotazione è confermata! 🎉\n\n🏨 {hotel}\n🛏️ Camera: {camera}\n📅 Check-in: {checkin} ore {ora_checkin}\n📅 Check-out: {checkout} ore {ora_checkout}\n🌙 {notti} notti\n💶 Totale: € {totale}\n\nPer il check-in online: {link_checkin}\n\nA presto! 🙏`,
  reminder_wa: `Gentile {nome},\n\nDomani ci vediamo! 🏨\n\nRicordiamo che il suo check-in è previsto per {checkin} alle ore {ora_checkin}.\n\nSe vuole velocizzare l'arrivo completi il check-in online:\n{link_checkin}\n\nA domani! 👋`,
  checkin_wa: `Gentile {nome},\n\nPuò completare il check-in online in anticipo:\n\n👇 {link_checkin}\n\nBasterà inserire i dati del documento. L'arrivo sarà più rapido! 🙏`,
  poststay_wa: `Gentile {nome},\n\nSperiamo che il suo soggiorno da noi sia stato piacevole! 😊\n\nSe ha un momento, una recensione ci aiuterebbe moltissimo:\n🌟 {link_recensione}\n\nGrazie di cuore e speriamo di rivederla presto! 🏨`,
  reminder_checkout_wa: `Buonasera {nome}! 🌙\n\nDomani sarà il suo ultimo giorno a {hotel}.\n\n🕙 Check-out entro le {ora_checkout}\n\nPer qualsiasi esigenza siamo a disposizione.\n\nSperiamo che il soggiorno sia stato piacevole! 🙏`,
  benvenuto_arrivo_wa: `Benvenuto a {hotel}, {nome}! 🏨\n\nLa sua camera {camera} è pronta.\n\n☕ Colazione: 07:00 – 10:30\n🕙 Check-out: ore {ora_checkout}\n\nPer qualsiasi esigenza risponda a questo messaggio.\n\nBuon soggiorno! 🙏`,
  post_checkout_email: `Gentile {nome},\n\nGrazie per aver scelto {hotel}!\n\nSperiamo che il suo soggiorno di {notti} notti sia stato all'altezza delle aspettative.\n\n⭐ Se ha un momento, le chiediamo un piccolo favore:\n\n1. Lasci una recensione su Google (vale oro per noi!):\n{link_recensione_google}\n\n2. Condivida la sua esperienza sulla nostra community:\n{link_ristoflowbook}\n\nGrazie di cuore e speriamo di rivederla presto!\n\n{hotel}`,
};

const TABS = [
  { id: "identita",  icon: "🏨", label: "Identità" },
  { id: "stile",     icon: "🎨", label: "Stile" },
  { id: "booking",   icon: "📅", label: "Booking" },
  { id: "pubblica",  icon: "🌐", label: "Pag. pubblica" },
  { id: "template",  icon: "💬", label: "Template msg" },
  { id: "chatbot",   icon: "🤖", label: "Chatbot" },
  { id: "form",      icon: "📝", label: "Form" },
  { id: "territorio", icon: "🌍", label: "Territorio" },
];

export async function render(container) {
  const az = window.state.azienda;

  // Carica configurazione esistente
  const { data: cfg } = await supabase
    .from("hotel_configurazione")
    .select("*")
    .eq("azienda_id", az.id)
    .maybeSingle();

  const c = cfg || {};

  container.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">⚙️ Configurazione Hotel</div>
        <div class="page-sub">Identità, stile, booking, pagina pubblica, messaggi e chatbot</div>
      </div>
      <button class="btn btn-primary" id="btn-salva-cfg">💾 Salva tutto</button>
    </div>

    <!-- Tab bar -->
    <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:20px;background:white;padding:6px;border-radius:14px;border:1px solid var(--border);box-shadow:var(--shadow);">
      ${TABS.map(t => `
        <button class="cfg-tab" data-tab="${t.id}" style="
          flex:1;min-width:80px;padding:10px 8px;border:none;background:none;
          border-radius:10px;cursor:pointer;font-size:12px;font-weight:700;
          color:var(--muted);transition:all .15s;
        ">
          <div style="font-size:18px;margin-bottom:2px;">${t.icon}</div>
          ${t.label}
        </button>
      `).join("")}
    </div>

    <!-- Tab content -->
    <div id="cfg-content"></div>

    <div id="cfg-error" style="color:var(--danger);font-size:13px;margin-top:12px;"></div>
    <div id="cfg-success" style="color:var(--success);font-size:13px;margin-top:12px;"></div>
  `;

  let tabAttivo = "identita";

  function setTab(id) {
    tabAttivo = id;
    container.querySelectorAll(".cfg-tab").forEach(btn => {
      const active = btn.dataset.tab === id;
      btn.style.background = active ? "var(--primary)" : "none";
      btn.style.color = active ? "white" : "var(--muted)";
    });
    renderTab(id, c, az, container);
  }

  container.querySelectorAll(".cfg-tab").forEach(btn => {
    btn.onclick = () => setTab(btn.dataset.tab);
  });

  container.querySelector("#btn-salva-cfg").onclick = () => salvaConfigurazione(az.id, container);

  setTab("identita");
}

function renderTab(id, c, az, container) {
  const box = container.querySelector("#cfg-content");

  switch(id) {
    case "identita": renderIdentita(box, c, az); break;
    case "stile":    renderStile(box, c); break;
    case "booking":  renderBooking(box, c); break;
    case "pubblica": renderPubblica(box, c, az); break;
    case "template": renderTemplate(box, c, az); break;
    case "chatbot":  renderChatbot(box, c, az); break;
    case "form":     renderForm(box, c); break;
    case "territorio": renderTerritorio(box, c, az); break;
  }
}

/* ══════════════════════════════════════════════
   TAB 1 — IDENTITÀ
══════════════════════════════════════════════ */
function renderIdentita(box, c, az) {
  box.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
      <div>
        <div class="card">
          <div class="card-title">🏨 Dati pubblici</div>
          <div class="form-group">
            <label>Nome pubblico hotel</label>
            <input id="cfg-nome" class="input" value="${esc(c.nome_pubblico || az.nome)}" placeholder="Es. Hotel Villa Rosa">
          </div>
          <div class="form-group">
            <label>Tagline</label>
            <input id="cfg-tagline" class="input" value="${esc(c.tagline)}" placeholder="Es. Il tuo rifugio nel cuore della Calabria">
          </div>
          <div class="form-group">
            <label>Descrizione pubblica</label>
            <textarea id="cfg-desc" class="input" rows="5" placeholder="Descrivi la tua struttura...">${esc(c.descrizione_pubblica)}</textarea>
          </div>
          <div class="form-group">
            <label>Instagram</label>
            <input id="cfg-instagram" class="input" value="${esc(c.instagram_handle)}" placeholder="@nomeprofilo">
          </div>
          <div class="form-group">
            <label>Facebook URL</label>
            <input id="cfg-facebook" class="input" value="${esc(c.facebook_url)}" placeholder="https://facebook.com/...">
          </div>
          <div class="form-group">
            <label>Link recensioni Google</label>
            <input id="cfg-google" class="input" value="${esc(c.google_review_link)}" placeholder="https://g.page/...">
          </div>
        </div>
      </div>

      <div>
        <div class="card">
          <div class="card-title">🖼️ Logo e immagini</div>
          <div class="form-group">
            <label>Logo URL</label>
            <input id="cfg-logo" class="input" value="${esc(c.logo_url || az.logo_url)}" placeholder="https://...">
            ${c.logo_url || az.logo_url ? `<img src="${c.logo_url || az.logo_url}" style="width:80px;height:80px;object-fit:contain;margin-top:8px;border-radius:10px;border:1px solid var(--border);">` : ""}
          </div>
          <div class="form-group">
            <label>Foto copertina URL (hero della pagina pubblica)</label>
            <input id="cfg-copertina" class="input" value="${esc(c.foto_copertina)}" placeholder="https://...">
            ${c.foto_copertina ? `<img src="${c.foto_copertina}" style="width:100%;height:120px;object-fit:cover;margin-top:8px;border-radius:10px;">` : ""}
          </div>
        </div>

        <div class="card">
          <div class="card-title">🔍 SEO</div>
          <div class="form-group">
            <label>Meta title (per Google)</label>
            <input id="cfg-meta-title" class="input" value="${esc(c.meta_title)}" placeholder="Hotel Villa Rosa — Conflenti, Calabria">
          </div>
          <div class="form-group">
            <label>Meta description</label>
            <textarea id="cfg-meta-desc" class="input" rows="3" placeholder="Descrizione breve per i motori di ricerca...">${esc(c.meta_description)}</textarea>
          </div>
        </div>
      </div>
    </div>
  `;
}

/* ══════════════════════════════════════════════
   TAB 2 — STILE
══════════════════════════════════════════════ */
function renderStile(box, c) {
  box.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
      <div class="card">
        <div class="card-title">🎨 Colori</div>
        <div class="form-group">
          <label>Colore primario</label>
          <div style="display:flex;gap:10px;align-items:center;">
            <input type="color" id="cfg-colore-primario" value="${c.colore_primario || "#1B4F72"}" style="width:50px;height:40px;border:none;cursor:pointer;border-radius:8px;">
            <input class="input" id="cfg-colore-primario-hex" value="${c.colore_primario || "#1B4F72"}" style="flex:1;" placeholder="#1B4F72">
          </div>
        </div>
        <div class="form-group">
          <label>Colore accento</label>
          <div style="display:flex;gap:10px;align-items:center;">
            <input type="color" id="cfg-colore-accento" value="${c.colore_accento || "#C9A84C"}" style="width:50px;height:40px;border:none;cursor:pointer;border-radius:8px;">
            <input class="input" id="cfg-colore-accento-hex" value="${c.colore_accento || "#C9A84C"}" style="flex:1;" placeholder="#C9A84C">
          </div>
        </div>

        <!-- Palette predefinite -->
        <div style="margin-top:12px;">
          <label style="font-size:12px;font-weight:600;color:var(--muted);margin-bottom:8px;display:block;">Palette predefinite</label>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            ${[
              { nome:"Blu notte", p:"#1B4F72", a:"#C9A84C" },
              { nome:"Verde bosco", p:"#1a4d3a", a:"#d4a03a" },
              { nome:"Bordeaux", p:"#6B1E3E", a:"#D4AF37" },
              { nome:"Grigio elegante", p:"#2C3E50", a:"#E74C3C" },
              { nome:"Terracotta", p:"#8B4513", a:"#DAA520" },
              { nome:"Nero lusso", p:"#1a1a1a", a:"#C9A84C" },
            ].map(p => `
              <div class="palette-btn" data-p="${p.p}" data-a="${p.a}" style="
                cursor:pointer;border-radius:8px;overflow:hidden;border:2px solid var(--border);
                width:60px;text-align:center;
              " title="${p.nome}">
                <div style="height:20px;background:${p.p};"></div>
                <div style="height:10px;background:${p.a};"></div>
                <div style="font-size:9px;padding:2px;color:var(--muted);">${p.nome}</div>
              </div>
            `).join("")}
          </div>
        </div>
      </div>

      <div>
        <div class="card">
          <div class="card-title">🔤 Tipografia</div>
          <div class="form-group">
            <label>Font famiglia</label>
            <select id="cfg-font" class="input">
              ${FONT_OPTIONS.map(f => `<option value="${f.id}" ${(c.font_famiglia||"system") === f.id ? "selected" : ""}>${f.label}</option>`).join("")}
            </select>
          </div>
          <div id="font-preview" style="margin-top:12px;padding:16px;border:1px solid var(--border);border-radius:10px;">
            <div style="font-size:22px;font-weight:800;margin-bottom:4px;" id="fp-titolo">Hotel Campo Antico</div>
            <div style="font-size:14px;color:var(--muted);" id="fp-sub">Il tuo rifugio nel cuore della Calabria</div>
          </div>
        </div>

        <div class="card" style="margin-top:16px;">
          <div class="card-title">🌙 Tema</div>
          <div style="display:flex;gap:10px;">
            <label style="flex:1;display:flex;align-items:center;gap:8px;padding:12px;border:2px solid var(--border);border-radius:10px;cursor:pointer;" id="lbl-chiaro">
              <input type="radio" name="tema" value="chiaro" ${(c.tema||"chiaro") === "chiaro" ? "checked" : ""}> ☀️ Chiaro
            </label>
            <label style="flex:1;display:flex;align-items:center;gap:8px;padding:12px;border:2px solid var(--border);border-radius:10px;cursor:pointer;" id="lbl-scuro">
              <input type="radio" name="tema" value="scuro" ${c.tema === "scuro" ? "checked" : ""}> 🌙 Scuro
            </label>
          </div>
        </div>

        <!-- Preview -->
        <div class="card" style="margin-top:16px;">
          <div class="card-title">👁 Preview</div>
          <div id="stile-preview" style="border-radius:12px;overflow:hidden;border:1px solid var(--border);">
            <div id="prev-hero" style="background:${c.colore_primario||"#1B4F72"};padding:20px;color:white;text-align:center;">
              <div id="prev-titolo" style="font-weight:800;font-size:16px;">Hotel Campo Antico</div>
              <div style="font-size:12px;opacity:.8;">Prenota la tua camera</div>
            </div>
            <div style="padding:12px;background:white;">
              <div id="prev-btn" style="background:${c.colore_accento||"#C9A84C"};color:white;padding:8px 16px;border-radius:8px;font-weight:700;font-size:12px;text-align:center;">
                Cerca disponibilità
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Sync color picker ↔ hex input
  ["primario","accento"].forEach(tipo => {
    const picker = box.querySelector(`#cfg-colore-${tipo}`);
    const hex    = box.querySelector(`#cfg-colore-${tipo}-hex`);
    picker.oninput = () => { hex.value = picker.value; aggiornaPreview(box); };
    hex.oninput    = () => { if (/^#[0-9A-Fa-f]{6}$/.test(hex.value)) { picker.value = hex.value; aggiornaPreview(box); } };
  });

  // Palette predefinite
  box.querySelectorAll(".palette-btn").forEach(btn => {
    btn.onclick = () => {
      box.querySelector("#cfg-colore-primario").value     = btn.dataset.p;
      box.querySelector("#cfg-colore-primario-hex").value = btn.dataset.p;
      box.querySelector("#cfg-colore-accento").value      = btn.dataset.a;
      box.querySelector("#cfg-colore-accento-hex").value  = btn.dataset.a;
      aggiornaPreview(box);
    };
  });

  // Font preview
  const fontMap = { system:"inherit", georgia:"Georgia,serif", garamond:"Garamond,serif", montserrat:"Montserrat,sans-serif", playfair:"'Playfair Display',serif" };
  box.querySelector("#cfg-font").onchange = () => {
    const font = fontMap[box.querySelector("#cfg-font").value] || "inherit";
    box.querySelector("#fp-titolo").style.fontFamily = font;
    box.querySelector("#fp-sub").style.fontFamily    = font;
  };

  // Tema
  box.querySelectorAll("input[name='tema']").forEach(r => {
    r.onchange = () => {
      box.querySelector("#lbl-chiaro").style.borderColor = r.value === "chiaro" ? "var(--primary)" : "var(--border)";
      box.querySelector("#lbl-scuro").style.borderColor  = r.value === "scuro"  ? "var(--primary)" : "var(--border)";
    };
    if (r.checked) r.dispatchEvent(new Event("change"));
  });
}

function aggiornaPreview(box) {
  const p = box.querySelector("#cfg-colore-primario")?.value || "#1B4F72";
  const a = box.querySelector("#cfg-colore-accento")?.value || "#C9A84C";
  const prev = box.querySelector("#prev-hero");
  const btn  = box.querySelector("#prev-btn");
  if (prev) prev.style.background = p;
  if (btn)  btn.style.background  = a;
}

/* ══════════════════════════════════════════════
   TAB 3 — BOOKING
══════════════════════════════════════════════ */
function renderBooking(box, c) {
  box.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
      <div class="card">
        <div class="card-title">📅 Impostazioni soggiorno</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div class="form-group">
            <label>Ora check-in default</label>
            <input id="cfg-ora-ci" class="input" type="time" value="${c.ora_checkin_default || "14:00"}">
          </div>
          <div class="form-group">
            <label>Ora check-out default</label>
            <input id="cfg-ora-co" class="input" type="time" value="${c.ora_checkout_default || "11:00"}">
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div class="form-group">
            <label>Notti minime</label>
            <input id="cfg-min-notti" class="input" type="number" min="1" value="${c.min_notti || 1}">
          </div>
          <div class="form-group">
            <label>Ospiti max accettati</label>
            <input id="cfg-max-ospiti" class="input" type="number" min="1" value="${c.max_ospiti_default || 20}">
            <div style="font-size:11px;color:var(--muted);margin-top:4px;">Nessun limite rigido — il cliente inserisce il numero e l'admin gestisce l'assegnazione camere manualmente</div>
          </div>
        </div>
        <div class="form-group">
          <label>Deposito richiesto (%)</label>
          <input id="cfg-deposito" class="input" type="number" step="0.1" min="0" max="100" value="${c.deposito_percentuale || 0}" placeholder="0 = nessun deposito">
          <div style="font-size:11px;color:var(--muted);margin-top:4px;">Es. 30 = richiede il 30% al momento della prenotazione</div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">📋 Politiche</div>
        <div class="form-group">
          <label>Politica di cancellazione</label>
          <textarea id="cfg-cancellazione" class="input" rows="5" placeholder="Es. Cancellazione gratuita fino a 48 ore prima del check-in. Cancellazione tardiva: addebito prima notte.">${esc(c.politica_cancellazione)}</textarea>
        </div>
        <div class="form-group">
          <label>Messaggio di benvenuto (mostrato dopo la prenotazione)</label>
          <textarea id="cfg-benvenuto" class="input" rows="4" placeholder="Es. Grazie per aver scelto il nostro hotel! Non vediamo l'ora di accoglierla...">${esc(c.messaggio_benvenuto)}</textarea>
        </div>
      </div>
    </div>
  `;
}

/* ══════════════════════════════════════════════
   TAB 4 — PAGINA PUBBLICA
══════════════════════════════════════════════ */
function renderPubblica(box, c, az) {
  const linkBooking = `https://hotel.ristoflow-ai.com/public/booking.html?az=${az.id}`;

  box.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
      <div>
        <div class="card">
          <div class="card-title">🔗 Link e QR</div>
          <div style="background:var(--bg);border-radius:10px;padding:14px;margin-bottom:14px;">
            <div style="font-size:12px;font-weight:600;color:var(--muted);margin-bottom:6px;">Link prenotazione pubblica</div>
            <div style="font-size:12px;word-break:break-all;color:var(--primary);margin-bottom:8px;">${linkBooking}</div>
            <div style="display:flex;gap:8px;">
              <button class="btn btn-ghost btn-sm" onclick="navigator.clipboard.writeText('${linkBooking}').then(()=>alert('Link copiato ✓'))">📋 Copia</button>
              <button class="btn btn-ghost btn-sm" onclick="window.open('${linkBooking}','_blank')">🔗 Apri</button>
            </div>
          </div>

          <!-- QR Code -->
          <div style="text-align:center;padding:20px;border:1px solid var(--border);border-radius:10px;">
            <div id="qr-container"></div>
            <div style="font-size:11px;color:var(--muted);margin-top:8px;">Stampa e metti al reception o nelle camere</div>
            <button class="btn btn-ghost btn-sm" style="margin-top:8px;" id="btn-stampa-qr">🖨️ Stampa QR</button>
          </div>
        </div>

        <div class="card" style="margin-top:16px;">
          <div class="card-title">✨ Servizi in evidenza</div>
          <div style="font-size:12px;color:var(--muted);margin-bottom:10px;">Seleziona i servizi da mostrare nella pagina pubblica</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
            ${["wifi","piscina","spa","parcheggio","colazione","ristorante","palestra","animali_ammessi","aria_condizionata","vista_mare","vista_montagna","transfer"].map(s => `
              <label style="display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:8px;border:1px solid var(--border);cursor:pointer;font-size:12px;">
                <input type="checkbox" data-servizio-pub="${s}" ${(c.servizi_evidenza||[]).includes(s) ? "checked" : ""}> ${s.replace(/_/g," ")}
              </label>
            `).join("")}
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">📸 Gallery foto</div>
        <div style="font-size:12px;color:var(--muted);margin-bottom:10px;">URL delle foto da mostrare nella pagina pubblica (una per riga)</div>
        <textarea id="cfg-gallery" class="input" rows="8" placeholder="https://esempio.com/foto1.jpg&#10;https://esempio.com/foto2.jpg">${(c.foto_gallery||[]).join("\n")}</textarea>
        <div id="gallery-preview" style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:10px;">
          ${(c.foto_gallery||[]).map(url => `<img src="${url}" style="width:100%;height:70px;object-fit:cover;border-radius:6px;" onerror="this.style.display='none'">`).join("")}
        </div>

        <!-- Preview pagina -->
        <div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border);">
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <button class="btn btn-primary" onclick="window.open('${linkBooking}','_blank')">
              👁 Apri pagina pubblica
            </button>
            <button class="btn btn-ghost" id="btn-toggle-mockup">
              📱 Mostra mockup mobile
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- MOCKUP MOBILE -->
    <div id="mockup-mobile" style="display:none;margin-top:20px;">
      <div class="card">
        <div class="card-title">📱 Anteprima mobile</div>
        <div style="display:flex;justify-content:center;padding:20px 0;">
          <div style="width:375px;background:#f0f6fa;border-radius:40px;border:8px solid #1a1a1a;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.3);position:relative;">
            <!-- Notch -->
            <div style="background:#1a1a1a;height:28px;display:flex;align-items:center;justify-content:center;">
              <div style="width:80px;height:10px;background:#333;border-radius:10px;"></div>
            </div>
            <!-- Schermo -->
            <div style="height:600px;overflow-y:auto;background:#f0f6fa;">
              <!-- Hero cover -->
              <div style="height:160px;background:linear-gradient(135deg,var(--primary,#1B4F72),#2471A3);position:relative;display:flex;align-items:flex-end;">
                <div style="position:absolute;inset:0;background:linear-gradient(to bottom,transparent 50%,rgba(0,0,0,.2));"></div>
              </div>
              <!-- Logo e nome -->
              <div style="background:white;padding:0 16px 14px;display:flex;gap:12px;align-items:flex-end;margin-top:-30px;position:relative;">
                <div style="width:60px;height:60px;border-radius:50%;border:3px solid white;background:#EBF5FB;flex-shrink:0;box-shadow:0 2px 8px rgba(0,0,0,.15);display:flex;align-items:center;justify-content:center;font-size:20px;">🏨</div>
                <div style="padding-bottom:4px;">
                  <div style="font-size:14px;font-weight:800;color:#111;">\${c.nome_pubblico || az.nome || 'Il tuo hotel'}</div>
                  <div style="font-size:11px;color:#1B4F72;font-weight:600;">Prenotazione hotel</div>
                </div>
              </div>
              <!-- Card info -->
              <div style="margin:8px 12px;background:white;border-radius:14px;padding:14px;box-shadow:0 2px 8px rgba(0,0,0,.06);">
                <div style="font-size:10px;font-weight:800;color:#1B4F72;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px;">Prenotazione per</div>
                <div style="font-size:18px;font-weight:800;color:#111;margin-bottom:10px;">Mario Rossi</div>
                <div style="display:inline-flex;align-items:center;gap:6px;background:#DCFCE7;color:#166534;border-radius:999px;padding:4px 12px;font-size:11px;font-weight:800;margin-bottom:12px;">🟢 Confermata</div>
                <div style="display:inline-flex;align-items:center;gap:6px;background:#EBF5FB;color:#1B4F72;border-radius:999px;padding:4px 12px;font-size:11px;font-weight:800;margin-left:6px;margin-bottom:12px;">🛏️ Camera Standard</div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                  <div style="background:#EBF5FB;border-radius:10px;padding:10px;">
                    <div style="font-size:16px;margin-bottom:2px;">📅</div>
                    <div style="font-size:9px;font-weight:800;color:#1B4F72;text-transform:uppercase;">Check-in</div>
                    <div style="font-size:13px;font-weight:800;color:#111;">\${c.ora_checkin_default || '14:00'}</div>
                  </div>
                  <div style="background:#EBF5FB;border-radius:10px;padding:10px;">
                    <div style="font-size:16px;margin-bottom:2px;">📆</div>
                    <div style="font-size:9px;font-weight:800;color:#1B4F72;text-transform:uppercase;">Check-out</div>
                    <div style="font-size:13px;font-weight:800;color:#111;">\${c.ora_checkout_default || '11:00'}</div>
                  </div>
                  <div style="background:#EBF5FB;border-radius:10px;padding:10px;">
                    <div style="font-size:16px;margin-bottom:2px;">🌙</div>
                    <div style="font-size:9px;font-weight:800;color:#1B4F72;text-transform:uppercase;">Notti</div>
                    <div style="font-size:13px;font-weight:800;color:#111;">3</div>
                  </div>
                  <div style="background:#EBF5FB;border-radius:10px;padding:10px;">
                    <div style="font-size:16px;margin-bottom:2px;">👥</div>
                    <div style="font-size:9px;font-weight:800;color:#1B4F72;text-transform:uppercase;">Ospiti</div>
                    <div style="font-size:13px;font-weight:800;color:#111;">2</div>
                  </div>
                </div>
              </div>
              <!-- Totale -->
              <div style="margin:8px 12px;background:white;border-radius:14px;padding:14px;box-shadow:0 2px 8px rgba(0,0,0,.06);">
                <div style="font-size:10px;font-weight:800;color:#1B4F72;text-transform:uppercase;">Totale soggiorno</div>
                <div style="font-size:22px;font-weight:800;color:#111;margin-top:4px;">€ 450,00</div>
              </div>
              <!-- Azioni -->
              <div style="margin:8px 12px;display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                <div style="background:#059669;border-radius:12px;padding:12px;text-align:center;">
                  <div style="font-size:18px;">✅</div>
                  <div style="font-size:11px;font-weight:800;color:white;margin-top:4px;">Check-in online</div>
                </div>
                <div style="background:#1B4F72;border-radius:12px;padding:12px;text-align:center;">
                  <div style="font-size:18px;">✏️</div>
                  <div style="font-size:11px;font-weight:800;color:white;margin-top:4px;">Modifica</div>
                </div>
              </div>
              <!-- Info hotel -->
              <div style="margin:8px 12px 20px;background:white;border-radius:14px;padding:14px;box-shadow:0 2px 8px rgba(0,0,0,.06);">
                <div style="font-size:12px;font-weight:800;color:#374151;margin-bottom:10px;">🏨 L'hotel</div>
                \${az.telefono ? '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #f3f4f6;"><div style="width:32px;height:32px;border-radius:10px;background:#EBF5FB;display:flex;align-items:center;justify-content:center;font-size:14px;">📞</div><div style="font-size:12px;color:#111;font-weight:600;">' + az.telefono + '</div></div>' : ''}
                \${az.indirizzo ? '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;"><div style="width:32px;height:32px;border-radius:10px;background:#EBF5FB;display:flex;align-items:center;justify-content:center;font-size:14px;">📍</div><div style="font-size:12px;color:#111;font-weight:600;">' + az.indirizzo + '</div></div>' : ''}
              </div>
            </div>
            <!-- Barra home iPhone -->
            <div style="background:white;height:20px;display:flex;align-items:center;justify-content:center;">
              <div style="width:100px;height:4px;background:#1a1a1a;border-radius:4px;"></div>
            </div>
          </div>
        </div>
        <div style="text-align:center;margin-top:12px;font-size:12px;color:var(--muted);">
          Anteprima della pagina <strong>hotel-prenotazione.html</strong> — quella che riceve l'ospite via WhatsApp/email dopo la prenotazione
        </div>
      </div>
    </div>
  `;

  // QR code
  const script = document.createElement("script");
  script.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
  script.onload = () => {
    new QRCode(document.getElementById("qr-container"), {
      text: linkBooking,
      width: 180, height: 180,
      colorDark: "#1B4F72",
      colorLight: "#ffffff",
    });
  };
  document.head.appendChild(script);

  // Gallery preview live
  box.querySelector("#cfg-gallery").oninput = () => {
    const urls = box.querySelector("#cfg-gallery").value.split("\n").filter(u => u.trim());
    box.querySelector("#gallery-preview").innerHTML = urls.map(url =>
      `<img src="${url.trim()}" style="width:100%;height:70px;object-fit:cover;border-radius:6px;" onerror="this.style.display='none'">`
    ).join("");
  };

  box.querySelector("#btn-stampa-qr").onclick = () => {
    const qrImg = box.querySelector("#qr-container img");
    if (!qrImg) return;
    const w = window.open("", "_blank");
    w.document.write(`<html><body style="text-align:center;padding:40px;"><h2>Prenota online</h2><img src="${qrImg.src}" style="width:200px;"><p style="margin-top:12px;font-size:12px;">${linkBooking}</p></body></html>`);
    w.print();
  };

  // Toggle mockup mobile
  const btnMockup = box.querySelector("#btn-toggle-mockup");
  const mockupDiv = box.querySelector("#mockup-mobile");
  if (btnMockup && mockupDiv) {
    btnMockup.onclick = () => {
      const visible = mockupDiv.style.display !== "none";
      mockupDiv.style.display = visible ? "none" : "block";
      btnMockup.textContent = visible ? "📱 Mostra mockup mobile" : "📱 Nascondi mockup";
    };
  }
}

/* ══════════════════════════════════════════════
   TAB 5 — TEMPLATE MESSAGGI
══════════════════════════════════════════════ */
function renderTemplate(box, c, az) {
  const VARS = "{nome} {cognome} {hotel} {camera} {checkin} {checkout} {ora_checkin} {ora_checkout} {notti} {totale} {link_checkin} {link_recensione}";

  const templates = [
    { id:"conferma", label:"✅ Conferma prenotazione", field:"template_conferma_wa", toggle:"attiva_conferma_auto", default: TEMPLATE_DEFAULTS.conferma_wa },
    { id:"reminder", label:"⏰ Reminder (1 giorno prima)", field:"template_reminder_wa", toggle:"attiva_reminder_auto", default: TEMPLATE_DEFAULTS.reminder_wa, extra:`
      <div class="form-group">
        <label>Invia quanti giorni prima del check-in</label>
        <input id="cfg-reminder-giorni" class="input" type="number" min="1" max="7" value="${c.reminder_giorni_prima || 1}" style="max-width:100px;">
      </div>` },
    { id:"checkin_link", label:"📱 Invito check-in online", field:"template_checkin_wa", toggle:"attiva_checkin_auto", default: TEMPLATE_DEFAULTS.checkin_wa },
    { id:"poststay", label:"⭐ Post-stay recensione", field:"template_poststay_wa", toggle:"attiva_poststay_auto", default: TEMPLATE_DEFAULTS.poststay_wa, extra:`
      <div class="form-group">
        <label>Invia quanti giorni dopo il check-out</label>
        <input id="cfg-poststay-giorni" class="input" type="number" min="1" max="7" value="${c.poststay_giorni_dopo || 1}" style="max-width:100px;">
      </div>` },
    { id:"reminder_checkout", label:"🌙 Reminder check-out (sera prima)", field:"template_reminder_checkout_wa", toggle:"attiva_reminder_checkout_auto", default: TEMPLATE_DEFAULTS.reminder_checkout_wa },
    { id:"benvenuto_arrivo", label:"🏨 Benvenuto arrivo", field:"template_benvenuto_arrivo_wa", toggle:"attiva_benvenuto_arrivo_auto", default: TEMPLATE_DEFAULTS.benvenuto_arrivo_wa },
  ];

  box.innerHTML = `
    <div style="background:#EBF5FB;border-radius:12px;padding:14px;margin-bottom:16px;font-size:13px;">
      <strong>📌 Variabili disponibili:</strong><br>
      <code style="font-size:11px;">${VARS} {link_recensione_google} {link_tripadvisor} {link_ristoflowbook}</code>
    </div>

    <!-- SEZIONE LINK RECENSIONI -->
    <div class="card" style="margin-bottom:20px;border-left:4px solid #f59e0b;">
      <div class="card-title">⭐ Link recensioni</div>
      <p style="font-size:13px;color:var(--muted);margin-bottom:14px;line-height:1.5;">
        Configura i link per le recensioni. Verranno usati automaticamente nei messaggi post-checkout
        e sostituiti nelle variabili <code>{link_recensione_google}</code>, <code>{link_tripadvisor}</code>, <code>{link_ristoflowbook}</code>.
      </p>
      <div style="display:grid;gap:14px;">
        <div class="form-group">
          <label>🔍 Google Reviews</label>
          <input id="cfg-link-google" class="input" type="url" value="${esc(c.link_google_recensione || '')}" placeholder="https://g.page/r/...">
          <div style="font-size:11px;color:var(--muted);margin-top:3px;">Vai su Google Maps → Il tuo profilo → Chiedi recensioni → Ottieni link</div>
        </div>
        <div class="form-group">
          <label>🦉 TripAdvisor</label>
          <input id="cfg-link-tripadvisor" class="input" type="url" value="${esc(c.link_tripadvisor || '')}" placeholder="https://www.tripadvisor.it/...">
        </div>
        <div class="form-group">
          <label>📱 RistoflowBook (portale community)</label>
          <input id="cfg-link-ristoflowbook" class="input" type="url" value="${esc(c.link_ristoflowbook || ('https://social.ristoflow-ai.com/recensione?az=' + (az?.id || '') + '&tipo=hotel'))}" placeholder="https://social.ristoflow-ai.com/recensione?az=...">
          <div style="font-size:11px;color:var(--muted);margin-top:3px;">Portale recensioni interno — costruisce community e raccoglie dati clienti</div>
        </div>
        <div style="background:#fef3c7;border-radius:10px;padding:12px;font-size:13px;color:#92400e;">
          <strong>💡 Strategia consigliata:</strong> Nel messaggio post-checkout chiedi prima Google (vale per la classifica),
          poi proponi RistoflowBook per costruire la community. TripAdvisor è opzionale ma utile per i viaggiatori stranieri.
        </div>
      </div>
    </div>

    ${templates.map(t => `
      <div class="card" style="margin-bottom:14px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:10px;">
          <div class="card-title" style="margin:0;">${t.label}</div>
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;">
            <input type="checkbox" id="cfg-${t.toggle}" ${c[t.toggle] !== false ? "checked" : ""}> Automatico attivo
          </label>
        </div>
        ${t.extra || ""}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div class="form-group">
            <label>📱 Testo WhatsApp</label>
            <textarea id="cfg-${t.field}" class="input" rows="8">${esc(c[t.field] || t.default)}</textarea>
            <button class="btn btn-ghost btn-sm" style="margin-top:4px;" onclick="document.getElementById('cfg-${t.field}').value=${JSON.stringify(t.default)}">↩ Ripristina default</button>
          </div>
          <div>
            <label style="font-size:12px;font-weight:600;color:var(--muted);margin-bottom:5px;display:block;">Anteprima WhatsApp</label>
            <div style="background:#ECE5DD;border-radius:12px;padding:12px;min-height:150px;">
              <div id="prev-${t.id}" style="background:#DCF8C6;border-radius:10px;padding:10px;font-size:12px;white-space:pre-wrap;word-break:break-word;line-height:1.5;"></div>
            </div>
          </div>
        </div>
      </div>
    `).join("")}
  `;

  // Preview live per ogni template
  templates.forEach(t => {
    const ta   = box.querySelector(`#cfg-${t.field}`);
    const prev = box.querySelector(`#prev-${t.id}`);
    if (!ta || !prev) return;
    const aggiorna = () => {
      prev.textContent = ta.value
        .replace(/{nome}/g, "Mario").replace(/{cognome}/g, "Rossi")
        .replace(/{hotel}/g, c.nome_pubblico || "Hotel Campo Antico").replace(/{camera}/g, "Suite 101")
        .replace(/{checkin}/g, "15/07/2025").replace(/{checkout}/g, "18/07/2025")
        .replace(/{ora_checkin}/g, c.ora_checkin_default || "14:00").replace(/{ora_checkout}/g, c.ora_checkout_default || "11:00")
        .replace(/{notti}/g, "3").replace(/{totale}/g, "450.00")
        .replace(/{link_checkin}/g, "https://hotel.ristoflow-ai.com/hotel-prenotazione.html?t=...")
        .replace(/{link_recensione}/g, c.link_google_recensione || "https://g.page/r/...")
        .replace(/{link_recensione_google}/g, c.link_google_recensione || "https://g.page/r/...")
        .replace(/{link_tripadvisor}/g, c.link_tripadvisor || "https://tripadvisor.it/...")
        .replace(/{link_ristoflowbook}/g, c.link_ristoflowbook || "https://social.ristoflow-ai.com/recensione?az=...");
    };
    ta.oninput = aggiorna;
    aggiorna();
  });
}

/* ══════════════════════════════════════════════
   TAB 6 — CHATBOT
══════════════════════════════════════════════ */
async function renderChatbot(box, c, az) {
  const linkBooking = `https://hotel.ristoflow-ai.com/public/booking.html?az=${az.id}`;

  // Carica connessione WhatsApp reale
  const { data: wa } = await supabase
    .from("whatsapp_connessioni")
    .select("numero_telefono, phone_number_id, attiva")
    .eq("azienda_id", az.id)
    .maybeSingle();

  const waNumero   = wa?.numero_telefono || null;
  const waAttiva   = wa?.attiva === true;
  const waStatoBg  = waAttiva ? "#f0fdf4" : "#fff0f0";
  const waStatoCol = waAttiva ? "#15803d" : "#991b1b";
  const waIcona    = waAttiva ? "✅" : "⚠️";
  const waLabel    = waAttiva
    ? (waNumero ? `Connesso — <strong>${waNumero}</strong>` : "Connesso")
    : "Nessuna connessione WhatsApp attiva";

  box.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
      <div>
        <div class="card" style="margin-bottom:16px;">
          <div class="card-title">🤖 Chatbot WhatsApp Hotel</div>
          <div style="background:#f0fdf4;border-radius:10px;padding:12px;margin-bottom:14px;font-size:12px;color:#15803d;">
            Il chatbot guida l'ospite dalla prenotazione al checkout — disponibilità, info, check-in online, colazione e assistenza.
            Usa la connessione WhatsApp Business già configurata in Ristoflow.
          </div>

          <div class="form-group">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:14px;">
              <input type="checkbox" id="cfg-chatbot-attivo" ${c.chatbot_attivo ? "checked" : ""}> <strong>Chatbot attivo</strong>
            </label>
          </div>

          <div class="form-group">
            <label>Messaggio di benvenuto</label>
            <textarea id="cfg-chat-benvenuto" class="input" rows="6">${esc(c.chatbot_messaggio_benvenuto || `Ciao! 👋 Benvenuto a *${az.nome || 'Hotel'}*.\n\nCome posso aiutarti?\n\n1️⃣ Disponibilità e prezzi\n2️⃣ Prenota una camera\n3️⃣ Info hotel\n4️⃣ Gestisci la tua prenotazione\n5️⃣ Parla con noi`)}</textarea>
          </div>

          <div class="form-group">
            <label>Messaggio "non capito"</label>
            <textarea id="cfg-chat-noncapito" class="input" rows="3">${esc(c.chatbot_messaggio_non_capito || "Non ho capito 😅\n\nScrivi un numero:\n1️⃣ Disponibilità\n2️⃣ Prenota\n3️⃣ Info hotel\n4️⃣ La mia prenotazione\n5️⃣ Staff")}</textarea>
          </div>

          <div class="form-group">
            <label>Link booking da inviare</label>
            <input id="cfg-chat-link" class="input" value="${esc(c.chatbot_link_booking || linkBooking)}">
            <div style="font-size:11px;color:var(--muted);margin-top:4px;">Inviato automaticamente quando l'ospite chiede di prenotare</div>
          </div>
        </div>

        <!-- INFO WHATSAPP -->
        <div class="card">
          <div class="card-title">📱 Connessione WhatsApp</div>
          <div style="background:${waStatoBg};border-radius:10px;padding:14px;font-size:13px;color:${waStatoCol};">
            <div style="font-size:15px;font-weight:700;margin-bottom:6px;">${waIcona} ${waLabel}</div>
            <div style="font-size:12px;opacity:.8;line-height:1.5;">
              Il chatbot usa questo numero per rispondere agli ospiti.<br>
              Per cambiare numero contatta il supporto Ristoflow.
            </div>
          </div>
          ${!waAttiva ? `
          <div style="background:#fff7ed;border-radius:10px;padding:12px;margin-top:10px;font-size:12px;color:#c2410c;">
            ⚠️ Il chatbot non funzionerà senza una connessione WhatsApp attiva.<br>
            Contatta il supporto per attivare WhatsApp Business.
          </div>` : ""}
        </div>
      </div>

      <div>
        <div class="card" style="margin-bottom:16px;">
          <div class="card-title">📱 Flusso conversazione completo</div>
          <div style="font-size:12px;color:var(--muted);margin-bottom:12px;">Il chatbot gestisce automaticamente questi scenari:</div>

          ${[
            { emoji:'1️⃣', trigger:'Disponibilità / prezzi', risposta:'Invia link booking con disponibilità in tempo reale' },
            { emoji:'2️⃣', trigger:'Prenota / prenotazione', risposta:'Guida alla prenotazione con link diretto' },
            { emoji:'3️⃣', trigger:'Info / dove siete / orari', risposta:'Indirizzo, orari check-in/out, link Maps' },
            { emoji:'4️⃣', trigger:'La mia prenotazione', risposta:'Cerca per cognome → link gestione prenotazione' },
            { emoji:'✅', trigger:'Check-in / arrivo', risposta:'Cerca prenotazione → link check-in online' },
            { emoji:'🛫', trigger:'Check-out / partenza', risposta:'Orari checkout, assistenza saldo' },
            { emoji:'☕', trigger:'Colazione / breakfast', risposta:'Info orari colazione + ordine' },
            { emoji:'👤', trigger:'5 / staff / aiuto', risposta:'Notifica staff e passa a operatore umano' },
            { emoji:'🔄', trigger:'ciao / menu / 0', risposta:'Torna al menu principale' },
          ].map(f => `
            <div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);font-size:12px;">
              <div style="font-size:16px;flex-shrink:0;">${f.emoji}</div>
              <div>
                <div style="background:#EBF5FB;border-radius:6px;padding:2px 8px;color:var(--primary);font-weight:700;font-size:11px;display:inline-block;margin-bottom:2px;">${f.trigger}</div>
                <div style="color:var(--muted);">→ ${f.risposta}</div>
              </div>
            </div>
          `).join("")}
        </div>

        <!-- SESSIONI LIVE -->
        <div class="card">
          <div class="card-title">📊 Sessioni attive oggi</div>
          <div id="chatbot-sessioni-live">
            <div style="color:var(--muted);font-size:13px;">Caricamento...</div>
          </div>
          <button id="btn-ricarica-sessioni" class="btn btn-ghost btn-sm" style="margin-top:10px;">🔄 Aggiorna</button>
        </div>
      </div>
    </div>
  `;

  // Carica sessioni live
  async function caricaSessioni() {
    const { data } = await supabase
      .from('hotel_chatbot_sessioni')
      .select('telefono, step, updated_at')
      .eq('azienda_id', az.id)
      .gte('updated_at', new Date(Date.now() - 24*3600*1000).toISOString())
      .order('updated_at', { ascending: false })
      .limit(10);

    const el = document.getElementById('chatbot-sessioni-live');
    if (!el) return;
    if (!data?.length) { el.innerHTML = '<div style="color:var(--muted);font-size:13px;">Nessuna sessione nelle ultime 24 ore</div>'; return; }
    el.innerHTML = data.map(s => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border);font-size:12px;">
        <div>
          <div style="font-weight:600;">📱 ${s.telefono}</div>
          <div style="color:var(--muted);">Step: <strong>${s.step}</strong></div>
        </div>
        <div style="color:var(--muted);font-size:11px;">${new Date(s.updated_at).toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'})}</div>
      </div>
    `).join('');
  }

  caricaSessioni();
  document.getElementById('btn-ricarica-sessioni')?.addEventListener('click', caricaSessioni);
}

/* ══════════════════════════════════════════════
   TAB 7 — FORM
══════════════════════════════════════════════ */
function renderForm(box, c) {
  box.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
      <div class="card">
        <div class="card-title">📝 Campi del form pubblico</div>
        <div style="display:grid;gap:10px;">
          ${[
            { id:"mostra_richieste_speciali", label:"✏️ Richieste speciali", desc:"Campo testo libero per richieste dell'ospite" },
            { id:"mostra_documento", label:"🪪 Documento d'identità", desc:"Chiede tipo e numero documento in fase di booking" },
            { id:"richiedi_privacy", label:"🔒 Consenso privacy", desc:"Checkbox GDPR obbligatoria (consigliato)" },
          ].map(f => `
            <label style="display:flex;align-items:flex-start;gap:10px;padding:12px;border:1.5px solid var(--border);border-radius:10px;cursor:pointer;">
              <input type="checkbox" id="cfg-${f.id}" ${c[f.id] !== false ? "checked" : ""} style="margin-top:3px;flex-shrink:0;">
              <div>
                <div style="font-weight:700;font-size:13px;">${f.label}</div>
                <div style="font-size:11px;color:var(--muted);">${f.desc}</div>
              </div>
            </label>
          `).join("")}
        </div>
      </div>

      <div class="card">
        <div class="card-title">📄 Testi personalizzati</div>
        <div class="form-group">
          <label>Testo privacy (sostituisce il default)</label>
          <textarea id="cfg-testo-privacy" class="input" rows="4" placeholder="Accetto il trattamento dei dati personali per la gestione della prenotazione secondo il GDPR...">${esc(c.testo_privacy)}</textarea>
        </div>
        <div class="form-group">
          <label>Testo pagina di conferma</label>
          <textarea id="cfg-testo-conferma" class="input" rows="4" placeholder="Grazie! La sua prenotazione è stata ricevuta. Riceverà una email di conferma a breve...">${esc(c.testo_conferma)}</textarea>
        </div>
      </div>
    </div>
  `;
}

/* ══════════════════════════════════════════════
   SALVA TUTTO
══════════════════════════════════════════════ */
async function salvaConfigurazione(aziendaId, container) {
  const btn = container.querySelector("#btn-salva-cfg");
  const err = container.querySelector("#cfg-error");
  const suc = container.querySelector("#cfg-success");
  btn.disabled = true; btn.textContent = "Salvataggio...";
  err.textContent = ""; suc.textContent = "";

  // Raccoglie tutti i valori dai tab
  const get = (id) => container.querySelector(`#${id}`)?.value?.trim() || null;
  const getCheck = (id) => container.querySelector(`#${id}`)?.checked ?? true;
  const getTA = (id) => container.querySelector(`#${id}`)?.value || null;

  const servizi = Array.from(container.querySelectorAll("[data-servizio-pub]:checked")).map(el => el.dataset.servizioPublic || el.getAttribute("data-servizio-pub"));
  const gallery = (get("cfg-gallery") || "").split("\n").map(u => u.trim()).filter(Boolean);

  const payload = {
    azienda_id: aziendaId,
    // Identità
    nome_pubblico:        get("cfg-nome"),
    tagline:              get("cfg-tagline"),
    descrizione_pubblica: getTA("cfg-desc"),
    logo_url:             get("cfg-logo"),
    foto_copertina:       get("cfg-copertina"),
    instagram_handle:     get("cfg-instagram"),
    facebook_url:         get("cfg-facebook"),
    google_review_link:   get("cfg-google"),
    meta_title:           get("cfg-meta-title"),
    meta_description:     getTA("cfg-meta-desc"),
    // Stile
    colore_primario:      get("cfg-colore-primario-hex") || get("cfg-colore-primario"),
    colore_accento:       get("cfg-colore-accento-hex") || get("cfg-colore-accento"),
    font_famiglia:        get("cfg-font"),
    tema:                 container.querySelector("input[name='tema']:checked")?.value || "chiaro",
    // Booking
    ora_checkin_default:  get("cfg-ora-ci"),
    ora_checkout_default: get("cfg-ora-co"),
    min_notti:            parseInt(get("cfg-min-notti")) || 1,
    max_ospiti_default:   parseInt(get("cfg-max-ospiti")) || 4,
    deposito_percentuale: parseFloat(get("cfg-deposito")) || 0,
    politica_cancellazione: getTA("cfg-cancellazione"),
    messaggio_benvenuto:  getTA("cfg-benvenuto"),
    // Pubblica
    foto_gallery:         gallery,
    servizi_evidenza:     servizi,
    // Template
    template_conferma_wa: getTA("cfg-template_conferma_wa"),
    template_reminder_wa: getTA("cfg-template_reminder_wa"),
    template_checkin_wa:  getTA("cfg-template_checkin_wa"),
    template_poststay_wa: getTA("cfg-template_poststay_wa"),
    attiva_conferma_auto: getCheck("cfg-attiva_conferma_auto"),
    attiva_reminder_auto: getCheck("cfg-attiva_reminder_auto"),
    attiva_checkin_auto:  getCheck("cfg-attiva_checkin_auto"),
    attiva_poststay_auto: getCheck("cfg-attiva_poststay_auto"),
    attiva_reminder_checkout_auto: getCheck("cfg-attiva_reminder_checkout_auto"),
    attiva_benvenuto_arrivo_auto:  getCheck("cfg-attiva_benvenuto_arrivo_auto"),
    reminder_giorni_prima: parseInt(get("cfg-reminder-giorni")) || 1,
    poststay_giorni_dopo:  parseInt(get("cfg-poststay-giorni")) || 1,
    template_reminder_checkout_wa: getTA("cfg-template_reminder_checkout_wa"),
    template_benvenuto_arrivo_wa:  getTA("cfg-template_benvenuto_arrivo_wa"),
    // Link recensioni
    link_google_recensione: get("cfg-link-google"),
    link_tripadvisor:       get("cfg-link-tripadvisor"),
    link_ristoflowbook:     get("cfg-link-ristoflowbook"),
    // Chatbot
    chatbot_attivo:              getCheck("cfg-chatbot-attivo"),
    chatbot_messaggio_benvenuto: getTA("cfg-chat-benvenuto"),
    chatbot_messaggio_non_capito:getTA("cfg-chat-nonCapito") || getTA("cfg-chat-nonCapito"),
    chatbot_link_booking:        get("cfg-chat-link"),
    // Form
    mostra_richieste_speciali: getCheck("cfg-mostra_richieste_speciali"),
    mostra_documento:          getCheck("cfg-mostra_documento"),
    richiedi_privacy:          getCheck("cfg-richiedi_privacy"),
    testo_privacy:             getTA("cfg-testo-privacy"),
    testo_conferma:            getTA("cfg-testo-conferma"),
    updated_at:                new Date().toISOString(),
    // Territorio — salvato su aziende non su hotel_configurazione
  };

  // Salva territorio su aziende separatamente
  var territorioPayload = buildTerritorioPayload(container);
  if (territorioPayload !== null) {
    await supabase.from("aziende").update({ territorio: territorioPayload }).eq("id", aziendaId);
  }
  // Salva galleria su aziende
  var galleriaStr = container.querySelector("#cfg-gallery-territorio")?.value || "";
  var galleriaArr = galleriaStr.split("\n").map(u => u.trim()).filter(Boolean);
  if (galleriaArr.length > 0) {
    await supabase.from("aziende").update({ foto_galleria: galleriaArr }).eq("id", aziendaId);
  }

  const { error } = await supabase
    .from("hotel_configurazione")
    .upsert(payload, { onConflict: "azienda_id" });

  btn.disabled = false; btn.textContent = "💾 Salva tutto";

  if (error) {
    err.textContent = "Errore: " + error.message;
  } else {
    suc.textContent = "✅ Configurazione salvata!";
    setTimeout(() => suc.textContent = "", 3000);
  }
}

// ── Helper buildTerritorioPayload ──
function buildTerritorioPayload(container) {
  try {
    var desc = container.querySelector("#terr-descrizione")?.value?.trim() || "";
    var park = container.querySelector("#terr-parcheggio")?.value?.trim() || "";
    var parkGrat = container.querySelector("#terr-parcheggio-gratuito")?.checked ?? true;
    var autoTxt = container.querySelector("#terr-auto")?.value?.trim() || "";
    var trenoTxt = container.querySelector("#terr-treno")?.value?.trim() || "";
    var aereoTxt = container.querySelector("#terr-aereo")?.value?.trim() || "";
    var busTxt = container.querySelector("#terr-bus")?.value?.trim() || "";

    // Attrazioni
    var attrazioni = [];
    container.querySelectorAll(".attr-row").forEach(function(row) {
      var nome = row.querySelector(".attr-nome")?.value?.trim();
      if (!nome) return;
      attrazioni.push({
        nome: nome,
        distanza: row.querySelector(".attr-distanza")?.value?.trim() || "",
        tempo: row.querySelector(".attr-tempo")?.value?.trim() || "",
        icona: row.querySelector(".attr-icona")?.value?.trim() || "📍",
        descrizione: row.querySelector(".attr-desc")?.value?.trim() || "",
        link: row.querySelector(".attr-link")?.value?.trim() || "",
      });
    });

    // Ristoranti
    var ristoranti = [];
    container.querySelectorAll(".rist-row").forEach(function(row) {
      var nome = row.querySelector(".rist-nome")?.value?.trim();
      if (!nome) return;
      ristoranti.push({
        nome: nome,
        tipo: row.querySelector(".rist-tipo")?.value?.trim() || "",
        distanza: row.querySelector(".rist-distanza")?.value?.trim() || "",
        prezzo: row.querySelector(".rist-prezzo")?.value || "€€",
      });
    });

    return {
      descrizione: desc,
      attrazioni: attrazioni,
      come_arrivare: {
        auto: autoTxt, treno: trenoTxt, aereo: aereoTxt, bus: busTxt
      },
      parcheggio: park ? { descrizione: park, gratuito: parkGrat } : null,
      ristoranti: ristoranti,
    };
  } catch(e) { return null; }
}

/* ══════════════════════════════════════════════
   TAB 8 — TERRITORIO & CONTENUTI
══════════════════════════════════════════════ */
async function renderTerritorio(box, c, az) {
  // Carica territorio attuale da aziende
  const { data: azData } = await supabase.from("aziende").select("territorio, foto_galleria").eq("id", az.id).maybeSingle();
  const t = azData?.territorio || {};
  const fotoGalleria = (azData?.foto_galleria || []).join("\n");
  const arrivare = t.come_arrivare || {};
  const park = t.parcheggio || {};
  const attrazioni = t.attrazioni || [];
  const ristoranti = t.ristoranti || [];

  box.innerHTML = `
    <div style="display:grid;gap:16px;">

      <!-- DESCRIZIONE -->
      <div class="card">
        <div class="card-title">📝 Descrizione pubblica hotel</div>
        <div class="form-group">
          <label>Testo mostrato sulla pagina prenotazione</label>
          <textarea id="terr-descrizione" class="input" rows="4" placeholder="Immerso nella campagna viterbese, a pochi km dal centro storico...">${esc(t.descrizione || "")}</textarea>
        </div>
      </div>

      <!-- GALLERIA FOTO -->
      <div class="card">
        <div class="card-title">📸 Galleria foto hotel</div>
        <div style="font-size:12px;color:var(--muted);margin-bottom:10px;">URL delle foto da mostrare sulla pagina prenotazione (una per riga)</div>
        <textarea id="cfg-gallery-territorio" class="input" rows="6" placeholder="https://esempio.com/foto1.jpg&#10;https://esempio.com/foto2.jpg">${esc(fotoGalleria)}</textarea>
        <div id="terr-gallery-preview" style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:10px;">
          ${(azData?.foto_galleria||[]).map(url => `<img src="${url}" style="width:100%;height:60px;object-fit:cover;border-radius:6px;" onerror="this.style.display='none'">`).join("")}
        </div>
      </div>

      <!-- ATTRAZIONI -->
      <div class="card">
        <div class="card-title">🏛️ Attrazioni e punti di interesse</div>
        <div style="font-size:12px;color:var(--muted);margin-bottom:12px;">Cosa vedere e fare nei dintorni dell'hotel</div>
        <div id="attrazioni-list">
          ${attrazioni.map((a, i) => renderAttrazioneRow(a, i)).join("")}
        </div>
        <button class="btn btn-ghost btn-sm" id="btn-add-attr" style="margin-top:8px;">+ Aggiungi attrazione</button>
      </div>

      <!-- COME ARRIVARE -->
      <div class="card">
        <div class="card-title">🚗 Come arrivare</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div class="form-group">
            <label>🚗 In auto</label>
            <textarea id="terr-auto" class="input" rows="3" placeholder="A1 uscita Orte, poi SS204 direzione centro...">${esc(arrivare.auto || "")}</textarea>
          </div>
          <div class="form-group">
            <label>🚂 In treno</label>
            <textarea id="terr-treno" class="input" rows="3" placeholder="Stazione Orte (FR1 Roma-Firenze)...">${esc(arrivare.treno || "")}</textarea>
          </div>
          <div class="form-group">
            <label>✈️ In aereo</label>
            <textarea id="terr-aereo" class="input" rows="3" placeholder="Roma Fiumicino 80 km...">${esc(arrivare.aereo || "")}</textarea>
          </div>
          <div class="form-group">
            <label>🚌 In autobus</label>
            <textarea id="terr-bus" class="input" rows="3" placeholder="Bus navetta dalla stazione...">${esc(arrivare.bus || "")}</textarea>
          </div>
        </div>
      </div>

      <!-- PARCHEGGIO -->
      <div class="card">
        <div class="card-title">🅿️ Parcheggio</div>
        <div class="form-group">
          <label>Descrizione</label>
          <input id="terr-parcheggio" class="input" value="${esc(park.descrizione || "")}" placeholder="Parcheggio privato in struttura, 20 posti disponibili">
        </div>
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;">
          <input type="checkbox" id="terr-parcheggio-gratuito" ${park.gratuito !== false ? "checked" : ""}> Gratuito
        </label>
      </div>

      <!-- RISTORANTI -->
      <div class="card">
        <div class="card-title">🍽️ Ristoranti consigliati</div>
        <div style="font-size:12px;color:var(--muted);margin-bottom:12px;">I migliori posti dove mangiare nei dintorni</div>
        <div id="ristoranti-list">
          ${ristoranti.map((r, i) => renderRistoranteRow(r, i)).join("")}
        </div>
        <button class="btn btn-ghost btn-sm" id="btn-add-rist" style="margin-top:8px;">+ Aggiungi ristorante</button>
      </div>

    </div>
  `;

  // Gallery preview live
  const gallTA = box.querySelector("#cfg-gallery-territorio");
  const gallPrev = box.querySelector("#terr-gallery-preview");
  if (gallTA && gallPrev) {
    gallTA.oninput = () => {
      const urls = gallTA.value.split("\n").filter(u => u.trim());
      gallPrev.innerHTML = urls.map(url =>
        `<img src="${url.trim()}" style="width:100%;height:60px;object-fit:cover;border-radius:6px;" onerror="this.style.display='none'">`
      ).join("");
    };
  }

  // Add attrazione
  box.querySelector("#btn-add-attr").onclick = () => {
    const list = box.querySelector("#attrazioni-list");
    const idx = list.querySelectorAll(".attr-row").length;
    const div = document.createElement("div");
    div.innerHTML = renderAttrazioneRow({}, idx);
    list.appendChild(div.firstElementChild);
    bindRemove(list);
  };

  // Add ristorante
  box.querySelector("#btn-add-rist").onclick = () => {
    const list = box.querySelector("#ristoranti-list");
    const idx = list.querySelectorAll(".rist-row").length;
    const div = document.createElement("div");
    div.innerHTML = renderRistoranteRow({}, idx);
    list.appendChild(div.firstElementChild);
    bindRemove(list);
  };

  bindRemove(box.querySelector("#attrazioni-list"));
  bindRemove(box.querySelector("#ristoranti-list"));
}

function renderAttrazioneRow(a, i) {
  return `<div class="attr-row" style="background:#f8fafc;border-radius:10px;padding:12px;margin-bottom:8px;border:1px solid var(--border);">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
      <div style="font-size:12px;font-weight:700;color:var(--muted);">Attrazione ${i+1}</div>
      <button class="btn btn-ghost btn-sm btn-remove" style="color:#e53e3e;padding:2px 8px;">🗑</button>
    </div>
    <div style="display:grid;grid-template-columns:2fr 1fr 1fr 80px;gap:8px;margin-bottom:8px;">
      <input class="input attr-nome" placeholder="Nome *" value="${esc(a.nome||"")}">
      <input class="input attr-distanza" placeholder="Distanza (es. 2 km)" value="${esc(a.distanza||"")}">
      <input class="input attr-tempo" placeholder="Tempo (es. 5 min)" value="${esc(a.tempo||"")}">
      <input class="input attr-icona" placeholder="🏛️" value="${esc(a.icona||"📍")}" style="text-align:center;">
    </div>
    <input class="input attr-desc" placeholder="Descrizione breve" value="${esc(a.descrizione||"")}" style="width:100%;margin-bottom:6px;box-sizing:border-box;">
    <input class="input attr-link" placeholder="Link (opzionale)" value="${esc(a.link||"")}" style="width:100%;box-sizing:border-box;">
  </div>`;
}

function renderRistoranteRow(r, i) {
  const prezzi = ["€","€€","€€€","€€€€"];
  return `<div class="rist-row" style="background:#f8fafc;border-radius:10px;padding:12px;margin-bottom:8px;border:1px solid var(--border);">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
      <div style="font-size:12px;font-weight:700;color:var(--muted);">Ristorante ${i+1}</div>
      <button class="btn btn-ghost btn-sm btn-remove" style="color:#e53e3e;padding:2px 8px;">🗑</button>
    </div>
    <div style="display:grid;grid-template-columns:2fr 1fr 1fr 80px;gap:8px;">
      <input class="input rist-nome" placeholder="Nome *" value="${esc(r.nome||"")}">
      <input class="input rist-tipo" placeholder="Tipo cucina" value="${esc(r.tipo||"")}">
      <input class="input rist-distanza" placeholder="Distanza" value="${esc(r.distanza||"")}">
      <select class="input rist-prezzo">${prezzi.map(p=>`<option value="${p}" ${(r.prezzo||"€€")===p?"selected":""}>${p}</option>`).join("")}</select>
    </div>
  </div>`;
}

function bindRemove(list) {
  if (!list) return;
  list.querySelectorAll(".btn-remove").forEach(btn => {
    btn.onclick = () => { btn.closest(".attr-row, .rist-row").remove(); };
  });
}

// ── Helper ──
function esc(v) { return String(v || "").replace(/"/g, "&quot;").replace(/</g, "&lt;"); }

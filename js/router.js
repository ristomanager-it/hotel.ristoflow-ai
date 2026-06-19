import { supabase } from "./supabaseClient.js";

/* ============================================================
   ROUTES
============================================================ */
const routes = {
  login:                  () => import("./views/login.js"),
  home:                   () => import("./views/home.js"),
  "hotel-camere":         () => import("./views/hotel-camere.js"),
  "hotel-prenotazioni":   () => import("./views/hotel-prenotazioni.js"),
  "hotel-calendario":     () => import("./views/hotel-calendario.js"),
  "hotel-checkin":        () => import("./views/hotel-checkin.js"),
  "hotel-colazione":      () => import("./views/hotel-colazione.js"),
  "hotel-pacchetti":      () => import("./views/hotel-pacchetti.js"),
  "hotel-tariffe":        () => import("./views/hotel-tariffe.js"),
  "hotel-report":         () => import("./views/hotel-report.js"),
  "hotel-configurazione": () => import("./views/hotel-configurazione.js"),
  "hotel-ospiti":         () => import("./views/hotel-ospiti.js"),
  "hotel-marketing":      () => import("./views/hotel-marketing.js"),
  "hotel-messaggi":       () => import("./views/hotel-messaggi.js"),
};

/* ============================================================
   STATE
============================================================ */
window.state = { user: null, azienda: null };

window.stateActions = {
  setUser:    (u) => { window.state.user = u; },
  setAzienda: (a) => {
    window.state.azienda = a;
    const el = document.getElementById("topbar-azienda");
    if (el) el.textContent = a?.nome || "";
    localStorage.setItem("hotel_azienda_id", a?.id || "");
  }
};

/* ============================================================
   MENU — basato su azienda.moduli
============================================================ */
const MENU = [
  { section: "Operativo" },
  { hash: "home",               icon: "🏠", label: "Dashboard" },
  { hash: "hotel-calendario",   icon: "📅", label: "Planning" },
  { hash: "hotel-checkin",      icon: "🛎️",  label: "Check-in / out" },
  { hash: "hotel-prenotazioni", icon: "📋", label: "Prenotazioni" },
  { hash: "hotel-colazione",    icon: "☕", label: "Colazione" },

  { section: "Struttura" },
  { hash: "hotel-camere",       icon: "🛏️",  label: "Camere" },
  { hash: "hotel-tariffe",      icon: "💶", label: "Tariffe" },
  { hash: "hotel-pacchetti",    icon: "🎁", label: "Pacchetti" },
  { hash: "hotel-configurazione", icon: "⚙️", label: "Configurazione" },

  { section: "Clienti & Marketing" },
  { hash: "hotel-ospiti",       icon: "👥", label: "Anagrafica ospiti" },
  { hash: "hotel-marketing",    icon: "📣", label: "Marketing" },
  { hash: "hotel-messaggi",     icon: "💬", label: "Messaggistica" },

  { section: "Analytics" },
  { hash: "hotel-report",       icon: "📊", label: "Report & KPI" },
];

function buildMenu(azienda) {
  const moduli = azienda?.moduli || [];
  const sidebar = document.getElementById("sidebar-menu");
  if (!sidebar) return;

  const currentHash = (window.location.hash || "#/home").replace("#/", "");

  sidebar.innerHTML = MENU.map(item => {
    if (item.section) {
      return `<div class="menu-section">${item.section}</div>`;
    }
    const active = currentHash === item.hash ? "active" : "";
    return `<div class="menu-item ${active}" data-hash="${item.hash}">
      <span class="icon">${item.icon}</span>
      <span>${item.label}</span>
    </div>`;
  }).join("");

  sidebar.querySelectorAll(".menu-item[data-hash]").forEach(el => {
    el.onclick = () => { window.location.hash = "#/" + el.dataset.hash; };
  });
}

/* ============================================================
   AUTH & AZIENDA
============================================================ */
async function resolveAzienda(user) {
  const storedId = localStorage.getItem("hotel_azienda_id");

  const { data: rels } = await supabase
    .from("utenti_aziende")
    .select("azienda_id, ruolo, aziende(*)")
    .eq("user_id", user.id)
    .eq("attivo", true)
    .neq("aziende.stato", "piattaforma");

  if (!rels || rels.length === 0) return null;

  // Prendi tutte le aziende disponibili — nessun filtro moduli
  const pool = rels.filter(r => r.aziende);

  if (storedId) {
    const match = pool.find(r => r.aziende?.id === storedId);
    if (match?.aziende) return match.aziende;
  }

  // Se più aziende, mostra selezione
  if (pool.length > 1) return null; // il resolve gestirà la scelta

  return pool[0]?.aziende || null;
}

/* ============================================================
   RENDER ROUTE
============================================================ */
async function resolve() {
  const hash = (window.location.hash || "#/home").replace("#/", "") || "home";
  const routeName = hash.split("?")[0];

  // Route pubbliche (no auth)
  if (routeName === "login") {
    showLoginLayout();
    const mod = await routes.login();
    const container = document.getElementById("app-login");
    container.innerHTML = "";
    mod.render(container);
    return;
  }

  // Verifica sessione
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.hash = "#/login";
    return;
  }

  const user = session.user;
  window.stateActions.setUser(user);

  // Risolvi azienda
  if (!window.state.azienda) {
    const azienda = await resolveAzienda(user);

    if (!azienda) {
      // Più aziende disponibili — mostra selezione
      const { data: rels } = await supabase
        .from("utenti_aziende")
        .select("azienda_id, ruolo, aziende(id, nome, logo_url)")
        .eq("user_id", user.id)
        .eq("attivo", true)
        .neq("aziende.stato", "piattaforma");

      const pool = (rels || []).filter(r => r.aziende);
      if (pool.length === 0) { window.location.hash = "#/login"; return; }

      // Mostra schermata selezione azienda
      showLoginLayout();
      const sel = document.getElementById("app-login");
      sel.innerHTML = `
        <div style="min-height:100vh;background:linear-gradient(135deg,#1B4F72,#2471A3);display:flex;align-items:center;justify-content:center;padding:20px;">
          <div style="background:white;border-radius:20px;padding:32px;width:100%;max-width:400px;box-shadow:0 20px 60px rgba(0,0,0,.2);">
            <div style="text-align:center;margin-bottom:24px;">
              <img src="assets/favicon-192.png" style="width:48px;height:48px;border-radius:12px;margin-bottom:12px;">
              <div style="font-size:18px;font-weight:800;">Seleziona struttura</div>
              <div style="font-size:13px;color:#64748b;margin-top:4px;">Hai accesso a più strutture</div>
            </div>
            ${pool.map(r => `
              <div class="sel-az" data-id="${r.aziende.id}" style="
                display:flex;align-items:center;gap:12px;padding:14px;
                border:1.5px solid #e2e8f0;border-radius:12px;margin-bottom:10px;
                cursor:pointer;transition:all .15s;
              " onmouseenter="this.style.borderColor='#1B4F72';this.style.background='#EBF5FB'"
                onmouseleave="this.style.borderColor='#e2e8f0';this.style.background=''">
                <div style="width:40px;height:40px;border-radius:10px;background:#1B4F72;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                  <span style="color:white;font-size:18px;">🏨</span>
                </div>
                <div style="font-weight:700;">${r.aziende.nome}</div>
              </div>
            `).join("")}
          </div>
        </div>
      `;

      sel.querySelectorAll(".sel-az").forEach(el => {
        el.onclick = () => {
          const az = pool.find(r => r.aziende.id === el.dataset.id)?.aziende;
          if (az) {
            window.stateActions.setAzienda(az);
            resolve();
          }
        };
      });
      return;
    }

    window.stateActions.setAzienda(azienda);
  }

  // Layout con sidebar
  showAppLayout();
  buildMenu(window.state.azienda);

  // Aggiorna active nel menu
  document.querySelectorAll(".menu-item").forEach(el => {
    el.classList.toggle("active", el.dataset.hash === routeName);
  });

  // Carica view
  const loader = routes[routeName];
  if (!loader) {
    const container = document.getElementById("app");
    container.innerHTML = `<div class="card"><p>Pagina non trovata: ${routeName}</p></div>`;
    return;
  }

  const mod = await loader();
  const container = document.getElementById("app");
  container.innerHTML = "";
  await mod.render(container);
}

function showLoginLayout() {
  document.getElementById("topbar").style.display = "none";
  document.getElementById("app-shell").style.display = "none";
  document.getElementById("app-login").style.display = "";
}

function showAppLayout() {
  document.getElementById("topbar").style.display = "";
  document.getElementById("app-shell").style.display = "flex";
  document.getElementById("app-login").style.display = "none";
  document.getElementById("app-login").innerHTML = "";
}

/* ============================================================
   INIT
============================================================ */
window.router = { reload: () => resolve() };

// Logout
document.getElementById("btn-logout")?.addEventListener("click", async () => {
  await supabase.auth.signOut();
  window.state.user = null;
  window.state.azienda = null;
  localStorage.removeItem("hotel_azienda_id");
  window.location.hash = "#/login";
});

// Hash change
window.addEventListener("hashchange", resolve);

// Auth change
supabase.auth.onAuthStateChange((event, session) => {
  if (event === "SIGNED_OUT") {
    window.state.user = null;
    window.state.azienda = null;
    window.location.hash = "#/login";
  }
  if (event === "SIGNED_IN" && session) {
    window.stateActions.setUser(session.user);
  }
});

// Boot — SSO prima di resolve
(async () => {
  const hash = window.location.hash || "";
  if (hash.includes("access_token=") && hash.includes("type=sso")) {
    try {
      const params = new URLSearchParams(hash.substring(1));
      const access_token  = params.get("access_token");
      const refresh_token = params.get("refresh_token");
      if (access_token && refresh_token) {
        await supabase.auth.setSession({ access_token, refresh_token });
      }
    } catch(e) { console.error("SSO error", e); }
    // Pulisci hash e vai alla home
    window.history.replaceState(null, "", window.location.pathname);
    window.location.hash = "#/home";
    return;
  }
  resolve();
})();

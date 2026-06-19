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
  { section: "Hotel" },
  { hash: "home",                icon: "🏠", label: "Dashboard",     modulo: null },
  { hash: "hotel-calendario",    icon: "📅", label: "Calendario",    modulo: "hotel_prenotazioni" },
  { hash: "hotel-prenotazioni",  icon: "📋", label: "Prenotazioni",  modulo: "hotel_prenotazioni" },
  { hash: "hotel-checkin",       icon: "🛎️", label: "Check-in / out", modulo: "hotel_checkin" },
  { hash: "hotel-camere",        icon: "🛏️", label: "Camere",        modulo: "hotel_camere" },
  { hash: "hotel-tariffe",       icon: "💶", label: "Tariffe",       modulo: "hotel_camere" },
  { hash: "hotel-pacchetti",     icon: "🎁", label: "Pacchetti",     modulo: "hotel_pacchetti" },
  { hash: "hotel-colazione",     icon: "☕", label: "Colazione",     modulo: "hotel_colazione" },
  { hash: "hotel-report",        icon: "📊", label: "Report",        modulo: "hotel_report" },
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
    // Mostra voce se modulo null (sempre visibile) o se modulo attivo
    if (item.modulo && !moduli.includes(item.modulo)) return "";
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

  // Filtra solo aziende con modulo hotel
  const hotelRels = rels.filter(r =>
    r.aziende && (r.aziende.moduli || []).some(m => m.startsWith("hotel"))
  );

  const pool = hotelRels.length > 0 ? hotelRels : rels;

  if (storedId) {
    const match = pool.find(r => r.aziende?.id === storedId);
    if (match?.aziende) return match.aziende;
  }

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
    if (!azienda) { window.location.hash = "#/login"; return; }
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

// Boot
resolve();

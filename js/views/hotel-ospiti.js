import { supabase } from "../supabaseClient.js";

export async function render(container) {
  const az = window.state.azienda;

  container.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">👥 Anagrafica ospiti</div>
        <div class="page-sub">Storico soggiorni, preferenze e dati ospiti</div>
      </div>
    </div>

    <div class="card" style="margin-bottom:16px;">
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;">
        <div style="flex:2;min-width:200px;">
          <label style="font-size:11px;font-weight:600;color:var(--muted);">Cerca</label>
          <input id="f-cerca" class="input" placeholder="Nome, cognome, email, telefono...">
        </div>
        <div style="flex:1;min-width:140px;">
          <label style="font-size:11px;font-weight:600;color:var(--muted);">Nazione</label>
          <input id="f-nazione" class="input" placeholder="Es. IT, DE, FR...">
        </div>
        <button class="btn btn-primary" id="btn-filtra">Cerca</button>
      </div>
    </div>

    <div id="ospiti-list"></div>
    <div id="ospite-detail" style="margin-top:16px;"></div>
  `;

  let searchTimer;
  container.querySelector("#f-cerca").oninput = () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => caricaOspiti(az.id, container), 400);
  };
  container.querySelector("#btn-filtra").onclick = () => caricaOspiti(az.id, container);

  await caricaOspiti(az.id, container);
}

async function caricaOspiti(aziendaId, container) {
  const cerca   = container.querySelector("#f-cerca").value.trim();
  const nazione = container.querySelector("#f-nazione").value.trim();

  // Cerca nelle prenotazioni (fonte primaria degli ospiti)
  let q = supabase
    .from("hotel_prenotazioni")
    .select("ospite_nome, ospite_cognome, ospite_email, ospite_telefono, ospite_nazione, data_checkin, data_checkout, stato, prezzo_totale, camera_id, hotel_camere(nome)")
    .eq("azienda_id", aziendaId)
    .not("stato", "in", "(cancellata,noshow)")
    .order("data_checkin", { ascending: false });

  if (cerca) q = q.or(`ospite_nome.ilike.%${cerca}%,ospite_cognome.ilike.%${cerca}%,ospite_email.ilike.%${cerca}%,ospite_telefono.ilike.%${cerca}%`);
  if (nazione) q = q.eq("ospite_nazione", nazione.toUpperCase());

  const { data, error } = await q.limit(200);
  const list = container.querySelector("#ospiti-list");

  if (error) { list.innerHTML = `<div class="card" style="color:var(--danger);">${error.message}</div>`; return; }
  if (!data || data.length === 0) {
    list.innerHTML = `<div class="card" style="text-align:center;padding:32px;"><div style="font-size:40px;margin-bottom:10px;">👥</div><div class="text-muted">Nessun ospite trovato</div></div>`;
    return;
  }

  // Raggruppa per ospite (nome+cognome+email)
  const ospiti = {};
  data.forEach(p => {
    const key = `${p.ospite_nome}|${p.ospite_cognome}|${p.ospite_email || ""}`;
    if (!ospiti[key]) {
      ospiti[key] = {
        nome:     p.ospite_nome,
        cognome:  p.ospite_cognome,
        email:    p.ospite_email,
        telefono: p.ospite_telefono,
        nazione:  p.ospite_nazione,
        soggiorni: [],
        spesa_totale: 0,
      };
    }
    ospiti[key].soggiorni.push(p);
    ospiti[key].spesa_totale += (p.prezzo_totale || 0);
  });

  const lista = Object.values(ospiti).sort((a,b) => b.soggiorni.length - a.soggiorni.length);

  list.innerHTML = `
    <div style="margin-bottom:10px;padding:0 4px;" class="text-muted text-small">${lista.length} ospiti</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px;">
      ${lista.map((o, i) => {
        const ultimo = o.soggiorni[0];
        const flag = nazioneFlag(o.nazione);
        return `
        <div class="card" style="cursor:pointer;transition:box-shadow .15s;" data-idx="${i}"
          onmouseenter="this.style.boxShadow='0 8px 30px rgba(0,0,0,.12)'"
          onmouseleave="this.style.boxShadow=''">
          <div style="display:flex;align-items:flex-start;gap:12px;">
            <div style="width:44px;height:44px;border-radius:50%;background:var(--primary);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              <span style="color:white;font-weight:800;font-size:16px;">${o.nome[0]}${o.cognome[0]}</span>
            </div>
            <div style="flex:1;min-width:0;">
              <div style="font-weight:800;font-size:14px;">${flag} ${o.nome} ${o.cognome}</div>
              ${o.email ? `<div class="text-muted text-small" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${o.email}</div>` : ""}
              ${o.telefono ? `<div class="text-muted text-small">${o.telefono}</div>` : ""}
            </div>
          </div>
          <div style="display:flex;gap:10px;margin-top:12px;padding-top:10px;border-top:1px solid var(--border);">
            <div style="flex:1;text-align:center;">
              <div style="font-size:18px;font-weight:800;color:var(--primary);">${o.soggiorni.length}</div>
              <div style="font-size:10px;color:var(--muted);">SOGGIORNI</div>
            </div>
            <div style="flex:1;text-align:center;">
              <div style="font-size:18px;font-weight:800;color:var(--primary);">€ ${Math.round(o.spesa_totale / o.soggiorni.length)}</div>
              <div style="font-size:10px;color:var(--muted);">MEDIA/SOGG.</div>
            </div>
            <div style="flex:1;text-align:center;">
              <div style="font-size:18px;font-weight:800;color:var(--primary);">€ ${Math.round(o.spesa_totale)}</div>
              <div style="font-size:10px;color:var(--muted);">TOT. SPESA</div>
            </div>
          </div>
          <div style="margin-top:8px;font-size:11px;color:var(--muted);">
            Ultimo soggiorno: ${formatData(ultimo?.data_checkin)} — ${ultimo?.hotel_camere?.nome || "—"}
          </div>
        </div>`;
      }).join("")}
    </div>
  `;

  // Click su card ospite
  list.querySelectorAll("[data-idx]").forEach(card => {
    card.onclick = () => {
      const o = lista[parseInt(card.dataset.idx)];
      renderDettaglioOspite(o, container);
    };
  });
}

function renderDettaglioOspite(o, container) {
  const detail = container.querySelector("#ospite-detail");
  const flag = nazioneFlag(o.nazione);

  detail.innerHTML = `
    <div class="card" style="border:2px solid var(--primary);">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;flex-wrap:wrap;gap:10px;">
        <div style="display:flex;align-items:center;gap:14px;">
          <div style="width:56px;height:56px;border-radius:50%;background:var(--primary);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <span style="color:white;font-weight:800;font-size:20px;">${o.nome[0]}${o.cognome[0]}</span>
          </div>
          <div>
            <div style="font-size:20px;font-weight:800;">${flag} ${o.nome} ${o.cognome}</div>
            <div class="text-muted text-small">${o.email || ""} ${o.telefono ? "· " + o.telefono : ""} ${o.nazione ? "· " + o.nazione : ""}</div>
          </div>
        </div>
        <div style="display:flex;gap:8px;">
          ${o.email ? `
            <button class="btn btn-primary btn-sm" onclick="window.location.hash='#/hotel-messaggi?email=${encodeURIComponent(o.email)}'">
              💬 Invia messaggio
            </button>` : ""}
          <button class="btn btn-ghost btn-sm" id="btn-chiudi-detail">✕</button>
        </div>
      </div>

      <!-- Statistiche -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px;">
        <div class="stat-card">
          <div class="stat-label">Soggiorni</div>
          <div class="stat-value">${o.soggiorni.length}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Spesa totale</div>
          <div class="stat-value">€ ${Math.round(o.spesa_totale)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Media soggiorno</div>
          <div class="stat-value">€ ${Math.round(o.spesa_totale / o.soggiorni.length)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Notti totali</div>
          <div class="stat-value">${o.soggiorni.reduce((s,p) => {
            const n = Math.round((new Date(p.data_checkout) - new Date(p.data_checkin)) / 86400000);
            return s + (n || 0);
          }, 0)}</div>
        </div>
      </div>

      <!-- Storico soggiorni -->
      <div style="font-weight:700;margin-bottom:10px;">📅 Storico soggiorni</div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Camera</th><th>Check-in</th><th>Check-out</th><th>Notti</th><th>Totale</th><th>Stato</th>
            </tr>
          </thead>
          <tbody>
            ${o.soggiorni.map(p => {
              const notti = Math.round((new Date(p.data_checkout) - new Date(p.data_checkin)) / 86400000);
              return `<tr>
                <td>${p.hotel_camere?.nome || "—"}</td>
                <td>${formatData(p.data_checkin)}</td>
                <td>${formatData(p.data_checkout)}</td>
                <td>${notti}</td>
                <td>€ ${(p.prezzo_totale || 0).toFixed(2)}</td>
                <td><span class="badge ${badgeStato(p.stato)}">${p.stato}</span></td>
              </tr>`;
            }).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;

  detail.querySelector("#btn-chiudi-detail").onclick = () => { detail.innerHTML = ""; };
  detail.scrollIntoView({ behavior: "smooth", block: "start" });
}

function nazioneFlag(nazione) {
  const map = { IT:"🇮🇹", DE:"🇩🇪", FR:"🇫🇷", GB:"🇬🇧", US:"🇺🇸", ES:"🇪🇸", CH:"🇨🇭", AT:"🇦🇹", NL:"🇳🇱", BE:"🇧🇪" };
  return map[nazione] || "🌍";
}
function badgeStato(s) {
  const m = { confermata:"badge-blue", checkin:"badge-green", checkout:"badge-gold", cancellata:"badge-red" };
  return m[s] || "badge-gray";
}
function formatData(d) {
  if (!d) return "—";
  const [y,m,g] = d.split("-"); return `${g}/${m}/${y}`;
}

import { supabase } from "../supabaseClient.js";

const SERVIZI_INCLUSI = [
  "colazione","mezza_pensione","pensione_completa","spa","piscina",
  "parcheggio","transfer_aeroporto","escursioni","degustazione_vini",
  "noleggio_bici","kit_benvenuto","late_checkout","early_checkin"
];

export async function render(container) {
  const az = window.state.azienda;

  container.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">🎁 Pacchetti</div>
        <div class="page-sub">Sconti automatici per soggiorni lunghi e offerte speciali</div>
      </div>
      <button class="btn btn-primary" id="btn-nuovo">+ Nuovo pacchetto</button>
    </div>
    <div id="pacchetti-list"></div>
    <div id="pacchetto-editor" style="margin-top:16px;"></div>
  `;

  container.querySelector("#btn-nuovo").onclick = () => renderEditor(null, az.id, container);
  await caricaPacchetti(az.id, container);
}

async function caricaPacchetti(aziendaId, container) {
  const [{ data: pacchetti }, { data: camere }] = await Promise.all([
    supabase.from("hotel_pacchetti").select("*").eq("azienda_id", aziendaId).order("notti_minime"),
    supabase.from("hotel_camere").select("id,nome").eq("azienda_id", aziendaId).eq("attiva", true).order("nome"),
  ]);

  container._camere = camere || [];
  const list = container.querySelector("#pacchetti-list");

  if (!pacchetti || pacchetti.length === 0) {
    list.innerHTML = `
      <div class="card" style="text-align:center;padding:40px;">
        <div style="font-size:48px;margin-bottom:12px;">🎁</div>
        <div style="font-weight:700;font-size:16px;margin-bottom:8px;">Nessun pacchetto</div>
        <div class="text-muted">Crea offerte per soggiorni lunghi o periodi speciali</div>
      </div>`;
    return;
  }

  list.innerHTML = pacchetti.map(p => {
    const camereIds = p.camere_ids || [];
    const camereNomi = camereIds.length === 0
      ? "Tutte le camere"
      : camereIds.map(id => (container._camere.find(c => c.id === id)?.nome || id)).join(", ");

    return `
    <div class="card" style="margin-bottom:10px;${!p.attivo ? "opacity:.6;" : ""}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;">
        <div style="flex:1;">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px;">
            <span style="font-weight:800;font-size:15px;">${p.nome}</span>
            ${p.attivo ? '<span class="badge badge-green">Attivo</span>' : '<span class="badge badge-gray">Inattivo</span>'}
          </div>
          <div style="display:flex;gap:14px;flex-wrap:wrap;font-size:13px;color:var(--muted);margin-bottom:8px;">
            <span>🌙 Min ${p.notti_minime} notti${p.notti_massime ? ` — Max ${p.notti_massime} notti` : ""}</span>
            <span style="font-weight:700;color:var(--success);">-${p.sconto_perc || 0}% sconto</span>
            <span>🛏️ ${camereNomi}</span>
          </div>
          ${p.descrizione ? `<div style="font-size:13px;color:var(--muted);margin-bottom:8px;">${p.descrizione}</div>` : ""}
          ${(p.servizi_inclusi || []).length > 0 ? `
            <div style="display:flex;flex-wrap:wrap;gap:4px;">
              ${(p.servizi_inclusi || []).map(s =>
                `<span style="font-size:11px;padding:2px 8px;border-radius:999px;background:#f0fdf4;border:1px solid #bbf7d0;color:#15803d;">${s.replace(/_/g," ")}</span>`
              ).join("")}
            </div>` : ""
          }
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0;">
          <button class="btn btn-ghost btn-sm btn-edit" data-id="${p.id}">✏️ Modifica</button>
          <button class="btn btn-sm ${p.attivo ? "btn-ghost" : "btn-success"} btn-toggle" data-id="${p.id}" data-attivo="${p.attivo}">
            ${p.attivo ? "Disattiva" : "Attiva"}
          </button>
          <button class="btn btn-danger btn-sm btn-delete" data-id="${p.id}" data-nome="${p.nome}">🗑</button>
        </div>
      </div>
    </div>`;
  }).join("");

  list.querySelectorAll(".btn-edit").forEach(btn => {
    btn.onclick = async () => {
      const { data: p } = await supabase.from("hotel_pacchetti").select("*").eq("id", btn.dataset.id).single();
      if (p) renderEditor(p, aziendaId, container);
    };
  });

  list.querySelectorAll(".btn-toggle").forEach(btn => {
    btn.onclick = async () => {
      await supabase.from("hotel_pacchetti").update({ attivo: btn.dataset.attivo !== "true" }).eq("id", btn.dataset.id);
      await caricaPacchetti(aziendaId, container);
    };
  });

  list.querySelectorAll(".btn-delete").forEach(btn => {
    btn.onclick = async () => {
      if (!confirm(`Elimina pacchetto "${btn.dataset.nome}"?`)) return;
      await supabase.from("hotel_pacchetti").delete().eq("id", btn.dataset.id);
      await caricaPacchetti(aziendaId, container);
    };
  });
}

function renderEditor(pacchetto, aziendaId, container) {
  const isEdit = !!pacchetto?.id;
  const p = pacchetto || {};
  const camere = container._camere || [];
  const serviziAttivi = p.servizi_inclusi || [];
  const camereSelezionate = p.camere_ids || [];

  const editor = container.querySelector("#pacchetto-editor");
  editor.innerHTML = `
    <div class="card" style="border:2px solid var(--primary);">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
        <div style="font-weight:800;font-size:16px;">${isEdit ? `Modifica: ${p.nome}` : "Nuovo pacchetto"}</div>
        <button class="btn btn-ghost btn-sm" id="btn-chiudi">✕ Chiudi</button>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
        <div>
          <div class="form-group">
            <label>Nome pacchetto *</label>
            <input id="ed-nome" class="input" value="${p.nome || ""}" placeholder="Es. Weekend Romantico">
          </div>
          <div class="form-group">
            <label>Descrizione</label>
            <textarea id="ed-desc" class="input" rows="3" placeholder="Descrivi l'offerta...">${p.descrizione || ""}</textarea>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="form-group">
              <label>Notti minime *</label>
              <input id="ed-min" class="input" type="number" min="1" value="${p.notti_minime || 2}">
            </div>
            <div class="form-group">
              <label>Notti massime (vuoto = illimitato)</label>
              <input id="ed-max" class="input" type="number" value="${p.notti_massime || ""}">
            </div>
          </div>
          <div class="form-group">
            <label>Sconto % sul totale soggiorno</label>
            <input id="ed-sconto" class="input" type="number" step="0.1" min="0" max="100" value="${p.sconto_perc || 0}">
          </div>

          <!-- Simulatore -->
          <div style="background:#EBF5FB;border-radius:12px;padding:14px;margin-top:8px;">
            <div style="font-weight:700;margin-bottom:10px;color:var(--primary);">🧮 Simulatore</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
              <div class="form-group">
                <label>Prezzo/notte (€)</label>
                <input id="sim-notte" class="input" type="number" placeholder="100">
              </div>
              <div class="form-group">
                <label>Numero notti</label>
                <input id="sim-notti" class="input" type="number" placeholder="3">
              </div>
            </div>
            <div id="sim-result" style="font-weight:700;color:var(--primary);font-size:14px;"></div>
          </div>

          <div class="form-group" style="margin-top:14px;">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
              <input type="checkbox" id="ed-attivo" ${p.attivo !== false ? "checked" : ""}> Pacchetto attivo
            </label>
          </div>
        </div>

        <div>
          <div class="form-group">
            <label>Camere incluse (vuoto = tutte)</label>
            <div style="max-height:150px;overflow-y:auto;border:1px solid var(--border);border-radius:10px;padding:8px;">
              ${camere.length === 0
                ? `<div class="text-muted text-small">Nessuna camera trovata</div>`
                : camere.map(c => `
                  <label style="display:flex;align-items:center;gap:8px;padding:6px;cursor:pointer;font-size:13px;">
                    <input type="checkbox" data-camera="${c.id}" ${camereSelezionate.includes(c.id) ? "checked" : ""}> ${c.nome}
                  </label>`).join("")
              }
            </div>
          </div>

          <div class="form-group">
            <label>Servizi inclusi nel pacchetto</label>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;max-height:280px;overflow-y:auto;padding:4px;">
              ${SERVIZI_INCLUSI.map(s => `
                <label style="display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:8px;border:1px solid var(--border);cursor:pointer;font-size:12px;">
                  <input type="checkbox" data-servizio="${s}" ${serviziAttivi.includes(s) ? "checked" : ""}>
                  ${s.replace(/_/g," ")}
                </label>
              `).join("")}
            </div>
          </div>
        </div>
      </div>

      <div id="ed-error" style="color:var(--danger);font-size:13px;margin-top:12px;"></div>
      <div style="margin-top:16px;">
        <button class="btn btn-primary" id="btn-salva">💾 ${isEdit ? "Salva modifiche" : "Crea pacchetto"}</button>
      </div>
    </div>
  `;

  // Simulatore
  function aggiornaSim() {
    const notte  = parseFloat(editor.querySelector("#sim-notte").value) || 0;
    const notti  = parseInt(editor.querySelector("#sim-notti").value) || 0;
    const sconto = parseFloat(editor.querySelector("#ed-sconto").value) || 0;
    const res    = editor.querySelector("#sim-result");
    if (!notte || !notti) { res.textContent = ""; return; }
    const totale     = notte * notti;
    const scontato   = totale * (1 - sconto / 100);
    res.textContent = `€ ${totale.toFixed(2)} → € ${scontato.toFixed(2)} (risparmio € ${(totale - scontato).toFixed(2)})`;
  }

  ["#sim-notte","#sim-notti","#ed-sconto"].forEach(sel => {
    editor.querySelector(sel).oninput = aggiornaSim;
  });

  editor.querySelector("#btn-chiudi").onclick = () => { editor.innerHTML = ""; };
  editor.querySelector("#btn-salva").onclick  = () => salvaPacchetto(pacchetto?.id, aziendaId, editor, container);
  editor.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function salvaPacchetto(pacchettoId, aziendaId, editor, container) {
  const errEl = editor.querySelector("#ed-error");
  errEl.textContent = "";

  const nome = editor.querySelector("#ed-nome").value.trim();
  const min  = parseInt(editor.querySelector("#ed-min").value) || 1;
  if (!nome) { errEl.textContent = "Inserisci il nome del pacchetto"; return; }
  if (min < 1) { errEl.textContent = "Le notti minime devono essere almeno 1"; return; }

  const servizi  = Array.from(editor.querySelectorAll("[data-servizio]:checked")).map(el => el.dataset.servizio);
  const camereId = Array.from(editor.querySelectorAll("[data-camera]:checked")).map(el => el.dataset.camera);

  const payload = {
    azienda_id:      aziendaId,
    nome,
    descrizione:     editor.querySelector("#ed-desc").value.trim() || null,
    notti_minime:    min,
    notti_massime:   parseInt(editor.querySelector("#ed-max").value) || null,
    sconto_perc:     parseFloat(editor.querySelector("#ed-sconto").value) || 0,
    servizi_inclusi: servizi,
    camere_ids:      camereId,
    attivo:          editor.querySelector("#ed-attivo").checked,
  };

  const btn = editor.querySelector("#btn-salva");
  btn.disabled = true;
  btn.textContent = "Salvataggio...";

  const { error } = pacchettoId
    ? await supabase.from("hotel_pacchetti").update(payload).eq("id", pacchettoId)
    : await supabase.from("hotel_pacchetti").insert(payload);

  if (error) {
    errEl.textContent = error.message;
    btn.disabled = false;
    btn.textContent = "💾 Salva";
    return;
  }

  editor.innerHTML = "";
  await caricaPacchetti(aziendaId, container);
}

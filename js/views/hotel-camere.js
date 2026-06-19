import { supabase } from "../supabaseClient.js";

const TIPOLOGIE = ["singola","doppia","matrimoniale","suite","family","deluxe","altro"];
const SERVIZI = [
  "wifi","aria_condizionata","riscaldamento","tv","balcone","terrazza",
  "jacuzzi","vasca","doccia","minibar","cassaforte","parcheggio",
  "vista_mare","vista_montagna","vista_città","cucina","soggiorno",
  "letto_aggiunto","culla","animali_ammessi","non_fumatori"
];

export async function render(container) {
  const az = window.state.azienda;

  container.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">🛏️ Camere</div>
        <div class="page-sub">Gestisci le camere, servizi e prezzi base</div>
      </div>
      <button class="btn btn-primary" id="btn-nuova">+ Nuova camera</button>
    </div>
    <div id="camere-list"></div>
    <div id="camera-editor" style="margin-top:16px;"></div>
  `;

  container.querySelector("#btn-nuova").onclick = () => renderEditor(null, az.id, container);

  await caricaCamere(az.id, container);
}

async function caricaCamere(aziendaId, container) {
  const { data, error } = await supabase
    .from("hotel_camere")
    .select("*")
    .eq("azienda_id", aziendaId)
    .order("ordine")
    .order("nome");

  const list = container.querySelector("#camere-list");

  if (error) { list.innerHTML = `<div class="card" style="color:var(--danger);">Errore: ${error.message}</div>`; return; }
  if (!data || data.length === 0) {
    list.innerHTML = `
      <div class="card" style="text-align:center;padding:40px;">
        <div style="font-size:48px;margin-bottom:12px;">🛏️</div>
        <div style="font-weight:700;font-size:16px;margin-bottom:8px;">Nessuna camera</div>
        <div class="text-muted">Aggiungi la prima camera per iniziare</div>
      </div>`;
    return;
  }

  list.innerHTML = data.map(c => `
    <div class="card" style="margin-bottom:12px;" data-id="${c.id}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;">

        <div style="display:flex;gap:16px;align-items:flex-start;flex:1;">
          <!-- Foto preview -->
          <div style="width:80px;height:80px;border-radius:10px;overflow:hidden;flex-shrink:0;background:var(--bg);display:flex;align-items:center;justify-content:center;">
            ${c.foto_urls?.[0]
              ? `<img src="${c.foto_urls[0]}" style="width:100%;height:100%;object-fit:cover;">`
              : `<span style="font-size:28px;">🛏️</span>`
            }
          </div>

          <div style="flex:1;">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px;">
              <span style="font-weight:800;font-size:16px;">${c.nome}</span>
              <span class="badge badge-blue">${c.tipologia || "—"}</span>
              ${c.attiva ? '' : '<span class="badge badge-gray">Inattiva</span>'}
            </div>
            <div style="display:flex;gap:12px;flex-wrap:wrap;font-size:13px;color:var(--muted);margin-bottom:8px;">
              ${c.piano != null ? `<span>Piano ${c.piano}</span>` : ""}
              ${c.dimensioni_mq ? `<span>📐 ${c.dimensioni_mq} m²</span>` : ""}
              ${c.ospiti_max ? `<span>👥 max ${c.ospiti_max} ospiti</span>` : ""}
              ${c.prezzo_base ? `<span style="color:var(--primary);font-weight:700;">€ ${c.prezzo_base}/notte</span>` : ""}
            </div>
            ${(c.servizi || []).length > 0 ? `
              <div style="display:flex;flex-wrap:wrap;gap:4px;">
                ${(c.servizi || []).slice(0,6).map(s =>
                  `<span style="font-size:11px;padding:2px 8px;border-radius:999px;background:var(--bg);border:1px solid var(--border);">${s.replace(/_/g," ")}</span>`
                ).join("")}
                ${(c.servizi || []).length > 6 ? `<span style="font-size:11px;color:var(--muted);">+${c.servizi.length - 6}</span>` : ""}
              </div>` : ""
            }
          </div>
        </div>

        <div style="display:flex;gap:6px;flex-shrink:0;">
          <button class="btn btn-ghost btn-sm btn-edit" data-id="${c.id}">✏️ Modifica</button>
          <button class="btn btn-sm ${c.attiva ? 'btn-ghost' : 'btn-success'} btn-toggle" data-id="${c.id}" data-attiva="${c.attiva}">
            ${c.attiva ? "Disattiva" : "Attiva"}
          </button>
          <button class="btn btn-danger btn-sm btn-delete" data-id="${c.id}" data-nome="${c.nome}">🗑</button>
        </div>
      </div>
    </div>
  `).join("");

  // Bind bottoni
  list.querySelectorAll(".btn-edit").forEach(btn => {
    btn.onclick = async () => {
      const { data: cam } = await supabase.from("hotel_camere").select("*").eq("id", btn.dataset.id).single();
      if (cam) renderEditor(cam, aziendaId, container);
    };
  });

  list.querySelectorAll(".btn-toggle").forEach(btn => {
    btn.onclick = async () => {
      const nuova = btn.dataset.attiva === "true" ? false : true;
      await supabase.from("hotel_camere").update({ attiva: nuova }).eq("id", btn.dataset.id);
      await caricaCamere(aziendaId, container);
    };
  });

  list.querySelectorAll(".btn-delete").forEach(btn => {
    btn.onclick = async () => {
      if (!confirm(`Elimina camera "${btn.dataset.nome}"?`)) return;
      await supabase.from("hotel_camere").delete().eq("id", btn.dataset.id);
      await caricaCamere(aziendaId, container);
    };
  });
}

function renderEditor(camera, aziendaId, container) {
  const isEdit = !!camera?.id;
  const c = camera || {};
  const serviziAttivi = c.servizi || [];
  const fotoUrls = c.foto_urls || [];

  const editor = container.querySelector("#camera-editor");
  editor.innerHTML = `
    <div class="card" style="border:2px solid var(--primary);">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
        <div style="font-weight:800;font-size:16px;">${isEdit ? `Modifica: ${c.nome}` : "Nuova camera"}</div>
        <button class="btn btn-ghost btn-sm" id="btn-chiudi-editor">✕ Chiudi</button>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">

        <!-- Colonna sinistra -->
        <div>
          <div class="form-group">
            <label>Nome / Numero camera *</label>
            <input id="ed-nome" class="input" value="${c.nome || ""}" placeholder="Es. 101 oppure Suite Panoramica">
          </div>
          <div class="form-group">
            <label>Tipologia</label>
            <select id="ed-tipo" class="input">
              <option value="">Seleziona...</option>
              ${TIPOLOGIE.map(t => `<option value="${t}" ${c.tipologia === t ? "selected" : ""}>${t}</option>`).join("")}
            </select>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="form-group">
              <label>Piano</label>
              <input id="ed-piano" class="input" type="number" value="${c.piano ?? ""}" placeholder="0">
            </div>
            <div class="form-group">
              <label>Ospiti max</label>
              <input id="ed-ospiti" class="input" type="number" value="${c.ospiti_max || 2}">
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="form-group">
              <label>Dimensioni (m²)</label>
              <input id="ed-mq" class="input" type="number" value="${c.dimensioni_mq || ""}">
            </div>
            <div class="form-group">
              <label>Prezzo base / notte (€)</label>
              <input id="ed-prezzo" class="input" type="number" step="0.01" value="${c.prezzo_base || ""}">
            </div>
          </div>
          <div class="form-group">
            <label>Descrizione</label>
            <textarea id="ed-desc" class="input" rows="3" placeholder="Descrivi la camera...">${c.descrizione || ""}</textarea>
          </div>
          <div class="form-group">
            <label>Note interne</label>
            <textarea id="ed-note" class="input" rows="2" placeholder="Note visibili solo allo staff...">${c.note_interne || ""}</textarea>
          </div>
          <div class="form-group">
            <label>Ordine visualizzazione</label>
            <input id="ed-ordine" class="input" type="number" value="${c.ordine || 0}">
          </div>
        </div>

        <!-- Colonna destra -->
        <div>
          <!-- Foto -->
          <div class="form-group">
            <label>Foto (URL — una per riga)</label>
            <textarea id="ed-foto" class="input" rows="4" placeholder="https://...&#10;https://...">${fotoUrls.join("\n")}</textarea>
            <div style="font-size:11px;color:var(--muted);margin-top:4px;">Incolla gli URL delle foto. Puoi usare Supabase Storage o link esterni.</div>
          </div>

          <!-- Preview foto -->
          <div id="foto-preview" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;">
            ${fotoUrls.map(url => `
              <img src="${url}" style="width:70px;height:70px;object-fit:cover;border-radius:8px;border:1px solid var(--border);" onerror="this.style.display='none'">
            `).join("")}
          </div>

          <!-- Upload foto -->
          <div class="form-group">
            <label>Oppure carica foto</label>
            <input type="file" id="ed-upload" accept="image/*" multiple class="input" style="padding:6px;">
          </div>
          <div id="upload-progress" style="font-size:12px;color:var(--muted);margin-bottom:14px;"></div>

          <!-- Servizi -->
          <div class="form-group">
            <label>Servizi inclusi</label>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;max-height:260px;overflow-y:auto;padding:4px;">
              ${SERVIZI.map(s => `
                <label style="display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:8px;border:1px solid var(--border);cursor:pointer;font-size:12px;">
                  <input type="checkbox" data-servizio="${s}" ${serviziAttivi.includes(s) ? "checked" : ""}>
                  ${s.replace(/_/g," ")}
                </label>
              `).join("")}
            </div>
          </div>
        </div>

      </div>

      <div id="ed-error" style="color:var(--danger);font-size:13px;margin-top:8px;"></div>

      <div style="display:flex;gap:10px;margin-top:16px;">
        <button class="btn btn-primary" id="btn-salva-camera">
          💾 ${isEdit ? "Salva modifiche" : "Crea camera"}
        </button>
        <div style="flex:1;"></div>
        <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;">
          <input type="checkbox" id="ed-attiva" ${c.attiva !== false ? "checked" : ""}> Camera attiva
        </label>
      </div>
    </div>
  `;

  // Preview foto live
  editor.querySelector("#ed-foto").addEventListener("input", () => {
    const urls = editor.querySelector("#ed-foto").value.split("\n").filter(u => u.trim());
    editor.querySelector("#foto-preview").innerHTML = urls.map(url => `
      <img src="${url.trim()}" style="width:70px;height:70px;object-fit:cover;border-radius:8px;border:1px solid var(--border);" onerror="this.style.display='none'">
    `).join("");
  });

  // Upload foto su Supabase Storage
  editor.querySelector("#ed-upload").addEventListener("change", async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const progress = editor.querySelector("#upload-progress");
    progress.textContent = "Caricamento...";

    const uploadedUrls = [];
    for (const file of files) {
      const ext = file.name.split(".").pop();
      const path = `camere/${aziendaId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("hotel-foto").upload(path, file);
      if (!error) {
        const { data: pub } = supabase.storage.from("hotel-foto").getPublicUrl(path);
        uploadedUrls.push(pub.publicUrl);
      }
    }

    if (uploadedUrls.length > 0) {
      const fotoEl = editor.querySelector("#ed-foto");
      const existing = fotoEl.value.split("\n").filter(u => u.trim());
      fotoEl.value = [...existing, ...uploadedUrls].join("\n");
      fotoEl.dispatchEvent(new Event("input"));
      progress.textContent = `✅ ${uploadedUrls.length} foto caricate`;
    } else {
      progress.textContent = "❌ Errore upload — crea il bucket 'hotel-foto' in Supabase Storage";
    }
  });

  editor.querySelector("#btn-chiudi-editor").onclick = () => { editor.innerHTML = ""; };

  editor.querySelector("#btn-salva-camera").onclick = async () => {
    await salvaCamera(camera?.id, aziendaId, editor, container);
  };

  // Scroll all'editor
  editor.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function salvaCamera(cameraId, aziendaId, editor, container) {
  const errEl = editor.querySelector("#ed-error");
  errEl.textContent = "";

  const nome = editor.querySelector("#ed-nome").value.trim();
  if (!nome) { errEl.textContent = "Inserisci il nome della camera"; return; }

  const servizi = Array.from(editor.querySelectorAll("[data-servizio]:checked")).map(el => el.dataset.servizio);
  const fotoUrls = editor.querySelector("#ed-foto").value.split("\n").map(u => u.trim()).filter(Boolean);

  const payload = {
    azienda_id: aziendaId,
    nome,
    tipologia: editor.querySelector("#ed-tipo").value || null,
    piano: parseInt(editor.querySelector("#ed-piano").value) || null,
    ospiti_max: parseInt(editor.querySelector("#ed-ospiti").value) || 2,
    dimensioni_mq: parseInt(editor.querySelector("#ed-mq").value) || null,
    prezzo_base: parseFloat(editor.querySelector("#ed-prezzo").value) || null,
    descrizione: editor.querySelector("#ed-desc").value.trim() || null,
    note_interne: editor.querySelector("#ed-note").value.trim() || null,
    ordine: parseInt(editor.querySelector("#ed-ordine").value) || 0,
    attiva: editor.querySelector("#ed-attiva").checked,
    servizi,
    foto_urls: fotoUrls,
    updated_at: new Date().toISOString(),
  };

  const btn = editor.querySelector("#btn-salva-camera");
  btn.disabled = true;
  btn.textContent = "Salvataggio...";

  const { error } = cameraId
    ? await supabase.from("hotel_camere").update(payload).eq("id", cameraId)
    : await supabase.from("hotel_camere").insert(payload);

  if (error) {
    errEl.textContent = error.message;
    btn.disabled = false;
    btn.textContent = "💾 Salva";
    return;
  }

  editor.innerHTML = "";
  await caricaCamere(aziendaId, container);
}

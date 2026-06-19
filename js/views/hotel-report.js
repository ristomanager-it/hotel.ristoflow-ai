import { supabase } from "../supabaseClient.js";
export async function render(container) {
  container.innerHTML = `<div class="card" style="text-align:center;padding:40px;">
    <div style="font-size:48px;margin-bottom:12px;">📊</div>
    <div style="font-weight:700;font-size:18px;margin-bottom:8px;">Report</div>
    <div class="text-muted">Modulo in arrivo</div>
  </div>`;
}

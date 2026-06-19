import { supabase } from "../supabaseClient.js";

export async function render(container) {
  container.innerHTML = `
<div class="login-page">
  <div class="login-box">
    <div class="login-logo-wrap">
      <img src="assets/favicon-192.png" class="login-logo">
    </div>
    <div class="login-title">Ristoflow <span style="color:#1B4F72;">Hotel</span></div>
    <div class="login-sub">Accedi per gestire la tua struttura</div>

    <div class="form-group">
      <label>Email</label>
      <input id="login-email" class="input" type="email" placeholder="info@hotel.it" autocomplete="username">
    </div>
    <div class="form-group" style="position:relative;">
      <label>Password</label>
      <input id="login-password" class="input" type="password" autocomplete="current-password">
      <span id="toggle-pw" style="position:absolute;right:12px;bottom:10px;cursor:pointer;font-size:14px;color:#64748b;">👁</span>
    </div>

    <button id="btn-login" class="btn btn-primary login-btn w-full" style="margin-top:8px;">Accedi</button>
    <div id="login-msg" class="form-result"></div>

    <div style="text-align:center;margin-top:16px;">
      <button id="btn-reset" style="background:none;border:none;color:#1B4F72;font-size:13px;cursor:pointer;">Recupera password</button>
    </div>
  </div>
</div>`;

  const emailEl    = container.querySelector("#login-email");
  const passwordEl = container.querySelector("#login-password");
  const msgEl      = container.querySelector("#login-msg");
  const btnLogin   = container.querySelector("#btn-login");

  container.querySelector("#toggle-pw").onclick = () => {
    passwordEl.type = passwordEl.type === "password" ? "text" : "password";
  };

  container.querySelector("#btn-reset").onclick = async () => {
    const email = emailEl.value.trim();
    if (!email) { msgEl.innerHTML = "<span class='error-text'>Inserisci l'email</span>"; return; }
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "#/set-password"
    });
    msgEl.innerHTML = "<span class='success-text'>Email inviata ✔</span>";
  };

  async function doLogin() {
    const email    = emailEl.value.trim();
    const password = passwordEl.value;
    if (!email || !password) { msgEl.innerHTML = "<span class='error-text'>Compila tutti i campi</span>"; return; }

    btnLogin.disabled = true;
    btnLogin.textContent = "Accesso...";
    msgEl.innerHTML = "";

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      msgEl.innerHTML = `<span class='error-text'>${error.message}</span>`;
      btnLogin.disabled = false;
      btnLogin.textContent = "Accedi";
      return;
    }

    window.location.hash = "#/home";
  }

  btnLogin.onclick = doLogin;
  passwordEl.addEventListener("keydown", e => { if (e.key === "Enter") doLogin(); });
}

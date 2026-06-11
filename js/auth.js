/* PokeSnipr cosmetic access gate.
 *
 * IMPORTANT: this is client-side only. GitHub Pages serves static files, so
 * this gate keeps casual visitors out but is NOT real security — the page
 * HTML and data/*.json remain publicly fetchable to anyone determined. For
 * true protection, front the site with Cloudflare Access (see README).
 *
 * Credentials are stored as SHA-256 hashes so the plaintext isn't sitting in
 * the source. A successful login sets a sessionStorage flag for the tab.
 */
(function () {
  const USER_HASH = "f6eb3f508f935e89baa247ccec3ca4ddf445224c7962d56865826ad85d7fb05d";
  const PASS_HASH = "50ff7b91dd8a68183d579a9e8e47ee13315381518fbcee779ad4bdfbf165891b";
  const KEY = "pokesnipr-auth";

  if (sessionStorage.getItem(KEY) === "1") return;

  async function sha256(text) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  const overlay = document.createElement("div");
  overlay.id = "auth-gate";
  overlay.innerHTML = `
    <div class="auth-card">
      <img src="favicon.svg" alt="" width="56" height="56" />
      <h1>Poke<span>Snipr</span></h1>
      <p>Members only. Please sign in.</p>
      <form id="auth-form" autocomplete="off">
        <input id="auth-user" type="text" placeholder="Username" autocomplete="username" />
        <input id="auth-pass" type="password" placeholder="Password" autocomplete="current-password" />
        <label class="auth-remember"><input type="checkbox" id="auth-remember" /> Keep me signed in on this device</label>
        <button type="submit">Enter</button>
        <div class="auth-error" id="auth-error"></div>
      </form>
    </div>`;

  const style = document.createElement("style");
  style.textContent = `
    #auth-gate {
      position: fixed; inset: 0; z-index: 9999;
      display: flex; align-items: center; justify-content: center;
      background: #0c0f1d; padding: 1.25rem;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    #auth-gate .auth-card {
      width: 100%; max-width: 340px; text-align: center;
      background: #11152a; border: 1px solid #2a3158; border-radius: 16px;
      padding: 2rem 1.5rem; box-shadow: 0 20px 60px rgba(0,0,0,0.5);
    }
    #auth-gate h1 { margin: 0.75rem 0 0.25rem; font-size: 1.6rem; color: #ffcb05; }
    #auth-gate h1 span { color: #3d7dca; }
    #auth-gate p { color: #97a0c8; font-size: 0.9rem; margin: 0 0 1.25rem; }
    #auth-gate form { display: flex; flex-direction: column; gap: 0.65rem; }
    #auth-gate input[type=text], #auth-gate input[type=password] {
      width: 100%; box-sizing: border-box;
      background: #181d36; color: #edf0ff;
      border: 1px solid #2e3560; border-radius: 10px;
      padding: 0.7rem 0.9rem; font-size: 1rem; outline: none;
    }
    #auth-gate input:focus { border-color: #3d7dca; }
    #auth-gate .auth-remember {
      display: flex; align-items: center; gap: 0.4rem;
      color: #97a0c8; font-size: 0.78rem; text-align: left;
    }
    #auth-gate .auth-remember input { width: auto; }
    #auth-gate button {
      background: #3d7dca; color: #fff; border: none; border-radius: 10px;
      padding: 0.7rem; font-size: 1rem; font-weight: 700; cursor: pointer; margin-top: 0.25rem;
    }
    #auth-gate button:hover { filter: brightness(1.12); }
    #auth-gate .auth-error { color: #ff5d5d; font-size: 0.82rem; min-height: 1.1em; }
  `;

  function mount() {
    document.head.appendChild(style);
    document.body.appendChild(overlay);
    document.body.style.overflow = "hidden";
    const form = overlay.querySelector("#auth-form");
    const errEl = overlay.querySelector("#auth-error");
    // Restore a "remembered" session.
    if (localStorage.getItem(KEY) === "1") {
      sessionStorage.setItem(KEY, "1");
      unlock();
      return;
    }
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const u = overlay.querySelector("#auth-user").value.trim().toLowerCase();
      const p = overlay.querySelector("#auth-pass").value;
      const [uh, ph] = await Promise.all([sha256(u), sha256(p)]);
      if (uh === USER_HASH && ph === PASS_HASH) {
        sessionStorage.setItem(KEY, "1");
        if (overlay.querySelector("#auth-remember").checked) localStorage.setItem(KEY, "1");
        unlock();
      } else {
        errEl.textContent = "Incorrect username or password.";
      }
    });
    overlay.querySelector("#auth-user").focus();
  }

  function unlock() {
    overlay.remove();
    style.remove();
    document.body.style.overflow = "";
  }

  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount);
})();

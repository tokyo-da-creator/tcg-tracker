/* PokeSnipr push notifications — OneSignal integration.
 *
 * HOW TO ENABLE:
 * 1. Sign up free at https://onesignal.com
 * 2. Create a "Web Push" app → Site URL: https://pokesnipr.com
 * 3. Copy your App ID and paste it below as ONESIGNAL_APP_ID
 * 4. Add your REST API Key as a GitHub secret named ONESIGNAL_API_KEY
 * 5. That's it — users will see a "Allow notifications" prompt.
 */

const ONESIGNAL_APP_ID = "c5be86ef-368d-4cd3-afcd-4ab350d7b8b7";

const PUSH_PREFS_KEY = "ps_push_prefs";

function pushPrefs() {
  try { return JSON.parse(localStorage.getItem(PUSH_PREFS_KEY) || "{}"); } catch { return {}; }
}
function savePushPrefs(p) {
  localStorage.setItem(PUSH_PREFS_KEY, JSON.stringify(p));
}

async function pushIsSupported() {
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

async function pushGetPermission() {
  return Notification.permission; // "default" | "granted" | "denied"
}

/* Register service worker — call early on every page. */
async function swRegister() {
  if (!("serviceWorker" in navigator)) return;
  try {
    await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  } catch (e) {
    console.warn("SW registration failed:", e);
  }
}

/* Initialize OneSignal if App ID is configured. */
function initOneSignal() {
  if (!ONESIGNAL_APP_ID) return; // not configured yet

  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(function (OneSignal) {
    OneSignal.init({
      appId: ONESIGNAL_APP_ID,
      serviceWorkerPath: "/sw.js",
      allowLocalhostAsSecureOrigin: true,
      notifyButton: { enable: false }, // we use our own UI
      promptOptions: {
        slidedown: {
          prompts: [
            {
              type: "push",
              autoPrompt: false, // only prompt when user clicks
              text: {
                actionMessage: "Get restock alerts and big price moves pushed to your phone.",
                acceptButton: "Allow",
                cancelButton: "Maybe later",
              },
            },
          ],
        },
      },
    });
  });

  // Load the OneSignal page SDK
  if (!document.querySelector('script[src*="OneSignalSDK.page"]')) {
    const s = document.createElement("script");
    s.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
    s.defer = true;
    document.head.appendChild(s);
  }
}

/* Show the OneSignal slidedown prompt when user explicitly requests it. */
async function pushPromptUser() {
  if (!ONESIGNAL_APP_ID) {
    alert("Push notifications are not configured yet.\n\nVisit the Alerts page for setup instructions.");
    return;
  }
  if (!window.OneSignalDeferred) { initOneSignal(); }
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async function (OneSignal) {
    await OneSignal.Slidedown.promptPush({ force: true });
  });
}

/* Update the push button UI to reflect current permission state. */
async function pushUpdateUI() {
  const btn = document.getElementById("push-enable-btn");
  const status = document.getElementById("push-status-text");
  if (!btn) return;

  if (!(await pushIsSupported())) {
    btn.textContent = "Not supported in this browser";
    btn.disabled = true;
    return;
  }

  const perm = await pushGetPermission();
  if (perm === "granted") {
    btn.textContent = "Notifications enabled ✓";
    btn.classList.add("btn-ghost");
    btn.classList.remove("btn-buy");
    if (status) status.textContent = "You'll receive restock alerts and big market moves.";
  } else if (perm === "denied") {
    btn.textContent = "Notifications blocked";
    btn.disabled = true;
    if (status) status.textContent = "Unblock in browser Settings → Notifications for pokesnipr.com.";
  } else {
    btn.textContent = "Enable push notifications";
    btn.classList.add("btn-buy");
  }
}

/* Boot — call on every page */
(async function () {
  await swRegister();
  initOneSignal();
  pushUpdateUI();
})();

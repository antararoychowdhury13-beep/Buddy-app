import { DESIGN_CSS, FONT_LINK, ICON_SPRITE } from "./design.js";

export type TabId = "home" | "chats" | "voice" | "myday" | "me";

const TABS: { id: TabId; href: string; icon: string; label: string }[] = [
  { id: "home", href: "/", icon: "home", label: "Home" },
  { id: "chats", href: "/chats", icon: "chat", label: "Chats" },
  { id: "voice", href: "/voice", icon: "wave", label: "" },
  { id: "myday", href: "/my-day", icon: "calendar", label: "My Day" },
  { id: "me", href: "/me", icon: "person", label: "Me" },
];

function tabbarHtml(active: TabId | undefined): string {
  const items = TABS.map((tab) => {
    if (tab.id === "voice") {
      return `<a href="${tab.href}" class="tab-orb" aria-label="Talk to Buddy"><svg class="i i-sm"><use href="#ic-wave"/></svg></a>`;
    }
    const activeClass = active === tab.id ? " active" : "";
    return `<a href="${tab.href}" class="tab${activeClass}"><svg class="i"><use href="#ic-${tab.icon}"/></svg><span>${tab.label}</span></a>`;
  }).join("");
  return `<nav class="tabbar">${items}</nav>`;
}

const DRAWER_LINKS: { href: string; icon: string; label: string; tab?: TabId }[] = [
  { href: "/", icon: "home", label: "Home", tab: "home" },
  { href: "/my-day", icon: "calendar", label: "My Day", tab: "myday" },
  { href: "/notifications", icon: "bell", label: "Notifications" },
  { href: "/me", icon: "person", label: "Me", tab: "me" },
];

function drawerHtml(active: TabId | undefined): string {
  const links = DRAWER_LINKS.map(
    (l) =>
      `<a href="${l.href}" class="drawer-link${l.tab && l.tab === active ? " active" : ""}"><svg class="i i-sm"><use href="#ic-${l.icon}"/></svg><span>${l.label}</span></a>`
  ).join("");
  return `
  <div class="scrim" id="menu-scrim"></div>
  <div class="drawer" id="menu-drawer">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
      <div style="font-weight:700; font-size:14px;">Buddy</div>
      <button class="icon-btn" id="menu-close-btn" aria-label="Close menu"><svg class="i i-sm"><use href="#ic-x"/></svg></button>
    </div>
    <div style="display:flex; flex-direction:column; gap:2px; flex:1;">${links}</div>
    <div class="mono" style="font-size:9.5px; color:var(--faint);">Buddy v0.1.0</div>
  </div>`;
}

const SHARED_SCRIPT = `
(function () {
  var menuBtn = document.getElementById("menu-toggle");
  var menuClose = document.getElementById("menu-close-btn");
  var menuScrim = document.getElementById("menu-scrim");
  function closeMenu() { document.body.classList.remove("menu-open"); }
  if (menuBtn) menuBtn.addEventListener("click", function () { document.body.classList.add("menu-open"); });
  if (menuClose) menuClose.addEventListener("click", closeMenu);
  if (menuScrim) menuScrim.addEventListener("click", closeMenu);

  var audioEl = document.getElementById("app-audio");
  var currentObjectUrl = null;
  var listenButtons = document.querySelectorAll(".listen-btn");
  listenButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var text = btn.getAttribute("data-text") || "";
      if (!text.trim()) return;
      btn.disabled = true;
      var originalLabel = btn.innerHTML;
      btn.textContent = "Generating…";
      fetch("/speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text }),
      })
        .then(function (res) {
          if (!res.ok) throw new Error("Speech request failed: " + res.status);
          return res.blob();
        })
        .then(function (blob) {
          audioEl.pause();
          if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
          currentObjectUrl = URL.createObjectURL(blob);
          audioEl.src = currentObjectUrl;
          return audioEl.play();
        })
        .catch(function (err) {
          console.error(err);
          alert("Could not generate speech. Please try again.");
        })
        .finally(function () {
          btn.disabled = false;
          btn.innerHTML = originalLabel;
        });
    });
  });
  audioEl.addEventListener("ended", function () {
    if (currentObjectUrl) { URL.revokeObjectURL(currentObjectUrl); currentObjectUrl = null; }
  });
})();
`;

export interface ShellOptions {
  title: string;
  activeTab?: TabId;
  headerHtml: string;
  bodyHtml: string;
  showTabbar?: boolean;
  extraScript?: string;
  bodyStyle?: string;
}

export function renderShell(opts: ShellOptions): string {
  const showTabbar = opts.showTabbar !== false;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Buddy — ${opts.title}</title>
${FONT_LINK}
<style>${DESIGN_CSS}</style>
</head>
<body>
${ICON_SPRITE}
${drawerHtml(opts.activeTab)}
<div class="app-shell">
  <header class="app-header">${opts.headerHtml}</header>
  <main class="app-body"${opts.bodyStyle ? ` style="${opts.bodyStyle}"` : ""}>${opts.bodyHtml}</main>
  ${showTabbar ? tabbarHtml(opts.activeTab) : ""}
</div>
<audio id="app-audio" hidden></audio>
<script>${SHARED_SCRIPT}${opts.extraScript ?? ""}</script>
</body>
</html>`;
}

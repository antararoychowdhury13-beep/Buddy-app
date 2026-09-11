function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === void 0 || v === false) continue;
    if (k === "class") node.className = String(v);
    else if (k === "html") node.innerHTML = String(v);
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === "style" && typeof v === "string") node.setAttribute("style", v);
    else if (v === true) node.setAttribute(k, "");
    else node.setAttribute(k, String(v));
  }
  for (const c of children) {
    if (c === null || c === void 0) continue;
    node.append(typeof c === "string" ? document.createTextNode(c) : c);
  }
  return node;
}
function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}
function announce(msg) {
  let live = document.getElementById("sr-live");
  if (!live) {
    live = el("div", { id: "sr-live", "aria-live": "polite", "aria-atomic": "true", class: "sr-only" });
    document.body.append(live);
  }
  live.textContent = "";
  requestAnimationFrame(() => {
    live.textContent = msg;
  });
}
function openSheet(opts) {
  const opener = document.activeElement;
  const scrim = el("div", { class: "sheet-scrim", role: "presentation" });
  const titleId = `sheet-title-${Math.random().toString(36).slice(2, 7)}`;
  const sheet = el("div", {
    class: "sheet",
    role: "dialog",
    "aria-modal": "true",
    "aria-labelledby": titleId
  }, [
    el("div", { class: "sheet-grip", "aria-hidden": "true" }),
    el("div", { class: "sheet-head" }, [
      el("h2", { id: titleId, class: "sheet-title" }, [opts.title]),
      el("button", { class: "sheet-close", "aria-label": "Close", onClick: () => close() }, ["✕"])
    ]),
    opts.body
  ]);
  scrim.append(sheet);
  document.body.append(scrim);
  document.body.style.overflow = "hidden";
  requestAnimationFrame(() => scrim.classList.add("open"));
  const focusables = () => Array.from(sheet.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  )).filter((e) => !e.hasAttribute("disabled") && e.offsetParent !== null);
  function onKey(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
      return;
    }
    if (e.key === "Tab") {
      const f = focusables();
      if (f.length === 0) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }
  document.addEventListener("keydown", onKey);
  scrim.addEventListener("mousedown", (e) => {
    if (e.target === scrim) close();
  });
  requestAnimationFrame(() => {
    (focusables()[0] ?? sheet).focus?.();
  });
  function close() {
    document.removeEventListener("keydown", onKey);
    scrim.classList.remove("open");
    document.body.style.overflow = "";
    setTimeout(() => {
      scrim.remove();
      opener?.focus?.();
    }, 220);
  }
  return { close };
}
function toast(msg, tone = "ok") {
  const t = el("div", { class: `toast toast-${tone}`, role: "status" }, [msg]);
  document.body.append(t);
  requestAnimationFrame(() => t.classList.add("show"));
  setTimeout(() => {
    t.classList.remove("show");
    setTimeout(() => t.remove(), 250);
  }, 3200);
}
export {
  announce,
  clear,
  el,
  openSheet,
  toast
};

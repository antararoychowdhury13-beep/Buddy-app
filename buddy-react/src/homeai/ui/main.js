var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { MOCK_CONTEXT } from "../mock";
import { HomeApp } from "./app";
import { TodayApp } from "../today/app";
import { AskApp } from "../ask/app";
import { LifeApp } from "../life/app";
import { toast } from "./dom";
async function loadContext() {
  try {
    const res = await fetch("/api/home-ai/context", { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    if (!Array.isArray(data.meetings) || !data.signals) throw new Error("bad shape");
    return data;
  } catch {
    return MOCK_CONTEXT;
  }
}
class Shell {
  constructor(root, ctx) {
    __publicField(this, "root");
    __publicField(this, "ctx");
    __publicField(this, "active", "home");
    this.root = root;
    this.ctx = ctx;
    this.wireNav();
    this.mount("home");
  }
  wireNav() {
    document.querySelectorAll(".tabbar [data-module]").forEach((btn) => {
      btn.addEventListener("click", () => this.select(btn.dataset.module));
    });
    const fab = document.querySelector(".fab");
    if (fab) fab.addEventListener("click", () => this.select("ask"));
  }
  select(id) {
    if (id === "work") {
      toast("Work module is part of Buddy — not in this AI prototype.");
      return;
    }
    if (id === this.active) return;
    this.active = id;
    document.querySelectorAll(".tabbar [data-module]").forEach((b) => {
      const on = b.dataset.module === id;
      b.classList.toggle("active", on);
      if (on) b.setAttribute("aria-current", "page");
      else b.removeAttribute("aria-current");
    });
    document.querySelector(".fab")?.classList.toggle("fab-active", id === "ask");
    this.root.scrollTop = 0;
    this.mount(id);
  }
  mount(id) {
    if (id === "home") new HomeApp(this.root, this.ctx);
    else if (id === "today") new TodayApp(this.root);
    else if (id === "ask") new AskApp(this.root);
    else if (id === "life") new LifeApp(this.root);
  }
}
async function boot() {
  const root = document.getElementById("hp-root");
  if (!root) return;
  const ctx = await loadContext();
  new Shell(root, ctx);
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}

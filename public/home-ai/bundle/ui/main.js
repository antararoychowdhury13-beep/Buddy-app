import { MOCK_CONTEXT } from "../mock.js";
import { HomeApp } from "./app.js";
import { TodayApp } from "../today/app.js";
import { AskApp } from "../ask/app.js";
import { LifeApp } from "../life/app.js";
import { toast } from "./dom.js";
/**
 * Load the real day context from the server (real calendar/facts where
 * connectors exist, demo fill elsewhere). Fall back to the fully-mock
 * context if the API is unreachable — the page always works, even offline.
 */
async function loadContext() {
    try {
        const res = await fetch("/api/home-ai/context", { headers: { Accept: "application/json" } });
        if (!res.ok)
            throw new Error(String(res.status));
        const data = (await res.json());
        if (!Array.isArray(data.meetings) || !data.signals)
            throw new Error("bad shape");
        return data;
    }
    catch {
        return MOCK_CONTEXT;
    }
}
/** Hosts the active module in #hp-root and switches on bottom-nav taps.
 * The center mic FAB is the "Ask Buddy" entry point. */
class Shell {
    root;
    ctx;
    active = "home";
    constructor(root, ctx) {
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
        if (fab)
            fab.addEventListener("click", () => this.select("ask"));
    }
    select(id) {
        if (id === "work") {
            toast("Work module is part of Buddy — not in this AI prototype.");
            return;
        }
        if (id === this.active)
            return;
        this.active = id;
        document.querySelectorAll(".tabbar [data-module]").forEach((b) => {
            const on = b.dataset.module === id;
            b.classList.toggle("active", on);
            if (on)
                b.setAttribute("aria-current", "page");
            else
                b.removeAttribute("aria-current");
        });
        document.querySelector(".fab")?.classList.toggle("fab-active", id === "ask");
        this.root.scrollTop = 0;
        this.mount(id);
    }
    mount(id) {
        if (id === "home")
            new HomeApp(this.root, this.ctx);
        else if (id === "today")
            new TodayApp(this.root);
        else if (id === "ask")
            new AskApp(this.root);
        else if (id === "life")
            new LifeApp(this.root);
    }
}
async function boot() {
    const root = document.getElementById("hp-root");
    if (!root)
        return;
    const ctx = await loadContext();
    new Shell(root, ctx);
}
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
}
else {
    boot();
}

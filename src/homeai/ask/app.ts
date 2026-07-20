/** Ask Buddy command centre — conversational, agentic. Renders the greeting,
 * interactive context bar, multimodal composer, suggested prompts, status
 * cards, and the conversation with inline plan/completion/monitoring messages. */
import { clear, el, toast, announce, openSheet } from "../ui/dom.js";
import { ICONS } from "../ui/icons.js";
import type { AgentMode } from "./models.js";
import { MEETING, PALETTE, PRIMARY_COMMAND, USER } from "./mock.js";
import { AskStore } from "./store.js";
import { openPlanFlow, openConsent, openMomWorkspace, openCompletion, openMonitoring, openWorkflowBuilder, openActivity } from "./sheets.js";

const MODES: { id: AgentMode; label: string; hint: string }[] = [
  { id: "ask", label: "Ask", hint: "Answer only — no actions" },
  { id: "prepare", label: "Prepare", hint: "Draft a plan, don't run it" },
  { id: "act", label: "Act", hint: "Run after your approval" },
  { id: "monitor", label: "Monitor", hint: "Watch and follow up" },
];

export class AskApp {
  store = new AskStore();
  root: HTMLElement;
  composerValue = "";

  constructor(root: HTMLElement) {
    this.root = root;
    this.render();
  }

  render() {
    clear(this.root);
    this.root.append(
      this.header(),
      this.contextBar(),
      this.conversation(),
      this.composer(),
    );
    this.scrollToEnd();
  }

  private scrollToEnd() {
    requestAnimationFrame(() => { this.root.scrollTop = this.root.scrollHeight; });
  }

  private header(): HTMLElement {
    const hr = new Date().getHours();
    const greeting = hr < 12 ? "Good morning" : hr < 17 ? "Good afternoon" : "Good evening";
    return el("header", { class: "ask-head" }, [
      el("div", { class: "hp-brand" }, [
        el("div", { class: "hp-logo", "aria-hidden": "true", html: ICONS.spark }),
        el("span", { class: "hp-brandname" }, ["Ask Buddy"]),
        el("button", { class: "hp-bell", "aria-label": "Activity & audit", html: ICONS.bell, onClick: () => openActivity(this.store) }),
      ]),
      el("h1", { class: "ask-greet" }, [`${greeting}, ${USER.name.split(" ")[0]}`]),
      el("p", { class: "hp-sub" }, [`${MEETING.date.replace("2026", "").trim()} · Work · Project Phoenix. I plan before I act — nothing runs without your approval.`]),
    ]);
  }

  private contextBar(): HTMLElement {
    const c = this.store.data.context;
    return el("section", { class: "ctx-bar", "aria-label": "Active context" }, [
      el("button", { class: "ctx-item", type: "button", onClick: () => this.openScopePicker() }, [
        el("span", { class: "ctx-k" }, ["Scope"]), el("span", { class: "ctx-v" }, [c.scopeLabel]),
      ]),
      el("div", { class: "ctx-apps", "aria-label": "Connected apps" }, c.apps.map((a) =>
        el("span", { class: "app-chip", title: `${a} · simulated integration` }, [a[0]]))),
      el("button", { class: "ctx-item", type: "button", onClick: () => this.openModePicker() }, [
        el("span", { class: "ctx-k" }, ["Mode"]), el("span", { class: "ctx-v cap" }, [c.mode]),
      ]),
      el("span", { class: "ctx-privacy" }, [el("span", { class: "ic", html: ICONS.shield }), c.privacy]),
    ]);
  }

  private openScopePicker() {
    const scopes: [string, string][] = [
      ["Work → Project Phoenix", "project"], ["Work (all)", "work"], ["Today", "today"],
      ["Personal", "personal"], ["This conversation", "conversation"],
    ];
    const body = el("div", { class: "sheet-body" }, [
      el("p", { class: "muted", style: "margin-bottom:12px;" }, ["Buddy only uses the data in the scope you pick. Switching scope is always explicit."]),
      ...scopes.map(([label, type]) => el("button", { class: `btn btn-ghost full${this.store.data.context.scopeLabel === label ? " ctx-active" : ""}`, type: "button", onClick: () => {
        const crossingToPersonal = type === "personal" && this.store.data.context.scopeType !== "personal";
        this.store.data.context.scopeLabel = label; this.store.data.context.scopeType = type as any;
        this.store.data.context.privacy = type === "personal" ? "Private to Antara · personal" : "Private to Antara";
        this.store.audit("Changed scope", label);
        this.store.save();
        (document.querySelector(".sheet-scrim.open .sheet-close") as HTMLElement)?.click();
        this.render();
        toast(crossingToPersonal ? "Switched to Personal — work data is now out of scope." : `Scope: ${label}`);
      } }, [label])),
      el("p", { class: "fineprint" }, ["Buddy never silently mixes Work and Personal contexts."]),
    ]);
    openSheet({ title: "Choose context scope", body });
  }

  private openModePicker() {
    const body = el("div", { class: "sheet-body" }, [
      ...MODES.map((m) => el("button", { class: `mode-row${this.store.data.context.mode === m.id ? " active" : ""}`, type: "button", onClick: () => {
        this.store.data.context.mode = m.id; this.store.save();
        (document.querySelector(".sheet-scrim.open .sheet-close") as HTMLElement)?.click();
        this.render(); toast(`Mode: ${m.label}`);
      } }, [el("div", { class: "mode-name" }, [m.label]), el("div", { class: "mode-hint" }, [m.hint])])),
      el("p", { class: "fineprint" }, ["Even in Act mode, external sends and high-impact changes still ask for approval."]),
    ]);
    openSheet({ title: "Agent mode", body });
  }

  private conversation(): HTMLElement {
    const msgs = this.store.data.messages;
    const wrap = el("section", { class: "ask-convo", "aria-label": "Conversation", "aria-live": "polite" });
    if (msgs.length === 0) {
      wrap.append(this.emptyState());
    } else {
      for (const m of msgs) wrap.append(this.messageEl(m));
    }
    return wrap;
  }

  private emptyState(): HTMLElement {
    const prompts: [string, string][] = [
      ["Prepare the MOM for my last meeting", PRIMARY_COMMAND],
      ["Summarise my emails and update the project", "Summarise my Project Phoenix emails and update the timeline."],
      ["What needs my approval today?", "What's waiting for my approval right now?"],
      ["Follow up on overdue tasks", "Follow up with owners on any overdue Phoenix tasks."],
    ];
    return el("div", { class: "ask-empty" }, [
      // suggested prompts
      el("div", { class: "sec-head" }, [el("h2", {}, ["Try asking"])]),
      el("div", { class: "prompt-grid" }, prompts.map(([label, cmd]) =>
        el("button", { class: "prompt-card", type: "button", onClick: () => this.submit(cmd) }, [
          el("span", { class: "prompt-ic", html: ICONS.spark }), el("span", {}, [label]),
        ]))),
      // upcoming meeting assistance
      el("div", { class: "sec-head" }, [el("h2", {}, ["Upcoming meeting"])]),
      el("article", { class: "assist-card" }, [
        el("div", { class: "assist-top" }, [
          el("div", {}, [el("div", { class: "assist-title" }, [MEETING.title]), el("div", { class: "assist-sub" }, [`${MEETING.date} · ${MEETING.platform} · ${MEETING.participants.length} people`])]),
          el("span", { class: "app-chip", style: `background:${PALETTE.indigo};` }, ["T"]),
        ]),
        el("button", { class: "btn btn-primary full", type: "button", onClick: () => this.submit(PRIMARY_COMMAND) }, [el("span", { class: "ic", html: ICONS.spark }), "Set up meeting assistant"]),
      ]),
      // status cards
      el("div", { class: "status-grid" }, [
        this.statusCard("Waiting for approval", this.store.data.journey === "waiting_for_approval" ? "1 plan" : "None", ICONS.info, () => this.store.data.plan.length && this.store.data.messages.some((m) => m.kind === "plan") ? openPlanFlow(this.store, () => this.render()) : toast("Nothing waiting.")),
        this.statusCard("Active monitoring", this.store.data.monitoringOn ? "1 rule" : "None", ICONS.clock, () => this.store.data.monitoringOn ? openMonitoring(this.store, () => this.render()) : toast("No monitoring yet.")),
      ]),
      el("div", { class: "sec-head" }, [el("h2", {}, ["Recently completed"])]),
      el("div", { class: "recent-list" }, [
        el("div", { class: "recent-row" }, [el("span", { class: "ic ok", html: ICONS.check }), el("span", { style: "flex:1;" }, ["Sent leadership summary · Phoenix"]), el("span", { class: "recent-time" }, ["2h"])]),
        el("div", { class: "recent-row" }, [el("span", { class: "ic ok", html: ICONS.check }), el("span", { style: "flex:1;" }, ["Booked travel approval in Workday"]), el("span", { class: "recent-time" }, ["Yst"])]),
      ]),
    ]);
  }

  private statusCard(k: string, v: string, icon: string, onClick: () => void): HTMLElement {
    return el("button", { class: "status-card", type: "button", onClick }, [
      el("span", { class: "ic", html: icon }), el("div", {}, [el("div", { class: "status-v" }, [v]), el("div", { class: "status-k" }, [k])]),
    ]);
  }

  private messageEl(m: import("./models.js").Message): HTMLElement {
    if (m.kind === "user") return el("div", { class: "bubble user" }, [m.text ?? ""]);
    if (m.kind === "text") return el("div", { class: "bubble buddy" }, [el("span", { class: "buddy-mark", html: ICONS.spark }), el("span", {}, [m.text ?? ""])]);
    if (m.kind === "plan") return this.planMessage(m.text ?? "");
    if (m.kind === "completion") return this.completionMessage();
    if (m.kind === "followup") return this.followupMessage();
    return el("div", {});
  }

  private planMessage(text: string): HTMLElement {
    const preview = ["Send internal MOM to 6 employees", "Send client-safe MOM to 2 vendors", "Create 4 Jira tasks & assign owners", "+6 more steps"];
    return el("div", { class: "bubble buddy plan-bubble" }, [
      el("div", { class: "plan-msg-head" }, [el("span", { class: "buddy-mark", html: ICONS.spark }), el("span", {}, [text])]),
      el("div", { class: "plan-preview" }, preview.map((p, i) => el("div", { class: "plan-preview-row" }, [el("span", { class: "pp-num" }, [i < 3 ? String(i + 1) : "…"]), el("span", {}, [p])]))),
      el("div", { class: "plan-msg-actions" }, [
        el("button", { class: "btn btn-primary", type: "button", onClick: () => this.startMeetingFlow() }, ["Start with the meeting"]),
        el("button", { class: "btn btn-ghost", type: "button", onClick: () => openPlanFlow(this.store, () => this.render()) }, ["Review full plan"]),
      ]),
      el("p", { class: "fineprint", style: "text-align:left;" }, ["Nothing runs until you approve. External sends need explicit sign-off."]),
    ]);
  }

  private completionMessage(): HTMLElement {
    return el("div", { class: "bubble buddy" }, [
      el("div", { class: "comp-line" }, [el("span", { class: "ic ok", html: ICONS.check }), el("span", {}, ["Done — 2 MOM versions sent, 4 Jira tasks created, timeline updated. One task needs your attention."])]),
      el("button", { class: "btn btn-primary full", type: "button", style: "margin-top:10px;", onClick: () => openCompletion(this.store, () => this.render()) }, ["View completion & evidence"]),
    ]);
  }

  private followupMessage(): HTMLElement {
    return el("div", { class: "bubble buddy followup-bubble" }, [
      el("div", { class: "fu-head" }, [el("span", { class: "ic amber", html: ICONS.info }), el("strong", {}, ["Follow-up watch"])]),
      el("p", {}, ["Rahul's API readiness task is due tomorrow and still To Do. It blocks Ananya's integration work."]),
      el("button", { class: "btn btn-tonal full", type: "button", style: "margin-top:8px;", onClick: () => openMonitoring(this.store, () => this.render()) }, ["Handle follow-up"]),
    ]);
  }

  private composer(): HTMLElement {
    const input = el("textarea", { class: "composer-input", rows: "1", placeholder: "Ask Buddy, or describe what you want done…", "aria-label": "Ask Buddy",
      onInput: (e: Event) => { this.composerValue = (e.target as HTMLTextAreaElement).value; const t = e.target as HTMLTextAreaElement; t.style.height = "auto"; t.style.height = Math.min(96, t.scrollHeight) + "px"; },
      onKeydown: (ev: Event) => { const e = ev as KeyboardEvent; if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); this.submit(this.composerValue); } } }) as HTMLTextAreaElement;
    input.value = this.composerValue;

    const tool = (label: string, icon: string, onClick: () => void) => el("button", { class: "composer-tool", type: "button", "aria-label": label, title: label, html: icon, onClick });

    return el("div", { class: "composer" }, [
      el("div", { class: "composer-tools" }, [
        tool("Voice", ICONS.mic, () => this.voiceDemo()),
        tool("Attach document", ICONS.doc, () => this.attachDemo("Document")),
        tool("Screenshot", ICONS.info, () => this.attachDemo("Screenshot")),
        tool("Forward email", ICONS.mail, () => this.attachDemo("Forwarded email")),
        tool("Capture meeting", ICONS.users, () => this.submit(PRIMARY_COMMAND)),
      ]),
      el("div", { class: "composer-row" }, [
        input,
        el("button", { class: "composer-send", type: "button", "aria-label": "Send", html: ICONS.spark, onClick: () => this.submit(this.composerValue) }),
      ]),
    ]);
  }

  private voiceDemo() {
    toast("Listening… (simulated)");
    setTimeout(() => { this.submit(PRIMARY_COMMAND); }, 1200);
  }

  private attachDemo(kind: string) {
    this.composerValue = this.composerValue ? this.composerValue : PRIMARY_COMMAND;
    toast(`${kind} attached (simulated).`);
    this.render();
  }

  private submit(text: string) {
    const t = (text || "").trim();
    if (!t) return;
    this.store.pushMessage({ kind: "user", text: t });
    this.composerValue = "";
    this.store.transition("request_understood");
    const low = t.toLowerCase();
    this.render();
    setTimeout(() => {
      if (/(mom|minutes|meeting|jira|record|follow)/.test(low)) {
        this.store.pushMessage({ kind: "plan", text: "Got it. I'll capture the meeting, draft the MOM for your approval, create the Jira tasks, update the timeline and follow up with owners. Here's my plan — nothing runs until you approve." });
        this.store.transition("plan_ready");
      } else {
        this.store.pushMessage({ kind: "text", text: "I can help with that. For the full agentic demo, try \"Prepare the MOM for my last meeting\" — I'll show consent, the plan, approval and execution." });
      }
      this.render();
    }, 500);
  }

  private startMeetingFlow() {
    openConsent(this.store, () => this.render(), () => openMomWorkspace(this.store, () => this.render()));
  }
}

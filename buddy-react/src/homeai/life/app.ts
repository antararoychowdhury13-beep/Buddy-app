/** Life module landing — the Personal-Life Orchestrator. Scannable by default,
 * privacy-aware, with each section opening its full flow. */
import { clear, el, toast } from "../ui/dom";
import { ICONS } from "../ui/icons";
import { HOUSEHOLD, HOUSEHOLD_SOLO, INFO_LEGEND, NEEDS_ATTENTION, PAL, SAFE_TO_SPEND } from "./mock";
import { LifeStore } from "./store";
import {
  openMember, openCare, openWellbeing, openBasket, openAsset, openOccasion,
  openMoney, openSharedWorkflow, openNudge, openPermissions, openActivity,
} from "./sheets";

export class LifeApp {
  store = new LifeStore();
  root: HTMLElement;
  constructor(root: HTMLElement) { this.root = root; this.render(); }

  private household() { return this.store.data.household === "hh-solo" ? HOUSEHOLD_SOLO : HOUSEHOLD; }
  private privacy() { return this.store.data.privacyMode; }

  render() {
    clear(this.root);
    const sections = [
      this.header(),
      this.privacyStatus(),
      this.needsAttention(),
      this.familyCare(),
      this.wellbeing(),
      this.householdAssets(),
      this.occasions(),
      this.money(),
      this.sharedWorkflows(),
      this.footer(),
    ];
    for (const s of sections) if (s) this.root.append(s);
  }

  private header(): HTMLElement {
    return el("header", { class: "life-head" }, [
      el("div", { class: "hp-brand" }, [
        el("div", { class: "hp-logo", style: `background:linear-gradient(150deg, ${PAL.pink}, ${PAL.violet});`, "aria-hidden": "true", html: ICONS.heart }),
        el("span", { class: "hp-brandname" }, ["Life"]),
        el("button", { class: "hp-bell", "aria-label": "Life activity & permissions", html: ICONS.shield, onClick: () => openActivity(this.store) }),
      ]),
      el("h1", { class: "ask-greet", style: "font-size:24px;" }, ["Your world, coordinated"]),
      el("p", { class: "hp-sub" }, ["Personal, explainable, and yours to correct. Nothing sensitive is used or shared without you."]),
    ]);
  }

  private privacyStatus(): HTMLElement {
    const p = this.privacy();
    const hh = this.household();
    return el("section", { class: "privacy-bar" }, [
      el("div", { class: "priv-left" }, [
        el("span", { class: `priv-dot ${p ? "on" : ""}`, "aria-hidden": "true" }),
        el("div", {}, [
          el("div", { class: "priv-title" }, [p ? "Privacy mode on" : "Privacy mode off"]),
          el("div", { class: "priv-sub" }, [p ? "Sensitive health & money values are hidden" : `${hh.label} · ${hh.members.length} ${hh.members.length === 1 ? "profile" : "people"}`]),
        ]),
      ]),
      el("button", { class: `toggle sm${p ? " on" : ""}`, type: "button", role: "switch", "aria-checked": p, "aria-label": "Toggle privacy mode", onClick: () => { this.store.data.privacyMode = !p; this.store.data.hideSensitiveValues = !p; this.store.audit("Toggled privacy mode", !p ? "on" : "off", "family"); this.store.save(); this.render(); toast(!p ? "Privacy mode on — sensitive values hidden." : "Privacy mode off."); } }, [p ? "On" : "Off"]),
    ]);
  }

  private needsAttention(): HTMLElement {
    const items = NEEDS_ATTENTION.filter((n) => !this.store.data.dismissedNudges.includes(n.id));
    return el("section", { class: "life-sec", "aria-label": "Needs attention" }, [
      el("div", { class: "sec-head" }, [el("h2", {}, ["Needs your attention"]), el("span", { class: "sec-note" }, [`${items.length} item${items.length === 1 ? "" : "s"}`])]),
      ...(items.length ? items.map((n) => el("article", { class: "attn-card", style: `border-left:4px solid ${n.accent};` }, [
        el("div", { class: "attn-top" }, [
          el("span", { class: "attn-tag", style: `background:${n.accent}1a; color:${n.accent};` }, [n.tag]),
          n.sensitivity === "sensitive" ? el("span", { class: "sens-tag" }, [el("span", { class: "ic", html: ICONS.shield }), "Sensitive"]) : null,
        ]),
        el("div", { class: "attn-title" }, [n.title]),
        el("div", { class: "attn-sub" }, [n.sub]),
        el("div", { class: "attn-actions" }, [
          el("button", { class: "chip-btn primary", type: "button", onClick: () => openNudge(n, this.store, () => this.render()) }, ["Review"]),
          el("button", { class: "chip-btn ghost", type: "button", onClick: () => { this.store.data.dismissedNudges.push(n.id); this.store.audit("Dismissed nudge", n.title, n.category); this.store.save(); this.render(); toast("Not now."); } }, ["Not now"]),
        ]),
      ])) : [el("p", { class: "empty" }, ["Nothing needs you right now."])]),
    ]);
  }

  private familyCare(): HTMLElement {
    const hh = this.household();
    return el("section", { class: "life-sec", "aria-label": "Family and care" }, [
      el("div", { class: "sec-head" }, [el("h2", {}, ["Family & care"]), el("button", { class: "sec-link", type: "button", onClick: () => openPermissions(this.store, () => this.render()) }, ["Manage access"])]),
      // info legend
      el("div", { class: "info-legend" }, INFO_LEGEND.map((l) => el("span", { class: "legend-chip" }, [el("span", { class: "legend-dot", style: `background:${l.color};` }), l.label]))),
      // members
      el("div", { class: "member-grid" }, hh.members.map((m) => {
        const unconfirmed = m.info.filter((i) => (i.state === "inferred" || i.state === "sensitive") && !i.confirmed && !this.store.data.confirmedInfo.includes(i.id) && !this.store.data.deletedInfo.includes(i.id)).length;
        return el("button", { class: "member-card", type: "button", onClick: () => openMember(m, this.store, () => this.render()) }, [
          el("span", { class: "avatar", style: `background:${m.color}; width:40px; height:40px; font-size:14px;` }, [m.initials]),
          el("div", { class: "member-info" }, [el("div", { class: "member-name" }, [m.name]), el("div", { class: "member-rel" }, [m.relationship])]),
          unconfirmed ? el("span", { class: "pending-badge", "aria-label": `${unconfirmed} pending confirmations` }, [String(unconfirmed)]) : null,
        ]);
      })),
      // care journey entry
      el("article", { class: "care-card", onClick: () => openCare(this.store, () => this.render()) }, [
        el("div", { class: "care-top" }, [el("span", { class: "ic", style: `color:${PAL.green};`, html: ICONS.heart }), el("div", {}, [el("div", { class: "care-title" }, ["Dad's cardiologist visit"]), el("div", { class: "care-sub" }, ["A full care journey — reports, meds, travel, follow-up"])])]),
        el("div", { class: "care-mini" }, [["Reports", ICONS.doc], ["Meds", ICONS.heart], ["Cab", ICONS.pin], ["Remind", ICONS.clock]].map(([l, i]) => el("span", { class: "care-mini-item" }, [el("span", { class: "ic", html: i as string }), l as string]))),
        el("button", { class: "btn btn-primary full", type: "button", style: `background:${PAL.green}; box-shadow:none;`, onClick: (e: Event) => { e.stopPropagation(); openCare(this.store, () => this.render()); } }, ["Open care journey"]),
      ]),
    ]);
  }

  private wellbeing(): HTMLElement {
    const p = this.privacy();
    return el("section", { class: "life-sec", "aria-label": "Wellbeing" }, [
      el("div", { class: "sec-head" }, [el("h2", {}, ["Wellbeing"]), el("span", { class: "sec-note" }, ["Private to you"])]),
      el("button", { class: "well-card", type: "button", onClick: () => openWellbeing(this.store, () => this.render()) }, [
        el("div", { class: "well-lead" }, [
          el("span", { class: "ic", style: `color:${PAL.violet};`, html: ICONS.activity }),
          el("div", {}, [
            el("div", { class: "well-title" }, [p ? "Wellbeing hidden in privacy mode" : "18% below your usual Tuesday activity"]),
            el("div", { class: "well-sub" }, [p ? "Turn off privacy mode to view" : "Possibly because the morning was meeting-heavy · personal baseline, not a target"]),
          ]),
        ]),
        !p ? el("div", { class: "well-bars", "aria-hidden": "true" }, [40, 55, 70, 45, 62, 38, 30].map((h, i) => el("span", { class: "well-bar", style: `height:${h}%; background:${i === 6 ? `linear-gradient(${PAL.amber},#F3D08A)` : `linear-gradient(${PAL.violet},#B9A9F5)`};` }))) : null,
      ]),
    ]);
  }

  private householdAssets(): HTMLElement {
    return el("section", { class: "life-sec", "aria-label": "Household and assets" }, [
      el("div", { class: "sec-head" }, [el("h2", {}, ["Household & assets"])]),
      el("div", { class: "hh-grid" }, [
        el("button", { class: "hh-card", type: "button", onClick: () => openBasket(this.store, () => this.render()) }, [
          el("span", { class: "ic", style: `color:${PAL.green};`, html: ICONS.check }),
          el("div", {}, [el("div", { class: "hh-title" }, ["Grocery basket ready"]), el("div", { class: "hh-sub" }, ["3 predicted low · nothing bought until you confirm"])]),
        ]),
        el("button", { class: "hh-card", type: "button", onClick: () => openAsset(this.store, () => this.render()) }, [
          el("span", { class: "ic", style: `color:${PAL.blue};`, html: ICONS.pin }),
          el("div", {}, [el("div", { class: "hh-title" }, ["Car service due soon"]), el("div", { class: "hh-sub" }, ["~400 km · ₹42,000/yr est · insurance renews Oct"])]),
        ]),
      ]),
    ]);
  }

  private occasions(): HTMLElement {
    return el("section", { class: "life-sec", "aria-label": "Occasions" }, [
      el("div", { class: "sec-head" }, [el("h2", {}, ["Occasions"])]),
      el("button", { class: "occasion-card", type: "button", onClick: () => openOccasion(this.store, () => this.render()) }, [
        el("span", { class: "occ-ic", style: `background:${PAL.pink}1a; color:${PAL.pink};`, html: ICONS.heart }),
        el("div", { style: "flex:1;" }, [el("div", { class: "occ-title" }, ["Anniversary · 24 July"]), el("div", { class: "occ-sub" }, ["I can plan this — dinner, gift and reminders"])]),
      ]),
    ]);
  }

  private money(): HTMLElement {
    const p = this.privacy();
    const sts = SAFE_TO_SPEND;
    return el("section", { class: "life-sec", "aria-label": "Money" }, [
      el("div", { class: "sec-head" }, [el("h2", {}, ["Money"]), el("span", { class: "sec-note" }, ["Estimate, not a guarantee"])]),
      el("button", { class: "money-card", type: "button", onClick: () => openMoney(this.store, () => this.render()) }, [
        el("div", { class: "money-label" }, [`Safe to spend ${sts.period}`]),
        el("div", { class: "money-value" }, [p ? "•••••" : `₹${sts.total.toLocaleString("en-IN")}`]),
        el("div", { class: "money-sub" }, [p ? "Hidden in privacy mode" : `Based on ${sts.accountsIncluded.length} connected accounts · synced ${sts.lastSync} · tap to see the maths`]),
      ]),
    ]);
  }

  private sharedWorkflows(): HTMLElement {
    return el("section", { class: "life-sec", "aria-label": "Shared workflows" }, [
      el("div", { class: "sec-head" }, [el("h2", {}, ["Shared with family"]), el("span", { class: "sec-note" }, ["Your private data stays private"])]),
      el("button", { class: "sw-card", type: "button", onClick: () => openSharedWorkflow(this.store, () => this.render()) }, [
        el("div", {}, [el("div", { class: "sw-title" }, ["Elder-care rota"]), el("div", { class: "sw-sub" }, ["Shared with 2 · you own it"])]),
        el("div", { class: "sw-avatars" }, [["AR", PAL.blue], ["RV", PAL.teal], ["CG", PAL.purple]].map(([i, c]) => el("span", { class: "avatar sm", style: `background:${c};` }, [i as string]))),
      ]),
    ]);
  }

  private footer(): HTMLElement {
    return el("section", { class: "foot-controls" }, [
      el("button", { class: "btn btn-ghost sm", type: "button", onClick: () => openActivity(this.store) }, ["Life activity"]),
      el("button", { class: "btn btn-ghost sm", type: "button", onClick: () => openPermissions(this.store, () => this.render()) }, ["Permissions"]),
      el("button", { class: "btn btn-ghost sm", type: "button", onClick: () => { this.store.data.household = this.store.data.household === "hh-solo" ? "hh-full" : "hh-solo"; this.store.save(); this.render(); toast(this.store.data.household === "hh-solo" ? "Switched to single-person household." : "Switched to full household."); } }, ["Switch household"]),
      el("button", { class: "btn btn-ghost sm danger", type: "button", onClick: () => { this.store.reset(); this.render(); toast("Life demo reset."); } }, ["Reset Life"]),
    ]);
  }
}

import { el, openSheet, toast } from "../ui/dom";
import { ICONS } from "../ui/icons";
import {
  BASKET,
  CAR,
  CARE_STEPS,
  CORRELATIONS,
  FINANCIAL_ACTION,
  FORECAST_7D,
  INFO_LEGEND,
  MICRO,
  OCCASION,
  PAL,
  PERMISSION_CATEGORIES,
  PERMISSION_LABELS,
  SAFE_TO_SPEND,
  SCENARIO,
  SHARED_WORKFLOWS,
  STORES,
  WELLBEING
} from "./mock";
function closeTop() {
  const s = document.querySelectorAll(".sheet-scrim");
  s[s.length - 1]?.querySelector(".sheet-close")?.click();
}
function stateMeta(state) {
  return INFO_LEGEND.find((l) => l.state === state) ?? INFO_LEGEND[0];
}
function infoChip(state) {
  const m = stateMeta(state);
  return el("span", { class: "state-chip", style: `color:${m.color}; background:${m.color}1a;` }, [el("span", { class: "dot", style: `background:${m.color};` }), m.label]);
}
function visLabel(v) {
  return { only_you: "Only you", you_and_caregiver: "You & caregiver", household: "Household", custom: "Custom" }[v] ?? v;
}
function confMeta(c) {
  return { high: ["High confidence", PAL.green], medium: ["Medium confidence", PAL.amber], low: ["Low confidence", PAL.red] }[c] ?? ["", PAL.slate];
}
function confBadge(c) {
  const [label, color] = confMeta(c);
  return el("span", { class: "conf-chip", style: `color:${color}; background:${color}1a;` }, [label]);
}
function block(label, node) {
  return el("div", { class: "info-block" }, [el("div", { class: "info-label" }, [label]), node]);
}
function kv(k, v) {
  return el("div", { class: "preview-field" }, [el("span", { class: "pf-k" }, [k]), el("span", { class: "pf-v" }, [v])]);
}
function openMember(m, store, rerender) {
  const wrap = el("div", {});
  function render() {
    const items = m.info.filter((i) => !store.data.deletedInfo.includes(i.id));
    wrap.replaceChildren(
      el("div", { class: "member-hero" }, [
        el("span", { class: "avatar", style: `background:${m.color}; width:52px; height:52px; font-size:18px;` }, [m.initials]),
        el("div", {}, [el("div", { class: "member-hero-name" }, [m.name]), el("div", { class: "member-hero-rel" }, [m.relationship])])
      ]),
      m.manages.length ? block("Normally manages", el("div", { class: "chip-row" }, m.manages.map((x) => el("span", { class: "soft-chip" }, [x])))) : el("p", { class: "muted sm" }, ["No responsibilities assigned."]),
      el("div", { class: "info-label", style: "margin-top:8px;" }, ["Information Buddy holds"]),
      ...items.map((i) => infoRow(i, store, render, rerender)),
      el("p", { class: "fineprint" }, ["Every item shows its source and who can see it. You can confirm, correct, restrict or delete anything."])
    );
  }
  render();
  openSheet({ title: m.name, body: el("div", { class: "sheet-body" }, [wrap]) });
}
function infoRow(i, store, render, rerender) {
  const confirmed = i.confirmed || store.data.confirmedInfo.includes(i.id);
  const corrected = store.data.correctedInfo.includes(i.id);
  const needsConfirm = (i.state === "inferred" || i.state === "sensitive") && !confirmed && !corrected;
  return el("div", { class: `info-item state-${i.state}` }, [
    el("div", { class: "info-item-top" }, [
      el("span", { class: "info-item-label" }, [i.label]),
      infoChip(i.state)
    ]),
    el("div", { class: "info-item-meta" }, [
      el("span", {}, [`Source: ${i.source}`]),
      el("span", { class: "vis-chip" }, [el("span", { class: "ic", html: ICONS.shield }), visLabel(i.visibility)])
    ]),
    corrected ? el("div", { class: "corrected-tag" }, ["Marked not relevant — Buddy won't use it."]) : null,
    i.usedIn && i.usedIn.length && !needsConfirm ? el("div", { class: "used-in" }, [`Used in: ${i.usedIn.join(", ")}`]) : null,
    needsConfirm ? el("div", { class: "info-actions" }, [
      el("button", { class: "chip-btn primary", type: "button", onClick: () => {
        store.confirmInfo(i.id);
        store.audit("Confirmed info", i.label, "family");
        render();
        rerender();
        toast("Confirmed.");
      } }, ["Confirm"]),
      el("button", { class: "chip-btn", type: "button", onClick: () => {
        store.correctInfo(i.id);
        store.audit("Marked not relevant", i.label, "family");
        render();
        rerender();
        toast("Buddy won't use this.");
      } }, ["Not relevant"]),
      el("button", { class: "chip-btn ghost", type: "button", onClick: () => openSourceInspect(i) }, ["Inspect source"])
    ]) : el("div", { class: "info-actions" }, [
      el("button", { class: "chip-btn", type: "button", onClick: () => openVisibility(i, store, render) }, ["Change visibility"]),
      el("button", { class: "chip-btn ghost danger", type: "button", onClick: () => {
        store.deleteInfo(i.id);
        store.audit("Deleted info", i.label, "family");
        render();
        rerender();
        toast("Deleted from Buddy's memory.");
      } }, ["Delete"])
    ])
  ]);
}
function openSourceInspect(i) {
  openSheet({ title: "Where this came from", body: el("div", { class: "sheet-body" }, [
    el("div", { class: "consent-lead" }, [el("span", { class: "ic", html: ICONS.shield }), el("p", {}, ["Only you can see this source. It's never revealed to anyone else — including the person it's about."])]),
    block("Signal", el("p", {}, [i.source])),
    block("Status", el("p", {}, [`This is ${i.state} information. ${i.state === "inferred" ? "Buddy guessed it — confirm before it's used." : "Confirm before it's stored or used."}`])),
    el("p", { class: "fineprint" }, ["Buddy shows the type of signal, not private message contents."])
  ]) });
}
function openVisibility(i, store, render) {
  const opts = [["only_you", "Only you"], ["you_and_caregiver", "You & caregiver"], ["household", "Household"]];
  openSheet({ title: "Who can see this", body: el("div", { class: "sheet-body" }, [
    el("p", { class: "muted", style: "margin-bottom:12px;" }, [`"${i.label}"`]),
    ...opts.map(([v, label]) => el("button", { class: `btn btn-ghost full${i.visibility === v ? " ctx-active" : ""}`, type: "button", onClick: () => {
      i.visibility = v;
      store.audit("Changed visibility", `${i.label} → ${label}`, "family");
      store.save();
      closeTop();
      render();
      toast(`Visibility: ${label}`);
    } }, [label])),
    el("p", { class: "fineprint" }, ["Changing visibility never shares past data retroactively."])
  ]) });
}
function openNudge(n, store, rerender) {
  const [confLabel] = confMeta(n.confidence);
  openSheet({ title: n.title, body: el("div", { class: "sheet-body" }, [
    n.sensitivity === "sensitive" ? el("div", { class: "consent-lead" }, [el("span", { class: "ic", html: ICONS.shield }), el("p", {}, ["Sensitive — nothing is used or shared until you confirm."])]) : null,
    block("Why now", el("p", {}, [n.whyNow])),
    el("div", { class: "conf-row" }, [confBadge(n.confidence)]),
    block("Source", el("p", { class: "muted" }, [n.source])),
    block("If ignored", el("p", {}, [n.consequenceIfIgnored])),
    kv("Reversible", n.reversible ? "Yes" : "No"),
    el("div", { class: "sheet-actions col" }, [
      n.id === "n-italian" ? el("button", { class: "btn btn-primary full", type: "button", onClick: () => {
        store.confirmInfo("i-p2");
        store.audit("Confirmed inference", "Priya may prefer Italian", "family");
        closeTop();
        rerender();
        toast("Confirmed — I'll use it for the anniversary plan.");
      } }, ["Confirm this preference"]) : null,
      n.id === "n-car" ? el("button", { class: "btn btn-primary full", type: "button", onClick: () => {
        closeTop();
        openCare(store, rerender);
      } }, ["Open the care journey"]) : null,
      el("button", { class: "btn btn-ghost full", type: "button", onClick: () => {
        store.audit("Corrected nudge", `too personal: ${n.title}`, n.category);
        toast("Understood — I'll ease off.");
        closeTop();
      } }, ["Too personal — don't suggest this again"]),
      el("button", { class: "btn btn-ghost full", type: "button", onClick: () => {
        toast("I'll remind you later.");
        closeTop();
      } }, ["Remind me later"])
    ]),
    el("p", { class: "fineprint" }, ["I describe patterns and timing — never anyone's feelings."])
  ]) });
}
function openCare(store, rerender) {
  const wrap = el("div", {});
  const stageLabel = { before: "Before appointment", during: "During appointment", after: "After appointment" };
  function render() {
    const escalation = [["Wellness", PAL.green], ["Care", PAL.blue], ["Medical", PAL.amber], ["Urgent", PAL.red]];
    wrap.replaceChildren(
      // escalation ladder (medical boundaries always visible)
      el("div", { class: "escalation" }, [
        el("div", { class: "info-label" }, ["Where this sits"]),
        el("div", { class: "escalation-row" }, escalation.map(([label, color], i) => el("span", { class: `esc-pill${i === 1 ? " active" : ""}`, style: i === 1 ? `background:${color}; color:#fff;` : `color:${color}; background:${color}1a;` }, [label]))),
        el("p", { class: "muted sm", style: "margin-top:6px;" }, ["This is care coordination — logistics, reports and reminders. Buddy never diagnoses or changes medication. Urgent help is one tap away below."])
      ]),
      ...["before", "during", "after"].map((stage) => el("div", { class: "care-stage" }, [
        el("div", { class: "care-stage-head" }, [stageLabel[stage]]),
        ...CARE_STEPS.filter((s) => s.stage === stage).map((s) => careStepRow(s, store, render))
      ])),
      el("div", { class: "sheet-actions col" }, [
        el("button", { class: "btn btn-primary full", type: "button", style: `background:${PAL.green};`, onClick: () => {
          store.audit("Coordinated care prep", "Reports gathered, calendar held; cab & refill await approval", "health");
          closeTop();
          rerender();
          toast("Prep coordinated — reports ready, 2 items await your approval.");
        } }, ["Coordinate the prep"]),
        el("button", { class: "btn btn-ghost full danger", type: "button", onClick: () => openEmergency() }, [el("span", { class: "ic", html: ICONS.info }), "Urgent — show emergency actions"])
      ]),
      el("p", { class: "fineprint" }, ["Logistics only. No medical changes; purchases and cabs are confirmed separately."])
    );
  }
  render();
  openSheet({ title: "Dad's care journey", body: el("div", { class: "sheet-body" }, [wrap]) });
}
function careStepRow(s, store, render) {
  return el("div", { class: `care-step${s.status === "done" ? " done" : ""}` }, [
    el("div", { class: "care-step-top" }, [
      el("span", { class: "care-step-title" }, [s.title]),
      s.sensitivity === "sensitive" ? el("span", { class: "sens-tag sm" }, [el("span", { class: "ic", html: ICONS.shield }), "Sensitive"]) : null
    ]),
    el("div", { class: "care-step-meta" }, [
      el("span", { class: "soft-chip" }, [s.owner]),
      el("span", { class: "soft-chip" }, [s.due]),
      el("span", { class: "vis-chip" }, [visLabel(s.visibility)]),
      s.buddyCanPrepare ? el("span", { class: "soft-chip good" }, ["Buddy can prepare"]) : null,
      s.requiresConfirm ? el("span", { class: "soft-chip warn" }, ["Needs your OK"]) : null
    ])
  ]);
}
function openEmergency() {
  openSheet({ title: "Emergency support", body: el("div", { class: "sheet-body" }, [
    el("div", { class: "emergency-hero" }, [el("span", { class: "ic", html: ICONS.info }), el("div", {}, [el("strong", {}, ["If this is a medical emergency"]), el("p", {}, ["Contact local emergency services right away. Buddy is not a medical service and can't help in an emergency."])])]),
    el("a", { class: "btn btn-primary full danger", href: "tel:112", role: "button" }, ["Call emergency services (112)"]),
    block("Dad's emergency contacts", el("div", { class: "chip-row" }, [el("span", { class: "soft-chip" }, ["Dr. Sharma — City Hospital"]), el("span", { class: "soft-chip" }, ["Ravi (sibling)"])])),
    el("p", { class: "fineprint" }, ["Buddy never hides urgent guidance behind a conversation."])
  ]) });
}
function openWellbeing(store, rerender) {
  const wrap = el("div", {});
  const t = store.data.wellbeingToggles;
  function render() {
    const parts = [
      el("p", { class: "muted", style: "margin-bottom:12px;" }, ["Personal patterns, private to you. Compared to your own baseline — never a target to hit."]),
      // baselines
      ...WELLBEING.map((w) => el("div", { class: "baseline-card" }, [
        el("div", { class: "baseline-top" }, [el("span", { class: "baseline-label" }, [w.label]), confBadge(w.confidence)]),
        el("div", { class: "baseline-row" }, [
          el("div", {}, [el("span", { class: "meta-k" }, ["Today"]), el("span", { class: "baseline-v" }, [w.today])]),
          el("div", {}, [el("span", { class: "meta-k" }, ["Your usual"]), el("span", { class: "baseline-v" }, [w.baseline])])
        ]),
        el("div", { class: `baseline-diff ${w.diffPct < 0 ? "below" : "above"}` }, [`${w.diffPct > 0 ? "+" : ""}${w.diffPct}% vs usual · ${w.dataPeriod}`]),
        w.missingData ? el("div", { class: "missing-note" }, [`Missing: ${w.missingData}`]) : null,
        w.publicRef ? el("div", { class: "public-ref" }, [`Public-health reference (separate): ${w.publicRef}`]) : null
      ])),
      // correlation
      t.correlations ? el("div", { class: "corr-card" }, [
        el("div", { class: "info-label" }, ["A pattern appears"]),
        el("div", { class: "corr-vars" }, [CORRELATIONS[0].variables]),
        el("p", {}, [CORRELATIONS[0].observation]),
        el("div", { class: "corr-meta" }, [`Based on ${CORRELATIONS[0].dataPoints} comparable days · ${CORRELATIONS[0].strength} pattern`]),
        el("div", { class: "info-label", style: "margin-top:8px;" }, ["Other factors may contribute"]),
        el("ul", { class: "bullet" }, CORRELATIONS[0].alternatives.map((a) => el("li", {}, [a]))),
        el("div", { class: "disclaimer" }, [CORRELATIONS[0].disclaimer]),
        el("div", { class: "info-actions" }, [
          el("button", { class: "chip-btn ghost", type: "button", onClick: () => toast("Marked inaccurate — excluded.") }, ["Mark inaccurate"]),
          el("button", { class: "chip-btn ghost", type: "button", onClick: () => {
            t.correlations = false;
            store.save();
            render();
            toast("Pattern insights off.");
          } }, ["Turn off"])
        ])
      ]) : null,
      // micro-intervention
      el("div", { class: "info-label" }, ["A small thing that fits your day"]),
      ...MICRO.map((mi) => el("div", { class: "micro-card" }, [
        el("div", { class: "micro-top" }, [el("span", { class: "micro-title" }, [mi.title]), el("span", { class: "soft-chip" }, [`${mi.durationMins} min`])]),
        el("p", { class: "muted sm" }, [mi.reason]),
        el("div", { class: "micro-meta" }, [`Best time: ${mi.bestTime} · ${mi.affectsCalendar ? "adds to calendar" : "no calendar change"}`]),
        el("div", { class: "info-actions" }, [
          el("button", { class: "chip-btn primary", type: "button", onClick: () => {
            store.audit("Added micro-intervention", mi.title, "health");
            toast("Added to your day.");
          } }, ["Add to day"]),
          el("button", { class: "chip-btn ghost", type: "button", onClick: () => toast("Snoozed.") }, ["Snooze"]),
          el("button", { class: "chip-btn ghost", type: "button", onClick: () => toast("I'll stop suggesting this type.") }, ["Not this type"])
        ])
      ])),
      // health-data consent
      block("Health-data consent", el("div", { class: "consent-toggles" }, [
        toggleRow("Use wearable data", "Sleep & activity from your device", t.wearable, () => {
          t.wearable = !t.wearable;
          store.audit("Health consent", `wearable ${t.wearable}`, "health");
          store.save();
          render();
        }),
        toggleRow("Show pattern insights", "Personal correlations, clearly labelled", t.correlations, () => {
          t.correlations = !t.correlations;
          store.save();
          render();
        }),
        toggleRow("Use my check-ins", "How you say you feel", t.checkins, () => {
          t.checkins = !t.checkins;
          store.save();
          render();
        })
      ])),
      el("p", { class: "fineprint" }, ["Health data is private to you — never shared with managers, never used for performance or employment. Delete it anytime. Buddy never diagnoses from wearable, sleep or activity data."])
    ];
    wrap.replaceChildren(...parts.filter(Boolean));
  }
  function toggleRow(title, sub, on, onClick) {
    return el("div", { class: "consent-toggle-row" }, [
      el("div", {}, [el("div", { class: "ct-title" }, [title]), el("div", { class: "ct-sub" }, [sub])]),
      el("button", { class: `toggle sm${on ? " on" : ""}`, type: "button", role: "switch", "aria-checked": on, "aria-label": title, onClick }, [on ? "On" : "Off"])
    ]);
  }
  render();
  openSheet({ title: "Wellbeing", body: el("div", { class: "sheet-body" }, [wrap]) });
}
function openBasket(store, rerender) {
  const wrap = el("div", {});
  const invLabel = { confirmed: "Confirmed", predicted: "Predicted", user_reported: "You reported", device: "Smart-shelf" };
  function render() {
    const items = BASKET.filter((b) => !store.data.basketExcluded.includes(b.id));
    const total = items.filter((b) => b.included).reduce((s, b) => s + b.price, 0);
    wrap.replaceChildren(
      el("div", { class: "consent-lead" }, [el("span", { class: "ic", html: ICONS.shield }), el("p", {}, ["Buddy prepared this basket — nothing is bought until you confirm."])]),
      ...items.map((b) => el("div", { class: `basket-item${b.included ? "" : " excluded"}` }, [
        el("label", { class: "basket-check" }, [el("input", { type: "checkbox", checked: b.included, "aria-label": `Include ${b.name}`, onChange: (e) => {
          b.included = e.target.checked;
          render();
        } })]),
        el("div", { class: "basket-body" }, [
          el("div", { class: "basket-top" }, [el("span", { class: "basket-name" }, [b.name]), el("span", { class: `inv-tag inv-${b.inventoryState}` }, [invLabel[b.inventoryState]])]),
          el("div", { class: "basket-why" }, [b.whyPredicted]),
          el("div", { class: "basket-meta" }, [confBadge(b.confidence), el("span", { class: "soft-chip" }, [b.brand]), b.price ? el("span", { class: "basket-price" }, [`₹${b.price}`]) : null, b.needsConfirm ? el("span", { class: "soft-chip warn" }, ["Confirm"]) : null])
        ]),
        el("button", { class: "chip-btn ghost", type: "button", "aria-label": `Still have ${b.name}`, onClick: () => {
          store.data.basketExcluded.push(b.id);
          store.save();
          render();
          toast("Marked still available — Buddy learns.");
        } }, ["Have it"])
      ])),
      // store comparison
      block("Store comparison", el("div", { class: "store-compare" }, STORES.map((s) => el("div", { class: `store-row${s.recommended ? " best" : ""}` }, [
        el("div", {}, [el("div", { class: "store-name" }, [s.name, s.recommended ? el("span", { class: "soft-chip good" }, ["Best"]) : null]), el("div", { class: "store-eta" }, [`Delivery: ${s.eta}`])]),
        el("div", { class: "store-price" }, [`₹${s.price}`])
      ])))),
      el("div", { class: "sheet-actions col" }, [
        el("button", { class: "btn btn-primary full", type: "button", onClick: () => {
          store.audit("Confirmed grocery purchase", `₹${total} · FreshMart`, "purchasing");
          closeTop();
          rerender();
          toast(`Order confirmed · ₹${total}. Categorised to household budget.`);
        } }, [`Confirm purchase · ₹${total.toLocaleString("en-IN")}`]),
        el("button", { class: "btn btn-ghost full", type: "button", onClick: () => {
          toast("Prediction paused.");
        } }, ["Pause predictions"])
      ]),
      el("p", { class: "fineprint" }, ["Confirmed / predicted / you-reported / smart-shelf are shown separately so you always know the source."])
    );
  }
  render();
  openSheet({ title: "Grocery basket", body: el("div", { class: "sheet-body" }, [wrap]) });
}
function openAsset(store, rerender) {
  const a = CAR;
  openSheet({ title: a.name, body: el("div", { class: "sheet-body" }, [
    el("div", { class: "asset-stats" }, [
      kv("Service due", a.serviceDue),
      kv("Est. cost / yr", a.estAnnualCost),
      kv("Insurance", a.insurance),
      kv("Compliance", a.compliance),
      kv("Responsible", a.responsible),
      kv("Purchased", a.purchaseDate)
    ]),
    el("div", { class: "asset-note" }, [el("span", { class: "ic", html: ICONS.info }), el("p", {}, ["Service is estimated from distance and time — Buddy won't claim a mechanical fault from incomplete data."])]),
    block("Authorised service slots", el("div", { class: "slot-list" }, a.serviceSlots.map((s) => el("div", { class: "slot-row" }, [
      el("div", {}, [el("div", { class: "slot-name" }, [s.name, s.authorised ? el("span", { class: "soft-chip good" }, ["Authorised"]) : null]), el("div", { class: "slot-when" }, [`${s.when} · ₹${s.price}`])]),
      el("button", { class: `chip-btn ${s.authorised ? "primary" : ""}`, type: "button", onClick: () => {
        closeTop();
        openFinancial({ ...FINANCIAL_ACTION, action: `Book car service · ${s.name}`, amount: s.price, to: s.name, safeToSpendImpact: `−₹${s.price}` }, store, rerender);
      } }, ["Book"])
    ])))),
    el("p", { class: "fineprint" }, ["Booking prepares a quotation; the charge is confirmed with step-up authentication."])
  ]) });
}
function openOccasion(store, rerender) {
  const o = OCCASION;
  const wrap = el("div", {});
  function render() {
    const italianConfirmed = store.data.confirmedInfo.includes("i-p2");
    wrap.replaceChildren(
      el("div", { class: "occ-hero" }, [el("div", { class: "occ-hero-title" }, [o.title]), el("div", { class: "occ-hero-sub" }, [`${o.date} · ${o.people.join(" & ")} · budget ₹${o.budget.toLocaleString("en-IN")}`])]),
      block("Gift & plan ideas", el("div", { class: "idea-list" }, o.giftIdeas.map((g) => el("div", { class: "idea-row" }, [
        el("div", { style: "flex:1;" }, [
          el("div", { class: "idea-label" }, [g.label]),
          el("div", { class: `idea-source ${g.source}` }, [g.source === "inferred" ? italianConfirmed ? "From a preference you confirmed" : g.note : g.note])
        ]),
        g.source === "inferred" && !italianConfirmed ? el("button", { class: "chip-btn", type: "button", onClick: () => openPreferenceSource(store, render) }, ["Inspect"]) : el("button", { class: "chip-btn primary", type: "button", onClick: () => {
          closeTop();
          openFinancial({ ...FINANCIAL_ACTION, action: `Reserve · ${g.label}`, amount: 3500, to: "Restaurant", safeToSpendImpact: "−₹3,500" }, store, rerender);
        } }, ["Book"])
      ])))),
      el("p", { class: "fineprint" }, ["Inferred preferences are never revealed to the gift recipient. High-value bookings ask for confirmation."])
    );
  }
  render();
  openSheet({ title: "Occasion planner", body: el("div", { class: "sheet-body" }, [wrap]) });
}
function openPreferenceSource(store, render) {
  openSheet({ title: "Private preference source", body: el("div", { class: "sheet-body" }, [
    el("div", { class: "consent-lead" }, [el("span", { class: "ic", html: ICONS.shield }), el("p", {}, ["Based on an authorised preference signal (3 conversations). Only you can see this — it's never shown to Priya."])]),
    el("button", { class: "btn btn-primary full", type: "button", onClick: () => {
      store.confirmInfo("i-p2");
      store.audit("Confirmed inference", "Italian preference for occasion", "family");
      closeTop();
      render();
      toast("Confirmed — I'll use it privately.");
    } }, ["Confirm & use privately"]),
    el("button", { class: "btn btn-ghost full", type: "button", onClick: () => {
      store.correctInfo("i-p2");
      closeTop();
      render();
      toast("Won't use it.");
    } }, ["Don't use this"]),
    el("p", { class: "fineprint" }, ["Buddy shows the type of signal, not the message contents."])
  ]) });
}
function openMoney(store, rerender) {
  let tab = "safe";
  const wrap = el("div", {});
  function render() {
    const seg = el("div", { class: "seg", role: "radiogroup", "aria-label": "Money view" }, [["safe", "Safe to spend"], ["forecast", "Forecast"], ["scenario", "Scenarios"]].map(([k, label]) => el("button", { class: `seg-btn${tab === k ? " active" : ""}`, role: "radio", "aria-checked": tab === k, type: "button", onClick: () => {
      tab = k;
      render();
    } }, [label])));
    const body = [seg];
    if (tab === "safe") body.push(safeToSpendView());
    else if (tab === "forecast") body.push(forecastView());
    else body.push(scenarioView(store, rerender));
    wrap.replaceChildren(...body.filter(Boolean));
  }
  render();
  openSheet({ title: "Money", body: el("div", { class: "sheet-body" }, [wrap]) });
}
function safeToSpendView() {
  const s = SAFE_TO_SPEND;
  return el("div", {}, [
    el("div", { class: "sts-hero" }, [
      el("div", { class: "sts-label" }, [`Safe to spend ${s.period}`]),
      el("div", { class: "sts-value" }, [`₹${s.total.toLocaleString("en-IN")}`]),
      el("div", { class: "sts-note" }, ["Based on the accounts and bills currently connected. This is an estimate, not a guarantee."])
    ]),
    el("div", { class: "sts-calc" }, s.rows.map((r) => el("div", { class: `sts-row${r.op === "total" ? " total" : ""}` }, [
      el("span", {}, [`${r.op === "sub" ? "− " : r.op === "add" ? "+ " : ""}${r.label}`]),
      el("span", { class: "sts-amt" }, [`₹${r.amount.toLocaleString("en-IN")}`])
    ])).concat([el("div", { class: "sts-row total" }, [el("span", {}, ["= Safe to spend"]), el("span", { class: "sts-amt" }, [`₹${s.total.toLocaleString("en-IN")}`])])])),
    el("div", { class: "meta-grid" }, [
      kv("Accounts included", `${s.accountsIncluded.length}`),
      kv("Excluded", `${s.accountsExcluded.length}`),
      kv("Last sync", s.lastSync),
      kv("Pending txns", `${s.pendingTxns}`)
    ]),
    el("div", { class: "info-actions" }, [
      el("button", { class: "chip-btn", type: "button", onClick: () => toast("Edit assumptions (simulated).") }, ["Edit assumptions"]),
      el("button", { class: "chip-btn", type: "button", onClick: () => toast("Recalculated with the latest sync.") }, ["Recalculate"])
    ]),
    el("div", { class: "disclaimer" }, ["This is planning guidance based on connected information, not personalised financial advice."])
  ]);
}
function forecastView() {
  const max = Math.max(...FORECAST_7D.map((d) => d.balance));
  return el("div", {}, [
    el("p", { class: "muted", style: "margin-bottom:10px;" }, ["7-day balance forecast. A low-balance window is flagged in coral."]),
    el("div", { class: "forecast-chart", role: "img", "aria-label": "7-day balance forecast; a low-balance dip around the 22nd" }, FORECAST_7D.map((d) => el("div", { class: "fc-col" }, [
      el("div", { class: `fc-bar${d.low ? " low" : ""}`, style: `height:${Math.round(d.balance / max * 100)}%;` }),
      el("div", { class: "fc-day" }, [d.day])
    ]))),
    el("div", { class: "forecast-alert" }, [el("span", { class: "ic amber", html: ICONS.info }), el("span", {}, ["Balance dips to ~₹15,440 around 22 Jul, before salary on the 25th. Your card bill is due before then — worth paying early."])]),
    el("p", { class: "fineprint" }, ["Confidence ranges widen where data is incomplete. No guaranteed outcomes."])
  ]);
}
function scenarioView(store, rerender) {
  const s = SCENARIO;
  return el("div", {}, [
    el("div", { class: "scenario-q" }, [el("span", { class: "ic", html: ICONS.spark }), s.question]),
    el("div", { class: "meta-grid" }, [
      kv("Monthly impact", s.monthlyImpact),
      kv("Lowest balance", s.lowestBalance),
      kv("Savings goal", s.savingsImpact),
      kv("Safety buffer", s.bufferImpact)
    ]),
    block("Assumptions", el("ul", { class: "bullet" }, s.assumptions.map((a) => el("li", {}, [a])))),
    block("Risks", el("ul", { class: "bullet bad-bullet" }, s.risks.map((r) => el("li", {}, [r])))),
    block("What Buddy doesn't know", el("ul", { class: "bullet" }, s.unknowns.map((u) => el("li", {}, [u])))),
    el("div", { class: "conf-row" }, [confBadge(s.confidence)]),
    el("div", { class: "info-actions" }, [
      el("button", { class: "chip-btn primary", type: "button", onClick: () => {
        store.audit("Saved scenario as goal", s.question, "banking");
        toast("Saved as a savings goal.");
      } }, ["Save as goal"]),
      el("button", { class: "chip-btn", type: "button", onClick: () => toast("Compare scenarios (simulated).") }, ["Compare"])
    ]),
    el("div", { class: "disclaimer" }, ["This is planning guidance based on connected information, not personalised financial advice."])
  ]);
}
function openFinancial(fa, store, rerender) {
  openSheet({ title: "Confirm financial action", body: el("div", { class: "sheet-body" }, [
    el("div", { class: "fin-warn" }, [el("span", { class: "ic", html: ICONS.shield }), el("p", {}, ["High-impact. Buddy never pays, transfers or changes anything automatically — this needs your explicit confirmation."])]),
    el("div", { class: "fin-rows" }, [
      kv("Action", fa.action),
      kv("Amount", `₹${fa.amount.toLocaleString("en-IN")}`),
      kv("To", fa.to),
      kv("From", fa.from),
      kv("When", fa.when),
      kv("Fees", fa.fees),
      kv("Cancellation", fa.cancellation),
      kv("Impact on safe-to-spend", fa.safeToSpendImpact),
      kv("Permission", fa.permission)
    ]),
    el("button", { class: "btn btn-primary full", type: "button", onClick: () => openStepUp(fa, store, rerender) }, ["Continue to authentication"]),
    el("p", { class: "fineprint" }, ["Financial permission is one-time, amount-specific, recipient-specific and auditable."])
  ]) });
}
function openStepUp(fa, store, rerender) {
  const inp = el("input", { type: "password", class: "stepup-input", inputmode: "numeric", maxlength: "6", placeholder: "••••••", "aria-label": "Step-up passcode (demo — type any 6 digits)" });
  const btn = el("button", { class: "btn btn-primary full", type: "button", disabled: true, onClick: () => runFinancial(fa, store, rerender) }, ["Authenticate & confirm"]);
  inp.addEventListener("input", () => btn.toggleAttribute("disabled", inp.value.length < 6));
  openSheet({ title: "Step-up authentication", body: el("div", { class: "sheet-body" }, [
    el("p", { class: "muted", style: "margin-bottom:14px;" }, [`Confirm ₹${fa.amount.toLocaleString("en-IN")} to ${fa.to}. Enter your passcode to authorise this one action.`]),
    inp,
    btn,
    el("p", { class: "fineprint" }, ["Demo only — no real account is touched. Type any 6 digits."])
  ]) });
  requestAnimationFrame(() => inp.focus());
}
function runFinancial(fa, store, rerender) {
  store.audit("Authorised financial action", `${fa.action} · ₹${fa.amount}`, "banking");
  document.querySelectorAll(".sheet-scrim .sheet-close").forEach((b) => b.click());
  setTimeout(() => {
    openSheet({ title: "Receipt", body: el("div", { class: "sheet-body" }, [
      el("div", { class: "receipt-hero" }, [el("span", { class: "ic", html: ICONS.check }), el("div", {}, [el("div", { class: "comp-h" }, ["Done"]), el("div", { class: "comp-sub" }, [`${fa.action} · ₹${fa.amount.toLocaleString("en-IN")}`])])]),
      el("div", { class: "fin-rows" }, [kv("Reference", `TXN-${Date.now().toString().slice(-6)}`), kv("To", fa.to), kv("From", fa.from), kv("When", (/* @__PURE__ */ new Date()).toLocaleString("en-US", { hour: "numeric", minute: "2-digit", day: "numeric", month: "short" }))]),
      fa.cancellation.includes("Can't") ? el("p", { class: "fineprint" }, ["This action can't be reversed."]) : el("button", { class: "btn btn-ghost full", type: "button", onClick: () => {
        toast("Cancelled.");
        closeTop();
      } }, ["Cancel this action"]),
      el("button", { class: "btn btn-primary full", type: "button", onClick: () => {
        closeTop();
        rerender();
      } }, ["Back to Life"])
    ]) });
    rerender();
  }, 300);
}
function openSharedWorkflow(store, rerender) {
  const w = SHARED_WORKFLOWS[0];
  openSheet({ title: w.title, body: el("div", { class: "sheet-body" }, [
    block("Purpose", el("p", {}, [w.purpose])),
    block("Participants & permissions", el("div", { class: "participant-list" }, w.participants.map((p) => el("div", { class: "participant-row" }, [
      el("span", { class: "avatar sm", style: `background:${p.color};` }, [p.initials]),
      el("div", { style: "flex:1;" }, [el("div", { class: "cp-name" }, [p.name]), el("div", { class: "cp-role" }, [p.role])]),
      el("span", { class: `perm-chip perm-${p.permission.toLowerCase()}` }, [p.permission])
    ])))),
    block("Shared with the group", el("ul", { class: "bullet" }, w.sharedInfo.map((x) => el("li", {}, [x])))),
    el("div", { class: "private-block" }, [
      el("div", { class: "info-label" }, [el("span", { class: "ic", html: ICONS.shield }), "Private — never shared"]),
      el("ul", { class: "bullet" }, w.privateInfo.map((x) => el("li", {}, [x])))
    ]),
    el("div", { class: "sheet-actions col" }, [
      el("button", { class: "btn btn-primary full", type: "button", onClick: () => openSharePreview(store) }, ["Share something new"]),
      el("button", { class: "btn btn-ghost full danger", type: "button", onClick: () => {
        store.audit("Revoked access", "Removed a participant", "shared");
        toast("Access revoked.");
      } }, ["Revoke someone's access"])
    ]),
    el("p", { class: "fineprint" }, ["Buddy never exposes one person's private data to another just because they're in the same family group."])
  ]) });
}
function openSharePreview(store) {
  openSheet({ title: "Before you share", body: el("div", { class: "sheet-body" }, [
    kv("Exact information", "Dad's visit schedule (next 2 weeks)"),
    kv("Recipient", "Ravi (sibling)"),
    kv("Reason", "Weekend cover coordination"),
    kv("Visible for", "Until you revoke"),
    kv("Can reshare?", "No"),
    kv("Revocable?", "Yes, anytime"),
    el("button", { class: "btn btn-primary full", type: "button", onClick: () => {
      store.audit("Shared information", "Visit schedule → Ravi", "shared");
      closeTop();
      toast("Shared with Ravi — you can revoke anytime.");
    } }, ["Share this"]),
    el("p", { class: "fineprint" }, ["Only the exact item above is shared — nothing else."])
  ]) });
}
function openPermissions(store, rerender) {
  const wrap = el("div", {});
  const levels = Object.keys(PERMISSION_LABELS);
  function render() {
    wrap.replaceChildren(
      el("p", { class: "muted", style: "margin-bottom:12px;" }, ["What Buddy may do per category. Set separately for each — nothing escalates automatically."]),
      ...PERMISSION_CATEGORIES.map((c) => {
        const cur = store.data.permissions[c.id] ?? c.level;
        return el("div", { class: "perm-row" }, [
          el("div", { class: "perm-cat" }, [c.label]),
          el(
            "select",
            { class: "perm-select", "aria-label": `Permission for ${c.label}`, onChange: (e) => {
              store.data.permissions[c.id] = e.target.value;
              store.audit("Changed permission", `${c.label} → ${PERMISSION_LABELS[e.target.value]}`, c.id);
              store.save();
              render();
            } },
            levels.map((l) => el("option", { value: l, selected: l === cur }, [PERMISSION_LABELS[l]]))
          )
        ]);
      }),
      el("p", { class: "fineprint" }, ["Investments default to 'Never automatic'. Financial and health actions always require explicit, action-specific confirmation."])
    );
  }
  render();
  openSheet({ title: "Permissions", body: el("div", { class: "sheet-body" }, [wrap]) });
}
function openActivity(store) {
  const items = store.data.audit;
  openSheet({ title: "Life activity & permissions", body: el("div", { class: "sheet-body" }, [
    el("p", { class: "muted", style: "margin-bottom:12px;" }, ["Everything Buddy did, and every permission or privacy change — yours to review."]),
    items.length === 0 ? el("p", { class: "empty" }, ["No activity yet."]) : el("div", { class: "audit-list" }, items.map((a) => el("div", { class: "audit-row" }, [
      el("div", { class: "audit-dot" }, []),
      el("div", {}, [el("div", { class: "audit-action" }, [a.action]), el("div", { class: "audit-meta" }, [`${a.detail} · ${a.category} · ${new Date(a.at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`])])
    ]))),
    el("button", { class: "btn btn-ghost sm danger full", type: "button", style: "margin-top:14px;", onClick: () => {
      store.reset();
      closeTop();
      toast("Life demo reset — memory cleared.");
    } }, ["Delete Buddy's Life memory (reset)"])
  ]) });
}
export {
  openActivity,
  openAsset,
  openBasket,
  openCare,
  openFinancial,
  openMember,
  openMoney,
  openNudge,
  openOccasion,
  openPermissions,
  openSharedWorkflow,
  openWellbeing
};

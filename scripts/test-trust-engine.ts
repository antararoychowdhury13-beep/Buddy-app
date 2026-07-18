import { assignTier, computeConfidence, scoreInsights } from "../src/trustEngine.js";
import type { CandidateInsight } from "../src/types.js";

let failures = 0;

function check(label: string, condition: boolean) {
  if (condition) {
    console.log(`  PASS  ${label}`);
  } else {
    console.log(`  FAIL  ${label}`);
    failures++;
  }
}

console.log("Tier boundaries:");
check("confidence 0.0 -> silent", assignTier(0.0) === "silent");
check("confidence 0.29 -> silent", assignTier(0.29) === "silent");
check("confidence 0.3 -> passive", assignTier(0.3) === "passive");
check("confidence 0.5 -> ambient", assignTier(0.5) === "ambient");
check("confidence 0.75 -> proactive", assignTier(0.75) === "proactive");
check("confidence 1.0 -> proactive", assignTier(1.0) === "proactive");

console.log("\nConfidence formula:");
const base: CandidateInsight = {
  domain: "work",
  sourceEventIds: [],
  candidateText: "test",
  sourceDirectness: 1,
  evidenceMaturity: 1,
  domainAccuracy: 1,
  stakesMultiplier: 1,
};
check("all factors 1.0 -> confidence 1.0", computeConfidence(base) === 1);
check(
  "any factor 0 -> confidence 0",
  computeConfidence({ ...base, domainAccuracy: 0 }) === 0
);
check(
  "0.5 x 0.5 x 0.5 x 0.5 = 0.0625",
  Math.abs(computeConfidence({
    sourceDirectness: 0.5,
    evidenceMaturity: 0.5,
    domainAccuracy: 0.5,
    stakesMultiplier: 0.5,
    domain: "work",
    sourceEventIds: [],
    candidateText: "test",
  }) - 0.0625) < 1e-9
);

console.log("\nEnd-to-end: a fresh, untrusted domain must correctly stay silent");
const candidates: CandidateInsight[] = [
  {
    domain: "work",
    sourceEventIds: ["e1"],
    candidateText: "A true, direct calendar fact in a brand-new domain",
    sourceDirectness: 1.0, // as direct and certain as evidence gets
    evidenceMaturity: 0.15, // domain has almost no track record yet
    domainAccuracy: 0.5, // neutral prior, no history to judge by
    stakesMultiplier: 0.8,
  },
  {
    domain: "commute",
    sourceEventIds: ["e2"],
    candidateText: "A confident nudge in a well-established, high-trust domain",
    sourceDirectness: 1.0,
    evidenceMaturity: 1.0, // long track record
    domainAccuracy: 0.9, // historically accurate
    stakesMultiplier: 1.0,
  },
];
const scored = scoreInsights(candidates);
check(
  "direct fact in immature domain stays silent despite being true",
  scored[0].tier === "silent"
);
check(
  "same-quality fact in mature, trusted domain gets surfaced",
  scored[1].tier === "proactive"
);
check(
  "not everything is surfaced (proves tiering isn't a no-op)",
  scored.some((s) => s.tier === "silent") && scored.some((s) => s.tier !== "silent")
);

console.log(`\n${failures === 0 ? "All checks passed." : `${failures} check(s) FAILED.`}`);
process.exit(failures === 0 ? 0 : 1);

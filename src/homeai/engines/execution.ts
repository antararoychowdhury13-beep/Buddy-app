/**
 * Action execution simulation. Steps run one at a time with realistic
 * outcomes — not everything succeeds instantly. The mock day deliberately
 * produces: one clean success, one partial completion, one permission
 * failure, one stale-data warning, and undo for reversible steps.
 */
import { hasPermission } from "./policy.js";

/** Structural shape both Home and Today ActionSteps satisfy. */
export interface StepLike {
  description: string;
  targetSystem: string;
  permissionRequired: string | null;
  undoAvailable: boolean;
}

export interface StepResult {
  status: "completed" | "partial" | "failed";
  message: string;
  undoAvailable: boolean;
  warning?: string;
}

export function simulateStep(step: StepLike, staleSystems: string[] = ["Health"]): Promise<StepResult> {
  const staleSources = new Set(staleSystems);
  return new Promise((resolve) => {
    setTimeout(() => {
      // permission failure — e.g. external message without messages.send_external
      if (!hasPermission(step.permissionRequired)) {
        resolve({
          status: "failed",
          message: `Buddy doesn't have permission to ${step.description.toLowerCase()}. Grant "${step.permissionRequired}" in Settings to enable this — Buddy won't do it without your explicit go-ahead.`,
          undoAvailable: false,
        });
        return;
      }
      // stale-data warning — Health-derived steps
      if (step.targetSystem === "Health" || staleSources.has(step.targetSystem)) {
        resolve({
          status: "partial",
          message: `Done, but based on data from over 9 hours ago.`,
          undoAvailable: step.undoAvailable,
          warning: "Health data is stale — re-sync your watch for an accurate read.",
        });
        return;
      }
      // partial completion — the Teams post half of the deck step
      if (step.targetSystem === "Teams") {
        resolve({
          status: "partial",
          message: `Draft posted, but 2 of 5 mentioned people are outside this channel and weren't notified.`,
          undoAvailable: step.undoAvailable,
          warning: "Some recipients weren't reachable in this channel.",
        });
        return;
      }
      // clean success
      resolve({
        status: "completed",
        message: `${step.description} — done.`,
        undoAvailable: step.undoAvailable,
      });
    }, 480);
  });
}

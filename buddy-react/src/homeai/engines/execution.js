import { hasPermission } from "./policy";
function simulateStep(step, staleSystems = ["Health"]) {
  const staleSources = new Set(staleSystems);
  return new Promise((resolve) => {
    setTimeout(() => {
      if (!hasPermission(step.permissionRequired)) {
        resolve({
          status: "failed",
          message: `Buddy doesn't have permission to ${step.description.toLowerCase()}. Grant "${step.permissionRequired}" in Settings to enable this — Buddy won't do it without your explicit go-ahead.`,
          undoAvailable: false
        });
        return;
      }
      if (step.targetSystem === "Health" || staleSources.has(step.targetSystem)) {
        resolve({
          status: "partial",
          message: `Done, but based on data from over 9 hours ago.`,
          undoAvailable: step.undoAvailable,
          warning: "Health data is stale — re-sync your watch for an accurate read."
        });
        return;
      }
      if (step.targetSystem === "Teams") {
        resolve({
          status: "partial",
          message: `Draft posted, but 2 of 5 mentioned people are outside this channel and weren't notified.`,
          undoAvailable: step.undoAvailable,
          warning: "Some recipients weren't reachable in this channel."
        });
        return;
      }
      resolve({
        status: "completed",
        message: `${step.description} — done.`,
        undoAvailable: step.undoAvailable
      });
    }, 480);
  });
}
export {
  simulateStep
};

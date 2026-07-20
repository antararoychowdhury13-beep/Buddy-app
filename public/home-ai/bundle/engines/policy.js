/** Permissions the user has explicitly granted in this prototype. */
export const GRANTED_PERMISSIONS = new Set([
    "calendar.block_focus", // create private focus blocks
    "notifications.mute", // temporary muting
    "reminders.create", // private reminders
    "calendar.move_internal", // move internal meetings (specific automation grant)
]);
/** Permissions deliberately NOT granted — exercising these must fail or ask. */
export const KNOWN_PERMISSIONS = {
    "calendar.block_focus": "Create focus blocks on your calendar",
    "notifications.mute": "Mute notifications temporarily",
    "reminders.create": "Create private reminders",
    "calendar.move_internal": "Move internal meetings",
    "messages.send_external": "Send messages to people outside your org",
    "payments.execute": "Make payments from your account",
    "email.send": "Send email on your behalf",
};
export function hasPermission(permission) {
    return permission === null || GRANTED_PERMISSIONS.has(permission);
}
/** Does this step need an explicit user confirmation before executing? */
export function needsConfirmation(step) {
    if (step.riskLevel === "high")
        return true;
    if (step.riskLevel === "medium")
        return !hasPermission(step.permissionRequired);
    return false; // low risk: runs if permission exists; permission check still applies at execute time
}
export function riskLabel(risk) {
    return { low: "Low risk", medium: "Medium risk", high: "High risk" }[risk];
}

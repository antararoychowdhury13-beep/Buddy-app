/**
 * Permission & risk policy. High-risk actions ALWAYS require explicit
 * confirmation; medium-risk require confirmation unless a specific automation
 * permission exists; low-risk reversible actions may auto-run if permitted.
 * General consent never spans domains, and outcome learning can never grant
 * permissions — only this explicit table does.
 */
import type { ActionStep, RiskLevel } from "../models.js";

/** Permissions the user has explicitly granted in this prototype. */
export const GRANTED_PERMISSIONS = new Set<string>([
  "calendar.block_focus",     // create private focus blocks
  "notifications.mute",       // temporary muting
  "reminders.create",         // private reminders
  "calendar.move_internal",   // move internal meetings (specific automation grant)
]);

/** Permissions deliberately NOT granted — exercising these must fail or ask. */
export const KNOWN_PERMISSIONS: Record<string, string> = {
  "calendar.block_focus": "Create focus blocks on your calendar",
  "notifications.mute": "Mute notifications temporarily",
  "reminders.create": "Create private reminders",
  "calendar.move_internal": "Move internal meetings",
  "messages.send_external": "Send messages to people outside your org",
  "payments.execute": "Make payments from your account",
  "email.send": "Send email on your behalf",
};

export function hasPermission(permission: string | null): boolean {
  return permission === null || GRANTED_PERMISSIONS.has(permission);
}

/** Does this step need an explicit user confirmation before executing? */
export function needsConfirmation(step: ActionStep): boolean {
  if (step.riskLevel === "high") return true;
  if (step.riskLevel === "medium") return !hasPermission(step.permissionRequired);
  return false; // low risk: runs if permission exists; permission check still applies at execute time
}

export function riskLabel(risk: RiskLevel): string {
  return { low: "Low risk", medium: "Medium risk", high: "High risk" }[risk];
}

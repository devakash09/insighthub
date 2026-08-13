/** Shared by the server page (validation) and the client filter (options). */
export const AUDIT_ACTION_PREFIXES = [
  { value: "auth", label: "Auth" },
  { value: "org", label: "Workspace" },
  { value: "member", label: "Members" },
  { value: "report", label: "Reports" },
  { value: "alert", label: "Alerts" },
  { value: "event_definition", label: "Events" },
] as const;

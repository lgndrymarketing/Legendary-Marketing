/**
 * Client CRM pipeline model — the 12-stage launch pipeline, the four
 * departments work is routed to, and the default onboarding checklist that is
 * auto-generated for every new client. Shared by the API (task generation,
 * stage auto-progression) and the Client CRM UI (board columns, labels).
 */

export const CRM_STAGES = [
  "onboarding_form",
  "onboarding_guide",
  "crm_access",
  "funnel_build_out",
  "automations_build_out",
  "a2p_submitted",
  "a2p_verified",
  "ad_creatives",
  "launch_form_submitted",
  "launch_call_completed",
  "ads_campaign_build_out",
  "ads_launched",
] as const;

export type CrmStage = (typeof CRM_STAGES)[number];

export const STAGE_LABELS: Record<CrmStage, string> = {
  onboarding_form: "Onboarding form",
  onboarding_guide: "Onboarding guide",
  crm_access: "CRM Access",
  funnel_build_out: "Funnel build out",
  automations_build_out: "Automations build out",
  a2p_submitted: "A2P submitted",
  a2p_verified: "A2P verified",
  ad_creatives: "Ad creatives",
  launch_form_submitted: "Launch form submitted",
  launch_call_completed: "Launch call completed",
  ads_campaign_build_out: "Ads campaign build out",
  ads_launched: "Ads launched",
};

export type Department = "csm" | "funnel" | "automations" | "ads";

export const DEPARTMENT_LABELS: Record<Department, string> = {
  csm: "CSM",
  funnel: "Funnel",
  automations: "Automations",
  ads: "Ads",
};

export type TaskPriority = "low" | "medium" | "high";

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

/** SaaS subscription tiers tracked per client. "Custom" reveals a free-text
 * input — the column itself is free-form. */
export const SAAS_PLANS = [
  "$69/mo",
  "$97/mo",
  "$297/mo",
  "ConnectPro",
  "Custom",
];

/**
 * The default onboarding checklist — 15 steps routed to the four departments.
 * `assignee` is the team member's first name; the API resolves it to a live
 * staff user id at creation time. Launch-pipeline tasks default to high
 * priority; the onboarding guide is the one medium-priority step.
 */
export const DEFAULT_TASKS: {
  title: string;
  department: Department;
  stage: CrmStage;
  assignee: string;
  priority: TaskPriority;
}[] = [
  { title: "Onboarding form", department: "csm", stage: "onboarding_form", assignee: "Roxanne", priority: "high" },
  { title: "Onboarding guide", department: "csm", stage: "onboarding_guide", assignee: "Roxanne", priority: "medium" },
  { title: "CRM Access", department: "csm", stage: "crm_access", assignee: "Roxanne", priority: "high" },
  { title: "Funnel build out", department: "funnel", stage: "funnel_build_out", assignee: "Matthias", priority: "high" },
  { title: "Domain connected", department: "funnel", stage: "funnel_build_out", assignee: "Matthias", priority: "high" },
  { title: "Automations build out", department: "automations", stage: "automations_build_out", assignee: "Jude", priority: "high" },
  { title: "Forms & Surveys", department: "automations", stage: "automations_build_out", assignee: "Jude", priority: "high" },
  { title: "A2P submitted", department: "automations", stage: "a2p_submitted", assignee: "Kyle", priority: "high" },
  { title: "A2P website & form", department: "automations", stage: "a2p_submitted", assignee: "Kyle", priority: "high" },
  { title: "A2P verified", department: "automations", stage: "a2p_verified", assignee: "Kyle", priority: "high" },
  { title: "Ad creatives", department: "ads", stage: "ad_creatives", assignee: "Virginia", priority: "high" },
  { title: "Launch form submitted", department: "csm", stage: "launch_form_submitted", assignee: "Roxanne", priority: "high" },
  { title: "Launch call completed", department: "csm", stage: "launch_call_completed", assignee: "Roxanne", priority: "high" },
  { title: "Ads campaign build out", department: "ads", stage: "ads_campaign_build_out", assignee: "Uri", priority: "high" },
  { title: "Ads launched", department: "ads", stage: "ads_launched", assignee: "Uri", priority: "high" },
];

export const INDUSTRIES = [
  "Credit Repair",
  "Car Rentals",
  "Coaches",
  "Webinar",
  "Custom",
];

/**
 * Given the client's tasks (in pipeline order) return the stage the client
 * should now sit at: the stage of the first not-yet-completed task, or the
 * final stage once everything is done.
 */
export function stageFromTasks(
  tasks: { stage: string | null; status: string; order: number }[]
): CrmStage {
  const ordered = [...tasks]
    .filter((t) => t.stage && CRM_STAGES.includes(t.stage as CrmStage))
    .sort((a, b) => a.order - b.order);
  const nextIncomplete = ordered.find((t) => t.status !== "completed");
  if (nextIncomplete) return nextIncomplete.stage as CrmStage;
  return CRM_STAGES[CRM_STAGES.length - 1];
}

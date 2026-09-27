/**
 * Audit Action Labels and Formatting Utilities.
 * Conforms to:
 * - docs/11-frontend-design-contract.md §14.4 (Action Badge Colors)
 * - docs/11-frontend-design-contract.md §21 (Derived UI Data)
 * - docs/12-frontend-redesign-build-plan.md FE-022
 */

import type { AuditEventResponse } from "@osm/shared";
import { getActorDisplayName } from "../services/actor-fixtures.ts";
import { getScriptReference } from "./scriptReferences.ts";

export interface AuditActionMeta {
  label: string;
  badgeVariant: "success" | "warning" | "danger" | "info" | "neutral" | "primary";
  icon: string;
}

export const AUDIT_ACTION_MAP: Record<string, AuditActionMeta> = {
  SUBMIT_EVALUATION: {
    label: "Evaluation Submitted",
    badgeVariant: "success",
    icon: "✓",
  },
  ASSIGN_MARK: {
    label: "Mark Recorded",
    badgeVariant: "primary",
    icon: "✎",
  },
  UPDATE_MARK: {
    label: "Mark Updated",
    badgeVariant: "primary",
    icon: "✎",
  },
  CREATE_EVALUATION: {
    label: "Evaluation Created",
    badgeVariant: "info",
    icon: "📄",
  },
  INGEST_EVALUATION: {
    label: "Evaluation Ingested",
    badgeVariant: "info",
    icon: "📥",
  },
  CREATE_TRIAGE_CASE: {
    label: "Triage Case Created",
    badgeVariant: "warning",
    icon: "⚡",
  },
  ASSIGN_TRIAGE_CASE: {
    label: "Case Assigned",
    badgeVariant: "primary",
    icon: "👤",
  },
  RESOLVE_TRIAGE_CASE: {
    label: "Resolution Recorded",
    badgeVariant: "success",
    icon: "⚖",
  },
  GENERATE_AI_ADVISORY: {
    label: "AI Advisory Generated",
    badgeVariant: "info",
    icon: "🤖",
  },
  TRIGGER_SENTINEL: {
    label: "Sentinel Scan Run",
    badgeVariant: "warning",
    icon: "🔍",
  },
  SEED_DEMO_COHORT: {
    label: "Demo Cohort Seeded",
    badgeVariant: "neutral",
    icon: "🌱",
  },
  RESET_DEMO_COHORT: {
    label: "Demo Cohort Reset",
    badgeVariant: "neutral",
    icon: "🔄",
  },
};

export function getAuditActionMeta(action: string): AuditActionMeta {
  if (AUDIT_ACTION_MAP[action]) {
    return AUDIT_ACTION_MAP[action];
  }
  // Fallbacks based on action prefixes
  if (action.includes("RESOLVE")) {
    return { label: "Resolution Action", badgeVariant: "success", icon: "⚖" };
  }
  if (action.includes("SUBMIT")) {
    return { label: "Submission Action", badgeVariant: "success", icon: "✓" };
  }
  if (action.includes("ASSIGN") || action.includes("UPDATE")) {
    return { label: "Update Action", badgeVariant: "primary", icon: "✎" };
  }
  if (action.includes("CREATE") || action.includes("SEED")) {
    return { label: "Creation Action", badgeVariant: "info", icon: "📄" };
  }
  if (action.includes("RESET") || action.includes("DELETE")) {
    return { label: "Reset Action", badgeVariant: "neutral", icon: "🔄" };
  }
  return { label: action.replace(/_/g, " "), badgeVariant: "neutral", icon: "📋" };
}

/**
 * Formats a clear, human-readable institutional sentence summarizing the audit event.
 */
export function formatAuditEventSummary(event: AuditEventResponse): string {
  const actorName = getActorDisplayName(event.actorId || event.actor?.id || "System");
  const details = (event.details || {}) as Record<string, unknown>;

  switch (event.action) {
    case "SUBMIT_EVALUATION": {
      const scriptInfo = getScriptReference(event.entityId);
      const score = details.totalScore !== undefined ? `${details.totalScore} marks` : "marks";
      return `${actorName} formally finalized and submitted examination evaluation for ${scriptInfo.displayRef} (Total: ${score}).`;
    }

    case "ASSIGN_MARK":
    case "UPDATE_MARK": {
      const qId = details.questionId ? String(details.questionId).toUpperCase() : "question";
      const awarded = details.awardedMarks !== undefined ? details.awardedMarks : "—";
      const max = details.maxMarks !== undefined ? ` / ${details.maxMarks}` : "";
      const scriptInfo = getScriptReference(event.entityId);
      return `${actorName} recorded mark of ${awarded}${max} on ${qId} for script ${scriptInfo.displayRef}.`;
    }

    case "RESOLVE_TRIAGE_CASE": {
      const outcome = details.outcome ? String(details.outcome).replace(/_/g, " ") : "formal decision";
      const reason = details.reason ? ` ("${details.reason}")` : "";
      return `${actorName} recorded authoritative moderation determination: ${outcome}${reason}.`;
    }

    case "ASSIGN_TRIAGE_CASE": {
      const assigneeName = details.assigneeId
        ? getActorDisplayName(String(details.assigneeId))
        : "reviewer";
      return `${actorName} assigned moderation case ${event.entityId} to ${assigneeName} for supervisory triage.`;
    }

    case "CREATE_TRIAGE_CASE": {
      const priority = details.priority ? ` (${details.priority} priority)` : "";
      return `Automated quality monitor generated moderation case ${event.entityId}${priority} following detected anomaly.`;
    }

    case "GENERATE_AI_ADVISORY": {
      return `${actorName} requested non-authoritative AI advisory synthesis for evaluation analysis.`;
    }

    case "TRIGGER_SENTINEL": {
      const anomalies = details.anomaliesDetected !== undefined ? details.anomaliesDetected : 0;
      const signals = details.newSignalsGenerated !== undefined ? details.newSignalsGenerated : 0;
      return `${actorName} executed SentinelFlag cohort scan: ${anomalies} deviation(s) detected, ${signals} signal(s) generated.`;
    }

    case "SEED_DEMO_COHORT": {
      const evalCount = details.evaluationsCreated || 12;
      return `${actorName} seeded canonical demonstration scenario (${evalCount} examination evaluations, active rubric CS-101).`;
    }

    case "RESET_DEMO_COHORT": {
      return `${actorName} safely cleared and reset demonstration cohort records.`;
    }

    default:
      return `${actorName} executed ${event.action.toLowerCase().replace(/_/g, " ")} on ${event.entityType} (${event.entityId}).`;
  }
}

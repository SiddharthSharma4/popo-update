import { UserRole } from "@osm/shared";

/**
 * Canonical frontend route paths conforming to:
 * - docs/11-frontend-design-contract.md §5
 * - docs/12-frontend-redesign-build-plan.md FE-008
 */
export const ROUTES = {
  ROOT: "/",
  // Examiner routes
  EXAMINER_QUEUE: "/examiner/queue",
  EXAMINER_EVALUATE: "/examiner/evaluate/:evaluationId",
  // Moderator routes
  MODERATOR_TRIAGE: "/moderator/triage",
  MODERATOR_TRIAGE_CASE: "/moderator/triage/:caseId",
  MODERATOR_SIGNALS: "/moderator/signals",
  MODERATOR_ANALYTICS: "/moderator/analytics",
  MODERATOR_AUDIT: "/moderator/audit",
  // Admin routes
  ADMIN_OVERVIEW: "/admin/overview",
  ADMIN_ANALYTICS: "/admin/analytics",
  ADMIN_AUDIT: "/admin/audit",
  ADMIN_TRIAGE: "/admin/triage",
  ADMIN_DEMO: "/admin/demo",
} as const;

/**
 * Returns default landing route for each role per Design Contract §5.4
 */
export function getRoleDefaultRoute(role: UserRole): string {
  switch (role) {
    case UserRole.EXAMINER:
      return ROUTES.EXAMINER_QUEUE;
    case UserRole.MODERATOR:
      return ROUTES.MODERATOR_TRIAGE;
    case UserRole.ADMIN:
      return ROUTES.ADMIN_OVERVIEW;
    default:
      return ROUTES.EXAMINER_QUEUE;
  }
}

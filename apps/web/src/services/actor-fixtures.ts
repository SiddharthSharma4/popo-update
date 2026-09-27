/**
 * Canonical Actor Display Names Fixture Mapping.
 * Conforms to:
 * - docs/11-frontend-design-contract.md §14 (Actor Display Names)
 * - docs/11-frontend-design-contract.md Appendix A (Canonical Demo Data Mapping)
 * - docs/12-frontend-redesign-build-plan.md FE-009 (Step 5)
 */

// DEMO FIXTURE — Not from backend
export const ACTOR_DISPLAY_NAMES: Record<string, string> = {
  evaluator_1: "Dr. Sarah Jenkins",
  evaluator_2: "Dr. Michael Chen",
  evaluator_3: "Dr. Priya Nair",
  evaluator_4: "Dr. James O'Brien",
  evaluator_lenient: "Dr. Adrian Foster",
  moderator_1: "Prof. Marcus Vance",
  admin_1: "Examination Controller",
  SYSTEM: "System Automated Action",
};

/**
 * Returns human-readable display name for given actorId,
 * falling back to raw actorId if not mapped.
 */
export function getActorDisplayName(actorId: string): string {
  return ACTOR_DISPLAY_NAMES[actorId] || actorId;
}

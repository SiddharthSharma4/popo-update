/**
 * OSM Integration Port.
 * Conforms to:
 * - docs/contracts/02-architecture-contract.md §50 (External OSM Integration)
 * - docs/contracts/06-api-contract.md §54-56 (External OSM Integration Boundary)
 * - docs/contracts/08-data-contract.md §108-111 (Synthetic OSM Boundary & Data Import)
 *
 * Invariants:
 * - Port interface decouples internal domain/application logic from external vendor schemas.
 * - Consequential operations require authorized human or system actor attribution.
 * - AI actors are strictly prohibited.
 */

import type {
  ExternalOsmEvaluation,
  ExternalOsmBatchImport,
  ExternalOsmIngestResult,
  ExternalOsmBatchResult,
} from "@osm/shared";

export interface IntegrationActorContext {
  actorId: string;
  role: string;
  actorType?: string;
}

export interface OsmIntegrationPort {
  ingestEvaluation(
    payload: ExternalOsmEvaluation,
    actor: IntegrationActorContext
  ): Promise<ExternalOsmIngestResult>;

  ingestBatch(
    payload: ExternalOsmBatchImport,
    actor: IntegrationActorContext
  ): Promise<ExternalOsmBatchResult>;
}

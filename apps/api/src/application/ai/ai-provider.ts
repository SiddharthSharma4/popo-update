/**
 * AI Provider Abstraction Interface.
 * Conforms to docs/contracts/02-architecture-contract.md §27 and docs/contracts/09-testing-contract.md §96.
 */

import type { ApprovedAiContext } from "@osm/shared";

export interface RawAiOutput {
  recommendation: string;
  confidence: number;
  evidenceReferences: string[];
  rawText?: string;
}

export interface AiProvider {
  readonly providerName: string;
  readonly modelName: string;
  readonly version: string;

  /**
   * Generates advisory analysis from an approved, sanitized AI context.
   */
  generateAdvisory(context: ApprovedAiContext): Promise<RawAiOutput>;
}

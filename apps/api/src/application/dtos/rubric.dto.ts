/**
 * Rubric Application DTOs.
 * Conforms to docs/contracts/06-api-contract.md §18, §20.
 */

import type { Rubric } from "../../domain/rubric/rubric.js";

export interface RubricLevelDto {
  title: string;
  marks: number;
  description: string;
}

export interface RubricCriterionDto {
  id: string;
  title: string;
  maxMarks: number;
  description: string;
  levels: RubricLevelDto[];
}

export interface RubricDto {
  id: string;
  version: number;
  title: string;
  criteria: RubricCriterionDto[];
  totalMaxMarks: number;
  createdAt: string;
}

export function toRubricDto(rubric: Rubric): RubricDto {
  return {
    id: rubric.id,
    version: rubric.version,
    title: rubric.title,
    criteria: rubric.criteria.map((c) => ({
      id: c.id,
      title: c.title,
      maxMarks: c.maxMarks,
      description: c.description,
      levels: c.levels.map((l) => ({
        title: l.title,
        marks: l.marks,
        description: l.description,
      })),
    })),
    totalMaxMarks: rubric.totalMaxMarks,
    createdAt: rubric.createdAt,
  };
}

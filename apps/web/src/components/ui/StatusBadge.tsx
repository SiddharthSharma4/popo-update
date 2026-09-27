import React from 'react';
import {
  EvaluationStatus,
  SignalSeverity,
  QualitySignalStatus,
  TriageCaseStatus,
  ResolutionOutcome,
  UserRole,
} from '@osm/shared';
import { Badge, BadgeVariant, BadgeSize } from './Badge';

export type SupportedStatus =
  | EvaluationStatus
  | SignalSeverity
  | QualitySignalStatus
  | TriageCaseStatus
  | ResolutionOutcome
  | UserRole
  | string;

export interface StatusBadgeProps {
  /** Domain enum or status string */
  status: SupportedStatus;
  /** Badge size */
  size?: BadgeSize;
  /** Show leading status dot */
  showDot?: boolean;
  /** Optional label override */
  label?: string;
  /** Extra CSS classes */
  className?: string;
  /** Accessible label */
  'aria-label'?: string;
}

interface StatusMeta {
  variant: BadgeVariant;
  label: string;
}

function resolveStatusMeta(status: SupportedStatus): StatusMeta {
  switch (status) {
    // EvaluationStatus
    case EvaluationStatus.DRAFT:
      return { variant: 'muted', label: 'Draft' };
    case EvaluationStatus.IN_PROGRESS:
      return { variant: 'info', label: 'In Progress' };
    case EvaluationStatus.SUBMITTED:
      return { variant: 'success', label: 'Submitted' };
    case EvaluationStatus.FINALIZED:
      return { variant: 'success', label: 'Finalized' };

    // TriageCaseStatus
    case TriageCaseStatus.OPEN:
      return { variant: 'warning', label: 'Open' };
    case TriageCaseStatus.ASSIGNED:
      return { variant: 'info', label: 'Assigned' };
    case TriageCaseStatus.UNDER_REVIEW:
      return { variant: 'info', label: 'Under Review' };
    case TriageCaseStatus.RESOLVED:
      return { variant: 'success', label: 'Resolved' };
    case TriageCaseStatus.ESCALATED:
      return { variant: 'danger', label: 'Escalated' };

    // SignalSeverity
    case SignalSeverity.CRITICAL:
      return { variant: 'danger', label: 'Critical' };
    case SignalSeverity.HIGH:
      return { variant: 'warning', label: 'High' };
    case SignalSeverity.MEDIUM:
      return { variant: 'muted', label: 'Medium' };
    case SignalSeverity.LOW:
      return { variant: 'muted', label: 'Low' };
    case SignalSeverity.INFO:
      return { variant: 'info', label: 'Info' };

    // QualitySignalStatus
    case QualitySignalStatus.GENERATED:
      return { variant: 'warning', label: 'Generated' };
    case QualitySignalStatus.REVIEWABLE:
      return { variant: 'warning', label: 'Reviewable' };
    case QualitySignalStatus.LINKED_TO_CASE:
      return { variant: 'info', label: 'Linked to Case' };
    case QualitySignalStatus.UNDER_INVESTIGATION:
      return { variant: 'info', label: 'Under Investigation' };
    case QualitySignalStatus.RESOLVED:
      return { variant: 'success', label: 'Resolved' };
    case QualitySignalStatus.DISMISSED:
      return { variant: 'muted', label: 'Dismissed' };

    // ResolutionOutcome
    case ResolutionOutcome.CONFIRMED_VALID:
      return { variant: 'success', label: 'Confirmed Valid' };
    case ResolutionOutcome.LEGITIMATE_VARIATION:
      return { variant: 'info', label: 'Legitimate Variation' };
    case ResolutionOutcome.CORRECTION_REQUIRED:
      return { variant: 'warning', label: 'Correction Required' };
    case ResolutionOutcome.ESCALATED:
      return { variant: 'danger', label: 'Escalated' };
    case ResolutionOutcome.DISMISSED:
      return { variant: 'muted', label: 'Dismissed' };

    // UserRole
    case UserRole.EXAMINER:
      return { variant: 'info', label: 'Examiner' };
    case UserRole.MODERATOR:
      return { variant: 'warning', label: 'Moderator' };
    case UserRole.ADMIN:
      return { variant: 'info', label: 'Admin' };

    // Fallbacks
    default: {
      const normalized = String(status || '').toUpperCase();
      if (normalized.includes('RESOLVED') || normalized.includes('SUCCESS') || normalized.includes('SUBMIT')) {
        return { variant: 'success', label: String(status) };
      }
      if (
        normalized.includes('FAIL') ||
        normalized.includes('ERROR') ||
        normalized.includes('DANGER') ||
        normalized.includes('CRITICAL')
      ) {
        return { variant: 'danger', label: String(status) };
      }
      if (normalized.includes('WARN') || normalized.includes('OPEN') || normalized.includes('ALERT')) {
        return { variant: 'warning', label: String(status) };
      }
      if (normalized.includes('PROGRESS') || normalized.includes('ASSIGN') || normalized.includes('REVIEW')) {
        return { variant: 'info', label: String(status) };
      }
      return { variant: 'muted', label: String(status) };
    }
  }
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showDot = true,
  label,
  className = '',
  'aria-label': ariaLabel,
}) => {
  const meta = resolveStatusMeta(status);
  const displayLabel = label || meta.label;
  const accessibleLabel = ariaLabel || `Status: ${displayLabel}`;

  return (
    <Badge
      variant={meta.variant}
      size={size}
      dot={showDot}
      className={className}
      aria-label={accessibleLabel}
      role="status"
    >
      {displayLabel}
    </Badge>
  );
};

StatusBadge.displayName = 'StatusBadge';

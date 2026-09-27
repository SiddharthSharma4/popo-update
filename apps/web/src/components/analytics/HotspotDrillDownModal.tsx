import React from "react";
import type { QualityHotspot } from "@osm/shared";
import { Modal, Button, StatusBadge } from "../ui";
import { getActorDisplayName } from "../../services/actor-fixtures.ts";

export interface HotspotDrillDownModalProps {
  hotspot: QualityHotspot | null;
  isOpen: boolean;
  onClose: () => void;
}

export const HotspotDrillDownModal: React.FC<HotspotDrillDownModalProps> = ({
  hotspot,
  isOpen,
  onClose,
}) => {
  if (!hotspot) return null;

  const targetDisplay =
    hotspot.hotspotType === "EVALUATOR_ANOMALY"
      ? getActorDisplayName(hotspot.targetId)
      : hotspot.targetId;

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Emerging Quality Hotspot Inspection"
      size="lg"
    >
      <div className="osm-hotspot-modal-content">
        {/* Hotspot Header Details */}
        <div className="osm-hotspot-banner">
          <div className="osm-hotspot-tags">
            <StatusBadge status={hotspot.severity} size="md" showDot={false} />
            <span className="osm-hotspot-type-chip">{hotspot.hotspotType}</span>
          </div>
          <h3 className="osm-hotspot-title">{hotspot.title}</h3>
          <p className="osm-hotspot-target-line">
            Subject Focus: <strong>{targetDisplay}</strong> (<code>{hotspot.targetId}</code>)
          </p>
        </div>

        {/* Narrative Description */}
        <div className="osm-hotspot-desc-box">
          <span className="osm-hotspot-section-label">Analysis Narrative:</span>
          <p className="osm-hotspot-desc-text">{hotspot.description}</p>
        </div>

        {/* Structured Quantitative Evidence Grid */}
        <div className="osm-hotspot-evidence-box">
          <span className="osm-hotspot-section-label">Quantitative Evidence Metrics:</span>
          <div className="osm-hotspot-evidence-grid">
            {Object.entries(hotspot.evidence || {}).map(([key, val]) => {
              if (typeof val === "object" && val !== null) return null;
              const formattedKey = key
                .replace(/([A-Z])/g, " $1")
                .replace(/^./, (str) => str.toUpperCase());
              return (
                <div key={key} className="osm-hotspot-metric-tile">
                  <span className="osm-hotspot-tile-label">{formattedKey}</span>
                  <strong className="osm-hotspot-tile-val osm-mono">
                    {typeof val === "number" ? val.toLocaleString() : String(val)}
                  </strong>
                </div>
              );
            })}
          </div>
        </div>

        {/* Expandable Technical Details */}
        <details className="osm-hotspot-technical-details">
          <summary className="osm-hotspot-summary-toggle">
            Inspect Technical Provenance Payload
          </summary>
          <pre className="osm-hotspot-raw-code">
            {JSON.stringify(hotspot.evidence, null, 2)}
          </pre>
        </details>

        {/* Governance Callout */}
        <div className="osm-hotspot-governance-notice">
          <span>ℹ️</span>
          <p>
            <strong>Supervisory Context:</strong> Quality hotspots aggregate statistical clusters across examinations. They highlight items for moderator verification and do not independently modify student marks or finalize evaluation outcomes.
          </p>
        </div>

        {/* Modal Actions */}
        <div className="osm-modal-actions-right" style={{ marginTop: "1.5rem" }}>
          <Button variant="secondary" onClick={onClose}>
            Close Inspection
          </Button>
        </div>
      </div>
    </Modal>
  );
};

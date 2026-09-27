import React from "react";
import type { QualityHotspot } from "@osm/shared";

interface HotspotDrillDownModalProps {
  hotspot: QualityHotspot | null;
  isOpen: boolean;
  onClose: () => void;
}

export const HotspotDrillDownModal: React.FC<HotspotDrillDownModalProps> = ({
  hotspot,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !hotspot) return null;

  const severityColor =
    hotspot.severity === "CRITICAL"
      ? "badge-critical"
      : hotspot.severity === "HIGH"
      ? "badge-high"
      : hotspot.severity === "MEDIUM"
      ? "badge-medium"
      : "badge-low";

  return (
    <div className="modal-backdrop" id="osm-hotspot-modal-backdrop" onClick={onClose}>
      <div
        className="modal-container hotspot-drilldown-modal"
        id="osm-hotspot-drilldown-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="hotspot-modal-title-row">
            <span className={`status-badge ${severityColor}`} id="modal-hotspot-severity">
              {hotspot.severity}
            </span>
            <span className="hotspot-type-tag" id="modal-hotspot-type">
              {hotspot.hotspotType}
            </span>
            <h2 className="modal-title" id="modal-hotspot-title">
              {hotspot.title}
            </h2>
          </div>
          <button
            className="btn-modal-close"
            id="btn-close-hotspot-modal"
            onClick={onClose}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        <div className="modal-body hotspot-modal-body">
          <div className="hotspot-target-banner">
            <span className="target-label">Target ID:</span>
            <code className="target-code" id="modal-hotspot-target-id">
              {hotspot.targetId}
            </code>
          </div>

          <div className="hotspot-description-section">
            <h4 className="section-subtitle">Analysis Description</h4>
            <p className="hotspot-description-text" id="modal-hotspot-description">
              {hotspot.description}
            </p>
          </div>

          <div className="hotspot-evidence-section">
            <h4 className="section-subtitle">Supporting Quantitative Evidence</h4>
            <div className="evidence-grid" id="modal-hotspot-evidence-grid">
              {Object.entries(hotspot.evidence).map(([key, val]) => (
                <div key={key} className="evidence-item">
                  <span className="evidence-key">{key}</span>
                  <span className="evidence-val">
                    {typeof val === "object" && val !== null
                      ? JSON.stringify(val)
                      : String(val)}
                  </span>
                </div>
              ))}
            </div>

            <div className="evidence-raw-container">
              <span className="evidence-raw-label">Raw Provenance Payload:</span>
              <pre className="evidence-raw-code" id="modal-hotspot-raw-json">
                {JSON.stringify(hotspot.evidence, null, 2)}
              </pre>
            </div>
          </div>

          <div className="hotspot-advisory-callout">
            <strong>Governance Principle (INV-004 / 01-product §15):</strong> Emerging hotspots
            highlight statistical concentrations for human review. They do not alter authoritative
            student marks or finalized evaluation states.
          </div>
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="btn-primary"
            id="btn-dismiss-hotspot-modal"
            onClick={onClose}
          >
            Close Drill-Down
          </button>
        </div>
      </div>
    </div>
  );
};

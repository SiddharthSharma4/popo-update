import React from "react";
import { Link } from "react-router-dom";
import { UserRole, ActorType } from "@osm/shared";
import type { HealthResponse } from "@osm/shared";
import type { AuthContext } from "../../services/api-client.ts";
import { getActorDisplayName } from "../../services/actor-fixtures.ts";

export interface HeaderProps {
  auth: AuthContext;
  onAuthChange: (newAuth: AuthContext) => void;
  health: HealthResponse | null;
  loading: boolean;
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  auth,
  onAuthChange,
  health,
  loading,
  onToggleMobileMenu,
}) => {
  const isDbOnline = health?.database === "connected";
  const isApiOnline = !loading && health?.status === "ok";

  const handleRolePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    switch (value) {
      case "evaluator_1":
        onAuthChange({
          role: UserRole.EXAMINER,
          actorId: "evaluator_1",
          actorType: ActorType.USER,
        });
        break;
      case "evaluator_lenient":
        onAuthChange({
          role: UserRole.EXAMINER,
          actorId: "evaluator_lenient",
          actorType: ActorType.USER,
        });
        break;
      case "moderator_1":
        onAuthChange({
          role: UserRole.MODERATOR,
          actorId: "moderator_1",
          actorType: ActorType.USER,
        });
        break;
      case "admin_1":
        onAuthChange({
          role: UserRole.ADMIN,
          actorId: "admin_1",
          actorType: ActorType.USER,
        });
        break;
      default:
        break;
    }
  };

  const getRoleChipClass = () => {
    switch (auth.role) {
      case UserRole.EXAMINER:
        return "osm-header__role-chip--examiner";
      case UserRole.MODERATOR:
        return "osm-header__role-chip--moderator";
      case UserRole.ADMIN:
        return "osm-header__role-chip--admin";
      default:
        return "";
    }
  };

  const getRoleLabel = () => {
    switch (auth.role) {
      case UserRole.EXAMINER:
        return "Examiner";
      case UserRole.MODERATOR:
        return "Moderator";
      case UserRole.ADMIN:
        return "Admin";
      default:
        return auth.role;
    }
  };

  // Determine current select value
  const currentSelectValue = ["evaluator_1", "evaluator_lenient", "moderator_1", "admin_1"].includes(auth.actorId)
    ? auth.actorId
    : "";

  return (
    <header className="osm-header" id="osm-app-header">
      <div className="osm-header__left">
        {onToggleMobileMenu && (
          <button
            type="button"
            className="osm-header__mobile-toggle"
            onClick={onToggleMobileMenu}
            aria-label="Toggle navigation menu"
            id="btn-toggle-mobile-menu"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}

        <Link to="/" className="osm-header__brand" id="osm-brand-link">
          <div className="osm-header__logo" id="osm-logo">
            OSM
          </div>
          <div className="osm-header__titles">
            <span className="osm-header__title">On-Screen Marking</span>
            <span className="osm-header__subtitle">Digital Examination Evaluation</span>
          </div>
        </Link>
      </div>

      <div className="osm-header__right">
        {/* Role Context Indicator Chip (Design Contract §4.4) */}
        <div
          className={`osm-header__role-chip ${getRoleChipClass()}`}
          id="osm-role-chip"
          title={`Active Actor: ${auth.actorId}`}
        >
          <strong>[{getRoleLabel()}]</strong> {getActorDisplayName(auth.actorId)}
        </div>

        {/* Demo Role Switcher (Replaces legacy "DEMO ACTOR SIMULATOR") */}
        <div className="osm-demo-switcher" id="osm-role-switcher" title="Demo Role Switcher">
          <label htmlFor="select-demo-role" className="osm-demo-switcher__label">
            Demo Role Switcher:
          </label>
          <select
            id="select-demo-role"
            className="osm-demo-switcher__select"
            value={currentSelectValue}
            onChange={handleRolePresetChange}
            aria-label="Demo Role Switcher"
          >
            <option value="evaluator_1">Examiner: Dr. Sarah Jenkins (evaluator_1)</option>
            <option value="evaluator_lenient">Examiner: Dr. Adrian Foster (evaluator_lenient)</option>
            <option value="moderator_1">Moderator: Prof. Marcus Vance (moderator_1)</option>
            <option value="admin_1">Admin: Examination Controller (admin_1)</option>
            {!currentSelectValue && <option value="">Custom: {auth.actorId}</option>}
          </select>
        </div>

        {/* System Status Dots (Design Contract §4.5) */}
        <div className="osm-header__system-status" id="osm-header-status">
          <div
            className="osm-status-indicator"
            id="osm-db-status"
            title={`Database: ${isDbOnline ? "Connected (WAL Mode)" : "Disconnected"}`}
          >
            <span
              className={`osm-status-dot ${isDbOnline ? "osm-status-dot--online" : "osm-status-dot--offline"}`}
              id="osm-db-status-dot"
            />
            <span className="osm-status-label">DB</span>
          </div>

          <div
            className="osm-status-indicator"
            id="osm-api-status"
            title={`API: ${isApiOnline ? "Online (Fastify /api/v1)" : loading ? "Connecting..." : "Offline"}`}
          >
            <span
              className={`osm-status-dot ${isApiOnline ? "osm-status-dot--online" : "osm-status-dot--offline"}`}
              id="osm-api-status-dot"
            />
            <span className="osm-status-label">API</span>
          </div>
        </div>
      </div>
    </header>
  );
};

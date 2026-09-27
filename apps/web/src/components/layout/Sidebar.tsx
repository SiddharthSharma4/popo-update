import React from "react";
import { NavLink } from "react-router-dom";
import { UserRole } from "@osm/shared";
import type { AuthContext } from "../../services/api-client.ts";
import { ROUTES } from "../../routes";

export interface SidebarProps {
  auth: AuthContext;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

interface NavItemDef {
  label: string;
  to: string;
  icon: React.ReactNode;
  id: string;
}

// Crisp, institutional SVG icons
const Icons = {
  Queue: (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
    </svg>
  ),
  Workspace: (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
      <path
        fillRule="evenodd"
        d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
        clipRule="evenodd"
      />
    </svg>
  ),
  Triage: (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
        clipRule="evenodd"
      />
    </svg>
  ),
  Signals: (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"
        clipRule="evenodd"
      />
    </svg>
  ),
  Analytics: (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
    </svg>
  ),
  Audit: (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z"
        clipRule="evenodd"
      />
    </svg>
  ),
  Overview: (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
    </svg>
  ),
  Demo: (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
        clipRule="evenodd"
      />
    </svg>
  ),
};

export const Sidebar: React.FC<SidebarProps> = ({ auth, mobileOpen = false, onCloseMobile }) => {
  // Construct role-specific navigation items per Design Contract §5
  const getNavItems = (): NavItemDef[] => {
    switch (auth.role) {
      case UserRole.EXAMINER:
        return [
          {
            label: "My Script Queue",
            to: ROUTES.EXAMINER_QUEUE,
            icon: Icons.Queue,
            id: "nav-examiner-queue",
          },
          {
            label: "Evaluation Workspace",
            to: "/examiner/evaluate/eval-demo-incomplete",
            icon: Icons.Workspace,
            id: "nav-examiner-workspace",
          },
        ];

      case UserRole.MODERATOR:
        return [
          {
            label: "Triage Queue",
            to: ROUTES.MODERATOR_TRIAGE,
            icon: Icons.Triage,
            id: "nav-moderator-triage",
          },
          {
            label: "Quality Signals",
            to: ROUTES.MODERATOR_SIGNALS,
            icon: Icons.Signals,
            id: "nav-moderator-signals",
          },
          {
            label: "QualityPulse Analytics",
            to: ROUTES.MODERATOR_ANALYTICS,
            icon: Icons.Analytics,
            id: "nav-moderator-analytics",
          },
          {
            label: "TrustLens Audit",
            to: ROUTES.MODERATOR_AUDIT,
            icon: Icons.Audit,
            id: "nav-moderator-audit",
          },
        ];

      case UserRole.ADMIN:
        return [
          {
            label: "System Overview",
            to: ROUTES.ADMIN_OVERVIEW,
            icon: Icons.Overview,
            id: "nav-admin-overview",
          },
          {
            label: "QualityPulse Analytics",
            to: ROUTES.ADMIN_ANALYTICS,
            icon: Icons.Analytics,
            id: "nav-admin-analytics",
          },
          {
            label: "TrustLens Audit",
            to: ROUTES.ADMIN_AUDIT,
            icon: Icons.Audit,
            id: "nav-admin-audit",
          },
          {
            label: "Triage Queue",
            to: ROUTES.ADMIN_TRIAGE,
            icon: Icons.Triage,
            id: "nav-admin-triage",
          },
          {
            label: "Demo Controls",
            to: ROUTES.ADMIN_DEMO,
            icon: Icons.Demo,
            id: "nav-admin-demo",
          },
        ];

      default:
        return [];
    }
  };

  const navItems = getNavItems();

  const sidebarClassNames = [
    "osm-sidebar",
    mobileOpen ? "osm-sidebar--mobile-open" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <aside className={sidebarClassNames} id="osm-app-sidebar" aria-label="Main Navigation">
      <nav className="osm-sidebar__nav" id="osm-sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.id}
            to={item.to}
            id={item.id}
            onClick={onCloseMobile}
            className={({ isActive }) =>
              `osm-sidebar__item ${isActive ? "osm-sidebar__item--active" : ""}`
            }
          >
            <span className="osm-sidebar__item-icon">{item.icon}</span>
            <span className="osm-sidebar__item-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Examination Cycle Context Footer (Design Contract §4.3) */}
      <div className="osm-sidebar__footer" id="osm-sidebar-footer">
        <div className="osm-sidebar__cycle" title="Active Examination Evaluation Cycle">
          <span className="osm-sidebar__cycle-icon" aria-hidden="true">
            🏛️
          </span>
          <span className="osm-sidebar__cycle-text">Spring 2026 Cycle</span>
        </div>
      </div>
    </aside>
  );
};

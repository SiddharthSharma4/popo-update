import React, { useState } from "react";
import type { HealthResponse } from "@osm/shared";
import type { AuthContext } from "../../services/api-client.ts";
import { ToastProvider } from "../ui";
import { Header } from "./Header.tsx";
import { Sidebar } from "./Sidebar.tsx";

export interface AppShellProps {
  auth: AuthContext;
  onAuthChange: (newAuth: AuthContext) => void;
  health: HealthResponse | null;
  loading: boolean;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  auth,
  onAuthChange,
  health,
  loading,
  children,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  const toggleMobileMenu = () => {
    setMobileMenuOpen((prev) => !prev);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <ToastProvider>
      <div className="osm-app-shell" id="osm-app-root">
        {/* Institutional 64px Header */}
        <Header
          auth={auth}
          onAuthChange={onAuthChange}
          health={health}
          loading={loading}
          onToggleMobileMenu={toggleMobileMenu}
        />

        {/* Mobile menu backdrop overlay */}
        {mobileMenuOpen && (
          <div
            className="osm-mobile-backdrop"
            onClick={closeMobileMenu}
            aria-hidden="true"
          />
        )}

        <div className="osm-shell-body">
          {/* 240px Fixed / Responsive Sidebar */}
          <Sidebar
            auth={auth}
            mobileOpen={mobileMenuOpen}
            onCloseMobile={closeMobileMenu}
          />

          {/* Main Content Area */}
          <main id="osm-main-content" className="osm-main-content" tabIndex={-1}>
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
};

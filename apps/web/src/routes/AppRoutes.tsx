import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { UserRole } from "@osm/shared";
import type { HealthResponse } from "@osm/shared";
import type { AuthContext } from "../services/api-client.ts";
import { ROUTES, getRoleDefaultRoute } from "./types.ts";
import { RoleGuard } from "./RoleGuard.tsx";

// Pages & Components
import { ExaminerQueue } from "../components/examiner/index.ts";
import { AdminOverviewPage } from "../components/pages/AdminOverviewPage.tsx";
import { AdminDemoPage } from "../components/pages/AdminDemoPage.tsx";
import { EvaluationWorkspace } from "../components/evaluation/EvaluationWorkspace.tsx";
import { EscalationHub } from "../components/escalation/EscalationHub.tsx";
import { QualityPulseDashboard } from "../components/analytics/QualityPulseDashboard.tsx";
import { TrustLensView } from "../components/audit/TrustLensView.tsx";

export interface AppRoutesProps {
  auth: AuthContext;
  health: HealthResponse | null;
  healthError: string | null;
  onAuthChange?: (newAuth: AuthContext) => void;
}

export const AppRoutes: React.FC<AppRoutesProps> = ({ auth, health, healthError, onAuthChange }) => {
  return (
    <Routes>
      {/* Root redirect to current role landing page */}
      <Route
        path={ROUTES.ROOT}
        element={<Navigate to={getRoleDefaultRoute(auth.role)} replace />}
      />

      {/* ====================================================================
          EXAMINER QUEUE (Guarded strictly to EXAMINER role)
          ==================================================================== */}
      <Route element={<RoleGuard auth={auth} allowedRoles={[UserRole.EXAMINER]} />}>
        <Route path={ROUTES.EXAMINER_QUEUE} element={<ExaminerQueue auth={auth} />} />
      </Route>

      {/* ====================================================================
          EVALUATION WORKSPACE (Examiners can mark; Moderators/Admins inspect read-only)
          ==================================================================== */}
      <Route
        element={
          <RoleGuard
            auth={auth}
            allowedRoles={[UserRole.EXAMINER, UserRole.MODERATOR, UserRole.ADMIN]}
          />
        }
      >
        <Route
          path={ROUTES.EXAMINER_EVALUATE}
          element={<EvaluationWorkspace auth={auth} />}
        />
      </Route>

      {/* ====================================================================
          MODERATOR ROUTES (Guarded to MODERATOR and ADMIN roles)
          ==================================================================== */}
      <Route
        element={
          <RoleGuard
            auth={auth}
            allowedRoles={[UserRole.MODERATOR, UserRole.ADMIN]}
          />
        }
      >
        <Route path={ROUTES.MODERATOR_TRIAGE} element={<EscalationHub auth={auth} />} />
        <Route
          path={ROUTES.MODERATOR_TRIAGE_CASE}
          element={<EscalationHub auth={auth} />}
        />
        <Route
          path={ROUTES.MODERATOR_SIGNALS}
          element={<QualityPulseDashboard auth={auth} />}
        />
        <Route
          path={ROUTES.MODERATOR_ANALYTICS}
          element={<QualityPulseDashboard auth={auth} />}
        />
        <Route path={ROUTES.MODERATOR_AUDIT} element={<TrustLensView auth={auth} />} />
      </Route>

      {/* ====================================================================
          ADMIN ROUTES (Guarded to ADMIN role)
          ==================================================================== */}
      <Route element={<RoleGuard auth={auth} allowedRoles={[UserRole.ADMIN]} />}>
        <Route
          path={ROUTES.ADMIN_OVERVIEW}
          element={<AdminOverviewPage health={health} healthError={healthError} auth={auth} />}
        />
        <Route
          path={ROUTES.ADMIN_ANALYTICS}
          element={<QualityPulseDashboard auth={auth} />}
        />
        <Route path={ROUTES.ADMIN_AUDIT} element={<TrustLensView auth={auth} />} />
        <Route path={ROUTES.ADMIN_TRIAGE} element={<EscalationHub auth={auth} />} />
        <Route
          path={ROUTES.ADMIN_DEMO}
          element={<AdminDemoPage auth={auth} onAuthChange={onAuthChange} />}
        />
      </Route>

      {/* Catch-all route: redirect unknown paths to role default */}
      <Route
        path="*"
        element={<Navigate to={getRoleDefaultRoute(auth.role)} replace />}
      />
    </Routes>
  );
};

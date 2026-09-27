import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import type { UserRole } from "@osm/shared";
import type { AuthContext } from "../services/api-client.ts";
import { getRoleDefaultRoute } from "./types.ts";

export interface RoleGuardProps {
  auth: AuthContext;
  allowedRoles: UserRole[];
}

/**
 * Route guard enforcing frontend role boundaries per Design Contract §5.4.
 *
 * NOTE: Frontend routing guards protect navigation state and user experience.
 * Authoritative security and role-based access control are enforced server-side
 * on every Fastify API route.
 */
export const RoleGuard: React.FC<RoleGuardProps> = ({ auth, allowedRoles }) => {
  const isAllowed = allowedRoles.includes(auth.role);

  if (!isAllowed) {
    // Redirect to default landing route for current active role
    return <Navigate to={getRoleDefaultRoute(auth.role)} replace />;
  }

  return <Outlet />;
};

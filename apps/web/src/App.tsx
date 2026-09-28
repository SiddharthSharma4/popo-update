import React, { useEffect, useState } from "react";
import type { HealthResponse } from "@osm/shared";
import { UserRole, ActorType } from "@osm/shared";
import { apiClient, type AuthContext } from "./services/api-client.ts";
import { AppShell } from "./components/layout";
import { AppRoutes } from "./routes";

export const App: React.FC = () => {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Demo actor context (DEVELOPMENT / DEMO actor simulator only; server strictly enforces authorization)
  const [auth, setAuth] = useState<AuthContext>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const roleParam = params.get("role");
      const actorParam = params.get("actor");
      if (roleParam === "ADMIN") {
        return { role: UserRole.ADMIN, actorId: actorParam || "admin_1", actorType: ActorType.USER };
      }
      if (roleParam === "EXAMINER") {
        return { role: UserRole.EXAMINER, actorId: actorParam || "evaluator_1", actorType: ActorType.USER };
      }
      if (roleParam === "MODERATOR") {
        return { role: UserRole.MODERATOR, actorId: actorParam || "moderator_1", actorType: ActorType.USER };
      }

      const savedRole = localStorage.getItem("osm_demo_role");
      const savedActor = localStorage.getItem("osm_demo_actor");

      if (savedRole && Object.values(UserRole).includes(savedRole as UserRole)) {
        const role = savedRole as UserRole;
        const defaultActor =
          role === UserRole.ADMIN
            ? "admin_1"
            : role === UserRole.EXAMINER
            ? "evaluator_1"
            : "moderator_1";
        return {
          role,
          actorId: savedActor || defaultActor,
          actorType: ActorType.USER,
        };
      }
    } catch {
      // ignore
    }
    return {
      role: UserRole.MODERATOR,
      actorId: "moderator_1",
      actorType: ActorType.USER,
    };
  });

  const handleAuthChange = (newAuth: AuthContext) => {
    try {
      localStorage.setItem("osm_demo_role", newAuth.role);
      localStorage.setItem("osm_demo_actor", newAuth.actorId);
    } catch {
      // ignore
    }
    setAuth(newAuth);
  };

  useEffect(() => {
    let isMounted = true;
    const checkHealth = async () => {
      try {
        const data = await apiClient.getHealth();
        if (isMounted) {
          setHealth(data);
          setHealthError(null);
        }
      } catch (err) {
        if (isMounted) {
          setHealthError(err instanceof Error ? err.message : "API offline");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <AppShell
      auth={auth}
      onAuthChange={handleAuthChange}
      health={health}
      loading={loading}
    >
      <AppRoutes
        auth={auth}
        onAuthChange={handleAuthChange}
        health={health}
        healthError={healthError}
      />
    </AppShell>
  );
};

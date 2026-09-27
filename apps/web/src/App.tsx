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
  const [auth, setAuth] = useState<AuthContext>({
    role: UserRole.MODERATOR,
    actorId: "moderator_1",
    actorType: ActorType.USER,
  });

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
      onAuthChange={setAuth}
      health={health}
      loading={loading}
    >
      <AppRoutes auth={auth} health={health} healthError={healthError} />
    </AppShell>
  );
};

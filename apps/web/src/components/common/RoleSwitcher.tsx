import React from "react";
import { UserRole } from "@osm/shared";
import type { AuthContext } from "../../services/api-client.ts";

interface RoleSwitcherProps {
  auth: AuthContext;
  onAuthChange: (newAuth: AuthContext) => void;
}

export const RoleSwitcher: React.FC<RoleSwitcherProps> = ({ auth, onAuthChange }) => {
  const handleRoleChange = (role: UserRole) => {
    onAuthChange({
      ...auth,
      role,
    });
  };

  const handleActorIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onAuthChange({
      ...auth,
      actorId: e.target.value.trim() || "moderator_1",
    });
  };

  return (
    <div className="role-switcher-container" id="osm-role-switcher" title="Development/Demo Actor Simulator">
      <div className="role-switcher-badge">
        <span className="simulator-tag">DEMO ACTOR SIMULATOR</span>
      </div>

      <div className="role-switcher-controls">
        <label className="role-label" htmlFor="select-user-role">
          Role:
        </label>
        <select
          id="select-user-role"
          className="role-select"
          value={auth.role}
          onChange={(e) => handleRoleChange(e.target.value as UserRole)}
        >
          <option value={UserRole.MODERATOR}>MODERATOR (Authorized)</option>
          <option value={UserRole.ADMIN}>ADMIN (Authorized)</option>
          <option value={UserRole.EXAMINER}>EXAMINER (Read-Only / 403)</option>
        </select>

        <label className="role-label" htmlFor="input-actor-id">
          Actor:
        </label>
        <input
          id="input-actor-id"
          type="text"
          className="actor-input"
          value={auth.actorId}
          onChange={handleActorIdChange}
          placeholder="actor_id"
        />
      </div>
    </div>
  );
};

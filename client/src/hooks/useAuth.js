/**
 * ⚠️ CONTEXT API SHIM — MARKED FOR REMOVAL
 * 🔄 FUTURE: Replace all `useAuth()` calls with direct Redux hooks:
 *   - `useMeQuery()` for user/profile
 *   - `useGetMyOrganizationsQuery()` for organization
 *   - `useSelector(state => state.auth.isAuthenticated)` for auth flags
 *
 * This file bridges legacy Context-based code with the new Redux store.
 * It reads from Redux (RTK Query cache) and returns a Context-like shape
 * so existing components don't break during migration.
 */

import { useMeQuery } from "@/Redux/Slices/api/authApi";
import { useGetMyOrganizationsQuery } from "@/Redux/Slices/api/orgApi";
import { useSelector } from "react-redux";

export function useAuth() {
  // Pull current user from RTK Query cache
  const { data: user, isLoading: userLoading } = useMeQuery();

  // Pull organizations
  const { data: orgs, isLoading: orgsLoading } = useGetMyOrganizationsQuery(
    undefined,
    { skip: !user?.isOnboarded }
  );

  // Auth flags from Redux slice
  const { isAuthenticated, isInitialized } = useSelector(
    (state) => state.auth
  );

  // Derive the active org from localStorage + orgs list
  const activeOrgId = typeof window !== "undefined"
    ? localStorage.getItem("activeOrgId")
    : null;

  const organization = orgs?.find(
    (o) => String(o.organizationId) === activeOrgId
  ) || orgs?.[0] || null;

  // Normalize org shape — backend returns organizationId, but legacy code expects id
  const normalizedOrg = organization
    ? {
        ...organization,
        id: organization.organizationId ?? organization.id,
      }
    : null;

  return {
    // ⚠️ CONTEXT API SHAPE — maintained for backward compat
    user: user ?? null,
    session: isAuthenticated ? { active: true } : null,
    profile: user ?? null,
    organization: normalizedOrg,
    loading: userLoading || orgsLoading || !isInitialized,

    // Stubs — callers should migrate to RTK mutation hooks
    signIn: async () => ({ error: new Error("Use useLoginMutation() from Redux") }),
    signUp: async () => ({ error: new Error("Use useSignupMutation() from Redux") }),
    signOut: async () => {},
    createOrganization: async () => ({ error: new Error("Use orgApi from Redux") }),
    refreshProfile: async () => {},
  };
}

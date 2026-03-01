/**
 * ⚠️ CONTEXT API — MARKED FOR REMOVAL
 * 🔄 FUTURE: This entire context should be replaced with Redux selectors.
 *
 * Currently kept as a shim so legacy components that still call `useAuth()`
 * don't break. New code should use Redux hooks directly:
 *   - useMeQuery()              → for user data
 *   - useGetMyOrganizationsQuery() → for org data
 *   - useSelector(state => state.auth) → for auth flags
 */

import { createContext, useContext } from "react";

export const AuthContext = createContext(null);

/**
 * ⚠️ CONTEXT API HOOK — MARKED FOR REMOVAL
 * 🔄 FUTURE: Replace every `useAuth()` call with the appropriate Redux selector.
 */
export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    // Gracefully return empty defaults so the app never crashes
    return {
      user: null,
      session: null,
      profile: null,
      organization: null,
      loading: false,
      signIn: async () => ({ error: new Error("Auth not connected") }),
      signUp: async () => ({ error: new Error("Auth not connected") }),
      signOut: async () => {},
      createOrganization: async () => ({ error: new Error("Not connected") }),
      refreshProfile: async () => {},
    };
  }
  return ctx;
}

import { useState, useEffect } from "react";
import { AuthContext } from "@/contexts/AuthContext";

/*
  TEMP AUTH PROVIDER (Backend disabled)

  Purpose:
  Keep UI functional while backend is removed.
  All auth actions return "not implemented" for now.

  Later:
  Replace with Redux + your API.
*/

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(false); // important: never block UI

  /*
  ================= SUPABASE REMOVED =================

  Old behavior:
    - listen to auth state
    - restore session
    - fetch profile

  Now:
    App starts immediately with logged-out state
  */

  useEffect(() => {
    // Previously: supabase session restore
    setLoading(false);
  }, []);

  // LOGIN (disabled)
  const signIn = async () => {
    return { error: new Error("Auth system not connected yet") };
  };

  // SIGNUP (disabled)
  const signUp = async () => {
    return { error: new Error("Auth system not connected yet") };
  };

  // LOGOUT (local only)
  const signOut = async () => {
    setUser(null);
    setSession(null);
    setProfile(null);
    setOrganization(null);
  };

  // CREATE ORG (disabled)
  const createOrganization = async () => {
    return { error: new Error("Organization system not connected yet") };
  };

  const refreshProfile = async () => {
    // no backend yet
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        organization,
        loading,
        signIn,
        signUp,
        signOut,
        createOrganization,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

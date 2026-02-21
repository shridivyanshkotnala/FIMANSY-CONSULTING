import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useMeQuery } from "@/Redux/Slices/api/authApi";
import { useGetMyOrganizationsQuery } from "@/Redux/Slices/api/orgApi";
import { Loader2 } from "lucide-react";

export function AuthGuard({ children }) {
  const location = useLocation();

  // backend is the source of truth
  const { data: user, isLoading } = useMeQuery();

  // fetch orgs only when user is authenticated and onboarded
  const { data: orgs } = useGetMyOrganizationsQuery(undefined, {
    skip: !user?.isOnboarded,
  });

  // auto-sync activeOrgId — validates stored org belongs to current user;
  // if stale/wrong (e.g. after logout/user-switch), replace with first valid org
  useEffect(() => {
    if (!orgs?.length) return;
    const stored = localStorage.getItem("activeOrgId");
    const isValid = orgs.some(o => String(o.organizationId) === stored);
    if (!isValid) {
      localStorage.setItem("activeOrgId", String(orgs[0].organizationId));
    }
  }, [orgs]);

  // while resolving session (FIRST load only)
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isAuthPage = location.pathname.startsWith("/auth");
  const isOnboardingPage = location.pathname.startsWith("/onboarding");

  // not logged in → allow auth page only
  if (!user) {
    return isAuthPage
      ? children
      : <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // logged in but not onboarded
  if (!user.isOnboarded) {
    return isOnboardingPage
      ? children
      : <Navigate to="/onboarding" replace />;
  }

  // logged in + onboarded but visiting auth/onboarding
  if (user.isOnboarded && (isAuthPage || isOnboardingPage)) {
    return <Navigate to="/dashboard" replace />;
  }

  // access granted
  return children;
}

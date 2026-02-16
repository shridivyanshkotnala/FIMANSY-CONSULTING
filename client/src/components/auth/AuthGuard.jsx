import { Navigate, useLocation } from "react-router-dom";
import { useMeQuery } from "@/Redux/Slices/api/authApi";
import { Loader2 } from "lucide-react";

export function AuthGuard({ children }) {
  const location = useLocation();

  // backend is the source of truth
  const { data: user, isLoading } = useMeQuery();

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

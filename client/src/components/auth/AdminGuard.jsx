import { Navigate, useLocation } from "react-router-dom";
import { useMeQuery } from "@/Redux/Slices/api/authApi";
import { Loader2 } from "lucide-react";

/**
 * AdminGuard
 * ---
 * Client-side mirror of the backend `isAdmin` middleware.
 * - Not authenticated → redirect to /accountant-login
 * - Authenticated but role !== "admin" → redirect to /auth (403-like)
 * - Authenticated + admin → render children
 */
export function AdminGuard({ children }) {
  const location = useLocation();
  const { data: user, isLoading } = useMeQuery();

  // wait for /me to resolve before making any decision
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // not logged in → send to accountant login
  if (!user) {
    return (
      <Navigate
        to="/accountant-login"
        state={{ from: location }}
        replace
      />
    );
  }

  // logged in but not admin → deny access
  if (user.role !== "admin") {
    return (
      <Navigate to="/auth" replace />
    );
  }

  // admin access granted
  return children;
}

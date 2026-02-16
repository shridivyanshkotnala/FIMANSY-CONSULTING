import { NavLink as RouterNavLink } from "react-router-dom";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

/**
 * NavLink Compatibility Wrapper
 * --------------------------------------------------
 * Provides:
 * - activeClassName support (like React Router v5)
 * - pendingClassName support
 *
 * WHY THIS EXISTS:
 * React Router v6 removed activeClassName prop.
 * This wrapper restores that API so UI components
 * don't need rewriting later.
 *
 * Safe to keep permanently — purely UI abstraction.
 */

const NavLink = forwardRef(
  ({ className, activeClassName, pendingClassName, to, ...props }, ref) => {
    return (
      <RouterNavLink
        ref={ref}
        to={to}
        className={({ isActive, isPending }) =>
          cn(
            className,
            isActive && activeClassName,
            isPending && pendingClassName
          )
        }
        {...props}
      />
    );
  }
);

NavLink.displayName = "NavLink";

export { NavLink };

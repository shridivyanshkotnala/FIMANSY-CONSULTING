// NotFound.jsx
// Converted TSX → JSX
// Purpose: Fallback route when user navigates to a non-existent page

import { useLocation } from "react-router-dom";
import { useEffect } from "react";

/*
OPTIONAL FUTURE IMPROVEMENT (Redux/Analytics)
--------------------------------------------
Instead of console.error, this should dispatch an analytics/logging action:
dispatch(trackBrokenRoute(pathname))
Useful for detecting missing routes users actually try to visit.
*/

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    // Currently local logging only
    // FUTURE: send to monitoring service / Redux analytics middleware
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Oops! Page not found</p>
        <a href="/" className="text-primary underline hover:text-primary/90">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;

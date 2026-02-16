import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthGuard } from "@/components/auth/AuthGuard";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Cockpit from "./pages/Cockpit";
import Reports from "./pages/Reports";
import CashIntelligence from "./pages/CashIntelligence";
import Inventory from "./pages/Inventory";
import Upload from "./pages/Upload";
import Documents from "./pages/Documents";
import Banking from "./pages/Banking";
import Compliance from "./pages/Compliance";
import Payroll from "./pages/Payroll";
import Transparency from "./pages/Transparency";
import NotFound from "./pages/NotFound";
import ZohoSuccess from "@/oauth/ZohoSuccess";
import { useDispatch } from "react-redux";
import { baseApi } from "@/Redux/Slices/api/baseApi";
import { useEffect } from "react";

const App = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get("zoho") === "connected") {
      // invalidate Zoho cache to refetch connection status
      dispatch(baseApi.util.invalidateTags(["Zoho"]));

      // remove query param (clean url)
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [dispatch]);
  return(
  <>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>

            <Route
              path="/"
              element={
                <AuthGuard requireOrganization>
                  <Cockpit />
                </AuthGuard>
              }
            />

            <Route path="/auth" element={<Auth />} />
            <Route path="/onboarding" element={<Onboarding />} />

            <Route
              path="/reports"
              element={
                <AuthGuard requireOrganization>
                  <Reports />
                </AuthGuard>
              }
            />

            <Route
              path="/cash-intelligence"
              element={
                <AuthGuard requireOrganization>
                  <CashIntelligence />
                </AuthGuard>
              }
            />

            <Route
              path="/banking"
              element={
                <AuthGuard requireOrganization>
                  <Banking />
                </AuthGuard>
              }
            />

            <Route
              path="/inventory"
              element={
                <AuthGuard requireOrganization>
                  <Inventory />
                </AuthGuard>
              }
            />

            <Route
              path="/compliance"
              element={
                <AuthGuard requireOrganization>
                  <Compliance />
                </AuthGuard>
              }
            />

            <Route
              path="/payroll"
              element={
                <AuthGuard requireOrganization>
                  <Payroll />
                </AuthGuard>
              }
            />

            <Route
              path="/transparency"
              element={
                <AuthGuard requireOrganization>
                  <Transparency />
                </AuthGuard>
              }
            />

            <Route
              path="/documents"
              element={
                <AuthGuard requireOrganization>
                  <Documents />
                </AuthGuard>
              }
            />

            <Route
              path="/upload"
              element={
                <AuthGuard requireOrganization>
                  <Upload />
                </AuthGuard>
              }
            />

            {/* redirects */}
            <Route path="/dashboard" element={<AuthGuard requireOrganization><Cockpit /></AuthGuard>} />
            <Route path="/command-center" element={<Navigate to="/" replace />} />
            <Route path="/invoices" element={<Navigate to="/documents" replace />} />
            <Route path="/team" element={<Navigate to="/reports" replace />} />
            <Route path="/settings" element={<Navigate to="/reports" replace />} />
            <Route path="/oauth/zoho/success" element={<ZohoSuccess />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
      </>)
};

export default App;

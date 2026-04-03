import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { baseApi } from "@/Redux/Slices/api/baseApi";
import {
  useGetZohoOauthOrganizationsQuery,
  useSelectZohoOrganizationMutation,
} from "@/Redux/Slices/api/zohoApi";
import { Button } from "@/components/ui/button";

export default function ZohoSuccess() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("zoho");
  const sessionId = searchParams.get("session") || "";

  const shouldSelectOrg = mode === "select_org" && Boolean(sessionId);

  const { data, isLoading, isError } = useGetZohoOauthOrganizationsQuery(sessionId, {
    skip: !shouldSelectOrg,
  });

  const organizations = useMemo(() => data?.data?.organizations || [], [data]);
  const [selectedOrgId, setSelectedOrgId] = useState("");

  useEffect(() => {
    if (!shouldSelectOrg) return;
    if (selectedOrgId) return;
    const defaultOrg = organizations.find((o) => o?.is_default_org) || organizations[0];
    if (defaultOrg?.organization_id) {
      setSelectedOrgId(String(defaultOrg.organization_id));
    }
  }, [organizations, selectedOrgId, shouldSelectOrg]);

  const [selectOrganization, { isLoading: isSubmitting }] = useSelectZohoOrganizationMutation();

  useEffect(() => {
    if (shouldSelectOrg) return;

    // tell RTK Query Zoho status changed
    dispatch(baseApi.util.invalidateTags(["Zoho"]));

    // go back to app
    navigate("/", { replace: true });
  }, [dispatch, navigate, shouldSelectOrg]);

  if (!shouldSelectOrg) return null;

  const handleContinue = async () => {
    if (!selectedOrgId || !sessionId) return;

    try {
      await selectOrganization({ sessionId, zohoOrgId: selectedOrgId }).unwrap();
      dispatch(baseApi.util.invalidateTags(["Zoho"]));
      navigate("/", { replace: true });
    } catch {
      // keep user on page for retry
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 space-y-4">
        <h1 className="text-lg font-semibold">Select Zoho Organization</h1>
        <p className="text-sm text-muted-foreground">
          Choose the Zoho Books organization to connect with your current Fimansy organization.
        </p>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading organizations...</p>
        ) : isError ? (
          <p className="text-sm text-destructive">Unable to load organizations. Please reconnect Zoho.</p>
        ) : organizations.length === 0 ? (
          <p className="text-sm text-destructive">No Zoho organizations found for this account.</p>
        ) : (
          <div className="space-y-3">
            <select
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={selectedOrgId}
              onChange={(e) => setSelectedOrgId(e.target.value)}
            >
              {organizations.map((org) => (
                <option key={org.organization_id} value={org.organization_id}>
                  {org.name || org.organization_id}
                </option>
              ))}
            </select>

            <Button
              className="w-full"
              onClick={handleContinue}
              disabled={!selectedOrgId || isSubmitting}
            >
              {isSubmitting ? "Connecting..." : "Continue"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

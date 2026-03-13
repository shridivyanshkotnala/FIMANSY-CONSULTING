import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Shield } from "lucide-react";
import { format } from "date-fns";
import { EmptyState } from "./EmptyState";

export function OrgCompanyInfoTab({ orgTickets = [], companyProfile, orgName }) {
  // companyProfile: data from GET /accountant/organizations/:orgId/company (CompanyComplianceProfile)
  // orgName: org display name from the parent (Organization.name)
  // orgTickets: still passed for potential future use (currently only directors uses mock)
  const t = orgTickets[0];

  if (!t && !companyProfile) {
    return <EmptyState message="No company information available" />;
  }

  // Resolve company fields: prefer CompanyComplianceProfile API data, fall back to ticket-level data
  const displayOrgName    = orgName || t?.organization_name || "—";
  const companyName       = companyProfile?.company_name    || t?.company_name    || displayOrgName;
  const cin               = companyProfile?.cin             || t?.cin             || null;
  const gstin             = companyProfile?.gstin           || t?.gstin           || null;
  const pan               = companyProfile?.pan             || t?.pan             || null;
  const tan               = companyProfile?.tan             || t?.tan             || null;
  const companyType       = companyProfile?.company_type    || t?.company_type    || null;
  const dateOfIncorp      = companyProfile?.date_of_incorporation || t?.date_of_incorporation || null;
  // Note: backend service returns registered_office_address (profile schema field name)
  const registeredAddress = companyProfile?.registered_office_address || t?.registered_address || null;

  const mockDirectors = [
    {
      name: "Rahul Sharma",
      designation: "Managing Director",
      din: "01234567",
      email: "rahul@stratzi.com",
      phone: "+91 98765 43210",
      dsc_expiry: "15 Dec 2026",
      is_active: true,
    },
    {
      name: "Priya Mehta",
      designation: "Director",
      din: "07654321",
      email: "priya@stratzi.com",
      phone: "+91 98765 12345",
      dsc_expiry: "22 Mar 2027",
      is_active: true,
    },
    {
      name: "Amit Patel",
      designation: "Independent Director",
      din: "04567890",
      email: "amit.p@gmail.com",
      phone: null,
      dsc_expiry: null,
      is_active: false,
    },
  ];

  return (
    <div className="space-y-4">

      {/* Company Profile */}
      <Card>
        <CardContent className="p-5 space-y-4">

          <div className="flex items-center gap-2 mb-1">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm">
              Company Profile
            </h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">

            <div>
              <p className="text-muted-foreground text-xs">
                Organization
              </p>
              <p className="font-medium">
                {displayOrgName}
              </p>
            </div>

            <div>
              <p className="text-muted-foreground text-xs">
                Company Name
              </p>
              <p className="font-medium">
                {companyName}
              </p>
            </div>

            <div>
              <p className="text-muted-foreground text-xs">
                CIN
              </p>
              <p className="font-medium font-mono text-xs">
                {cin || "N/A"}
              </p>
            </div>

            <div>
              <p className="text-muted-foreground text-xs">
                GSTIN
              </p>
              <p className="font-medium font-mono text-xs">
                {gstin || "N/A"}
              </p>
            </div>

            <div>
              <p className="text-muted-foreground text-xs">
                PAN
              </p>
              <p className="font-medium font-mono text-xs">
                {pan || "N/A"}
              </p>
            </div>

            <div>
              <p className="text-muted-foreground text-xs">
                TAN
              </p>
              <p className="font-medium font-mono text-xs">
                {tan || "N/A"}
              </p>
            </div>

            <div>
              <p className="text-muted-foreground text-xs">
                Company Type
              </p>
              <p className="font-medium capitalize">
                {companyType?.replace(/_/g, " ") ||
                  "Private Limited"}
              </p>
            </div>

            <div>
              <p className="text-muted-foreground text-xs">
                Date of Incorporation
              </p>
              <p className="font-medium">
                {dateOfIncorp
                  ? format(
                      new Date(dateOfIncorp),
                      "dd MMM yyyy"
                    )
                  : "—"}
              </p>
            </div>

            <div className="col-span-2 md:col-span-1">
              <p className="text-muted-foreground text-xs">
                Registered Address
              </p>
              <p className="font-medium text-xs">
                {registeredAddress || "—"}
              </p>
            </div>

          </div>
        </CardContent>
      </Card>

      {/* Directors */}
      <Card>
        <CardContent className="p-5 space-y-3">

          <div className="flex items-center gap-2 mb-1">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm">
              Directors ({mockDirectors.length})
            </h3>
          </div>

          <div className="space-y-3">
            {mockDirectors.map((dir, i) => (
              <div
                key={i}
                className="flex items-start justify-between p-3 border rounded-lg bg-muted/30"
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    {dir.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {dir.designation} · DIN: {dir.din}
                  </p>

                  {dir.dsc_expiry && (
                    <p className="text-[10px] text-muted-foreground">
                      DSC Expiry: {dir.dsc_expiry}
                    </p>
                  )}
                </div>

                <div className="text-right space-y-1">
                  {dir.email && (
                    <p className="text-[10px] text-muted-foreground">
                      {dir.email}
                    </p>
                  )}

                  {dir.phone && (
                    <p className="text-[10px] text-muted-foreground">
                      {dir.phone}
                    </p>
                  )}

                  <Badge
                    className={
                      dir.is_active
                        ? "bg-success/10 text-success border-success/20 text-[10px]"
                        : "bg-muted text-muted-foreground text-[10px]"
                    }
                  >
                    {dir.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>

        </CardContent>
      </Card>

    </div>
  );
}

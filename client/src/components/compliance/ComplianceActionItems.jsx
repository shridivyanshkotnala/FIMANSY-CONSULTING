import { useEffect, useState } from "react";
import { FileText, Shield, Calculator, AlertTriangle, Building2 } from "lucide-react";

/*
  useComplianceActions

  CURRENT:
    Frontend mock compliance engine
    Generates sample compliance alerts

  FUTURE:
    Replace with Redux selector:
      state.compliance.actions
*/

export function useComplianceActions() {
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // simulate async fetch delay
    setTimeout(() => {
      setActions([
        {
          id: "gst-filing",
          type: "mca_filing",
          severity: "critical",
          icon: <FileText className="h-5 w-5" />,
          message: "GSTR-1 filing overdue by 3 days.",
          actionLabel: "File Now",
          actionPath: "/compliance",
        },
        {
          id: "dsc-expiry",
          type: "dsc_expiry",
          severity: "warning",
          icon: <Shield className="h-5 w-5" />,
          message: "Director DSC expires in 12 days.",
          actionLabel: "Schedule Renewal",
          actionPath: "/compliance",
        },
        {
          id: "advance-tax",
          type: "advance_tax",
          severity: "warning",
          icon: <Calculator className="h-5 w-5" />,
          message: "Advance tax shortfall ₹18,500 for Q3.",
          actionLabel: "Pay Now",
          actionPath: "/compliance",
        },
        {
          id: "roc-event",
          type: "event_filing",
          severity: "info",
          icon: <AlertTriangle className="h-5 w-5" />,
          message: "Director change requires ROC filing.",
          actionLabel: "Start Filing",
          actionPath: "/compliance",
        },
        {
          id: "mca-status",
          type: "mca_status",
          severity: "critical",
          icon: <Building2 className="h-5 w-5" />,
          message: "Company MCA status marked non-active.",
          actionLabel: "Check Status",
          actionPath: "/compliance",
        },
      ]);

      setLoading(false);
    }, 400);
  }, []);

  return { actions, loading };
}

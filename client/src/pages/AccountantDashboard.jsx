// AccountantDashboard.jsx

import { AccountantLayout } from "@/components/accountant/AccountantLayout";
import { AccountantComplianceEngine } from "@/components/accountant/AccountantComplianceEngine";

/*
  AccountantDashboard Component

  Purpose:
  - Acts as the main entry point for accountant panel.
  - Wraps compliance engine inside AccountantLayout.
  - Layout handles sidebar, header, and structure.
  - ComplianceEngine handles actual business logic & UI.

  No TypeScript types were present in original TSX,
  so conversion is structurally identical.
*/

export default function AccountantDashboard() {
  return (
    <AccountantLayout>
      <AccountantComplianceEngine />
    </AccountantLayout>
  );
}
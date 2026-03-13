// AccountantReconciliation.jsx

/*
  AccountantReconciliation Component

  Purpose:
  - Wraps AccountantBankRecon inside AccountantLayout.
  - Layout handles accountant panel structure (sidebar, header, etc.).
  - AccountantBankRecon contains reconciliation engine UI.
*/

import { AccountantLayout } from "@/components/accountant/AccountantLayout";
import { AccountantBankRecon } from "@/components/accountant/AccountantBankRecon";

export default function AccountantReconciliation() {
  return (
    <AccountantLayout>
      <AccountantBankRecon />
    </AccountantLayout>
  );
}
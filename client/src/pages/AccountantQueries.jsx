// AccountantQueries.jsx

/*
  AccountantQueries Component

  Purpose:
  - Wraps AccountantQueryHub inside AccountantLayout.
  - Layout provides sidebar + header structure.
  - QueryHub handles accountant-side query management UI.
*/

import { AccountantLayout } from "@/components/accountant/AccountantLayout";
import { AccountantQueryHub } from "@/components/accountant/AccountantQueryHub";

export default function AccountantQueries() {
  return (
    <AccountantLayout>
      <AccountantQueryHub />
    </AccountantLayout>
  );
}
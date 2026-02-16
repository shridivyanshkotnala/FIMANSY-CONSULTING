// TransactionApprovalTable.jsx
// Bank transaction approval table — placeholder component

import { Card } from "@/components/ui/card";

export function TransactionApprovalTable({ transactions = [], onApprove, onReject }) {
  if (transactions.length === 0) {
    return (
      <Card className="p-8 text-center text-muted-foreground">
        No transactions pending approval.
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {transactions.map((tx) => (
        <Card key={tx.id} className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{tx.description || "Transaction"}</p>
              <p className="text-sm text-muted-foreground">{tx.date}</p>
            </div>
            <p className="font-semibold">₹{tx.amount?.toLocaleString("en-IN")}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}

export default TransactionApprovalTable;

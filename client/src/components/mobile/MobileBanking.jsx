import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

/*
  OLD:
    fetch bank_transactions from Supabase per filter

  NEW:
    Mobile renders BANK FEED snapshot
    Filters are client-side
    Server sync handled by Redux later
*/

import { MobileLayout } from "@/components/mobile/MobileLayout";
import { MobileListItem } from "@/components/mobile/MobileListItem";
import { MobileStickyFilters } from "@/components/mobile/MobileStickyFilters";
import { MobileEmptyState } from "@/components/mobile/MobileEmptyState";
import { MobileSkeletonList } from "@/components/mobile/MobileSkeletonCard";

import { format } from "date-fns";
import {
  ArrowDownRight,
  ArrowUpRight,
  CreditCard
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function MobileBanking() {

  const navigate = useNavigate();

  /*
    🔌 FUTURE REDUX:
      const transactions = useSelector(selectBankFeed)
      dispatch(fetchBankFeed())
  */

  const [allTransactions, setAllTransactions] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => {
    // temporary mock load
    setTimeout(() => {
      setAllTransactions([]);
      setLoading(false);
    }, 400);
  }, []);

  /*
    Client-side filtering (important for mobile speed)
    Server should NEVER be queried per filter tap
  */
  useEffect(() => {

    let filtered = [...allTransactions];

    if (statusFilter !== "all") {
      filtered = filtered.filter(t => t.reconciliation_status === statusFilter);
    }

    if (typeFilter === "credit") {
      filtered = filtered.filter(t => t.credit_amount > 0);
    } else if (typeFilter === "debit") {
      filtered = filtered.filter(t => t.debit_amount > 0);
    }

    setTransactions(filtered);

  }, [allTransactions, statusFilter, typeFilter]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case "matched": return "success";
      case "unmatched": return "warning";
      default: return "neutral";
    }
  };

  return (
    <MobileLayout
      title="Banking"
      actions={
        <Button
          size="sm"
          variant="ghost"
          onClick={() => navigate("/upload?type=bank_statement")}
          className="h-9 px-3"
        >
          Upload
        </Button>
      }
    >

      <MobileStickyFilters
        filters={[
          {
            key: "status",
            label: "Status",
            options: [
              { value: "all", label: "All" },
              { value: "matched", label: "Matched" },
              { value: "unmatched", label: "Unmatched" },
            ],
            value: statusFilter,
            onChange: setStatusFilter,
          },
          {
            key: "type",
            label: "Type",
            options: [
              { value: "all", label: "All" },
              { value: "credit", label: "Credits" },
              { value: "debit", label: "Debits" },
            ],
            value: typeFilter,
            onChange: setTypeFilter,
          },
        ]}
      />

      {loading ? (
        <MobileSkeletonList count={8} />

      ) : transactions.length === 0 ? (

        <MobileEmptyState
          icon={CreditCard}
          title="No transactions"
          description="Upload a bank statement to start tracking transactions."
          action={{
            label: "Upload Statement",
            onClick: () => navigate("/upload?type=bank_statement"),
          }}
        />

      ) : (

        <div className="divide-y divide-border">
          {transactions.map((txn) => {

            const isCredit = txn.credit_amount > 0;
            const amount = isCredit ? txn.credit_amount : txn.debit_amount;

            return (
              <MobileListItem
                key={txn.id}
                icon={
                  isCredit
                    ? <ArrowDownRight className="h-5 w-5 text-green-600"/>
                    : <ArrowUpRight className="h-5 w-5 text-red-600"/>
                }
                title={txn.description}
                subtitle={format(new Date(txn.transaction_date), "MMM d, yyyy")}
                value={
                  <span className={isCredit ? "text-green-600" : "text-red-600"}>
                    {isCredit ? "+" : "-"}{formatCurrency(amount)}
                  </span>
                }
                status={txn.reconciliation_status ? {
                  label: txn.reconciliation_status === "matched" ? "Linked" : "Unlinked",
                  variant: getStatusVariant(txn.reconciliation_status),
                } : undefined}
                onClick={() => {
                  /*
                    🔌 FUTURE:
                      open transaction details sheet
                      dispatch(selectTransaction(txn.id))
                  */
                }}
                showArrow={false}
              />
            );
          })}
        </div>

      )}

    </MobileLayout>
  );
}

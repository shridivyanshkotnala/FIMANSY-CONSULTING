import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  AlertTriangle,
  Link2,
  Lock,
  Search,
  ArrowLeftRight,
  Landmark,
  FileSpreadsheet,
  Flag,
} from "lucide-react";

/* Removed TypeScript interface ReconTransaction */

const MOCK_ORGS = ["Stratzi Pvt Ltd", "Nexora Solutions", "Vanguard Retail"];

/* Removed : ReconTransaction[] typing */
const MOCK_TRANSACTIONS = [
  { id: "rt-1", date: "2026-02-28", description: "NEFT to Vendor ABC", amount: 45000, type: "debit", status: "matched", matchedWith: "INV-2024-087" },
  { id: "rt-2", date: "2026-02-27", description: "UPI Credit from Client XYZ", amount: 125000, type: "credit", status: "matched", matchedWith: "INV-2024-092" },
  { id: "rt-3", date: "2026-02-26", description: "ATM Withdrawal", amount: 20000, type: "debit", status: "unmatched" },
  { id: "rt-4", date: "2026-02-25", description: "RTGS from Unknown", amount: 500000, type: "credit", status: "suspicious" },
  { id: "rt-5", date: "2026-02-24", description: "GST Payment", amount: 78400, type: "debit", status: "matched", matchedWith: "GST-FEB-2026" },
  { id: "rt-6", date: "2026-02-23", description: "Salary Transfer Feb", amount: 340000, type: "debit", status: "unmatched" },
  { id: "rt-7", date: "2026-02-22", description: "Cheque Deposit #4521", amount: 92000, type: "credit", status: "unmatched" },
  { id: "rt-8", date: "2026-02-21", description: "Duplicate Credit Entry", amount: 125000, type: "credit", status: "suspicious" },
];

export function AccountantBankRecon() {
  const [selectedOrg, setSelectedOrg] = useState(MOCK_ORGS[0]);
  const [selectedMonth, setSelectedMonth] = useState("2026-02");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(() => {
    if (statusFilter === "all") return MOCK_TRANSACTIONS;
    return MOCK_TRANSACTIONS.filter((t) => t.status === statusFilter);
  }, [statusFilter]);

  const matched = MOCK_TRANSACTIONS.filter((t) => t.status === "matched").length;
  const unmatched = MOCK_TRANSACTIONS.filter((t) => t.status === "unmatched").length;
  const suspicious = MOCK_TRANSACTIONS.filter((t) => t.status === "suspicious").length;
  const total = MOCK_TRANSACTIONS.length;
  const reconPercent = Math.round((matched / total) * 100);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Bank Reconciliation</h1>
        <p className="text-sm text-muted-foreground">
          Financial accuracy engine for assigned organizations
        </p>
      </div>

      {/* Org + Period Selector */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={selectedOrg} onValueChange={setSelectedOrg}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <Landmark className="h-3.5 w-3.5 mr-1.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MOCK_ORGS.map((org) => (
              <SelectItem key={org} value={org}>
                {org}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="2026-02">Feb 2026</SelectItem>
            <SelectItem value="2026-01">Jan 2026</SelectItem>
            <SelectItem value="2025-12">Dec 2025</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-card to-primary/5">
          <CardContent className="p-3">
            <p className="text-lg font-bold">{total}</p>
            <p className="text-[10px] text-muted-foreground">Total Imported</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-card to-success/10">
          <CardContent className="p-3">
            <p className="text-lg font-bold text-success">{matched}</p>
            <p className="text-[10px] text-muted-foreground">Matched</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-card to-warning/10">
          <CardContent className="p-3">
            <p className="text-lg font-bold text-warning">{unmatched}</p>
            <p className="text-[10px] text-muted-foreground">Unmatched</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-card to-destructive/10">
          <CardContent className="p-3">
            <p className="text-lg font-bold text-destructive">{suspicious}</p>
            <p className="text-[10px] text-muted-foreground">Suspicious</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-card to-info/10">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-lg font-bold">{reconPercent}%</p>
            </div>
            <Progress value={reconPercent} className="h-1.5" />
            <p className="text-[10px] text-muted-foreground mt-1">
              Reconciled
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        {[
          { key: "all", label: "All", count: total },
          { key: "matched", label: "Matched", count: matched },
          { key: "unmatched", label: "Unmatched", count: unmatched },
          { key: "suspicious", label: "Suspicious", count: suspicious },
        ].map((f) => (
          <Button
            key={f.key}
            variant={statusFilter === f.key ? "default" : "outline"}
            size="sm"
            className="text-xs gap-1"
            onClick={() => setStatusFilter(f.key)}
          >
            {f.label} ({f.count})
          </Button>
        ))}
      </div>

      {/* Transaction List */}
      <div className="space-y-2">
        {filtered.map((txn) => (
          <Card key={txn.id} className="hover:border-primary/30 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4">

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium truncate">
                      {txn.description}
                    </p>

                    <Badge
                      className={
                        txn.status === "matched"
                          ? "bg-success/10 text-success border-success/20 text-[10px]"
                          : txn.status === "suspicious"
                          ? "bg-destructive/10 text-destructive border-destructive/20 text-[10px]"
                          : "bg-warning/10 text-warning border-warning/20 text-[10px]"
                      }
                    >
                      {txn.status === "matched" && (
                        <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
                      )}
                      {txn.status === "suspicious" && (
                        <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                      )}
                      {txn.status === "unmatched" && (
                        <Search className="h-2.5 w-2.5 mr-0.5" />
                      )}
                      {txn.status}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{txn.date}</span>
                    {txn.matchedWith && (
                      <span className="flex items-center gap-0.5">
                        <Link2 className="h-2.5 w-2.5" />
                        {txn.matchedWith}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <p
                    className={`text-sm font-semibold ${
                      txn.type === "credit"
                        ? "text-success"
                        : "text-foreground"
                    }`}
                  >
                    {txn.type === "credit" ? "+" : "-"}₹
                    {txn.amount.toLocaleString("en-IN")}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {txn.type}
                  </p>
                </div>

                {txn.status !== "matched" && (
                  <div className="hidden md:flex gap-1.5">
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                      <ArrowLeftRight className="h-3 w-3" />
                      Match
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                      <Flag className="h-3 w-3" />
                      Flag
                    </Button>
                  </div>
                )}

              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Monthly Lock */}
      <Card className="border-primary/20">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Lock className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium">
                Lock {selectedMonth === "2026-02" ? "February" : "Month"} Reconciliation
              </p>
              <p className="text-xs text-muted-foreground">
                {reconPercent}% reconciled · {unmatched} unmatched remaining
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1.5">
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Export Report
            </Button>
            <Button size="sm" className="gap-1.5" disabled={reconPercent < 100}>
              <Lock className="h-3.5 w-3.5" />
              Lock Month
            </Button>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
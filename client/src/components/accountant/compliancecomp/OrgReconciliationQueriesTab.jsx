import { useMemo, useState } from "react";
import {
  useGetOrgReconciliationQueriesQuery,
  useResolveOrgReconciliationQueryMutation,
} from "@/Redux/Slices/api/complianceApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "./EmptyState";

const formatCurrency = (amount) => {
  if (amount == null || amount === "") return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount));
};

const formatDate = (dateValue) => {
  if (!dateValue) return "—";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export function OrgReconciliationQueriesTab({ orgId }) {
  const { data: queries = [], isLoading, isFetching } = useGetOrgReconciliationQueriesQuery(orgId, {
    skip: !orgId,
    pollingInterval: 20000,
  });
  const [resolveQuery] = useResolveOrgReconciliationQueryMutation();

  const [open, setOpen] = useState(false);
  const [selectedQuery, setSelectedQuery] = useState(null);
  const [resolvingId, setResolvingId] = useState(null);

  const sortedQueries = useMemo(
    () => [...queries].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [queries]
  );

  const handleView = (query) => {
    setSelectedQuery(query);
    setOpen(true);
  };

  const handleResolve = async () => {
    if (!selectedQuery?._id || !orgId) return;

    try {
      setResolvingId(selectedQuery._id);
      await resolveQuery({ orgId, queryId: selectedQuery._id }).unwrap();
      setOpen(false);
      setSelectedQuery(null);
    } catch (error) {
      console.error("Failed to resolve reconciliation query", error);
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reconciliation Queries</CardTitle>
      </CardHeader>

      <CardContent>
        {isLoading || isFetching ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Loading reconciliation queries...</div>
        ) : sortedQueries.length === 0 ? (
          <EmptyState message="No reconciliation queries for this organization" />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Running Balance</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {sortedQueries.map((q) => {
                  const details = q.transactionDetails || {};
                  return (
                    <TableRow key={q._id}>
                      <TableCell>{formatDate(details.transactionDate)}</TableCell>
                      <TableCell className="max-w-xs truncate">{details.description || details.referenceNumber || "—"}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(details.amount)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(details.runningBalance)}</TableCell>
                      <TableCell className="capitalize">{details.type || "—"}</TableCell>
                      <TableCell>
                        <Badge className="bg-warning/10 text-warning border-warning/20">Pending Query</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => handleView(q)}>
                          View Query
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Reported Query</DialogTitle>
              <DialogDescription>
                Review user-reported issue for this transaction.
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-md border border-border bg-muted/20 p-3 text-sm whitespace-pre-wrap">
              {selectedQuery?.queryMessage || "—"}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Close Dialog
              </Button>
              <Button
                onClick={handleResolve}
                disabled={!selectedQuery?._id || resolvingId === selectedQuery?._id}
              >
                Mark as Resolved
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

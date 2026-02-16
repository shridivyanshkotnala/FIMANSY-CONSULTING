import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Handshake,
  Download,
  MessageSquare,
  CheckCircle2,
  Clock,
  IndianRupee
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/**
 * VendorNegotiationSupport
 *
 * CRITICAL RULE:
 * This component must NOT compute negotiation intelligence.
 * Backend must provide analyzed vendor negotiation report.
 *
 * future redux:
 * const vendors = useSelector(selectVendorNegotiationReport)
 */

export function VendorNegotiationSupport({ vendors = [], loading = false }) {
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [showDialog, setShowDialog] = useState(false);

  const formatCurrency = (amount) => {
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    return `₹${(amount / 1000).toFixed(0)}K`;
  };

  const getStrengthBadge = (strength) => {
    if (strength === "strong")
      return <Badge className="bg-success text-success-foreground">Strong</Badge>;
    if (strength === "moderate")
      return <Badge className="bg-warning text-warning-foreground">Moderate</Badge>;
    return <Badge variant="secondary">Weak</Badge>;
  };

  const handleExportSummary = (vendor) => {
    const content = `
VENDOR NEGOTIATION BRIEF
========================

VENDOR: ${vendor.vendor_name}

Total Purchases: ${formatCurrency(vendor.totalPurchases)}
Orders: ${vendor.invoiceCount}
Avg Payment Days: ${vendor.avgPaymentDays}
Outstanding: ${formatCurrency(vendor.currentCredit)}
Strength: ${vendor.negotiationStrength}

TALKING POINTS
--------------
${vendor.talkingPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}
    `.trim();

    const blob = new Blob([content], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `negotiation-${vendor.vendor_name.replace(/\s+/g, '-').toLowerCase()}.txt`;
    a.click();

    toast.success("Negotiation brief downloaded");
  };

  const openDetails = (vendor) => {
    setSelectedVendor(vendor);
    setShowDialog(true);
  };

  return (
    <div className="space-y-6">

      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Handshake className="h-5 w-5 text-primary" />
            Vendor Negotiation Support
          </CardTitle>
          <CardDescription>
            Negotiation insights generated from financial intelligence engine
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vendor Analysis</CardTitle>
          <CardDescription>Top vendors with negotiation recommendations</CardDescription>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 w-full bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : vendors.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Handshake className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No vendor analysis available</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead className="text-right">Purchases</TableHead>
                  <TableHead className="text-center">Orders</TableHead>
                  <TableHead className="text-center">Avg Days</TableHead>
                  <TableHead>Strength</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {vendors.map((vendor) => (
                  <TableRow key={vendor.vendor_name}>
                    <TableCell className="font-medium">{vendor.vendor_name}</TableCell>
                    <TableCell className="text-right">{formatCurrency(vendor.totalPurchases)}</TableCell>
                    <TableCell className="text-center">{vendor.invoiceCount}</TableCell>
                    <TableCell className="text-center">{vendor.avgPaymentDays}</TableCell>
                    <TableCell>{getStrengthBadge(vendor.negotiationStrength)}</TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openDetails(vendor)}>
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleExportSummary(vendor)}>
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Negotiation Brief: {selectedVendor?.vendor_name}</DialogTitle>
            <DialogDescription>Pre-generated negotiation insights</DialogDescription>
          </DialogHeader>

          {selectedVendor && (
            <div className="space-y-4">

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Purchases</p>
                  <p className="text-lg font-bold">{formatCurrency(selectedVendor.totalPurchases)}</p>
                </div>

                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Avg Payment</p>
                  <p className="text-lg font-bold">{selectedVendor.avgPaymentDays} days</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg border">
                <span className="text-sm">Negotiation Strength:</span>
                {getStrengthBadge(selectedVendor.negotiationStrength)}
              </div>

              <ul className="space-y-2">
                {selectedVendor.talkingPoints.map((point, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-success mt-0.5" />
                    {point}
                  </li>
                ))}
              </ul>

              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                Request credit period: <strong>{selectedVendor.recommendedCredit} days</strong>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Close</Button>
            <Button onClick={() => selectedVendor && handleExportSummary(selectedVendor)}>
              <Download className="h-4 w-4 mr-2" />
              Export Brief
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

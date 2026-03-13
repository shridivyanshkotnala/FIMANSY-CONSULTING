import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function CreateTicketModal({ open, onOpenChange, obligation, onCreateTicket }) {
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!obligation) return;
    
    setSubmitting(true);
    setError("");
    
    try {
      await onCreateTicket(obligation._id, notes);
      onOpenChange(false);
      setNotes("");
    } catch (err) {
      setError(err.message || "Failed to create ticket");
    } finally {
      setSubmitting(false);
    }
  };

  if (!obligation) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Ticket</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Obligation Details</Label>
            <div className="p-3 bg-muted rounded-lg space-y-1">
              <p className="font-medium text-sm">
                {obligation.form_name || `${obligation.compliance_category?.toUpperCase()} - ${obligation.compliance_subtype}`}
              </p>
              <p className="text-xs text-muted-foreground">
                FY {obligation.financial_year} • Due: {new Date(obligation.due_date).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any initial comments or requirements..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Creating..." : "Create Ticket"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
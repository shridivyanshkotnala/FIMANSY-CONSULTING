import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

import { TAG_COLORS } from "@/lib/compliance/complianceData";

import {
  Upload,
  FileText,
  Loader2,
  Calendar,
  Tag,
  CheckCircle2,
} from "lucide-react";

import { format } from "date-fns";

export function ComplianceFilingModal({
  open,
  onOpenChange,
  compliance,
  mode = "ticket",
  onSuccess,
}) {

  const { toast } = useToast();

  const [comment, setComment] = useState("");
  const [files, setFiles] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileChange = (e) => {
    if (!e.target.files) return;
    setFiles(Array.from(e.target.files));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!compliance?._id) {
      toast({
        title: "Error",
        description: "No obligation selected",
        variant: "destructive",
      });
      return;
    }

    if (!comment.trim()) {
      toast({
        title: "Comment required",
        description: "Please describe the task",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {

      const payload = {
        comment: comment.trim(),
        attachments: files.map((f) => f.name),
      };

      // 🔥 Parent handles API + refresh
      if (onSuccess) {
        await onSuccess(payload);
      }

      setComment("");
      setFiles([]);

      onOpenChange(false);

    } catch (err) {

      console.error("Ticket creation error:", err);

      toast({
        title: "Failed to create ticket",
        description: err.message || "Server error occurred",
        variant: "destructive",
      });

    } finally {
      setIsSubmitting(false);
    }
  };

  if (!compliance) return null;

  const displayName =
    compliance.form_name ||
    compliance.compliance_subtype ||
    "Compliance Item";

  const primaryTag = compliance.compliance_category || "other";
  const secondaryTag = compliance.compliance_subtype || "";

  const dueDate = compliance.due_date || compliance.dueDate;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">

        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {displayName}
          </DialogTitle>

          <DialogDescription>
            Create a ticket to track this compliance obligation
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Tags */}
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-muted-foreground" />

            <Badge className={TAG_COLORS[primaryTag] || TAG_COLORS.other}>
              {primaryTag.toUpperCase()}
            </Badge>

            {secondaryTag && (
              <Badge variant="outline">{secondaryTag}</Badge>
            )}
          </div>

          {/* Due Date */}
          {dueDate && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />

              <span className="text-muted-foreground">Due:</span>

              <span className="font-medium">
                {format(new Date(dueDate), "dd MMM yyyy")}
              </span>
            </div>
          )}

          {/* Upload */}
          <div className="space-y-2">
            <Label>Upload Documents (Optional)</Label>

            <Input
              type="file"
              multiple
              onChange={handleFileChange}
              disabled={isSubmitting}
            />
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <Label>Ticket Description</Label>

            <Textarea
              placeholder="Describe what needs to be done..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              disabled={isSubmitting}
              required
            />
          </div>

          {/* Submit */}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Ticket...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Create Ticket
              </>
            )}
          </Button>

        </form>
      </DialogContent>
    </Dialog>
  );
}
import { useState } from "react";

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
} from "lucide-react";

import { format } from "date-fns";

/*
  ==========================================================
  Compliance Filing Modal
  ----------------------------------------------------------
  Props:
  - open
  - onOpenChange
  - compliance
  - onSubmit
  - isSubmitting
  ==========================================================
*/

export function ComplianceFilingModal({
  open,
  onOpenChange,
  compliance,
  onSubmit,
  isSubmitting,
}) {
  // Local state
  const [comment, setComment] = useState("");
  const [files, setFiles] = useState([]); // removed File[] typing

  /*
    ==========================================================
    Handle File Change
    TS removed:
    (e: React.ChangeEvent<HTMLInputElement>)
    ==========================================================
  */
  const handleFileChange = (e) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  /*
    ==========================================================
    Handle Submit
    TS removed:
    (e: React.FormEvent)
    ==========================================================
  */
  const handleSubmit = (e) => {
    e.preventDefault();

    onSubmit({
      comment,
      files,
    });

    // Reset local state after submission
    setComment("");
    setFiles([]);
  };

  // Guard condition
  if (!compliance) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">

        {/* Header */}
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {compliance.name}
          </DialogTitle>
          <DialogDescription>
            {compliance.description}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* ================= TAGS ================= */}
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-muted-foreground" />

            <Badge
              className={
                TAG_COLORS[compliance.primaryTag] ||
                TAG_COLORS.Other
              }
            >
              {compliance.primaryTag}
            </Badge>

            <Badge variant="outline">
              {compliance.secondaryTag}
            </Badge>
          </div>

          {/* ================= DUE DATE ================= */}
          {compliance.dueDate && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                Due:
              </span>
              <span className="font-medium">
                {format(
                  new Date(compliance.dueDate),
                  "dd MMM yyyy"
                )}
              </span>
            </div>
          )}

          {/* ================= FILE UPLOAD ================= */}
          <div className="space-y-2">
            <Label>Upload Documents</Label>

            <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />

              <p className="text-sm text-muted-foreground mb-2">
                Drag & drop or click to upload
              </p>

              <Input
                type="file"
                multiple
                onChange={handleFileChange}
                className="cursor-pointer"
              />
            </div>

            {files.length > 0 && (
              <div className="space-y-1">
                {files.map((f, i) => (
                  <p
                    key={i}
                    className="text-sm text-muted-foreground flex items-center gap-1"
                  >
                    <FileText className="h-3 w-3" />
                    {f.name}
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* ================= COMMENT ================= */}
          <div className="space-y-2">
            <Label>
              Comment / Message to Accountant
            </Label>

            <Textarea
              placeholder="Add notes or instructions for your accountant..."
              value={comment}
              onChange={(e) =>
                setComment(e.target.value)
              }
              rows={3}
            />
          </div>

          {/* ================= SUBMIT BUTTON ================= */}
          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Initiate Filing
          </Button>

        </form>
      </DialogContent>
    </Dialog>
  );
}
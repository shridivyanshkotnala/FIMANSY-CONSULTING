/**
 * CreateTicketModal.jsx
 * Dialog for accountants to manually create compliance tickets.
 *
 * Features:
 *   – Compliance template dropdown with auto-fill of category, subtag, description, recurrence
 *   – Calendar date picker (today or future only)
 *   – Organization dropdown with inline "Add New Organization" option
 *   – RTK mutations: useGetComplianceTemplatesQuery, useGetAllOrganizationsQuery, useCreateManualTicketMutation
 *   – Toast on success / error
 *   – Invalidates TicketList + Dashboard caches on success
 */

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { CalendarIcon, Plus, Building2, ChevronDown, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

// UI primitives
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Label }    from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge }    from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";

// RTK
import {
  useGetComplianceTemplatesQuery,
  useGetAllOrganizationsQuery,
  useCreateManualTicketMutation,
} from "@/Redux/Slices/api/complianceApi";

// Toast
import { useToast } from "@/hooks/use-toast";

// ─────────────────────────────────────────────
// Category display map
// ─────────────────────────────────────────────
const CATEGORY_LABEL = {
  gst:         "GST",
  tds:         "TDS",
  income_tax:  "Income Tax",
  mca:         "MCA",
  payroll:     "Payroll",
  other:       "Other",
};

const RECURRENCE_LABEL = {
  monthly:   "Monthly",
  quarterly: "Quarterly",
  annual:    "Annual",
  one_time:  "One Time",
};

// ─────────────────────────────────────────────
// Step indicator
// ─────────────────────────────────────────────
function StepBadge({ number, label }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
        {number}
      </span>
      <span className="text-sm font-semibold text-foreground">{label}</span>
    </div>
  );
}

// ─────────────────────────────────────────────
// Read-only pill badge
// ─────────────────────────────────────────────
function InfoPill({ children }) {
  return (
    <span className="inline-flex items-center rounded-md border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
      {children}
    </span>
  );
}

// ─────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────
export function CreateTicketModal({ open, onClose }) {
  const { toast } = useToast();

  // ── Remote data ───────────────────────────
  const { data: templates = [], isLoading: templatesLoading } = useGetComplianceTemplatesQuery(undefined, { skip: !open });
  const { data: orgs      = [], isLoading: orgsLoading      } = useGetAllOrganizationsQuery(undefined,  { skip: !open });
  const [createManualTicket, { isLoading: creating }]         = useCreateManualTicketMutation();

  // ── Form state ────────────────────────────
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [selectedTemplate,   setSelectedTemplate]   = useState(null);
  const [description,        setDescription]        = useState("");
  const [dueDate,            setDueDate]            = useState(null);
  const [calendarOpen,       setCalendarOpen]       = useState(false);

  // org selection
  const [orgMode,            setOrgMode]            = useState("select"); // "select" | "create"
  const [selectedOrgId,      setSelectedOrgId]      = useState("");
  const [newOrgName,         setNewOrgName]         = useState("");

  // validation
  const [errors, setErrors] = useState({});

  // ── Reset form when modal closes ──────────
  useEffect(() => {
    if (!open) {
      setSelectedTemplateId("");
      setSelectedTemplate(null);
      setDescription("");
      setDueDate(null);
      setOrgMode("select");
      setSelectedOrgId("");
      setNewOrgName("");
      setErrors({});
    }
  }, [open]);

  // ── Auto-fill when template selected ──────
  const handleTemplateChange = (id) => {
    setSelectedTemplateId(id);
    const tmpl = templates.find((t) => t._id === id) || null;
    setSelectedTemplate(tmpl);
    setDescription(tmpl?.description ?? "");
    setErrors((prev) => ({ ...prev, templateId: undefined }));
  };

  // ── Validation ────────────────────────────
  const validate = () => {
    const e = {};
    if (!selectedTemplateId)          e.templateId    = "Please select a compliance type";
    if (!dueDate)                     e.dueDate       = "Please pick a due date";
    if (orgMode === "select" && !selectedOrgId)  e.orgId     = "Please select an organization";
    if (orgMode === "create" && !newOrgName.trim()) e.newOrgName = "Organization name cannot be empty";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Submit ────────────────────────────────
  const handleSubmit = async () => {
    if (!validate()) return;

    const payload = {
      templateId:     selectedTemplateId,
      dueDate:        dueDate.toISOString(),
      description:    description || undefined,
      ...(orgMode === "select"
        ? { organizationId: selectedOrgId }
        : { newOrgName: newOrgName.trim() }),
    };

    try {
      const result = await createManualTicket(payload).unwrap();
      toast({
        title:       "Ticket created",
        description: result.message || `Ticket ${result.ticket_number} created successfully`,
      });
      onClose();
    } catch (err) {
      const msg = err?.data?.message || "Failed to create ticket. Please try again.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  // ── Helpers ───────────────────────────────
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const selectedOrgName = orgs.find((o) => o._id === selectedOrgId)?.name ?? "";

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg w-full p-0 gap-0 overflow-hidden max-h-[90vh] flex flex-col">
        {/* ── Header ── */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <DialogTitle className="text-lg font-bold">Create Compliance Ticket</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Select a compliance type, assign it to an organization, and set the due date.
          </DialogDescription>
        </DialogHeader>

        {/* ── Scrollable body ── */}
        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="px-6 py-5 space-y-8">

            {/* ═══ SECTION 1: Compliance Details ═══ */}
            <section className="space-y-5">
              <StepBadge number="1" label="Compliance Details" />

              {/* Compliance Name dropdown */}
              <div className="space-y-1.5">
                <Label htmlFor="compliance-name" className="text-sm font-medium">
                  Compliance Name <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={selectedTemplateId}
                  onValueChange={handleTemplateChange}
                  disabled={templatesLoading}
                >
                  <SelectTrigger
                    id="compliance-name"
                    className={cn(
                      "h-11 text-sm",
                      errors.templateId && "border-destructive focus:ring-destructive"
                    )}
                  >
                    <SelectValue placeholder={templatesLoading ? "Loading…" : "Choose a compliance type"} />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((tmpl) => (
                      <SelectItem key={tmpl._id} value={tmpl._id} className="text-sm">
                        {tmpl.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.templateId && (
                  <p className="text-xs text-destructive">{errors.templateId}</p>
                )}
                {!errors.templateId && (
                  <p className="text-xs text-muted-foreground">Pick the type of filing or return</p>
                )}
              </div>

              {/* Auto-fill pills — only shown after a template is selected */}
              {selectedTemplate && (
                <div className="space-y-3 rounded-lg border border-border/60 bg-muted/30 p-4">
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-xs">Category</span>
                      <InfoPill>{CATEGORY_LABEL[selectedTemplate.category_tag] ?? selectedTemplate.category_tag}</InfoPill>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-xs">Sub-tag</span>
                      <InfoPill>{selectedTemplate.subtag}</InfoPill>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-xs">Recurrence</span>
                      <InfoPill>{RECURRENCE_LABEL[selectedTemplate.recurrence_type] ?? selectedTemplate.recurrence_type}</InfoPill>
                    </div>
                  </div>
                </div>
              )}

              {/* Description (editable, auto-filled from template) */}
              {selectedTemplate && (
                <div className="space-y-1.5">
                  <Label htmlFor="description" className="text-sm font-medium">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="text-sm resize-none"
                    placeholder="Enter description…"
                  />
                  <p className="text-xs text-muted-foreground">Auto-filled from template — you can edit it</p>
                </div>
              )}

              {/* Due Date picker */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">
                  Due Date <span className="text-destructive">*</span>
                </Label>
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full h-11 justify-start text-sm font-normal",
                        !dueDate && "text-muted-foreground",
                        errors.dueDate && "border-destructive"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                      {dueDate ? format(dueDate, "d MMM yyyy") : "Pick a due date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dueDate}
                      onSelect={(d) => {
                        setDueDate(d);
                        setCalendarOpen(false);
                        setErrors((prev) => ({ ...prev, dueDate: undefined }));
                      }}
                      disabled={(date) => date < today}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {errors.dueDate ? (
                  <p className="text-xs text-destructive">{errors.dueDate}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">Must be today or a future date</p>
                )}
              </div>
            </section>

            {/* ═══ SECTION 2: Organization ═══ */}
            <section className="space-y-5">
              <StepBadge number="2" label="Organization" />

              {orgMode === "select" ? (
                <>
                  {/* Existing org dropdown */}
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">
                      Select Organization <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={selectedOrgId}
                      onValueChange={(v) => {
                        setSelectedOrgId(v);
                        setErrors((prev) => ({ ...prev, orgId: undefined }));
                      }}
                      disabled={orgsLoading}
                    >
                      <SelectTrigger
                        className={cn(
                          "h-11 text-sm",
                          errors.orgId && "border-destructive"
                        )}
                      >
                        <Building2 className="mr-2 h-4 w-4 text-muted-foreground shrink-0" />
                        <SelectValue placeholder={orgsLoading ? "Loading…" : "Choose an organization"} />
                      </SelectTrigger>
                      <SelectContent>
                        {orgs.map((org) => (
                          <SelectItem key={org._id} value={org._id} className="text-sm">
                            <span className="flex items-center gap-2">
                              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                              {org.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.orgId && (
                      <p className="text-xs text-destructive">{errors.orgId}</p>
                    )}
                  </div>

                  {/* Link to create-new mode */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1.5 text-primary hover:text-primary px-0"
                    onClick={() => {
                      setOrgMode("create");
                      setSelectedOrgId("");
                      setErrors((prev) => ({ ...prev, orgId: undefined }));
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add New Organization
                  </Button>
                </>
              ) : (
                <>
                  {/* New org name input */}
                  <div className="space-y-1.5">
                    <Label htmlFor="new-org-name" className="text-sm font-medium">
                      New Organization Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="new-org-name"
                      value={newOrgName}
                      onChange={(e) => {
                        setNewOrgName(e.target.value);
                        setErrors((prev) => ({ ...prev, newOrgName: undefined }));
                      }}
                      placeholder="e.g. Alpha Tech Pvt Ltd"
                      className={cn("h-11 text-sm", errors.newOrgName && "border-destructive")}
                    />
                    {errors.newOrgName ? (
                      <p className="text-xs text-destructive">{errors.newOrgName}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground">A new organization will be created when you submit</p>
                    )}
                  </div>

                  {/* Back to select mode */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => {
                      setOrgMode("select");
                      setNewOrgName("");
                      setErrors((prev) => ({ ...prev, newOrgName: undefined }));
                    }}
                  >
                    Select Existing Organization Instead
                  </Button>
                </>
              )}
            </section>

          </div>
        </ScrollArea>

        {/* ── Footer ── */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border shrink-0 bg-background">
          <Button variant="outline" onClick={onClose} disabled={creating} className="min-w-[90px]">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={creating}
            className="min-w-[130px] bg-primary hover:bg-primary/90"
          >
            {creating ? "Creating…" : "Create Ticket"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

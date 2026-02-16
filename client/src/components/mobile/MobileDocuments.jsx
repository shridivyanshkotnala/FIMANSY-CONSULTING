import { useNavigate } from "react-router-dom";
import { MobileLayout } from "@/components/mobile/MobileLayout";
import {
  FileText,
  Receipt,
  Building2,
  Landmark,
  Users,
  FolderOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

/*
========================================================
DOCUMENT TYPE REGISTRY

This acts as:
UI catalog + Upload classification system

Later this should move to:
store/constants/documentTypes.js

Because backend + OCR + workflow
will depend on these exact IDs.
DO NOT RANDOMLY CHANGE IDs.
========================================================
*/

const documentTypes = [
  {
    id: "sales_invoice",
    title: "Sales Invoice",
    description: "Customer invoices for GST & revenue",
    icon: FileText,
    color: "bg-success/10 text-success",
  },
  {
    id: "expense_invoice",
    title: "Expense Invoice",
    description: "Vendor bills for GST input",
    icon: Receipt,
    color: "bg-warning/10 text-warning",
  },
  {
    id: "bank_statement",
    title: "Bank Statement",
    description: "PDF statements for reconciliation",
    icon: Building2,
    color: "bg-info/10 text-info",
  },
  {
    id: "loan",
    title: "Loan Document",
    description: "Loan agreements & EMI schedules",
    icon: Landmark,
    color: "bg-primary/10 text-primary",
  },
  {
    id: "equity",
    title: "Equity Document",
    description: "Share certificates & cap table",
    icon: Users,
    color: "bg-accent text-accent-foreground",
  },
  {
    id: "other",
    title: "Other Document",
    description: "Rent, salary, miscellaneous",
    icon: FolderOpen,
    color: "bg-muted text-muted-foreground",
  },
];

export function MobileDocuments() {
  const navigate = useNavigate();

  /*
  ========================================================
  FUTURE BEHAVIOR (IMPORTANT)

  Right now:
  -> We navigate using query param

  Later:
  -> Dispatch Redux action:
     dispatch(startUploadFlow({ documentType }))

  Upload screen should NOT depend on router.
  Router navigation only for visual screen change.

  Example future:
  uploadService.start(documentType)
  ========================================================
  */
  const handleSelectDocumentType = (type) => {
    // TODO (Redux later):
    // dispatch(startUploadFlow({ type }))

    navigate(`/upload?type=${type}`);
  };

  return (
    <MobileLayout title="Upload Documents" hideFAB>
      <div className="p-4 space-y-3">
        <p className="text-sm text-muted-foreground mb-4">
          Select a document type to upload
        </p>

        {documentTypes.map((docType) => {
          const Icon = docType.icon;

          return (
            <button
              key={docType.id}
              onClick={() => handleSelectDocumentType(docType.id)}
              className="w-full flex items-center gap-4 p-4 bg-card rounded-xl border hover:border-primary/50 active:scale-[0.99] transition-all touch-manipulation text-left"
            >
              <div className={cn("p-3 rounded-xl", docType.color)}>
                <Icon className="h-5 w-5" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground">
                  {docType.title}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {docType.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </MobileLayout>
  );
}

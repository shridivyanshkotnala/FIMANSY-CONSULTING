import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Upload, FileText, CreditCard, X } from "lucide-react";
import { cn } from "@/lib/utils";

/*
========================================================
FAB ACTION DEFINITIONS

These are NOT just buttons.
They represent ENTRY POINTS into ingestion pipeline.

Later move to:
store/constants/uploadEntryPoints.js

Each action should map to a workflow:
upload -> generic picker
sales_invoice -> OCR invoice pipeline
bank_statement -> statement parser
========================================================
*/

const fabActions = [
  { icon: Upload, label: "Upload", type: "generic", path: "/upload", color: "bg-primary" },
  { icon: FileText, label: "Invoice", type: "sales_invoice", path: "/upload?type=sales_invoice", color: "bg-success" },
  { icon: CreditCard, label: "Statement", type: "bank_statement", path: "/upload?type=bank_statement", color: "bg-info" },
];

export function MobileFAB() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  /*
  ========================================================
  IMPORTANT FUTURE ARCHITECTURE

  Current:
    navigate(path)

  Correct Future:
    dispatch(startUploadSession({ type }))
    openCameraOrPicker()
    then navigate("/upload") ONLY for UI

  Why:
  Upload must survive:
  - screen close
  - navigation change
  - backgrounding app
  - retry failures
  ========================================================
  */
  const handleActionClick = (action) => {
    setIsOpen(false);

    // TODO (Redux Upload Engine later)
    // dispatch(startUploadSession({ documentType: action.type }))

    navigate(action.path);
  };

  return (
    <div className="fixed bottom-20 right-4 z-50 md:hidden">
      {/* Overlay when menu open */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Action buttons */}
      <div
        className={cn(
          "flex flex-col-reverse items-end gap-3 mb-3 transition-all duration-200 z-50 relative",
          isOpen
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-4 pointer-events-none"
        )}
      >
        {fabActions.map((action, index) => (
          <button
            key={action.label}
            onClick={() => handleActionClick(action)}
            className={cn(
              "flex items-center gap-3 pl-4 pr-3 py-2.5 rounded-full shadow-lg transition-all duration-200 touch-manipulation",
              action.color,
              "text-white font-medium text-sm"
            )}
            style={{
              transitionDelay: isOpen ? `${index * 50}ms` : "0ms",
            }}
          >
            <span>{action.label}</span>
            <action.icon className="h-5 w-5" />
          </button>
        ))}
      </div>

      {/* Main FAB */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 touch-manipulation z-50 relative",
          isOpen
            ? "bg-destructive rotate-45"
            : "bg-primary hover:bg-primary/90 active:scale-95"
        )}
      >
        {isOpen ? (
          <X className="h-6 w-6 text-white" />
        ) : (
          <Plus className="h-6 w-6 text-white" />
        )}
      </button>
    </div>
  );
}

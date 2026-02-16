// Documents.jsx
// Converted from TSX → JSX
// Purpose: Shows document category selection screen and routes user to upload flow based on chosen document type.
// No database or Supabase logic exists in this file — purely UI navigation layer.
// No Context API usage here — safe component (state-independent). Redux not required at this level.

import { useNavigate } from "react-router-dom";
import { PillarLayout } from "@/components/layout/PillarLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ContextualHelp } from "@/components/ui/contextual-help";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileDocuments } from "@/components/mobile/MobileDocuments";
import { 
  FileText, 
  Receipt, 
  Building2, 
  Landmark, 
  Users, 
  FolderOpen,
  ArrowRight
} from "lucide-react";

// Static configuration describing available upload document categories
// IMPORTANT: This is business configuration — DO NOT move to API. Backend depends on these IDs (query param `type`).
const documentTypes = [
  {
    id: 'sales_invoice',
    title: 'Sales Invoice',
    description: 'Upload customer invoices for GST recognition and revenue tracking',
    icon: FileText,
    color: 'bg-success/10 text-success',
  },
  {
    id: 'expense_invoice',
    title: 'Expense Invoice',
    description: 'Upload vendor bills for GST input detection and expense categorization',
    icon: Receipt,
    color: 'bg-warning/10 text-warning',
  },
  {
    id: 'bank_statement',
    title: 'Bank Statement',
    description: 'Upload PDF bank statements for transaction extraction and reconciliation',
    icon: Building2,
    color: 'bg-info/10 text-info',
  },
  {
    id: 'loan',
    title: 'Loan Document',
    description: 'Upload loan agreements, EMI schedules, and sanction letters',
    icon: Landmark,
    color: 'bg-primary/10 text-primary',
  },
  {
    id: 'equity',
    title: 'Equity Document',
    description: 'Upload share certificates, subscription agreements, and cap table documents',
    icon: Users,
    color: 'bg-accent text-accent-foreground',
  },
  {
    id: 'other',
    title: 'Other Document',
    description: 'Upload rent agreements, salary registers, asset invoices, and miscellaneous documents',
    icon: FolderOpen,
    color: 'bg-muted text-muted-foreground',
  },
];

export default function Documents() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // Mobile specific UI is separated into its own component
  // NOTE: If Redux later tracks device/layout state, replace this hook usage there
  if (isMobile) {
    return <MobileDocuments />;
  }

  return (
    <PillarLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Upload Documents</h1>
            <p className="text-muted-foreground">
              Upload and process different types of financial documents
            </p>
          </div>

          {/* Informational UI only — no logic dependency */}
          <ContextualHelp content="Upload your financial documents here. Our AI will automatically extract key information like GST details, vendor info, and transaction data." />
        </div>

        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {documentTypes.map((docType) => {
              const Icon = docType.icon;

              // Card click navigates to upload flow with document type
              // This query param is CRITICAL for backend processing pipeline selection
              return (
                <Card
                  key={docType.id}
                  className="cursor-pointer hover:shadow-lg transition-all hover:border-primary/50 group border-2"
                  onClick={() => navigate(`/upload?type=${docType.id}`)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-xl ${docType.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <CardTitle className="text-lg group-hover:text-primary transition-colors">
                        {docType.title}
                      </CardTitle>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <CardDescription className="text-sm min-h-[40px]">
                      {docType.description}
                    </CardDescription>

                    {/* Stop propagation so button doesn't trigger card click twice */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-4 w-full group-hover:bg-primary group-hover:text-primary-foreground transition-all"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/upload?type=${docType.id}`);
                      }}
                    >
                      Upload
                      <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </PillarLayout>
  );
}

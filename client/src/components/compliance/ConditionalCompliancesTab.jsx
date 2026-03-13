import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TAG_COLORS } from "@/lib/compliance/complianceData";
import { ComplianceFilingModal } from "./ComplianceFilingModal";
import { useCompliance } from "@/hooks/useCompliance";
import { getCurrentFinancialYear } from "@/lib/compliance/utils";
import { useToast } from "@/hooks/use-toast";
import {
  FileText,
  Info,
  Calendar,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";

export function ConditionalCompliancesTab() {
  const { 
    conditionalItems, 
    loadingConditional, 
    fetchConditionalCompliances,
    generateConditionalObligation 
  } = useCompliance();
  
  const { toast } = useToast();
  const [filingModal, setFilingModal] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fy = getCurrentFinancialYear();

  // Load conditional items when tab opens
  useEffect(() => {
    fetchConditionalCompliances(fy);
  }, []);

  const handleFileClick = (item) => {
    // Set the modal data directly from the DB item
    // The item already has all the fields we need from the backend
    setFilingModal(item);
  };

  const handleFiling = async (data) => {
    if (!filingModal) return;
    
    setIsSubmitting(true);
    
    const result = await generateConditionalObligation(filingModal._id, {
      comment: data.comment,
      status: 'initiated'
    });
    
    if (!result.error) {
      toast({
        title: "Filing initiated",
        description: `${filingModal.name} filing has been initiated.`,
      });
      setFilingModal(null);
    } else {
      toast({
        title: "Error",
        description: "Failed to initiate filing. Please try again.",
        variant: "destructive",
      });
    }
    
    setIsSubmitting(false);
  };

  if (loadingConditional) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">
          Loading conditional compliances...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Info className="h-4 w-4 text-primary" />
            </div>
            Conditional Compliances
          </h2>
          <p className="text-xs text-muted-foreground mt-1 ml-9">
            These apply only if certain conditions are met. File only if applicable to your business.
          </p>
        </div>
        <Badge
          variant="outline"
          className="text-xs border-primary/30 text-primary"
        >
          {conditionalItems.length} items
        </Badge>
      </div>

      {/* Compliance List */}
      <div className="space-y-4">
        {conditionalItems.map((item) => {
          const isGenerated = item.is_generated;
          const status = item.obligation_status;
          
          return (
            <Card
              key={item._id}
              className={cn(
                "group border-border/60 hover:border-primary/30 transition-all duration-200 overflow-hidden",
                isGenerated && status === 'filed' && "opacity-75"
              )}
            >
              <CardContent className="p-0">
                <div className="flex items-stretch">
                  {/* Accent bar */}
                  <div className={cn(
                    "w-1 shrink-0 transition-colors duration-200",
                    isGenerated && status === 'filed' && "bg-green-500",
                    isGenerated && status === 'initiated' && "bg-yellow-500",
                    !isGenerated && "bg-primary/20 group-hover:bg-primary"
                  )} />

                  <div className="flex-1 p-5">
                    <div className="flex items-start justify-between gap-4">
                      {/* Left Content */}
                      <div className="flex-1 min-w-0 space-y-2.5">
                        {/* Title with status badge */}
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-primary shrink-0" />
                            <h3 className="font-semibold text-sm">
                              {item.name}
                            </h3>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <Badge
                              className={cn(
                                "text-[10px] px-2 py-0",
                                TAG_COLORS[item.primaryTag] || TAG_COLORS.Other
                              )}
                            >
                              {item.primaryTag}
                            </Badge>
                            <Badge
                              variant="outline"
                              className="text-[10px] px-2 py-0 border-border"
                            >
                              {item.secondaryTag}
                            </Badge>
                            
                            {/* Status badge */}
                            {isGenerated && (
                              <Badge 
                                variant={status === 'filed' ? 'default' : 'secondary'}
                                className="text-[10px] px-2 py-0"
                              >
                                {status === 'filed' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                                {status}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Description */}
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {item.compliance_description}
                        </p>

                        {/* Applicability */}
                        <div className="bg-muted/50 rounded-lg px-3 py-2 border border-border/50">
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            <span className="font-medium text-foreground/70">
                              Applicability:
                            </span>{" "}
                            {item.applicability_info}
                          </p>
                        </div>

                        {/* Due Info */}
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5 text-primary/60" />
                          <span className="font-medium">Due:</span>
                          <span>{item.due_date_rule}</span>
                        </div>
                      </div>

                      {/* File Button */}
                      {!isGenerated || status !== 'filed' ? (
                        <Button
                          size="sm"
                          className="shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 gap-1.5 mt-1"
                          onClick={() => handleFileClick(item)}
                          disabled={isGenerated && status === 'initiated'}
                        >
                          {isGenerated && status === 'initiated' ? 'In Progress' : 'File'}
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      ) : (
                        <Badge variant="outline" className="shrink-0 mt-1">
                          Completed
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {conditionalItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Conditional Compliances</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              There are no conditional compliances configured for your organization.
            </p>
          </div>
        )}
      </div>

      {/* Filing Modal */}
      <ComplianceFilingModal
        open={!!filingModal}
        onOpenChange={(open) => !open && setFilingModal(null)}
        compliance={filingModal ? {
          name: filingModal.name,
          description: filingModal.compliance_description,
          primaryTag: filingModal.primaryTag,
          secondaryTag: filingModal.secondaryTag,
          // Pass through the original data for due date calculation
          dueMonth: filingModal.dueMonth,
          dueDay: filingModal.dueDay,
          _id: filingModal._id
        } : null}
        onSubmit={handleFiling}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
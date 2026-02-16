import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Horizontal workflow progress stepper
 * Shows completed, current (loading), and pending steps
 */
export function WorkflowStepper({ steps, currentStep, className }) {
  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isPending = index > currentStep;

          return (
            <div key={step.id} className="flex-1 flex items-center">
              {/* Step circle */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all",
                    isCompleted && "bg-success text-success-foreground",
                    isCurrent && "bg-primary text-primary-foreground",
                    isPending && "bg-muted text-muted-foreground border-2 border-border"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : isCurrent ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    index + 1
                  )}
                </div>

                {/* Label */}
                <div className="mt-2 text-center">
                  <p
                    className={cn(
                      "text-xs font-medium",
                      isCompleted || isCurrent
                        ? "text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {step.label}
                  </p>

                  {step.description && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {step.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="flex-1 mx-2">
                  <div
                    className={cn(
                      "h-0.5 transition-all",
                      isCompleted ? "bg-success" : "bg-border"
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { getCurrentFinancialYear, getDaysUntilDue } from "@/lib/compliance/utils";
import { ADVANCE_TAX_SCHEDULE } from "@/lib/compliance/types";
import { format, startOfDay } from "date-fns";
import { Calculator, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

/*
  AdvanceTaxCalculator
  --------------------
  PURE TAX ENGINE COMPONENT

  ❗ No database calls
  ❗ No Supabase
  ❗ Emits calculated payload for Redux/API layer

  Future integration:
  dispatch(saveAdvanceTaxThunk(payload))
*/

export function AdvanceTaxCalculator({ onSave }) {
  const { toast } = useToast();

  const [isCalculating, setIsCalculating] = useState(false);
  const [estimatedIncome, setEstimatedIncome] = useState(0);
  const [taxPaidTillDate, setTaxPaidTillDate] = useState(0);

  const fy = getCurrentFinancialYear();
  const [startYear] = fy.split("-").map(Number);

  // ---- BUSINESS CONSTANT ----
  // 25% corporate tax + 4% cess
  const TAX_RATE = 0.26;

  // ---- CORE TAX ENGINE ----
  const calculations = useMemo(() => {
    if (estimatedIncome <= 0) return [];

    const estimatedTax = estimatedIncome * TAX_RATE;
    const today = startOfDay(new Date());

    return ADVANCE_TAX_SCHEDULE.map((schedule, index) => {
      const [day, monthStr] = schedule.dueDate.split("-");
      const monthMap = { Jun: 5, Sep: 8, Dec: 11, Mar: 2 };

      const month = monthMap[monthStr];
      const year = month >= 3 ? startYear : startYear + 1;
      const dueDate = new Date(year, month, parseInt(day));

      const cumulativeTax = (estimatedTax * schedule.cumulative) / 100;
      const previousCumulative =
        index > 0
          ? (estimatedTax * ADVANCE_TAX_SCHEDULE[index - 1].cumulative) / 100
          : 0;

      const quarterTax = cumulativeTax - previousCumulative;

      // ---- CRITICAL BUSINESS LOGIC ----
      const shortfall = Math.max(0, cumulativeTax - taxPaidTillDate);

      const daysUntil = getDaysUntilDue(format(dueDate, "yyyy-MM-dd"));

      return {
        quarter: schedule.quarter,
        dueDate: format(dueDate, "yyyy-MM-dd"),
        dueDateFormatted: format(dueDate, "dd MMM yyyy"),
        cumulative: schedule.cumulative,
        cumulativeTax,
        quarterTax,
        shortfall,
        daysUntil,
        isPast: daysUntil < 0,
        isCurrent: daysUntil >= 0 && daysUntil <= 30,
      };
    });
  }, [estimatedIncome, taxPaidTillDate, startYear]);

  // ---- INTEREST CALCULATION (Sec 234C) ----
  const currentQuarter =
    calculations.find(c => c.isCurrent) || calculations.find(c => !c.isPast);

  const interestWarning = useMemo(() => {
    if (!currentQuarter || currentQuarter.shortfall <= 0) return null;

    const monthlyInterest = currentQuarter.shortfall * 0.01;

    return {
      shortfall: currentQuarter.shortfall,
      monthlyInterest,
      message: `Paying now avoids ₹${monthlyInterest.toLocaleString("en-IN")} interest/month (Sec 234C)`,
    };
  }, [currentQuarter]);

  // ---- SAVE HANDLER (Redux/API will plug here) ----
  const handleSaveCalculations = async () => {
    if (!estimatedIncome) {
      toast({ title: "Enter estimated income", variant: "destructive" });
      return;
    }

    setIsCalculating(true);

    const payload = calculations.map(calc => ({
      financial_year: fy,
      quarter: calc.quarter,
      due_date: calc.dueDate,
      estimated_annual_income: estimatedIncome,
      estimated_tax_liability: estimatedIncome * TAX_RATE,
      cumulative_percentage: calc.cumulative,
      tax_payable_this_quarter: calc.quarterTax,
      tax_paid_till_date: taxPaidTillDate,
      shortfall: calc.shortfall,
      payment_status: calc.isPast
        ? calc.shortfall > 0
          ? "overdue"
          : "paid"
        : "upcoming",
    }));

    // 🔌 FUTURE REDUX CALL
    if (onSave) await onSave(payload);

    toast({ title: "Calculations ready" });
    setIsCalculating(false);
  };

  const formatCurrency = amount =>
    amount >= 100000
      ? `₹${(amount / 100000).toFixed(2)} L`
      : `₹${amount.toLocaleString("en-IN")}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Advance Tax Calculator
        </CardTitle>
        <CardDescription>FY {fy}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">

        {/* Inputs */}
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Estimated Annual Income</Label>
            <Input
              type="number"
              value={estimatedIncome || ""}
              onChange={e => setEstimatedIncome(parseFloat(e.target.value) || 0)}
            />
          </div>

          <div>
            <Label>Tax Already Paid</Label>
            <Input
              type="number"
              value={taxPaidTillDate || ""}
              onChange={e => setTaxPaidTillDate(parseFloat(e.target.value) || 0)}
            />
          </div>
        </div>

        {/* Tax summary */}
        {estimatedIncome > 0 && (
          <>
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex justify-between mb-2">
                <span>Total Estimated Tax</span>
                <span className="font-bold">
                  {formatCurrency(estimatedIncome * TAX_RATE)}
                </span>
              </div>

              <Progress
                value={(taxPaidTillDate / (estimatedIncome * TAX_RATE)) * 100}
              />
            </div>

            {interestWarning && (
              <div className="p-4 border-l-4 border-l-warning bg-warning/5 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-warning" />
                <p className="text-sm mt-2">{interestWarning.message}</p>
              </div>
            )}

            {/* Quarterly breakdown */}
            {calculations.map(calc => (
              <div key={calc.quarter} className="p-3 border rounded-lg">
                <div className="flex justify-between">
                  <div>
                    <p className="font-medium">
                      Q{calc.quarter} — {calc.dueDateFormatted}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Pay {formatCurrency(calc.quarterTax)}
                    </p>
                  </div>

                  {calc.shortfall <= 0 ? (
                    <Badge className="bg-success/10 text-success">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Covered
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      Shortfall {formatCurrency(calc.shortfall)}
                    </Badge>
                  )}
                </div>
              </div>
            ))}

            <Button onClick={handleSaveCalculations} className="w-full">
              {isCalculating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Prepare Entries
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

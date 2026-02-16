import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format, addDays, isBefore, isWeekend } from "date-fns";
import {
  Calendar as CalendarIcon,
  Clock,
  FileText,
  TrendingUp,
  Building2,
  CheckCircle2,
} from "lucide-react";

/*
  BookConsultantModal

  Multi-step booking wizard:
  1) choose duration + purpose
  2) select date & time
  3) confirm booking

  Currently uses mock submit (no backend).
  Later you can connect Redux/API here.
*/

const USE_CASES = [
  { id: "tax-planning", label: "Tax Planning", icon: FileText, description: "Optimize your tax strategy" },
  { id: "purchase-analysis", label: "Purchase Impact Analysis", icon: TrendingUp, description: "Evaluate major purchases" },
  { id: "structuring", label: "Structuring Decisions", icon: Building2, description: "Business structure advice" },
  { id: "compliance", label: "Compliance Review", icon: CheckCircle2, description: "Regulatory compliance check" },
];

const TIME_SLOTS = [
  { time: "09:00", label: "9:00 AM" },
  { time: "09:30", label: "9:30 AM" },
  { time: "10:00", label: "10:00 AM" },
  { time: "10:30", label: "10:30 AM" },
  { time: "11:00", label: "11:00 AM" },
  { time: "11:30", label: "11:30 AM" },
  { time: "14:00", label: "2:00 PM" },
  { time: "14:30", label: "2:30 PM" },
  { time: "15:00", label: "3:00 PM" },
  { time: "15:30", label: "3:30 PM" },
  { time: "16:00", label: "4:00 PM" },
  { time: "16:30", label: "4:30 PM" },
];

export function BookConsultantModal({ open, onOpenChange }) {
  const [step, setStep] = useState(1);
  const [duration, setDuration] = useState("30");
  const [useCase, setUseCase] = useState("");
  const [selectedDate, setSelectedDate] = useState();
  const [selectedTime, setSelectedTime] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    setStep(1);
    setDuration("30");
    setUseCase("");
    setSelectedDate(undefined);
    setSelectedTime("");
    setNotes("");
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime || !useCase) {
      toast.error("Please complete all required fields");
      return;
    }

    setIsSubmitting(true);

    // TEMP MOCK SUBMIT — replace later with Redux/API dispatch
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const useCaseLabel = USE_CASES.find((uc) => uc.id === useCase)?.label;

    toast.success(
      `Meeting booked for ${format(selectedDate, "MMMM d, yyyy")} at ${
        TIME_SLOTS.find((t) => t.time === selectedTime)?.label
      }`,
      { description: `${duration}-minute ${useCaseLabel} consultation` }
    );

    setIsSubmitting(false);
    handleClose();
  };

  const disabledDays = (date) => {
    return isBefore(date, new Date()) || isWeekend(date);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            Book a Consultation
          </DialogTitle>
          <DialogDescription>
            Schedule a meeting with your CA/CS for expert advice
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">

          {/* STEP INDICATOR */}
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-2 w-8 rounded-full ${s <= step ? "bg-primary" : "bg-muted"}`}
              />
            ))}
          </div>

          {/* STEP 1 */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="space-y-3">
                <Label>Session Duration</Label>

                <div className="grid grid-cols-2 gap-3">
                  {["15", "30"].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDuration(d)}
                      className={`p-4 rounded-lg border-2 ${
                        duration === d ? "border-primary bg-primary/5" : "border-border"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>{d} minutes</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label>What do you need help with?</Label>

                <RadioGroup value={useCase} onValueChange={setUseCase}>
                  {USE_CASES.map((uc) => (
                    <Label key={uc.id} htmlFor={uc.id} className="flex gap-3 p-3 border rounded-lg cursor-pointer">
                      <RadioGroupItem value={uc.id} id={uc.id} className="sr-only" />
                      <uc.icon className="h-5 w-5" />
                      <div>
                        <p className="font-medium text-sm">{uc.label}</p>
                        <p className="text-xs text-muted-foreground">{uc.description}</p>
                      </div>
                    </Label>
                  ))}
                </RadioGroup>
              </div>

              <Button className="w-full" disabled={!useCase} onClick={() => setStep(2)}>
                Continue
              </Button>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="space-y-6">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={disabledDays}
                fromDate={new Date()}
                toDate={addDays(new Date(), 30)}
                className="rounded-md border"
              />

              {selectedDate && (
                <div className="grid grid-cols-3 gap-2">
                  {TIME_SLOTS.map((slot) => (
                    <button
                      key={slot.time}
                      onClick={() => setSelectedTime(slot.time)}
                      className={`p-2 border rounded-md ${
                        selectedTime === slot.time ? "bg-primary text-primary-foreground" : ""
                      }`}
                    >
                      {slot.label}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">Back</Button>
                <Button disabled={!selectedDate || !selectedTime} className="flex-1" onClick={() => setStep(3)}>Continue</Button>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="p-4 rounded-lg bg-muted/50 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Consultation</span>
                  <span>{USE_CASES.find((uc) => uc.id === useCase)?.label}</span>
                </div>
                <div className="flex justify-between">
                  <span>Duration</span>
                  <Badge variant="secondary">{duration} minutes</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Date</span>
                  <span>{selectedDate ? format(selectedDate, "MMMM d, yyyy") : "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Time</span>
                  <span>{TIME_SLOTS.find((t) => t.time === selectedTime)?.label}</span>
                </div>
              </div>

              <Textarea
                placeholder="Describe your query..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>Back</Button>
                <Button className="flex-1" disabled={isSubmitting} onClick={handleSubmit}>
                  {isSubmitting ? "Booking..." : "Confirm Booking"}
                </Button>
              </div>
            </div>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
}

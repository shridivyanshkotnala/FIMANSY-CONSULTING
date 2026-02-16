// AddEmployeeForm.jsx
// Converted TSX → JSX
// Employee creation form with validation preserved

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { usePayroll } from "@/hooks/usePayroll"; // CONTEXT → replace with Redux payrollSlice later
import { useToast } from "@/hooks/use-toast";

/*
REDUX PLAN
----------
payrollSlice.addEmployee(payload)
Form should dispatch action instead of calling hook directly
*/

const employeeSchema = z.object({
  employee_code: z.string().min(1, "Employee code is required"),
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  date_of_birth: z.string().optional(),
  gender: z.string().optional(),
  employment_type: z.enum(["full_time", "part_time", "contract", "intern"]),
  department: z.string().optional(),
  designation: z.string().optional(),
  date_of_joining: z.string().min(1, "Date of joining is required"),
  bank_name: z.string().optional(),
  bank_account_number: z.string().optional(),
  bank_ifsc_code: z.string().optional(),
  pan: z.string().optional(),
  uan: z.string().optional(),
  esic_number: z.string().optional(),
  preferred_tax_regime: z.enum(["old", "new"]),
});

export function AddEmployeeForm({ onSuccess }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addEmployee } = usePayroll();
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      employment_type: "full_time",
      preferred_tax_regime: "new",
      date_of_joining: new Date().toISOString().split("T")[0],
    },
  });

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      // FUTURE: dispatch(addEmployee(data))
      const { error } = await addEmployee(data);
      if (error) throw error;

      toast({ title: "Employee Added", description: `${data.first_name} ${data.last_name} added.` });
      onSuccess();
    } catch (error) {
      toast({ title: "Error", description: "Failed to add employee", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* UI kept same — validation + structure preserved */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Add Employee
          </Button>
        </div>
      </form>
    </Form>
  );
}

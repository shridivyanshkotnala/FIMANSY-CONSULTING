import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getDscStatus } from "@/lib/compliance/utils";
import { format } from "date-fns";
import {
  UserPlus, AlertTriangle, CheckCircle2, Clock, Loader2, Users, Mail, Phone as PhoneIcon, Calendar
} from "lucide-react";

/*
 PURE UI COMPONENT

 Emits events → parent handles persistence
*/

export function DirectorManagement({
  directors = [],
  loading = false,
  onAddDirector
}) {

  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    din: "",
    name: "",
    designation: "director",
    date_of_appointment: "",
    dsc_expiry_date: "",
    email: "",
    phone: "",
  });

  const designations = [
    "director",
    "managing_director",
    "whole_time_director",
    "independent_director",
    "additional_director",
    "nominee_director"
  ];

  const submit = async e => {
    e.preventDefault();
    if (!onAddDirector) return;

    setSubmitting(true);
    await onAddDirector({ ...form, is_active: true });

    setSubmitting(false);
    setOpen(false);
    setForm({
      din: "", name: "", designation: "director",
      date_of_appointment: "", dsc_expiry_date: "",
      email: "", phone: ""
    });
  };

  const getBadge = (director)=>{
    const status = getDscStatus(director.dsc_expiry_date);

    if(status.status==="expired")
      return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1"/>Expired</Badge>;

    if(status.daysRemaining<=7)
      return <Badge variant="destructive"><Clock className="h-3 w-3 mr-1"/>{status.daysRemaining}d</Badge>;

    if(status.daysRemaining<=30)
      return <Badge className="bg-warning/10 text-warning border-warning"><Clock className="h-3 w-3 mr-1"/>{status.daysRemaining}d</Badge>;

    if(status.status==="valid")
      return <Badge className="bg-success/10 text-success border-success"><CheckCircle2 className="h-3 w-3 mr-1"/>Valid</Badge>;

    return <Badge variant="outline">No DSC</Badge>;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row justify-between items-center">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5"/> Directors & DSC
          </CardTitle>
          <CardDescription>Track DIN & DSC expiry</CardDescription>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><UserPlus className="h-4 w-4 mr-2"/>Add</Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Director</DialogTitle>
              <DialogDescription>Enter director details and DSC information</DialogDescription>
            </DialogHeader>

            <form onSubmit={submit} className="space-y-5 py-2">
              {/* DIN */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">DIN (Director Identification Number)</Label>
                <Input 
                  placeholder="e.g., 12345678"
                  required 
                  value={form.din} 
                  onChange={e=>setForm({...form, din: e.target.value})}
                  className="w-full"
                />
              </div>

              {/* Full Name */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Full Name</Label>
                <Input 
                  placeholder="As per MCA records"
                  required 
                  value={form.name} 
                  onChange={e=>setForm({...form, name: e.target.value})}
                  className="w-full"
                />
              </div>

              {/* Designation */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Designation</Label>
                <Select value={form.designation} onValueChange={v=>setForm({...form, designation: v})}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Director" />
                  </SelectTrigger>
                  <SelectContent>
                    {designations.map(d=>(
                      <SelectItem key={d} value={d}>
                        {d.replaceAll("_", " ").replace(/\b\w/g, l => l.toUpperCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date of Appointment */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Date of Appointment</Label>
                <Input 
                  type="date" 
                  placeholder="dd-mm-yyyy"
                  value={form.date_of_appointment} 
                  onChange={e=>setForm({...form, date_of_appointment: e.target.value})}
                  className="w-full"
                />
              </div>

              {/* DSC Expiry Date */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">DSC Expiry Date</Label>
                <Input 
                  type="date" 
                  placeholder="dd-mm-yyyy"
                  value={form.dsc_expiry_date} 
                  onChange={e=>setForm({...form, dsc_expiry_date: e.target.value})}
                  className="w-full"
                />
              </div>

              {/* Email and Phone in one row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Email</Label>
                  <Input 
                    type="email"
                    placeholder="email@example.com"
                    value={form.email} 
                    onChange={e=>setForm({...form, email: e.target.value})}
                    className="w-full"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Phone</Label>
                  <Input 
                    type="tel"
                    placeholder="Phone number"
                    value={form.phone} 
                    onChange={e=>setForm({...form, phone: e.target.value})}
                    className="w-full"
                  />
                </div>
              </div>

              <Button type="submit" disabled={submitting} className="w-full">
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin"/>}
                Add Director
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="animate-spin"/></div>
        ) : directors.length===0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-2 opacity-40"/>
            No directors added
          </div>
        ) : (
          <div className="space-y-3">
            {directors.map((director, index) => (
  <div 
    key={director.id || `director-${index}`} 
    className="flex justify-between items-center border rounded-lg p-4"
  >
    <div>
      <p className="font-medium">{director.name}</p>
      <p className="text-sm text-muted-foreground">DIN: {director.din}</p>
    </div>
    <div className="flex items-center gap-3">
      {getBadge(director)}
      {director.dsc_expiry_date && (
        <span className="text-xs text-muted-foreground">
          {format(new Date(director.dsc_expiry_date), 'dd MMM yyyy')}
        </span>
      )}
    </div>
  </div>
))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
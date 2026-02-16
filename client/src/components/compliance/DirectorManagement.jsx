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
  UserPlus, AlertTriangle, CheckCircle2, Clock, Loader2, Users
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

          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Director</DialogTitle>
              <DialogDescription>Enter MCA details</DialogDescription>
            </DialogHeader>

            <form onSubmit={submit} className="space-y-4">

              <div className="space-y-2">
                <Label>DIN</Label>
                <Input required value={form.din} onChange={e=>setForm({...form,din:e.target.value})}/>
              </div>

              <div className="space-y-2">
                <Label>Name</Label>
                <Input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
              </div>

              <div className="space-y-2">
                <Label>Designation</Label>
                <Select value={form.designation} onValueChange={v=>setForm({...form,designation:v})}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    {designations.map(d=><SelectItem key={d} value={d}>{d.replaceAll("_"," ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>DSC Expiry</Label>
                <Input type="date" value={form.dsc_expiry_date} onChange={e=>setForm({...form,dsc_expiry_date:e.target.value})}/>
              </div>

              <Button type="submit" disabled={submitting} className="w-full">
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin"/>}
                Save Director
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
            {directors.map(d=>(
              <div key={d.id} className="flex justify-between items-center border rounded-lg p-4">
                <div>
                  <p className="font-medium">{d.name}</p>
                  <p className="text-sm text-muted-foreground">DIN: {d.din}</p>
                </div>
                <div className="flex items-center gap-3">
                  {getBadge(d)}
                  {d.dsc_expiry_date && (
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(d.dsc_expiry_date),'dd MMM yyyy')}
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

import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getDaysUntilDue, getCompliancePriority } from "@/lib/compliance/utils";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths } from "date-fns";
import { Calendar, FileText, ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

/*
  ComplianceCalendar (PURE UI COMPONENT)

  ❗ Receives obligations as prop
  ❗ No backend access
  ❗ Compatible with Redux / API / Mock data

  obligations: [
    {
      id,
      due_date,
      status,
      form_name,
      form_description
    }
  ]
*/

export function ComplianceCalendar({ obligations = [], loading = false }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // ---- FILTER CURRENT MONTH ----
  const monthObligations = useMemo(() => {
    return obligations.filter(ob => {
      const dueDate = new Date(ob.due_date);
      return dueDate >= monthStart && dueDate <= monthEnd;
    });
  }, [obligations, monthStart, monthEnd]);

  // ---- GROUP BY DATE ----
  const obligationsByDate = useMemo(() => {
    const grouped = {};
    monthObligations.forEach(ob => {
      const key = ob.due_date;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(ob);
    });
    return grouped;
  }, [monthObligations]);

  const getDayClass = date => {
    const key = format(date, "yyyy-MM-dd");
    const list = obligationsByDate[key];

    if (!list?.length) return "";

    const hasOverdue = list.some(ob => ob.status === "overdue" || getDaysUntilDue(ob.due_date) < 0);
    const urgent = list.some(ob => getDaysUntilDue(ob.due_date) <= 7 && ob.status !== "filed");
    const allFiled = list.every(ob => ob.status === "filed");

    if (hasOverdue) return "bg-destructive/20 text-destructive font-bold";
    if (allFiled) return "bg-success/20 text-success";
    if (urgent) return "bg-warning/20 text-warning font-bold";
    return "bg-primary/20 text-primary";
  };

  const getStatusBadge = status => {
    switch (status) {
      case "filed":
        return <Badge className="bg-success/10 text-success border-success text-xs">Filed</Badge>;
      case "in_progress":
        return <Badge className="bg-info/10 text-info border-info text-xs">In Progress</Badge>;
      case "overdue":
        return <Badge variant="destructive" className="text-xs">Overdue</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">Pending</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Compliance Calendar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Compliance Calendar
            </CardTitle>
            <CardDescription>Track statutory filing deadlines</CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <span className="font-medium min-w-[140px] text-center">
              {format(currentMonth, "MMMM yyyy")}
            </span>

            <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
            <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
          ))}

          {Array.from({ length: monthStart.getDay() }).map((_,i)=>(
            <div key={i} className="h-12"/>
          ))}

          {days.map(day=>{
            const key = format(day,"yyyy-MM-dd");
            const list = obligationsByDate[key];
            const isToday = isSameDay(day,new Date());

            return (
              <div
                key={key}
                className={cn("h-12 flex flex-col items-center justify-center rounded-lg relative", getDayClass(day), isToday && "ring-2 ring-primary ring-offset-2")}
              >
                <span className="text-sm">{format(day,"d")}</span>
                {list?.length && (
                  <div className="absolute bottom-1 flex gap-0.5">
                    {list.slice(0,3).map((_,i)=>(<div key={i} className="h-1 w-1 rounded-full bg-current"/>))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Monthly list */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">This Month's Filings</h4>

          {monthObligations.length===0 ? (
            <div className="text-center py-4 text-muted-foreground">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50"/>
              <p className="text-sm">No filings due this month</p>
            </div>
          ) : (
            monthObligations.map(ob=>{
              const daysUntil=getDaysUntilDue(ob.due_date);
              const {severity}=getCompliancePriority(ob.due_date);

              return (
                <div key={ob.id} className={cn(
                  "p-4 border rounded-lg flex justify-between",
                  severity==="critical" && "border-l-4 border-l-destructive bg-destructive/5",
                  severity==="warning" && "border-l-4 border-l-warning bg-warning/5"
                )}>
                  <div>
                    <p className="font-medium">{ob.form_name}</p>
                    <p className="text-sm text-muted-foreground">{ob.form_description}</p>
                  </div>

                  <div className="text-right">
                    {getStatusBadge(ob.status)}
                    <p className="text-sm font-medium">{format(new Date(ob.due_date),"dd MMM")}</p>
                    <p className={cn("text-xs",
                      daysUntil<0?"text-destructive":
                      daysUntil<=7?"text-warning":
                      "text-muted-foreground"
                    )}>
                      {daysUntil<0?`${Math.abs(daysUntil)}d overdue`:daysUntil===0?"Due today":`${daysUntil}d left`}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </CardContent>
    </Card>
  );
}

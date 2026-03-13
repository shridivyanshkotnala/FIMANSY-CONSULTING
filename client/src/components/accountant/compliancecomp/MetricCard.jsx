import { Card, CardContent } from "@/components/ui/card";

const colors = {
  destructive: "from-card to-destructive/10 text-destructive",
  warning: "from-card to-warning/10 text-warning",
  success: "from-card to-success/10 text-success",
  info: "from-card to-info/10 text-info",
  default: "from-card to-primary/5 text-primary",
};

const iconBg = {
  destructive: "bg-destructive/10",
  warning: "bg-warning/10",
  success: "bg-success/10",
  info: "bg-info/10",
  default: "bg-primary/10",
};

export function MetricCard({ icon: Icon, label, value, variant }) {
  return (
    <Card className={`border-0 shadow-sm bg-gradient-to-br ${colors[variant]}`}>
      <CardContent className="p-3">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${iconBg[variant]}`}>
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">{value}</p>
            <p className="text-[10px] text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

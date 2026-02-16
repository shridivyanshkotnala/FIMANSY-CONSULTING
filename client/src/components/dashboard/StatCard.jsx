import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/*
  PURE UI COMPONENT

  Receives already formatted values.
  Does NOT interpret business meaning.
  Parent decides what "good" or "bad" means.
*/

export function StatCard({
  title,
  value,
  description,
  icon,
  trend,
  className,
}) {

  const trendColor = {
    good: "text-success",
    bad: "text-destructive",
    info: "text-primary",
  };

  const trendSymbol = {
    up: "+",
    down: "",
    neutral: "",
  };

  return (
    <Card className={cn("transition-shadow hover:shadow-card-hover", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>

        <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center text-primary">
          {icon}
        </div>
      </CardHeader>

      <CardContent>
        <div className="text-2xl font-bold">{value}</div>

        {(description || trend) && (
          <p className="text-xs text-muted-foreground mt-1">
            {trend && (
              <span className={cn("font-medium mr-1", trendColor[trend.tone])}>
                {trendSymbol[trend.direction]}
                {trend.value}%
              </span>
            )}
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

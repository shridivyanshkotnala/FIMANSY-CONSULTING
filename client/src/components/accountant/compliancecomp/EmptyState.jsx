import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

export function EmptyState({ message }) {
  return (
    <Card className="border-dashed">
      <CardContent className="py-12 text-center">
        <CheckCircle2 className="h-10 w-10 text-success mx-auto mb-3" />
        <p className="text-sm font-medium">{message}</p>
      </CardContent>
    </Card>
  );
}

import { cn } from "@/lib/utils";

/*
  Skeleton

  Loading placeholder block.
  Used while data/components are loading.
  Pure visual component
*/

export function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}

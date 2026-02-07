import { cn } from "@/lib/utils";

function Skeleton({ className, shimmer = false, ...props }) {
  return (
    <div
      className={cn(
        "rounded-md bg-muted",
        shimmer ? "shimmer" : "animate-pulse",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };

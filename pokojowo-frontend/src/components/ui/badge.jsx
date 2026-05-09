import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-[0.12em] uppercase transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-foreground text-background hover:bg-foreground/85",
        secondary:
          "border-border/80 bg-surface-parchment text-foreground hover:bg-surface-parchment/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline:
          "border-border/80 bg-transparent text-foreground hover:bg-surface-parchment/60",
        accent:
          "border-transparent bg-accent text-accent-foreground hover:bg-accent/85",
        olive:
          "border-transparent bg-olive text-olive-foreground hover:bg-olive/85",
        rose:
          "border-transparent bg-rose text-rose-foreground hover:bg-rose/85",
        success:
          "border-transparent bg-success text-success-foreground hover:bg-success/80",
        warning:
          "border-transparent bg-warning text-warning-foreground hover:bg-warning/80",
        info:
          "border-transparent bg-info text-info-foreground hover:bg-info/80",
        muted:
          "border-border/60 bg-muted text-muted-foreground",
        editorial:
          "border-border/60 bg-surface-paper text-foreground/80 backdrop-blur",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({ className, variant, ...props }) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };

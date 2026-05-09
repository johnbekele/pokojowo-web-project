import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium tracking-tight ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-foreground text-background hover:bg-surface-ink shadow-[0_1px_2px_hsl(var(--surface-onyx)/0.18),0_8px_20px_hsl(var(--surface-onyx)/0.12)] hover:shadow-[0_2px_6px_hsl(var(--surface-onyx)/0.22),0_14px_30px_hsl(var(--surface-onyx)/0.18)]",
        accent:
          "bg-accent text-accent-foreground hover:bg-accent/90 shadow-[0_1px_2px_hsl(var(--accent)/0.30),0_10px_24px_hsl(var(--accent)/0.20)]",
        olive:
          "bg-olive text-olive-foreground hover:bg-olive/90 shadow-[0_1px_2px_hsl(var(--olive)/0.30),0_10px_24px_hsl(var(--olive)/0.20)]",
        rose:
          "bg-rose text-rose-foreground hover:bg-rose/90 shadow-[0_1px_2px_hsl(var(--rose)/0.30),0_10px_24px_hsl(var(--rose)/0.20)]",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-[0_1px_2px_hsl(var(--destructive)/0.30),0_10px_24px_hsl(var(--destructive)/0.20)]",
        outline:
          "border border-border/80 bg-transparent text-foreground hover:bg-surface-parchment hover:border-border",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-surface-parchment",
        ghost:
          "text-muted-foreground hover:text-foreground hover:bg-surface-parchment/70",
        link:
          "text-foreground underline-offset-[6px] decoration-accent decoration-2 hover:underline",
        success:
          "bg-success text-success-foreground hover:bg-success/90",
        warning:
          "bg-warning text-warning-foreground hover:bg-warning/90",
        info:
          "bg-info text-info-foreground hover:bg-info/90",
      },
      size: {
        default: "h-11 px-6",
        sm: "h-9 px-4 text-xs",
        lg: "h-12 px-8 text-base",
        xl: "h-14 px-10 text-base",
        icon: "h-10 w-10 rounded-full",
        xs: "h-8 px-3 text-xs",
        pill: "h-9 px-5 text-xs uppercase tracking-[0.18em]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

const Button = React.forwardRef(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };

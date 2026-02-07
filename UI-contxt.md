# VibeKit UI - Complete UI/UX Template Documentation

> This document serves as a comprehensive UI/UX reference for AI tools and developers to maintain consistent design patterns across projects.

---

## 1. Tech Stack & Frameworks

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 14.2.0 | App Router framework |
| React | 18.3.1 | UI library |
| TypeScript | 5.3.3 | Type safety |
| Tailwind CSS | 3.4.1 | Styling |
| Framer Motion | 11.0.0 | Animations |

---

## 2. UI Component Libraries

### Radix UI Primitives
- `@radix-ui/react-dialog` - Modals
- `@radix-ui/react-dropdown-menu` - Dropdowns
- `@radix-ui/react-tabs` - Tab navigation
- `@radix-ui/react-tooltip` - Tooltips
- `@radix-ui/react-scroll-area` - Custom scrollbars
- `@radix-ui/react-collapsible` - Collapsible sections
- `@radix-ui/react-separator` - Visual separators
- `@radix-ui/react-slot` - Polymorphic components

### Additional Tools
- **shadcn/ui** - Component registry (New York style)
- **Class Variance Authority (CVA)** v0.7.1 - Variant system
- **Lucide React** v0.344.0 - Icon library
- **next-themes** v0.4.6 - Dark/Light mode
- **clsx** - Conditional class names
- **tailwind-merge** - Merge Tailwind classes without conflicts

---

## 3. Color System

### Light Mode (`:root`)
```css
--background: 0 0% 100%;           /* White */
--foreground: 0 0% 3.9%;           /* Near-black */
--card: 0 0% 100%;                 /* White */
--card-foreground: 0 0% 3.9%;      /* Dark text */
--popover: 0 0% 100%;              /* White */
--popover-foreground: 0 0% 3.9%;   /* Dark text */
--primary: 0 0% 9%;                /* Very dark gray */
--primary-foreground: 0 0% 98%;    /* Almost white */
--secondary: 0 0% 96.1%;           /* Light gray */
--secondary-foreground: 0 0% 9%;   /* Dark text */
--muted: 0 0% 96.1%;               /* Neutral light gray */
--muted-foreground: 0 0% 45.1%;    /* Medium gray */
--accent: 0 0% 96.1%;              /* Light gray */
--accent-foreground: 0 0% 9%;      /* Dark text */
--destructive: 0 84.2% 60.2%;      /* Red */
--destructive-foreground: 0 0% 98%; /* White */
--border: 0 0% 89.8%;              /* Light border */
--input: 0 0% 89.8%;               /* Light input */
--ring: 0 0% 3.9%;                 /* Dark focus ring */
```

### Dark Mode (`.dark`)
```css
--background: 0 0% 3.9%;           /* Near-black */
--foreground: 0 0% 98%;            /* Almost white */
--card: 0 0% 3.9%;                 /* Very dark */
--card-foreground: 0 0% 98%;       /* White text */
--popover: 0 0% 3.9%;              /* Very dark */
--popover-foreground: 0 0% 98%;    /* White text */
--primary: 0 0% 98%;               /* Almost white */
--primary-foreground: 0 0% 9%;     /* Dark text */
--secondary: 0 0% 14.9%;           /* Dark gray */
--secondary-foreground: 0 0% 98%;  /* White text */
--muted: 0 0% 14.9%;               /* Dark gray */
--muted-foreground: 0 0% 63.9%;    /* Light gray */
--accent: 0 0% 14.9%;              /* Dark gray */
--accent-foreground: 0 0% 98%;     /* White text */
--destructive: 0 62.8% 30.6%;      /* Darker red */
--destructive-foreground: 0 0% 98%; /* White */
--border: 0 0% 14.9%;              /* Dark border */
--input: 0 0% 14.9%;               /* Dark input */
--ring: 0 0% 83.1%;                /* Light focus ring */
```

### Chart Colors
```css
/* Light Mode */
--chart-1: 12 76% 61%;    /* Orange */
--chart-2: 173 58% 39%;   /* Teal */
--chart-3: 197 37% 24%;   /* Dark blue */
--chart-4: 43 74% 66%;    /* Yellow */
--chart-5: 27 87% 67%;    /* Orange-red */

/* Dark Mode */
--chart-1: 220 70% 50%;   /* Blue */
--chart-2: 160 60% 45%;   /* Cyan */
--chart-3: 30 80% 55%;    /* Orange */
--chart-4: 280 65% 60%;   /* Purple */
--chart-5: 340 75% 55%;   /* Pink */
```

### Brand/Accent Colors
| Color | Hex Values | Tailwind Classes |
|-------|------------|------------------|
| Orange | `#ff6b4a`, `#F59E0B`, `#f5576c` | `orange-500`, `amber-500` |
| Pink | `#ec4899`, `#F43F5E`, `#f093fb` | `pink-500`, `rose-500` |
| Violet | `#8b5cf6`, `#6366F1`, `#667eea`, `#764ba2` | `violet-500`, `indigo-500` |
| Purple | `#a855f7`, `#ec4899` | `purple-500` |
| Blue | `#3b82f6`, `#0ea5e9`, `#4facfe` | `blue-500`, `sky-500` |
| Green | `#22c55e`, `#10B981`, `#43e97b` | `green-500`, `emerald-500` |
| Cyan | `#00f2fe`, `#38f9d7` | `cyan-400` |
| Yellow | `#F59E0B`, `#fbbf24` | `amber-500`, `yellow-400` |
| Gray | `#6b7280`, `#9ca3af`, `#d1d5db` | `gray-500`, `gray-400`, `gray-300` |

---

## 4. Typography

### Font Families
```css
/* System fonts - Body text */
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto',
    'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans',
    'Helvetica Neue', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Monospace - Code blocks */
code {
  font-family: source-code-pro, Menlo, Monaco, Consolas,
    'Courier New', monospace;
}
```

### Font Size Scale
| Usage | Tailwind Class | Approximate Size |
|-------|----------------|------------------|
| Hero heading | `text-6xl` | 60px |
| Page title | `text-4xl` | 36px |
| Section heading | `text-2xl` | 24px |
| Subsection | `text-xl` | 20px |
| Card title | `text-lg` | 18px |
| Body text | `text-base` | 16px |
| Description | `text-sm` | 14px |
| Code/Caption | `text-xs` | 12px |

### Font Weights
| Weight | Tailwind Class | Usage |
|--------|----------------|-------|
| 400 | `font-normal` | Body text |
| 500 | `font-medium` | Labels, buttons |
| 600 | `font-semibold` | Headings, emphasis |
| 700 | `font-bold` | Strong emphasis |

### Line Heights
| Type | Tailwind Class | Value |
|------|----------------|-------|
| Tight | `leading-tight` | 1.25 |
| Normal | `leading-normal` | 1.5 |
| Relaxed | `leading-relaxed` | 1.625 |

---

## 5. Design Tokens

### Border Radius
```css
--radius: 0.5rem;  /* Base: 8px */
```

| Token | Tailwind Class | Value |
|-------|----------------|-------|
| Large | `rounded-lg` | `var(--radius)` = 8px |
| Medium | `rounded-md` | `calc(var(--radius) - 2px)` = 6px |
| Small | `rounded-sm` | `calc(var(--radius) - 4px)` = 4px |
| Extra Large | `rounded-2xl` | 16px |
| Full | `rounded-full` | 9999px (circles) |

### Shadows
| Type | Tailwind Class | Usage |
|------|----------------|-------|
| Subtle | `shadow-sm` | Cards, inputs |
| Default | `shadow` | Elevated elements |
| Large | `shadow-lg` | Modals, dropdowns |
| Extra Large | `shadow-xl` | Prominent elements |
| Colored | `shadow-pink-500/30` | Glow effects |
| Colored | `shadow-violet-500/25` | Purple glow |

### Spacing Scale (Tailwind Default)
```
gap-1:  4px     p-1:  4px     m-1:  4px
gap-2:  8px     p-2:  8px     m-2:  8px
gap-3:  12px    p-3:  12px    m-3:  12px
gap-4:  16px    p-4:  16px    m-4:  16px
gap-5:  20px    p-5:  20px    m-5:  20px
gap-6:  24px    p-6:  24px    m-6:  24px
gap-8:  32px    p-8:  32px    m-8:  32px
gap-10: 40px    p-10: 40px    m-10: 40px
gap-12: 48px    p-12: 48px    m-12: 48px
```

---

## 6. Animation System

### Framer Motion Configuration

#### Spring Animation (Recommended for UI)
```typescript
transition: {
  type: 'spring',
  stiffness: 400,
  damping: 25,
}
```

#### Bounce Animation
```typescript
const bounceTransition = {
  duration: 0.5,
  repeat: Infinity,
  ease: "easeInOut"
}
```

#### Stagger Children
```typescript
// Delay each child by index
delay: index * 0.1

// Or use staggerChildren in variants
variants: {
  visible: {
    transition: {
      staggerChildren: 0.1
    }
  }
}
```

#### Fade In Animation
```typescript
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.3 }}
```

### Custom Tailwind Animations
```javascript
// tailwind.config.js
animation: {
  'spin-slow': 'spin 3s linear infinite',
  'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
}
```

### CSS Keyframe Animations
```css
/* Floating particles */
@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-20px); }
}

/* Robot bobbing */
@keyframes robotBob {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}

/* Fade in */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Bounce */
@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-25%); }
}
```

### Animation Timing Functions
| Name | Value | Usage |
|------|-------|-------|
| Ease In Out | `ease-in-out` | General transitions |
| Ease Out | `ease-out` | Exit animations |
| Linear | `linear` | Continuous (spinners) |
| Spring | `cubic-bezier(0.4, 0, 0.6, 1)` | Pulse effects |

---

## 7. Gradient Presets

### Background Gradients
```css
/* Purple/Violet - Primary brand */
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

/* Pink/Red - Accent/CTA */
background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);

/* Blue/Cyan - Info/Secondary */
background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);

/* Green/Cyan - Success */
background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);

/* Orange/Yellow - Warning */
background: linear-gradient(135deg, #f5576c 0%, #F59E0B 100%);
```

### Tailwind Gradient Classes
```tsx
// Purple to pink
className="bg-gradient-to-r from-violet-500 to-pink-500"

// Blue to cyan
className="bg-gradient-to-r from-blue-500 to-cyan-400"

// Multi-color brand gradient
className="bg-gradient-to-r from-orange-500 via-pink-500 to-violet-600"
```

### Text Gradients
```tsx
className="bg-gradient-to-r from-orange-500 via-pink-500 to-violet-600
           bg-clip-text text-transparent"
```

---

## 8. Special UI Effects

### Glassmorphism
```tsx
// Navbar/Header
className="bg-background/80 backdrop-blur-xl border-b border-border/40"

// Cards
className="bg-card/80 backdrop-blur-lg"

// Modals
className="bg-background/95 backdrop-blur-sm"
```

### Glow Effects
```tsx
// Pink glow
className="shadow-lg shadow-pink-500/30"

// Violet glow
className="shadow-xl shadow-violet-500/25"

// Blue glow
className="shadow-lg shadow-blue-500/20"
```

### 3D Tilt Effect (ProductCard)
```tsx
// Mouse tracking with perspective
style={{
  transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
  transition: 'transform 0.1s ease-out'
}}
```

### Hover Transformations
```tsx
// Scale up
className="hover:scale-105 transition-transform"

// Lift effect
className="hover:-translate-y-1 hover:shadow-lg transition-all"

// Color shift
className="hover:bg-primary/90 transition-colors"
```

---

## 9. Component Architecture

### Directory Structure
```
/components
├── /ui                      # Base UI components (Radix wrappers)
│   ├── alert.tsx
│   ├── badge.tsx
│   ├── button.tsx           # CVA variant system
│   ├── card.tsx             # Card, CardHeader, CardTitle, etc.
│   ├── collapsible.tsx
│   ├── dialog.tsx
│   ├── dropdown-menu.tsx
│   ├── input.tsx
│   ├── scroll-area.tsx
│   ├── separator.tsx
│   ├── sheet.tsx            # Mobile drawer
│   ├── table.tsx
│   ├── tabs.tsx
│   └── tooltip.tsx
├── DashboardLayout.tsx      # Layout with sidebar
├── Navbar.tsx               # Top navigation
├── theme-provider.tsx       # NextThemes wrapper
└── theme-toggle.tsx         # Light/Dark/System toggle

/app
├── /[component]/page.tsx    # Dynamic component pages
├── /docs/                   # Documentation
├── layout.tsx               # Root layout
├── page.tsx                 # Landing page
└── globals.css              # Global styles + CSS variables

/lib
├── component-registry.ts    # Component metadata
└── utils.ts                 # cn() utility function
```

### Component Categories
| Category | Components | Description |
|----------|------------|-------------|
| Loading | LoadingDots, Skeleton, Shimmer, ProgressBar | Loading states |
| Processing | DataProcessing, AiCreating, AiCreating2, PulseCircle | Data/AI animations |
| Chat | ChatBubble, ChatTyping, ChatMessage | Messaging UI |
| E-commerce | ProductCard, AddToCartButton, WishlistHeart, FlashSaleTimer, CartNotification | Shopping interactions |
| Auth | FloatingLogin | Authentication forms |
| Creative | CodeTyping | Special effects |

---

## 10. Utility Functions

### `cn()` - Class Name Merger
```typescript
// /lib/utils.ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Usage
className={cn(
  "base-styles",
  condition && "conditional-styles",
  className // Allow override from props
)}
```

### CVA (Class Variance Authority) Pattern
```typescript
import { cva, type VariantProps } from "class-variance-authority"

const buttonVariants = cva(
  // Base styles
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

// Component with variants
interface ButtonProps extends
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
```

---

## 11. Responsive Design

### Breakpoints (Tailwind Default)
| Breakpoint | Min Width | Usage |
|------------|-----------|-------|
| `sm` | 640px | Mobile landscape |
| `md` | 768px | Tablets |
| `lg` | 1024px | Desktop |
| `xl` | 1280px | Large desktop |
| `2xl` | 1536px | Extra large |

### Common Patterns
```tsx
// Hide on mobile, show on desktop
className="hidden lg:block"

// Show on mobile, hide on desktop
className="lg:hidden"

// Responsive grid
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"

// Responsive padding
className="p-4 md:p-6 lg:p-8"

// Responsive text
className="text-sm md:text-base lg:text-lg"
```

### Layout Components
```tsx
// Fixed sidebar (desktop only)
<aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:block lg:w-64">

// Mobile sheet drawer
<Sheet>
  <SheetTrigger className="lg:hidden">
    <Menu className="h-5 w-5" />
  </SheetTrigger>
  <SheetContent side="left">
    {/* Navigation */}
  </SheetContent>
</Sheet>
```

---

## 12. Dark Mode Implementation

### Theme Provider Setup
```tsx
// /components/theme-provider.tsx
"use client"
import { ThemeProvider as NextThemesProvider } from "next-themes"

export function ThemeProvider({ children, ...props }) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}

// /app/layout.tsx
<ThemeProvider
  attribute="class"
  defaultTheme="system"
  enableSystem
  disableTransitionOnChange
>
  {children}
</ThemeProvider>
```

### Theme Toggle Component
```tsx
"use client"
import { useTheme } from "next-themes"
import { Moon, Sun } from "lucide-react"

export function ThemeToggle() {
  const { setTheme, theme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => setTheme("light")}>Light</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>Dark</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>System</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

---

## 13. MCP Server Configuration

### `.mcp.json`
```json
{
  "mcpServers": {
    "shadcn": {
      "command": "npx",
      "args": ["shadcn@latest", "mcp"]
    }
  }
}
```

### Custom MCP Server Tools
| Tool | Description |
|------|-------------|
| `list_components` | List all components with optional category filter |
| `get_component` | Get detailed info, props, usage, source code |
| `add_component` | Add component to user's project |
| `get_install_command` | Get npm install command |
| `get_categories` | List all component categories |

### Build Commands
```bash
npm run build:mcp        # Build MCP server and CLI
npm run mcp              # Run: node dist/mcp/server.js
npm run mcp:dev          # Dev: npx tsx mcp/server.ts
```

---

## 14. Installation Commands

### Core Dependencies
```bash
# Framework
npm install next@14 react@18 react-dom@18 typescript

# Styling
npm install tailwindcss postcss autoprefixer
npm install tailwindcss-animate

# UI Components
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu
npm install @radix-ui/react-tabs @radix-ui/react-tooltip
npm install @radix-ui/react-scroll-area @radix-ui/react-collapsible
npm install @radix-ui/react-separator @radix-ui/react-slot

# Utilities
npm install class-variance-authority clsx tailwind-merge
npm install lucide-react next-themes

# Animations
npm install framer-motion
```

### shadcn/ui Setup
```bash
npx shadcn@latest init
npx shadcn@latest add button card dialog dropdown-menu
npx shadcn@latest add tabs tooltip sheet scroll-area
```

---

## 15. Code Patterns Reference

### Page Layout Template
```tsx
export default function ComponentPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-500 via-pink-500 to-violet-600 bg-clip-text text-transparent">
          Component Name
        </h1>
        <p className="text-muted-foreground mt-2">
          Component description here.
        </p>
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Controls */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Controls</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Control inputs */}
          </CardContent>
        </Card>

        {/* Preview */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Preview</CardTitle>
          </CardHeader>
          <CardContent className="min-h-[300px] flex items-center justify-center bg-muted/30 rounded-lg">
            {/* Component preview */}
          </CardContent>
        </Card>
      </div>

      {/* Code Section */}
      <div className="mt-8 grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-zinc-950 text-zinc-100 p-4 rounded-lg overflow-x-auto">
              <code>{usageCode}</code>
            </pre>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Installation</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-zinc-950 text-zinc-100 p-4 rounded-lg overflow-x-auto">
              <code>{installCode}</code>
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```

### Animated Component Template
```tsx
"use client"
import { motion } from "framer-motion"

interface AnimatedComponentProps {
  variant?: "default" | "secondary"
  size?: "sm" | "md" | "lg"
}

export function AnimatedComponent({
  variant = "default",
  size = "md"
}: AnimatedComponentProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 25,
      }}
      className={cn(
        "base-styles",
        variant === "secondary" && "secondary-styles",
        size === "sm" && "small-styles",
        size === "lg" && "large-styles",
      )}
    >
      {/* Content */}
    </motion.div>
  )
}
```

---

## Summary

This template provides a complete, production-ready UI/UX system featuring:

1. **Modern Stack**: Next.js 14 + React 18 + TypeScript
2. **Accessible Components**: Radix UI primitives with shadcn/ui styling
3. **Flexible Styling**: Tailwind CSS with CSS variables for theming
4. **Smooth Animations**: Framer Motion with spring physics
5. **Dark Mode**: Built-in with next-themes
6. **Type-Safe Variants**: CVA for component APIs
7. **AI Integration**: MCP server for component discovery

Use this document as a reference when building new applications to maintain consistent, high-quality UI/UX patterns.

# Frontend Development Rules (Archyra)

## IMPORTANT: Use Archyra MCP for ALL frontend/React work

When working on frontend code, components, hooks, or any React/TypeScript files, you MUST use the Archyra MCP tools. The guardrail rules are automatically enforced.

## Before Writing Any Component

1. Call `get_frontend_guidelines` to get the current rules
2. Or read the `archyra://guidelines` resource

## Creating Components

Use the Archyra MCP tools:
- `generate_hook` - Create React Query hooks
- `generate_service` - Create API service files
- `initialize_project` - Setup folder structure

Or use the prompts:
- `create-component` - Creates component with guardrail rules
- `create-hook` - Creates hook with proper patterns

## Mandatory Rules

These rules are ALWAYS enforced:

### File Limits
- Components: 150 lines max
- Hooks: 100 lines max
- Services: 200 lines max

### Forbidden Patterns
- NO fetch()/axios in components - use services + React Query
- NO useState for server data - use useQuery
- NO `any` type - use proper TypeScript types
- NO useEffect for data fetching

### Required Patterns
- Use React Query for server state
- Put API calls in services/ folder
- Put hooks in hooks/ folder
- Clean up effects (AbortController, clearInterval)
- Use "use client" for Next.js client components

### Folder Structure
```
src/
├── components/ui/       # shadcn/ui only
├── components/shared/   # Reusable components
├── components/feature/  # Feature-specific
├── hooks/              # React Query hooks
├── services/           # API services (no React)
├── types/              # TypeScript types
└── lib/                # Utilities
```

### Data Flow
```
Component → Hook (useQuery) → Service → API
```

## Analysis Tools

Before committing, use:
- `analyze_component` - Check for violations
- `check_memory_leak` - Detect memory leaks
- `validate_react_query` - Check React Query usage
- `enforce_structure` - Validate folder structure

## Framework Detection

Archyra auto-detects your framework:
- `vite.config.ts` → React + Vite
- `next.config.js` → Next.js

The appropriate rules are applied automatically.

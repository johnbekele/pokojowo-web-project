# GitHub Copilot Instructions - Frontend (Archyra)

When generating frontend/React code, follow these Archyra guardrail rules:

## Component Rules
- Maximum 150 lines per component
- No fetch() or axios calls in components
- No useState for server/API data
- No `any` type - use proper TypeScript
- Use React Query (useQuery/useMutation) for data fetching

## File Organization
- components/ui/ - UI primitives (shadcn/ui)
- components/shared/ - Reusable components
- hooks/ - React Query hooks
- services/ - API calls (no React imports)
- types/ - TypeScript definitions

## Data Fetching Pattern
Always use this pattern:
1. Service file handles fetch logic
2. Hook wraps service with useQuery
3. Component uses hook

## Example
```typescript
// services/user.service.ts
export const userService = {
  getById: async (id: string) => {
    const res = await fetch(`/api/users/${id}`);
    return res.json();
  }
};

// hooks/useUser.ts
export function useUser(id: string) {
  return useQuery({
    queryKey: ['user', id],
    queryFn: () => userService.getById(id),
  });
}

// Component uses useUser hook
```

# Responsive Hooks & Utilities

## `useMobile`

Detects if the current device is mobile based on a configurable breakpoint (default: Tailwind 'sm' 640px).

**Usage:**

```tsx
import { useMobile } from "@/lib/hooks";
const isMobile = useMobile(); // Uses 640px by default
// or useMobile(768) for a custom breakpoint
```

**Returns:** `boolean` — `true` if below the breakpoint.

---

## `useMediaQuery`

Checks if a custom media query matches.

**Usage:**

```tsx
import { useMediaQuery } from "@/lib/hooks";
const isLarge = useMediaQuery("(min-width: 1024px)");
```

**Returns:** `boolean` — `true` if the query matches.

---

## Breakpoints Utility

Predefined Tailwind CSS breakpoints and helpers.

**Usage:**

```tsx
import { BREAKPOINTS, getBreakpointQuery } from "@/lib/utils/breakpoints";
const query = getBreakpointQuery("lg", "min"); // (min-width: 1024px)
```

**BREAKPOINTS:**

- `sm`: 640
- `md`: 768
- `lg`: 1024
- `xl`: 1280
- `2xl`: 1536

**getBreakpointQuery(breakpoint, type):**

- `breakpoint`: one of the keys above
- `type`: 'min' | 'max' (default: 'min')

---

## Example: Responsive Component

```tsx
import { useMobile, useMediaQuery } from "@/lib/hooks";
import { BREAKPOINTS, getBreakpointQuery } from "@/lib/utils/breakpoints";

export function ResponsiveDemo() {
  const isMobile = useMobile();
  const isTablet =
    useMediaQuery(getBreakpointQuery("md", "min")) &&
    !useMediaQuery(getBreakpointQuery("lg", "min"));
  const isDesktop = useMediaQuery(getBreakpointQuery("lg", "min"));

  return (
    <div>
      {isMobile && "Mobile"}
      {isTablet && "Tablet"}
      {isDesktop && "Desktop"}
    </div>
  );
}
```

---

## Features

- SSR-safe (no hydration issues)
- Debounced for performance
- Event listener cleanup
- TypeScript support
- Tailwind CSS integration
- Comprehensive tests

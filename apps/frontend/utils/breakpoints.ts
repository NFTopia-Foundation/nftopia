// Tailwind CSS default breakpoints
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
};

export type BreakpointKey = keyof typeof BREAKPOINTS;

// Helper to get media query string for a breakpoint
export function getBreakpointQuery(
  breakpoint: BreakpointKey,
  type: "min" | "max" = "min"
) {
  const px = BREAKPOINTS[breakpoint];
  return `(${type}-width: ${px}px)`;
}

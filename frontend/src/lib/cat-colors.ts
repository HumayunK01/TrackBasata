// Category colors live as `--cat-N` CSS variables in index.css so each
// theme gets its own palette (pastels on dark, deeper tones on light).
const CAT_COUNT = 16;

export const CAT_COLORS = Array.from(
  { length: CAT_COUNT },
  (_, i) => `hsl(var(--cat-${i}))`,
);

// Returns a stable color for a given category key so the same
// category always gets the same color regardless of list order.
function hashKey(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) {
    h = (Math.imul(31, h) + key.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function colorForKey(key: string): string {
  return CAT_COLORS[hashKey(key) % CAT_COLORS.length];
}

// Translucent variant of a palette color, e.g. withAlpha(clr, 0.15).
// Works on the `hsl(var(--cat-N))` strings above; hex/other colors
// are returned unchanged.
export function withAlpha(color: string, alpha: number): string {
  if (color.startsWith("hsl(") && color.endsWith(")")) {
    return `${color.slice(0, -1)} / ${alpha})`;
  }
  return color;
}

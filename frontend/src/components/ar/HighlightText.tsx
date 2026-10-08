
interface HighlightTextProps {
  text: string | null | undefined;
  query: string | null | undefined;
  className?: string;
  highlightClassName?: string;
}

export function HighlightText({
  text,
  query,
  className,
  highlightClassName = "bg-primary/20 text-primary dark:bg-primary/30 dark:text-primary font-semibold rounded-xs px-0.5",
}: HighlightTextProps) {
  if (!text) return null;
  const q = query?.trim();
  if (!q) return <span className={className}>{text}</span>;

  // Extract query tokens (words and digit sequences)
  const rawTokens = q.split(/\s+/).filter(Boolean);
  const tokenSet = new Set<string>();

  for (const t of rawTokens) {
    const clean = t.replace(/[^\w]/g, "");
    if (clean.length > 0) tokenSet.add(clean);

    // If token has digits (like a pasted fax 6239306060), also extract 3+ digit chunks
    const digits = t.replace(/\D/g, "");
    if (digits.length >= 6) {
      if (digits.length === 10) {
        tokenSet.add(digits.slice(0, 3));
        tokenSet.add(digits.slice(3, 6));
        tokenSet.add(digits.slice(6));
      } else {
        tokenSet.add(digits.slice(0, 3));
        tokenSet.add(digits.slice(-4));
      }
    } else if (digits.length >= 3) {
      tokenSet.add(digits);
    }
  }

  const tokens = Array.from(tokenSet).filter((t) => t.length > 0);
  if (tokens.length === 0) return <span className={className}>{text}</span>;

  // Longest tokens first
  tokens.sort((a, b) => b.length - a.length);

  const pattern = tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const regex = new RegExp(`(${pattern})`, "gi");

  const parts = text.split(regex);

  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (!part) return null;
        const matches = tokens.some((t) => t.toLowerCase() === part.toLowerCase());
        if (matches) {
          return (
            <mark key={i} className={highlightClassName}>
              {part}
            </mark>
          );
        }
        return part;
      })}
    </span>
  );
}

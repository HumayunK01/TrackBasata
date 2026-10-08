import { toast } from "sonner";
import type { Facility } from "@/hooks/useFacilities";

// Beautifies a US fax number for display: (623) 930-6060.
export function formatFax(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return raw;
}

// E.164 for dialing/copying: +16239306060.
export function toE164(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return raw;
}

export function copyFax(f: Facility): Promise<void> {
  return navigator.clipboard
    .writeText(toE164(f.fax_number))
    .then(() => {
      toast.success(`${f.name} Fax copied`, {
        description: toE164(f.fax_number),
      });
    })
    .catch(() => {
      toast.error("Couldn't copy — select the number manually");
    });
}

export function logoSrc(url: string): string {
  return window.location.protocol === "https:" ? `/api/logo?url=${encodeURIComponent(url)}` : url;
}

// ── Dynamic & Fuzzy Facility Search ─────────────────────────────────────────

export type FacilityStatusFilter = "all" | "verified" | "unverified";

export function normalizeSearchText(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "") // ignore apostrophes so "St. Mary's" matches "marys" or "mary"
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function singleEditDistance(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  if (a === b) return true;

  if (a.length === b.length) {
    let diff = 0;
    let idx1 = -1;
    let idx2 = -1;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) {
        diff++;
        if (diff === 1) idx1 = i;
        else if (diff === 2) idx2 = i;
        else return false;
      }
    }
    if (diff === 1) return true; // 1 substitution
    if (
      diff === 2 &&
      idx2 === idx1 + 1 &&
      a[idx1] === b[idx2] &&
      a[idx2] === b[idx1]
    ) {
      return true; // 1 adjacent transposition (e.g. pheonix -> phoenix)
    }
    return false;
  }

  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  let i = 0;
  let j = 0;
  let diff = 0;
  while (i < longer.length && j < shorter.length) {
    if (longer[i] !== shorter[j]) {
      diff++;
      if (diff > 1) return false;
      i++;
    } else {
      i++;
      j++;
    }
  }
  return true;
}

function isFuzzyMatch(target: string, token: string): boolean {
  if (target.startsWith(token)) return true;
  if (singleEditDistance(target, token)) return true;

  // Check singular/base word if target ends in 's' (e.g. childrens -> children)
  if (target.endsWith("s") && target.length > 3) {
    const base = target.slice(0, -1);
    if (base.startsWith(token) || singleEditDistance(base, token)) return true;
  }

  // Check prefix of target with same length (for prefixes with a typo)
  if (target.length > token.length) {
    const targetSlice = target.slice(0, token.length);
    if (singleEditDistance(targetSlice, token)) return true;
  }

  return false;
}

/**
 * Evaluates match quality across name, fax number, and address.
 * Returns a score > 0 if all query tokens match, or 0 if non-matching.
 */
export function scoreFacilityMatch(f: Facility, query: string): number {
  const cleanQ = query.trim().toLowerCase();
  if (!cleanQ) return 1;

  const normName = normalizeSearchText(f.name);
  const normAddr = normalizeSearchText(f.address ?? "");
  const normQuery = normalizeSearchText(cleanQ);

  const rawFax = f.fax_number.toLowerCase();
  const faxDigits = f.fax_number.replace(/\D/g, "");
  const queryDigits = cleanQ.replace(/\D/g, "");

  // Highest priority: Exact full matches
  if (normName === normQuery) return 1000;
  if (faxDigits && queryDigits && faxDigits === queryDigits) return 950;
  if (normName.startsWith(normQuery)) return 800;

  const tokens = normQuery.split(" ").filter(Boolean);
  if (tokens.length === 0) return 0;

  const nameWords = normName.split(" ").filter(Boolean);
  const addrWords = normAddr.split(" ").filter(Boolean);
  const acronym = nameWords.map((w) => w[0]).join("");

  let totalScore = 0;

  // Every token must match somewhere (name, fax, or address)
  for (const token of tokens) {
    const tokenDigits = token.replace(/\D/g, "");
    let tokenMatched = false;
    let tokenScore = 0;

    // 1. Fax match (digit-based or raw)
    if (tokenDigits.length >= 3 && faxDigits.includes(tokenDigits)) {
      tokenMatched = true;
      if (faxDigits.endsWith(tokenDigits)) {
        tokenScore = Math.max(tokenScore, 350); // typed line digits
      } else if (faxDigits.startsWith(tokenDigits)) {
        tokenScore = Math.max(tokenScore, 300); // typed area code
      } else {
        tokenScore = Math.max(tokenScore, 250);
      }
    } else if (rawFax.includes(token)) {
      tokenMatched = true;
      tokenScore = Math.max(tokenScore, 200);
    }

    // 2. Name match (exact, prefix, word prefix, acronym, or fuzzy)
    if (normName.includes(token)) {
      tokenMatched = true;
      if (nameWords.some((w) => w.startsWith(token))) {
        tokenScore = Math.max(tokenScore, 220);
      } else {
        tokenScore = Math.max(tokenScore, 160);
      }
    } else if (token.length >= 2 && acronym.length >= 2 && (acronym === token || acronym.startsWith(token))) {
      tokenMatched = true;
      tokenScore = Math.max(tokenScore, 180);
    }

    // 3. Address match (street, city, state, zip)
    if (normAddr.includes(token)) {
      tokenMatched = true;
      if (addrWords.some((w) => w.startsWith(token))) {
        tokenScore = Math.max(tokenScore, 120);
      } else {
        tokenScore = Math.max(tokenScore, 90);
      }
    }

    // 4. Fuzzy fallback for minor typos (words length >= 4)
    if (!tokenMatched && token.length >= 4 && !tokenDigits) {
      if (nameWords.some((w) => isFuzzyMatch(w, token))) {
        tokenMatched = true;
        tokenScore = Math.max(tokenScore, 130);
      } else if (addrWords.some((w) => isFuzzyMatch(w, token))) {
        tokenMatched = true;
        tokenScore = Math.max(tokenScore, 70);
      }
    }

    if (!tokenMatched) {
      return 0; // All tokens must match
    }

    totalScore += tokenScore;
  }

  // Bonus if entire phrase appears contiguously in name or address
  if (normName.includes(normQuery)) totalScore += 100;
  if (normAddr.includes(normQuery)) totalScore += 50;

  // Verified facilities get a slight boost
  if (f.verified) totalScore += 5;

  return totalScore;
}

export function filterAndRankFacilities(
  facilities: Facility[],
  query: string,
  statusFilter: FacilityStatusFilter = "all"
): Facility[] {
  const statusFiltered = facilities.filter((f) => {
    if (statusFilter === "verified" && !f.verified) return false;
    if (statusFilter === "unverified" && f.verified) return false;
    return true;
  });

  const q = query.trim();
  if (!q) {
    return [...statusFiltered].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base", numeric: true })
    );
  }

  const scored: { facility: Facility; score: number }[] = [];
  for (const f of statusFiltered) {
    const score = scoreFacilityMatch(f, q);
    if (score > 0) {
      scored.push({ facility: f, score });
    }
  }

  return scored
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.facility.name.localeCompare(b.facility.name, undefined, {
        sensitivity: "base",
        numeric: true,
      });
    })
    .map((s) => s.facility);
}


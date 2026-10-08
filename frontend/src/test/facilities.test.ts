/**
 * Facilities schema verification.
 *
 * Mirrors the Zod schema + logo-cleaning in src/hooks/useFacilities.ts (kept
 * byte-identical; the source file isn't importable in tests because it pulls
 * in the supabase client). Same tripwire convention as security-claims.test.ts.
 */
import { describe, it, expect } from "vitest";
import { z } from "zod";

// Mirrors src/hooks/useFacilities.ts:14-28
const FacilitySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200, "Name too long"),
  fax_number: z.string().trim().min(1, "Fax number is required").max(50, "Fax number too long"),
  logo_url: z
    .string()
    .trim()
    .max(2000, "Logo URL too long")
    .regex(/^https?:\/\//i, "Logo must be a valid http(s) URL")
    .optional()
    .or(z.literal("")),
  address: z.string().trim().max(500, "Address too long").optional().or(z.literal("")),
});

const KEEP_UPPER = new Set(
  "N S E W NE NW SE SW US PO USA II III IV DC AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY".split(
    " ",
  ),
);

// Mirrors src/hooks/useFacilities.ts formatAddress
export function formatAddress(raw: string): string {
  let s = raw
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim().replace(/,+$/, ""))
    .filter(Boolean)
    .join(", ")
    .replace(/\s*,\s*/g, ", ")
    .trim();
  s = s.replace(/(\p{L})(?=\d)/gu, "$1 ");
  s = s.replace(/\p{L}+/gu, (w) => {
    if (KEEP_UPPER.has(w.toUpperCase())) return w.toUpperCase();
    let t = w[0].toUpperCase() + w.slice(1).toLowerCase();
    if (t.length > 2 && t.startsWith("Mc")) t = "Mc" + t[2].toUpperCase() + t.slice(3);
    return t;
  });
  return s.trim();
}

// Mirrors src/hooks/useFacilities.ts cleanLogo
function cleanLogo(input: z.infer<typeof FacilitySchema>) {
  return {
    ...input,
    logo_url: input.logo_url ? input.logo_url : null,
    address: input.address ? formatAddress(input.address) || null : null,
  };
}

// Mirrors src/pages/Facilities.tsx:48-59
function formatFax(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return raw;
}

// Mirrors src/pages/Facilities.tsx:62-70
function toE164(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return raw;
}

describe("Facilities fax number formatting", () => {
  it("formats a plain 10-digit number", () => {
    expect(formatFax("6239306060")).toBe("(623) 930-6060");
  });

  it("formats a number with existing punctuation", () => {
    expect(formatFax("623-930-6060")).toBe("(623) 930-6060");
  });

  it("formats an 11-digit number with country code", () => {
    expect(formatFax("16239306060")).toBe("(623) 930-6060");
  });

  it("leaves non-10/11-digit numbers untouched", () => {
    expect(formatFax("ext. 2101")).toBe("ext. 2101");
  });

  it("copies a 10-digit number in E.164 form", () => {
    expect(toE164("(623) 930-6060")).toBe("+16239306060");
  });

  it("copies an 11-digit number in E.164 form", () => {
    expect(toE164("1623-930-6060")).toBe("+16239306060");
  });

  it("leaves non-10/11-digit numbers untouched when copying", () => {
    expect(toE164("ext. 2101")).toBe("ext. 2101");
  });
});

describe("Facilities input validation", () => {
  it("rejects a missing name", () => {
    const r = FacilitySchema.safeParse({ name: " ", fax_number: "555-0100", logo_url: "" });
    expect(r.success).toBe(false);
  });

  it("rejects a missing fax number", () => {
    const r = FacilitySchema.safeParse({ name: "Phoenix Heart", fax_number: "", logo_url: "" });
    expect(r.success).toBe(false);
  });

  it("rejects a javascript: logo URL", () => {
    const r = FacilitySchema.safeParse({ name: "Phoenix Heart", fax_number: "555-0100", logo_url: "javascript:alert(1)" });
    expect(r.success).toBe(false);
  });

  it("accepts a valid facility and normalizes an empty logo to null", () => {
    const r = FacilitySchema.safeParse({ name: "Phoenix Heart", fax_number: "(602) 555-0134", logo_url: "" });
    expect(r.success).toBe(true);
    if (r.success) expect(cleanLogo(r.data).logo_url).toBeNull();
  });
});

describe("Facilities address formatting", () => {
  it("formats the exact pasted example: glue fix, newline join, title case, nothing stripped", () => {
    const raw = "BANNER ESTRELLA MEDICAL CENTER9201 W Thoms Rd\nPhoenix, AZ 85037-3332";
    expect(formatAddress(raw)).toBe(
      "Banner Estrella Medical Center 9201 W Thoms Rd, Phoenix, AZ 85037-3332",
    );
  });

  it("title-cases an all-caps address and keeps state/directional abbrevs", () => {
    expect(formatAddress("9201 W THOMS RD, PHOENIX, AZ 85037")).toBe(
      "9201 W Thoms Rd, Phoenix, AZ 85037",
    );
  });

  it("keeps PO uppercase but titles the rest", () => {
    expect(formatAddress("PO BOX 1234")).toBe("PO Box 1234");
  });

  it("splits letter-digit paste glue and joins newline lines with commas", () => {
    expect(formatAddress("Suite 200B\nChandler, AZ")).toBe("Suite 200B, Chandler, AZ");
    expect(formatAddress("Rd9201")).toBe("Rd 9201");
  });

  it("keeps McX capitalized", () => {
    expect(formatAddress("MCDOWELL RD")).toBe("McDowell Rd");
  });

  it("returns empty string for whitespace-only address", () => {
    expect(formatAddress("   \n  ")).toBe("");
  });

  it("cleanLogo normalizes empty address to null and formats a present one", () => {
    const empty = FacilitySchema.safeParse({ name: "X", fax_number: "5", logo_url: "", address: "   " });
    if (empty.success) expect(cleanLogo(empty.data).address).toBeNull();
    const filled = FacilitySchema.safeParse({ name: "PHX", fax_number: "5", logo_url: "", address: "9201 W THOMS RD" });
    if (filled.success) expect(cleanLogo(filled.data).address).toBe("9201 W Thoms Rd");
  });
});

import {
  filterAndRankFacilities,
  scoreFacilityMatch,
  normalizeSearchText,
} from "@/components/ar/facilities/facility-utils";
import type { Facility } from "@/hooks/useFacilities";

const mockFacility = (overrides: Partial<Facility> = {}): Facility => ({
  id: "fac-1",
  name: "Banner Estrella Medical Center",
  fax_number: "(623) 930-6060",
  address: "9201 W Thomas Rd, Phoenix, AZ 85037",
  logo_url: null,
  verified: true,
  created_by: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

describe("Dynamic Facility Search & Ranking", () => {
  it("normalizes text by stripping accents, apostrophes, and punctuation", () => {
    expect(normalizeSearchText("St. Mary's Hospital!")).toBe("st marys hospital");
    expect(normalizeSearchText("Café & Clinic")).toBe("cafe clinic");
  });

  it("matches across multiple fields simultaneously (name + city)", () => {
    const f1 = mockFacility({ name: "Banner Health", address: "Phoenix, AZ" });
    const f2 = mockFacility({ name: "Cedars Sinai", address: "Los Angeles, CA" });

    const results = filterAndRankFacilities([f1, f2], "banner phoenix");
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("Banner Health");
  });

  it("matches unformatted digits against formatted fax numbers", () => {
    const f = mockFacility({ name: "St. Jude", fax_number: "(901) 595-3300" });
    // Pure digits
    expect(scoreFacilityMatch(f, "9015953300")).toBeGreaterThan(0);
    // Area code
    expect(scoreFacilityMatch(f, "901")).toBeGreaterThan(0);
    // Line number (last 4 digits)
    expect(scoreFacilityMatch(f, "3300")).toBeGreaterThan(0);
  });

  it("handles minor typos via fuzzy matching", () => {
    const f = mockFacility({ name: "Phoenix Children's Hospital", address: "Phoenix, AZ" });
    // Typo: transposition "pheonix" -> "phoenix"
    expect(scoreFacilityMatch(f, "pheonix")).toBeGreaterThan(0);
    // Typo: deletion "childrn" -> "children"
    expect(scoreFacilityMatch(f, "childrn")).toBeGreaterThan(0);
  });

  it("matches acronyms for multi-word clinic names", () => {
    const f = mockFacility({ name: "Children's Hospital Los Angeles" });
    expect(scoreFacilityMatch(f, "chla")).toBeGreaterThan(0);
  });

  it("ranks exact matches higher than partial or fuzzy matches", () => {
    const exact = mockFacility({ id: "1", name: "Mayo Clinic", address: "Phoenix, AZ" });
    const partial = mockFacility({ id: "2", name: "Mayo Clinic Specialty Pharmacy", address: "Phoenix, AZ" });
    const other = mockFacility({ id: "3", name: "Phoenix Heart Clinic", address: "Mayo Blvd, Phoenix, AZ" });

    const results = filterAndRankFacilities([other, partial, exact], "mayo clinic");
    expect(results[0].id).toBe("1");
    expect(results[1].id).toBe("2");
  });

  it("returns all facilities sorted alphabetically when query is empty", () => {
    const fA = mockFacility({ id: "a", name: "Arrowhead Health" });
    const fZ = mockFacility({ id: "z", name: "Zion Medical" });
    const fM = mockFacility({ id: "m", name: "Mayo Clinic" });

    const results = filterAndRankFacilities([fZ, fA, fM], "");
    expect(results.map((f) => f.name)).toEqual(["Arrowhead Health", "Mayo Clinic", "Zion Medical"]);
  });
});

import { render } from "@testing-library/react";
import { HighlightText } from "@/components/ar/HighlightText";
import React from "react";

describe("HighlightText", () => {
  it("wraps matched tokens in <mark> elements", () => {
    const { container } = render(
      React.createElement(HighlightText, {
        text: "Banner Estrella Medical Center",
        query: "banner center",
      })
    );
    const marks = container.querySelectorAll("mark");
    expect(marks).toHaveLength(2);
    expect(marks[0].textContent).toBe("Banner");
    expect(marks[1].textContent).toBe("Center");
  });

  it("highlights digits in formatted phone numbers", () => {
    const { container } = render(
      React.createElement(HighlightText, {
        text: "(623) 930-6060",
        query: "623 6060",
      })
    );
    const marks = container.querySelectorAll("mark");
    expect(marks).toHaveLength(2);
    expect(marks[0].textContent).toBe("623");
    expect(marks[1].textContent).toBe("6060");
  });

  it("renders plain text when query is empty", () => {
    const { container } = render(
      React.createElement(HighlightText, {
        text: "Mayo Clinic",
        query: "",
      })
    );
    expect(container.querySelectorAll("mark")).toHaveLength(0);
    expect(container.textContent).toBe("Mayo Clinic");
  });
});
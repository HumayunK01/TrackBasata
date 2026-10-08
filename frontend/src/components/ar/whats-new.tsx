import { useEffect, useState, type ReactNode } from "react";
import { format } from "date-fns";
import { Bell, Sparkles, Clock } from "@/components/ui/icons";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useWhatsNewReads, useMarkWhatsNewRead } from "@/hooks/useWhatsNewReads";
import { APP_VERSION } from "@/lib/version";
import { cn } from "@/lib/utils";

export interface WhatsNewEntry {
  id: string;
  date: string; // ISO yyyy-MM-dd
  title: string;
  description: string;
  body: ReactNode[];
}

// ── Entries (newest first) ────────────────────────────────────────────────
export const WHATS_NEW_ENTRIES: WhatsNewEntry[] = [
  {
    id: "version-2-0-1-mini",
    date: "2026-09-22",
    title: "Inbox Process Guide",
    description:
      "A comprehensive, interactive intake guide featuring step-by-step flowcharts, document routing rules, and approved label references.",
    body: [
      (
        <>
          <strong className="text-foreground font-semibold">Step-by-Step Flowcharts:</strong> Interactive visual decision trees for all core intake workflows — including ROI medical records requests, Indexable documents, single-patient EKG and Cath Lab routing, Patient Referrals with incomplete document checks, and Archive rules.
        </>
      ),
      (
        <>
          <strong className="text-foreground font-semibold">Document Routing Guide:</strong> Instant search and lookup across clinical document types, showing exact NextGen categories, description conventions, and step-by-step bucket paths.
        </>
      ),
      (
        <>
          <strong className="text-foreground font-semibold">Approved Labels & Test Patients:</strong> Quick-reference directory of all 29 approved inbox labels and test patient account details with one-click copying for fast chart verification.
        </>
      ),
      (
        <>
          <strong className="text-foreground font-semibold">One-Click Compliance Actions:</strong> Built-in 1-click copy buttons for standard faxback responses, complete routing sequences, and clinical refax notices.
        </>
      ),
    ],
  },
  {
    id: "version-2-0-0-major",
    date: "2026-09-19",
    title: "Basata Tracker 2.0",
    description:
      "A complete modernization of Basata Tracker featuring our unified emerald design system, redesigned workflows, streamlined settings, and improved navigation.",
    body: [
      (
        <>
          <strong className="text-foreground font-semibold">Unified Emerald Design:</strong> A streamlined, modern aesthetic with glassmorphism, refined typography, and brand-consistent emerald accents across all pages and dialogs.
        </>
      ),
      (
        <>
          <strong className="text-foreground font-semibold">Redesigned Workstation:</strong> Upgraded Vault, Facility Management, Team views, and Login experience with responsive layouts and crisp vector iconography.
        </>
      ),
      (
        <>
          <strong className="text-foreground font-semibold">Interactive Settings & Preferences:</strong> Reimagined settings workspace with spring-animated navigation tabs, quick timezone switching, and document category management.
        </>
      ),
      (
        <>
          <strong className="text-foreground font-semibold">Performance & Polish:</strong> Faster page transitions, zero layout shift, seamless dark and light modes, and improved accessibility.
        </>
      ),
    ],
  },
  {
    id: "version-1-3-1-themes",
    date: "2026-09-10",
    title: "Modern & Legacy Theme",
    description:
      "Seamlessly switch between our sleek Modern Theme and the familiar Legacy Theme, with full Light Mode support across all views.",
    body: [
      (
        <>
          <strong className="text-foreground font-semibold">Theme Switching:</strong> Click the palette icon in the top navigation bar to switch between our sleek <strong className="text-foreground font-semibold">Modern Theme</strong> and the familiar <strong className="text-foreground font-semibold">Legacy Theme</strong>.
        </>
      ),
      (
        <>
          <strong className="text-foreground font-semibold">Full Light Mode Support:</strong> High-clarity light mode across both themes featuring crisp white canvases, clean table headers, and distraction-free contrast.
        </>
      ),
      (
        <>
          <strong className="text-foreground font-semibold">Unified Navigation:</strong> Standardized logo sizing, streamlined layout, and responsive controls across the entire workspace.
        </>
      ),
    ],
  },
  {
    id: "whats-new-panel",
    date: "2026-09-03",
    title: "See what's new, right in the app",
    description:
      "A new bell icon in the top bar shows you what's changed — both updates to your practice's setup and improvements across Basata.",
    body: [
      <>Until now, when something changed, you may not have heard about it.</>,
      (
        <>
          Click the bell in the top bar to open the <em>What&apos;s New</em> panel. It has two tabs:
        </>
      ),
      (
        <>
          <strong className="text-foreground font-semibold">For your team</strong> — changes specific to your practice, like a new view or a change to one of your workflows.
        </>
      ),
      (
        <>
          <strong className="text-foreground font-semibold">Across Basata</strong> — improvements that go out to everyone using Basata.
        </>
      ),
      (
        <>
          Unread items show a dot next to them. Opening one marks it read for you only, so on a shared workstation you won&apos;t clear your colleagues&apos; list — and your read state follows you to any computer you sign in from.
        </>
      ),
      (
        <>
          The first time there&apos;s something new for you, the panel opens on its own, once. After that it stays out of the way until there&apos;s something newer. Your work stays visible behind it, and closing it puts you right back where you were.
        </>
      ),
    ],
  },
  {
    id: "facilities-verified-addresses",
    date: "2026-09-01",
    title: "Facilities: verified and addressed",
    description: "You can now mark facilities as verified and keep their addresses on file.",
    body: [
      <>Verified facilities show a badge, so the team knows the details were checked.</>,
      <>Addresses appear neatly formatted on the facility card.</>,
    ],
  },
  {
    id: "fresh-look",
    date: "2026-08-28",
    title: "A fresh look",
    description: "New app logo and icons across Basata Tracker.",
    body: [],
  },
  {
    id: "entries-auto-save",
    date: "2026-08-20",
    title: "Entries save themselves",
    description: "Your entries save automatically as you work, so nothing gets lost.",
    body: [
      <>Keep typing or tapping as usual. Changes are stored on their own, no save button needed.</>,
    ],
  },
  {
    id: "faxed-back-faster",
    date: "2026-08-10",
    title: "Faxed Back, faster",
    description: "The Faxed Back page now loads faster, even with lots of documents.",
    body: [],
  },
];

export function unreadIds(entries: WhatsNewEntry[], read: string[]): string[] {
  return entries.filter((e) => !read.includes(e.id)).map((e) => e.id);
}

export function groupEntriesByDate(entries: WhatsNewEntry[]): [string, WhatsNewEntry[]][] {
  const groups = new Map<string, WhatsNewEntry[]>();
  for (const entry of entries) {
    const list = groups.get(entry.date);
    if (list) list.push(entry);
    else groups.set(entry.date, [entry]);
  }
  return [...groups.entries()];
}

const AUTO_OPEN_KEY = "whats_new_auto_opened";

function readAutoOpened(): string {
  try {
    return localStorage.getItem(AUTO_OPEN_KEY) ?? "";
  } catch {
    return "";
  }
}

function writeAutoOpened(id: string) {
  try {
    localStorage.setItem(AUTO_OPEN_KEY, id);
  } catch {
    // storage blocked: harmless
  }
}

function longDate(iso: string): string {
  return format(new Date(`${iso}T12:00:00Z`), "d MMMM yyyy").toUpperCase();
}

function shortDate(iso: string): string {
  return format(new Date(`${iso}T12:00:00Z`), "MMM d");
}

function EntryCard({
  entry,
  unread,
  isNew,
  expanded,
  onToggle,
}: {
  entry: WhatsNewEntry;
  unread: boolean;
  isNew: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border transition-all duration-200 p-4 space-y-3 shadow-2xs group",
        expanded
          ? "border-emerald-500/40 bg-card/90 shadow-xs"
          : "border-border/60 bg-muted/20 hover:bg-muted/40 hover:border-border/80"
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-start gap-3 text-left cursor-pointer"
      >
        <div
          className={cn(
            "size-7 rounded-lg flex items-center justify-center shrink-0 transition-colors mt-0.5",
            expanded
              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
              : "bg-muted text-muted-foreground group-hover:text-foreground"
          )}
        >
          <Sparkles className="size-3.5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13px] font-semibold text-foreground tracking-tight group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              {entry.title}
            </span>
            {isNew ? (
              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide bg-emerald-600 text-white px-1.5 py-0.5 rounded-full shadow-xs shadow-emerald-600/20">
                New
              </span>
            ) : (
              unread && (
                <span className="shrink-0 size-2 rounded-full bg-emerald-500 animate-pulse" aria-label="Unread" />
              )
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70 font-medium mt-0.5">
            <Clock className="size-3" />
            <span>{shortDate(entry.date)}</span>
          </div>
        </div>

        <div
          className={cn(
            "size-6 rounded-md flex items-center justify-center text-muted-foreground transition-all shrink-0 mt-0.5",
            expanded ? "text-emerald-600 dark:text-emerald-400" : "group-hover:text-foreground"
          )}
        >
          <ChevronDown
            className={cn(
              "size-4 transition-transform duration-200",
              expanded ? "rotate-180" : "rotate-0"
            )}
            strokeWidth={1.75}
          />
        </div>
      </button>

      <p className="text-xs text-muted-foreground leading-relaxed pl-10">
        {entry.description}
      </p>

      {expanded && entry.body.length > 0 && (
        <div className="ml-10 pt-2.5 border-t border-border/50 space-y-2.5 text-xs text-foreground/80 leading-relaxed">
          {entry.body.map((paragraph, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="size-1 rounded-full bg-emerald-500 mt-2 shrink-0" />
              <div className="flex-1">{paragraph}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function WhatsNewButton({ className }: { className?: string } = {}) {
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(WHATS_NEW_ENTRIES[0].id);
  const { data: reads = [], isSuccess: readsLoaded } = useWhatsNewReads();
  const markRead = useMarkWhatsNewRead();

  const unread = unreadIds(WHATS_NEW_ENTRIES, reads);
  const hasNew = unread.length > 0 && !open;

  // Auto-open once: only when there is something unread and this device has
  // not auto-opened for the newest entry yet.
  useEffect(() => {
    if (!readsLoaded || unread.length === 0) return;
    const newest = WHATS_NEW_ENTRIES[0].id;
    if (readAutoOpened() === newest) return;
    setOpen(true);
    writeAutoOpened(newest);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readsLoaded, reads]);

  const toggleEntry = (id: string) => {
    setExpandedId((current) => (current === id ? null : id));
    if (!reads.includes(id)) markRead.mutate(id);
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "relative h-7 w-7 text-foreground/85 hover:text-foreground hover:bg-background/80 dark:hover:bg-white/10 rounded-md transition-colors [&_svg]:!size-[18px]",
          className
        )}
        onClick={() => setOpen(true)}
        title="What's new"
        aria-label="What's new"
      >
        <Bell className="size-[18px]" />
        {hasNew && (
          <span className="absolute top-1 right-1 size-1.5 rounded-full bg-emerald-500 ring-2 ring-background animate-pulse" aria-hidden />
        )}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="p-0 gap-0 flex flex-col w-full sm:max-w-[420px] bg-card/95 backdrop-blur-2xl border-l border-border/70 shadow-2xl"
        >
          {/* Header */}
          <SheetHeader className="px-4 py-3 border-b border-border/60 text-left">
            <div className="flex items-center gap-2.5 pr-8">
              <div className="size-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Sparkles className="size-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <SheetTitle className="text-sm font-bold font-heading text-foreground tracking-tight">
                    What&apos;s new
                  </SheetTitle>
                  {unread.length > 0 && (
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                      {unread.length} new
                    </span>
                  )}
                </div>
                <SheetDescription className="text-[11px] text-muted-foreground leading-none mt-0.5">
                  Here&apos;s what changed recently.
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {/* Timeline Feed */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
            {groupEntriesByDate(WHATS_NEW_ENTRIES).map(([date, entries]) => (
              <section key={date} className="space-y-3">
                <div className="flex items-center gap-2.5 pt-1">
                  <span className="size-1.5 rounded-full bg-emerald-500/80" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground font-mono">
                    {longDate(date)}
                  </span>
                  <div className="h-px flex-1 bg-border/50" />
                </div>

                <div className="space-y-2.5">
                  {entries.map((entry) => (
                    <EntryCard
                      key={entry.id}
                      entry={entry}
                      unread={!reads.includes(entry.id)}
                      isNew={entry.id === WHATS_NEW_ENTRIES[0].id && !reads.includes(entry.id)}
                      expanded={expandedId === entry.id}
                      onToggle={() => toggleEntry(entry.id)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border/60 bg-muted/20 flex items-center justify-between text-[11px] text-muted-foreground shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              <span>Basata Release Feed</span>
            </div>
            <span className="font-mono text-muted-foreground/70">{APP_VERSION}</span>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Cookie,
  ShieldCheck,
  Trash2,
  ArrowLeft,
  Printer,
  ChevronRight,
  Sliders,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppLogo } from "@/components/ar/AppLogo";
import { useTheme } from "@/hooks/useTheme";
import { Sun, Moon } from "@/components/ui/icons";
import { useAuth } from "@/hooks/useAuth";
import { useLenis } from "@/hooks/useLenis";
import { triggerLightPrint, registerPrintThemeSync } from "@/lib/printUtils";
import { toast } from "sonner";

interface StorageItem {
  key: string;
  category: "Essential" | "Functional" | "Performance";
  purpose: string;
  storage: "HTTP Cookie / LocalStorage" | "LocalStorage" | "IndexedDB" | "IndexedDB / LocalStorage";
  duration: string;
  canDisable: boolean;
}

const STORAGE_INVENTORY: StorageItem[] = [
  {
    key: "sb-*-auth-token",
    category: "Essential",
    purpose: "Stores JWT access and refresh tokens to verify your login session with Supabase.",
    storage: "LocalStorage",
    duration: "Session / Persistent until sign-out",
    canDisable: false,
  },
  {
    key: "trackbasata-theme",
    category: "Functional",
    purpose: "Remembers your dark studio or light theme aesthetic preference.",
    storage: "LocalStorage",
    duration: "Persistent",
    canDisable: true,
  },
  {
    key: "sidebar:state",
    category: "Functional",
    purpose: "Stores whether the navigation sidebar is collapsed or expanded.",
    storage: "LocalStorage",
    duration: "Persistent",
    canDisable: true,
  },
  {
    key: "hrms_reminder_dismissed_*",
    category: "Functional",
    purpose: "Suppresses shift reminder notifications once acknowledged for the workday.",
    storage: "LocalStorage",
    duration: "Single Workday",
    canDisable: true,
  },
  {
    key: "REACT_QUERY_OFFLINE_CACHE",
    category: "Performance",
    purpose: "Maintains local indexed state for fast tab navigation and offline resilience.",
    storage: "IndexedDB / LocalStorage",
    duration: "24 hours",
    canDisable: true,
  },
  {
    key: "trackbasata_audio_feedback",
    category: "Functional",
    purpose: "Remembers whether tactile indexing audio clicks are enabled or muted.",
    storage: "LocalStorage",
    duration: "30 days",
    canDisable: true,
  },
];

export default function CookiesPolicyPage() {
  useLenis();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const [clearing, setClearing] = useState(false);
  const [detectedStorageCount, setDetectedStorageCount] = useState(0);

  useEffect(() => {
    try {
      setDetectedStorageCount(Object.keys(localStorage).length);
    } catch {
      setDetectedStorageCount(0);
    }
    return registerPrintThemeSync();
  }, []);

  const handleClearPreferences = () => {
    setClearing(true);
    try {
      const keysToKeep = ["sb-calghfwmypuqrydprscx-auth-token"]; // Keep auth token so user isn't abruptly kicked
      const allKeys = Object.keys(localStorage);
      let clearedCount = 0;

      for (const k of allKeys) {
        if (!k.includes("auth-token") && !keysToKeep.includes(k)) {
          localStorage.removeItem(k);
          clearedCount++;
        }
      }

      setDetectedStorageCount(Object.keys(localStorage).length);
      toast.success(`Cleared ${clearedCount} non-essential preference items. Default settings restored.`);
    } catch {
      toast.error("Failed to clear local browser storage.");
    } finally {
      setClearing(false);
    }
  };

  const handlePrint = () => {
    triggerLightPrint();
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20 print:bg-white print:text-black">
      {/* Top Header */}
      <header className="sticky top-0 z-30 h-14 border-b border-border bg-sidebar shrink-0 px-4 sm:px-8 lg:px-12 flex items-center justify-between print:static print:h-auto print:px-0 print:py-2.5 print:border-b print:border-gray-300 print:bg-transparent">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md">
            <AppLogo className="h-7 w-auto max-w-[130px] object-contain print:h-6" />
          </Link>
          <span className="text-[11px] font-semibold tracking-wider text-muted-foreground/70 uppercase px-2 py-0.5 rounded-full bg-muted/50 border border-border/50 hidden sm:inline-block print:inline-block print:border-gray-300 print:bg-gray-100 print:text-gray-800">
            Storage Transparency
          </span>
        </div>

        {/* Interactive buttons - Hidden when printing */}
        <div className="flex items-center gap-2 print:hidden">
          {/* Header Utility Toolbar */}
          <div className="h-9 flex items-center gap-1 bg-muted/40 dark:bg-white/[0.04] px-1.5 rounded-lg border border-border/60 backdrop-blur-xs">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrint}
              className="h-7 px-2.5 gap-1.5 rounded-md text-foreground/85 hover:text-foreground hover:bg-background/80 dark:hover:bg-white/10 transition-colors text-xs font-medium cursor-pointer hidden sm:inline-flex"
              title="Print Policy"
              aria-label="Print Policy"
            >
              <Printer className="size-3.5 text-muted-foreground" />
              <span>Print</span>
            </Button>

            <div className="h-4 w-px bg-border/60 hidden sm:block" />

            <Button
              variant="ghost"
              size="icon"
              onClick={toggle}
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              className="h-7 w-7 rounded-md text-foreground/85 hover:text-foreground hover:bg-background/80 dark:hover:bg-white/10 transition-colors [&_svg]:!size-[18px] cursor-pointer"
            >
              {theme === "dark" ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
            </Button>
          </div>

          <div className="h-4 w-px bg-border/60 mx-0.5 hidden sm:block" />

          {/* Back Action Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(user ? "/console" : "/")}
            className="h-9 px-3 gap-2 rounded-lg border-border/60 bg-muted/30 dark:bg-white/[0.03] hover:bg-muted/70 dark:hover:bg-white/[0.08] hover:border-border text-foreground text-xs font-semibold shadow-xs cursor-pointer transition-all"
          >
            <ArrowLeft className="size-3.5 text-muted-foreground" />
            <span>{user ? "Back to Dashboard" : "Back to Sign In"}</span>
          </Button>
        </div>
      </header>

      {/* Hero Banner */}
      <div className="border-b border-border/60 bg-gradient-to-b from-card/60 to-background py-5 sm:py-6 px-4 sm:px-8 lg:px-12 w-full print:bg-transparent print:px-0 print:py-3 print:border-b print:border-gray-300">
        <div className="w-full space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-2xs font-mono font-medium print:border-gray-300 print:text-gray-800 print:bg-gray-100">
            <Cookie className="size-3" />
            <span>Zero Third-Party Ad Trackers • Strictly Functional</span>
          </div>
          <h1 className="font-heading text-lg sm:text-xl font-bold tracking-tight text-foreground print:text-black">
            Cookie &amp; Local Storage Policy
          </h1>
          <p className="text-xs text-muted-foreground w-full leading-relaxed print:text-gray-700">
            TrackBasata adheres to privacy-by-design principles. We do not use advertising cookies, marketing trackers, or cross-site profiling pixels. We only store data strictly necessary for security, session verification, and your personal UI preferences.
          </p>
          <div className="flex flex-wrap items-center gap-3 text-2xs font-mono text-muted-foreground pt-1 print:text-gray-600">
            <span>Last Updated: October 22, 2026</span>
            <span className="print:hidden">•</span>
            <Link to="/terms" className="text-primary hover:underline flex items-center gap-1 print:hidden">
              Terms of Service <ChevronRight className="size-3" />
            </Link>
            <span className="print:hidden">•</span>
            <Link to="/privacy" className="text-primary hover:underline flex items-center gap-1 print:hidden">
              Privacy Policy <ChevronRight className="size-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Content Body */}
      <main className="w-full px-4 sm:px-8 lg:px-12 py-6 flex-1 space-y-5 text-xs leading-relaxed text-foreground/90 print:px-0 print:py-3 print:space-y-3.5 print:text-gray-900">
        {/* Core Guarantee Card */}
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex flex-col sm:flex-row items-start gap-3 break-inside-avoid print:break-inside-avoid print:bg-gray-50 print:border-gray-300 print:p-3.5">
          <ShieldCheck className="size-4.5 text-emerald-500 shrink-0 mt-0.5 print:text-gray-800" />
          <div className="space-y-1 text-xs">
            <h2 className="font-heading font-semibold text-foreground text-xs sm:text-sm print:text-black">Our Privacy Guarantee</h2>
            <p className="text-muted-foreground leading-relaxed print:text-gray-700">
              We <strong className="text-foreground print:text-black">NEVER</strong> sell your data, monetize your browsing history, or embed third-party tracking scripts such as Facebook Pixel, Google Ads, or advertising data brokers. Every byte stored in your browser exists solely to make this personal operational tool function securely.
            </p>
          </div>
        </div>

        {/* Section 1: What Are Cookies */}
        <section className="p-4 sm:p-5 rounded-xl border border-border/70 bg-card shadow-2xs space-y-2 w-full break-inside-avoid print:break-inside-avoid print:border-gray-300 print:bg-white print:p-3.5 print:shadow-none">
          <h2 className="text-xs sm:text-sm font-heading font-semibold text-foreground print:text-black">1. What Are Cookies and Local Storage?</h2>
          <p className="text-xs text-muted-foreground leading-relaxed print:text-gray-700">
            Cookies are small text files placed on your computer or device by websites that you visit. Modern web applications also use client-side storage mechanisms such as <strong className="text-foreground print:text-black">HTML5 LocalStorage</strong>, <strong className="text-foreground print:text-black">SessionStorage</strong>, and <strong className="text-foreground print:text-black">IndexedDB</strong> to store application state locally on your machine rather than re-transmitting it across the network on every user interaction.
          </p>
        </section>

        {/* Section 2: Storage Inventory Table */}
        <section className="p-4 sm:p-5 rounded-xl border border-border/70 bg-card shadow-2xs space-y-3 w-full break-inside-avoid print:break-inside-avoid print:border-gray-300 print:bg-white print:p-3.5 print:shadow-none">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-xs sm:text-sm font-heading font-semibold text-foreground print:text-black">2. Complete Storage Inventory</h2>
            <span className="text-2xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border/60 print:border-gray-300 print:bg-gray-100 print:text-gray-800">
              {STORAGE_INVENTORY.length} items cataloged
            </span>
          </div>
          <p className="text-xs text-muted-foreground print:text-gray-700">
            The table below lists every cookie, local storage key, and cache mechanism used on TrackBasata:
          </p>

          <div className="border border-border/60 rounded-lg overflow-x-auto text-2xs print:border-gray-300">
            <table className="w-full text-left min-w-[580px] print:min-w-0 print:border-collapse">
              <thead className="bg-muted/60 text-muted-foreground font-mono print:bg-gray-100 print:text-black">
                <tr>
                  <th className="p-2.5 print:border print:border-gray-300">Key / Storage Identifier</th>
                  <th className="p-2.5 print:border print:border-gray-300">Category</th>
                  <th className="p-2.5 print:border print:border-gray-300">Mechanism</th>
                  <th className="p-2.5 print:border print:border-gray-300">Duration</th>
                  <th className="p-2.5 print:border print:border-gray-300">Purpose</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 print:divide-gray-300">
                {STORAGE_INVENTORY.map((item) => (
                  <tr key={item.key} className="hover:bg-muted/20 transition-colors print:border-b print:border-gray-300">
                    <td className="p-2.5 font-mono font-medium text-foreground print:text-black print:border-r print:border-gray-300">{item.key}</td>
                    <td className="p-2.5 print:border-r print:border-gray-300">
                      <span
                        className={`inline-flex items-center px-1.5 py-0.2 rounded-full text-2xs font-mono font-medium print:bg-gray-100 print:text-gray-900 print:border-gray-300 ${item.category === "Essential"
                            ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                            : item.category === "Performance"
                              ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                              : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          }`}
                      >
                        {item.category}
                      </span>
                    </td>
                    <td className="p-2.5 text-muted-foreground font-mono print:text-gray-700 print:border-r print:border-gray-300">{item.storage}</td>
                    <td className="p-2.5 text-muted-foreground print:text-gray-700 print:border-r print:border-gray-300">{item.duration}</td>
                    <td className="p-2.5 text-muted-foreground leading-normal print:text-gray-700">{item.purpose}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 3: Interactive Preference Manager */}
        <section className="p-4 sm:p-5 rounded-xl border border-border/70 bg-card shadow-2xs space-y-3 w-full break-inside-avoid print:break-inside-avoid print:border-gray-300 print:bg-white print:p-3.5 print:shadow-none">
          <div className="flex items-center gap-2.5">
            <div className="size-7 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0 print:border-gray-300 print:bg-gray-100 print:text-gray-800">
              <Sliders className="size-3.5" />
            </div>
            <h2 className="text-xs sm:text-sm font-heading font-semibold text-foreground print:text-black">3. Manage Your Local Storage &amp; Preferences</h2>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed print:text-gray-700">
            You maintain full sovereignty over your browser storage. You can wipe all functional preference keys (such as dark/light mode and cached views) using the action button below without terminating your active login session:
          </p>

          <div className="p-3.5 rounded-lg border border-border/60 bg-muted/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 print:border-gray-300 print:bg-gray-50/60">
            <div className="space-y-0.5">
              <span className="font-semibold text-xs text-foreground block print:text-black">
                Local Storage Inventory on This Machine
              </span>
              <p className="text-2xs text-muted-foreground font-mono print:text-gray-600">
                Currently holding {detectedStorageCount} keys in browser storage.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={clearing}
              onClick={handleClearPreferences}
              className="h-8 px-3 rounded-lg border-border/70 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 text-xs font-semibold transition-colors cursor-pointer shrink-0 print:hidden"
            >
              <Trash2 className="size-3.5 mr-1.5" />
              <span>Reset Functional Preferences</span>
            </Button>
          </div>
        </section>

        {/* Section 4: Browser Settings Instructions */}
        <section className="p-4 sm:p-5 rounded-xl border border-border/70 bg-card shadow-2xs space-y-2 w-full break-inside-avoid print:break-inside-avoid print:border-gray-300 print:bg-white print:p-3.5 print:shadow-none">
          <h2 className="text-xs sm:text-sm font-heading font-semibold text-foreground print:text-black">4. How to Block or Remove Cookies via Browser</h2>
          <p className="text-xs text-muted-foreground leading-relaxed print:text-gray-700">
            Most web browsers allow you to manage or completely block cookies through their system settings. Note that disabling strictly necessary authentication storage will prevent you from signing in to TrackBasata:
          </p>
          <ul className="list-disc pl-4 space-y-1 text-xs text-muted-foreground print:text-gray-700">
            <li><strong className="text-foreground print:text-black">Google Chrome:</strong> Settings &gt; Privacy and security &gt; Third-party cookies &gt; See all site data and permissions.</li>
            <li><strong className="text-foreground print:text-black">Mozilla Firefox:</strong> Settings &gt; Privacy &amp; Security &gt; Cookies and Site Data &gt; Manage Data.</li>
            <li><strong className="text-foreground print:text-black">Apple Safari:</strong> Settings &gt; Privacy &gt; Manage Website Data &gt; Remove All.</li>
            <li><strong className="text-foreground print:text-black">Microsoft Edge:</strong> Settings &gt; Cookies and site permissions &gt; Manage and delete cookies and site data.</li>
          </ul>
        </section>

        {/* Section 5: Inquiries */}
        <section className="p-4 sm:p-5 rounded-xl border border-border/70 bg-card shadow-2xs space-y-2 w-full break-inside-avoid print:break-inside-avoid print:border-gray-300 print:bg-white print:p-3.5 print:shadow-none">
          <h2 className="text-xs sm:text-sm font-heading font-semibold text-foreground print:text-black">5. Questions &amp; Support</h2>
          <p className="text-xs text-muted-foreground leading-relaxed print:text-gray-700">
            If you have questions regarding this personal tool or its use of local browser storage, reach out through the project's repository issue tracker or your developer contact.
          </p>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/60 bg-muted/20 py-4 px-4 sm:px-8 lg:px-12 text-center text-2xs text-muted-foreground w-full print:px-0 print:py-2.5 print:border-t print:border-gray-300 print:bg-transparent print:text-gray-600">
        <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <span>&copy; {new Date().getFullYear()} TrackBasata (Personal Project). All rights reserved.</span>
          <div className="flex items-center gap-3 print:hidden">
            <Link to="/terms" className="text-muted-foreground hover:text-foreground hover:underline">Terms of Service</Link>
            <span>•</span>
            <Link to="/privacy" className="text-muted-foreground hover:text-foreground hover:underline">Privacy Policy</Link>
            <span>•</span>
            <Link to="/cookies" className="text-foreground font-medium hover:underline">Cookie Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

import { Link, useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  Lock,
  FileText,
  User,
  Server,
  ArrowLeft,
  Printer,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Database,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppLogo } from "@/components/ar/AppLogo";
import { useTheme } from "@/hooks/useTheme";
import { Sun, Moon } from "@/components/ui/icons";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLenis } from "@/hooks/useLenis";
import { triggerLightPrint, registerPrintThemeSync } from "@/lib/printUtils";

export default function PrivacyPolicyPage() {
  useLenis();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();

  useEffect(() => {
    return registerPrintThemeSync();
  }, []);

  const handlePrint = () => {
    triggerLightPrint();
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20 print:bg-white print:text-black">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 h-14 border-b border-border bg-sidebar shrink-0 px-4 sm:px-8 lg:px-12 flex items-center justify-between print:static print:h-auto print:px-0 print:py-2.5 print:border-b print:border-gray-300 print:bg-transparent">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md">
            <AppLogo className="h-7 w-auto max-w-[130px] object-contain print:h-6" />
          </Link>
          <span className="text-[11px] font-semibold tracking-wider text-muted-foreground/70 uppercase px-2 py-0.5 rounded-full bg-muted/50 border border-border/50 hidden sm:inline-block print:inline-block print:border-gray-300 print:bg-gray-100 print:text-gray-800">
            Privacy Notice
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
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-2xs font-mono font-medium print:border-gray-300 print:text-gray-800 print:bg-gray-100">
            <User className="size-3" />
            <span>Personal Productivity Project • Independent Tool</span>
          </div>
          <h1 className="font-heading text-lg sm:text-xl font-bold tracking-tight text-foreground print:text-black">
            Privacy Policy &amp; Usage Information
          </h1>
          <p className="text-xs text-muted-foreground w-full leading-relaxed print:text-gray-700">
            TrackBasata is a personal, independent productivity and work-tracking tool created by an individual developer to log daily tasks, account triage, and operational notes on the job. It is not affiliated with, operated by, or endorsed by any corporation, employer, or third-party entity.
          </p>
          <div className="flex flex-wrap items-center gap-3 text-2xs font-mono text-muted-foreground pt-1 print:text-gray-600">
            <span>Effective Date: January 1, 2026</span>
            <span>•</span>
            <span>Last Updated: October 22, 2026</span>
            <span className="print:hidden">•</span>
            <Link to="/terms" className="text-primary hover:underline flex items-center gap-1 print:hidden">
              Terms of Service <ChevronRight className="size-3" />
            </Link>
            <span className="print:hidden">•</span>
            <Link to="/cookies" className="text-primary hover:underline flex items-center gap-1 print:hidden">
              Cookie Policy <ChevronRight className="size-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content Body */}
      <main className="w-full px-4 sm:px-8 lg:px-12 py-6 flex-1 space-y-5 text-xs leading-relaxed text-foreground/90 print:px-0 print:py-3 print:space-y-3.5 print:text-gray-900">
        {/* Section 1: Nature of the Project */}
        <section id="nature" className="scroll-mt-20 space-y-2.5 p-4 sm:p-5 rounded-xl border border-border/70 bg-card shadow-2xs w-full break-inside-avoid print:break-inside-avoid print:border-gray-300 print:bg-white print:p-3.5 print:shadow-none">
          <div className="flex items-center gap-2.5 text-foreground font-heading font-semibold text-xs sm:text-sm print:text-black">
            <div className="size-7 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0 print:border-gray-300 print:bg-gray-100 print:text-gray-800">
              <User className="size-3.5" />
            </div>
            <h2>1. Personal Project &amp; Non-Affiliation Disclaimer</h2>
          </div>
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs text-foreground/90 flex items-start gap-2 print:border-gray-300 print:bg-gray-50 print:text-gray-900">
            <CheckCircle2 className="size-3.5 text-primary shrink-0 mt-0.5 print:text-gray-800" />
            <div className="leading-relaxed">
              <strong>Independent Personal Tool:</strong> TrackBasata is a personal project developed and maintained by an individual developer strictly to assist with personal work organization, task tracking, and daily productivity on the job.
            </div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed print:text-gray-700">
            TrackBasata is <strong className="text-foreground print:text-black">not</strong> an enterprise commercial service, nor is it associated with, sponsored by, or operated on behalf of any company, healthcare institution, corporate employer, or third party (including basata.ai). Any trade names, product references, or external identifiers used in the application are purely descriptive and remain the property of their respective owners.
          </p>
        </section>

        {/* Section 2: What Information Is Logged */}
        <section id="collection" className="scroll-mt-20 space-y-2.5 p-4 sm:p-5 rounded-xl border border-border/70 bg-card shadow-2xs w-full break-inside-avoid print:break-inside-avoid print:border-gray-300 print:bg-white print:p-3.5 print:shadow-none">
          <div className="flex items-center gap-2.5 text-foreground font-heading font-semibold text-xs sm:text-sm print:text-black">
            <div className="size-7 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0 print:border-gray-300 print:bg-gray-100 print:text-gray-800">
              <Database className="size-3.5" />
            </div>
            <h2>2. Information You Enter &amp; How It Is Used</h2>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed print:text-gray-700">
            The application only processes data that you directly input for your personal productivity workflows:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1 w-full print:grid-cols-2 print:gap-2">
            <div className="p-3 rounded-lg border border-border/50 bg-background/50 space-y-1 break-inside-avoid print:break-inside-avoid print:border-gray-300 print:bg-gray-50/60">
              <span className="font-semibold text-xs text-foreground block print:text-black">A. Account Credentials</span>
              <p className="text-2xs text-muted-foreground leading-relaxed print:text-gray-600">
                Your email address and securely hashed password used solely for authentication and session recovery via Supabase Auth.
              </p>
            </div>
            <div className="p-3 rounded-lg border border-border/50 bg-background/50 space-y-1 break-inside-avoid print:break-inside-avoid print:border-gray-300 print:bg-gray-50/60">
              <span className="font-semibold text-xs text-foreground block print:text-black">B. Daily Productivity Logs &amp; Counts</span>
              <p className="text-2xs text-muted-foreground leading-relaxed print:text-gray-600">
                Daily completion tallies, category breakdowns, and custom productivity numbers you record during your shift.
              </p>
            </div>
            <div className="p-3 rounded-lg border border-border/50 bg-background/50 space-y-1 break-inside-avoid print:break-inside-avoid print:border-gray-300 print:bg-gray-50/60">
              <span className="font-semibold text-xs text-foreground block print:text-black">C. Task Tracking &amp; Step Notes</span>
              <p className="text-2xs text-muted-foreground leading-relaxed print:text-gray-600">
                Account reference numbers, step completion checklists, and operational notes you save to keep track of your pending queue.
              </p>
            </div>
            <div className="p-3 rounded-lg border border-border/50 bg-background/50 space-y-1 break-inside-avoid print:break-inside-avoid print:border-gray-300 print:bg-gray-50/60">
              <span className="font-semibold text-xs text-foreground block print:text-black">D. Personal UI Preferences</span>
              <p className="text-2xs text-muted-foreground leading-relaxed print:text-gray-600">
                Interface settings such as dark/light studio theme, time zone choices, and sound effects stored directly in your browser's local storage.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3: Zero Data Selling */}
        <section id="no-sale" className="scroll-mt-20 space-y-2.5 p-4 sm:p-5 rounded-xl border border-border/70 bg-card shadow-2xs w-full break-inside-avoid print:break-inside-avoid print:border-gray-300 print:bg-white print:p-3.5 print:shadow-none">
          <div className="flex items-center gap-2.5 text-foreground font-heading font-semibold text-xs sm:text-sm print:text-black">
            <div className="size-7 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0 print:border-gray-300 print:bg-gray-100 print:text-gray-800">
              <Lock className="size-3.5" />
            </div>
            <h2>3. Zero Commercial Exploitation &amp; No Data Sharing</h2>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed print:text-gray-700">
            Your personal logs are strictly yours. This application does not engage in commercial data monetization:
          </p>
          <ul className="list-disc pl-4 space-y-1 text-xs text-muted-foreground print:text-gray-700">
            <li><strong className="text-foreground print:text-black">No Advertising:</strong> There are zero third-party ads, tracking pixels (like Google Ads or Meta Pixel), or behavioral marketing trackers.</li>
            <li><strong className="text-foreground print:text-black">No Sale or Brokerage:</strong> Your entries and email are never sold, rented, leased, or disclosed to data brokers or third parties.</li>
            <li><strong className="text-foreground print:text-black">No External AI Training:</strong> Your private work logs are not harvested to train commercial AI foundation models.</li>
          </ul>
        </section>

        {/* Section 4: Security & Database Infrastructure */}
        <section id="security" className="scroll-mt-20 space-y-2.5 p-4 sm:p-5 rounded-xl border border-border/70 bg-card shadow-2xs w-full break-inside-avoid print:break-inside-avoid print:border-gray-300 print:bg-white print:p-3.5 print:shadow-none">
          <div className="flex items-center gap-2.5 text-foreground font-heading font-semibold text-xs sm:text-sm print:text-black">
            <div className="size-7 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0 print:border-gray-300 print:bg-gray-100 print:text-gray-800">
              <ShieldCheck className="size-3.5" />
            </div>
            <h2>4. Security &amp; Infrastructure</h2>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed print:text-gray-700">
            Even as a personal project, sensible technical safeguards are built in to protect your data:
          </p>
          <div className="space-y-1.5 text-xs text-muted-foreground print:text-gray-700">
            <div className="flex items-start gap-2">
              <span className="font-mono font-bold text-primary shrink-0 print:text-gray-800">1.</span>
              <span><strong className="text-foreground print:text-black">Encryption in Transit:</strong> All communication between your browser and the database enforces HTTPS / TLS 1.3 encryption.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-mono font-bold text-primary shrink-0 print:text-gray-800">2.</span>
              <span><strong className="text-foreground print:text-black">Row-Level Security (RLS):</strong> The Postgres database enforces strict Row Level Security rules so that each authenticated user can only access their own records.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-mono font-bold text-primary shrink-0 print:text-gray-800">3.</span>
              <span><strong className="text-foreground print:text-black">Encrypted Cloud Storage:</strong> Data is hosted on Supabase (PostgreSQL), which provides industry-standard physical and data-at-rest encryption.</span>
            </div>
          </div>
        </section>

        {/* Section 5: Data Ownership & Deletion */}
        <section id="retention" className="scroll-mt-20 space-y-2.5 p-4 sm:p-5 rounded-xl border border-border/70 bg-card shadow-2xs w-full break-inside-avoid print:break-inside-avoid print:border-gray-300 print:bg-white print:p-3.5 print:shadow-none">
          <div className="flex items-center gap-2.5 text-foreground font-heading font-semibold text-xs sm:text-sm print:text-black">
            <div className="size-7 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0 print:border-gray-300 print:bg-gray-100 print:text-gray-800">
              <Trash2 className="size-3.5" />
            </div>
            <h2>5. Data Sovereignty &amp; Account Deletion</h2>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed print:text-gray-700">
            You maintain complete control over your information at all times:
          </p>
          <ul className="list-disc pl-4 space-y-1 text-xs text-muted-foreground print:text-gray-700">
            <li><strong className="text-foreground print:text-black">Full Editing &amp; Deletion:</strong> You can edit or delete any daily log, triage step, or counter record directly in the workstation.</li>
            <li><strong className="text-foreground print:text-black">Complete Account Deletion:</strong> You can permanently wipe your account and all associated records at any time from the Settings &gt; Danger Zone tab.</li>
            <li><strong className="text-foreground print:text-black">Local Storage Reset:</strong> You can clear all browser preferences and cached data at any time via the Cookie Policy page.</li>
          </ul>
        </section>

        {/* Section 6: Third-Party Infrastructure */}
        <section id="services" className="scroll-mt-20 space-y-2.5 p-4 sm:p-5 rounded-xl border border-border/70 bg-card shadow-2xs w-full break-inside-avoid print:break-inside-avoid print:border-gray-300 print:bg-white print:p-3.5 print:shadow-none">
          <div className="flex items-center gap-2.5 text-foreground font-heading font-semibold text-xs sm:text-sm print:text-black">
            <div className="size-7 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0 print:border-gray-300 print:bg-gray-100 print:text-gray-800">
              <Server className="size-3.5" />
            </div>
            <h2>6. Third-Party Infrastructure Providers</h2>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed print:text-gray-700">
            This personal application relies on standard cloud infrastructure platforms for hosting and database storage:
          </p>
          <div className="border border-border/60 rounded-lg overflow-hidden text-2xs print:border-gray-300">
            <table className="w-full text-left print:border-collapse">
              <thead className="bg-muted/60 text-muted-foreground font-mono print:bg-gray-100 print:text-black">
                <tr>
                  <th className="p-2.5 print:border print:border-gray-300">Service Provider</th>
                  <th className="p-2.5 print:border print:border-gray-300">Role</th>
                  <th className="p-2.5 print:border print:border-gray-300">Data Processed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 print:divide-gray-300">
                <tr className="print:border-b print:border-gray-300">
                  <td className="p-2.5 font-medium text-foreground print:text-black print:border-r print:border-gray-300">Supabase, Inc.</td>
                  <td className="p-2.5 text-muted-foreground print:text-gray-700 print:border-r print:border-gray-300">Managed PostgreSQL Database &amp; Auth</td>
                  <td className="p-2.5 text-muted-foreground print:text-gray-700">User account email, password hashes, and user-entered productivity logs</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-medium text-foreground print:text-black print:border-r print:border-gray-300">Cloud Hosting / CDN</td>
                  <td className="p-2.5 text-muted-foreground print:text-gray-700 print:border-r print:border-gray-300">Static Frontend Asset Delivery</td>
                  <td className="p-2.5 text-muted-foreground print:text-gray-700">Standard ephemeral HTTP connection logs (IP address, browser user-agent)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 7: Limitation of Liability */}
        <section id="disclaimer" className="scroll-mt-20 space-y-2.5 p-4 sm:p-5 rounded-xl border border-border/70 bg-card shadow-2xs w-full break-inside-avoid print:break-inside-avoid print:border-gray-300 print:bg-white print:p-3.5 print:shadow-none">
          <div className="flex items-center gap-2.5 text-foreground font-heading font-semibold text-xs sm:text-sm print:text-black">
            <div className="size-7 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0 print:border-gray-300 print:bg-gray-100 print:text-gray-800">
              <AlertCircle className="size-3.5" />
            </div>
            <h2>7. 'As-Is' Disclaimer &amp; User Responsibility</h2>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed print:text-gray-700">
            This personal software is provided on an <strong className="text-foreground print:text-black">“AS IS”</strong> and <strong className="text-foreground print:text-black">“AS AVAILABLE”</strong> basis without warranties of any kind, whether express or implied.
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed print:text-gray-700">
            As a personal project, the maintainer provides no enterprise service-level agreements (SLAs), formal uptime guarantees, or liability indemnification. You are solely responsible for ensuring that the personal notes and work logs you maintain through this tool comply with your workplace rules, confidentiality obligations, and company policies.
          </p>
        </section>

        {/* Section 8: Inquiries */}
        <section id="contact" className="scroll-mt-20 space-y-2.5 p-4 sm:p-5 rounded-xl border border-border/70 bg-card shadow-2xs w-full break-inside-avoid print:break-inside-avoid print:border-gray-300 print:bg-white print:p-3.5 print:shadow-none">
          <div className="flex items-center gap-2.5 text-foreground font-heading font-semibold text-xs sm:text-sm print:text-black">
            <div className="size-7 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0 print:border-gray-300 print:bg-gray-100 print:text-gray-800">
              <FileText className="size-3.5" />
            </div>
            <h2>8. Contact &amp; Questions</h2>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed print:text-gray-700">
            If you have questions, feedback, or inquiries regarding this personal tool and its data handling, you can reach out through the project's repository issue tracker or your developer contact.
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
            <Link to="/privacy" className="text-foreground font-medium hover:underline">Privacy Policy</Link>
            <span>•</span>
            <Link to="/cookies" className="text-muted-foreground hover:text-foreground hover:underline">Cookie Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

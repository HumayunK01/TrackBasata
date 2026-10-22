import { Link, useNavigate } from "react-router-dom";
import {
  Scale,
  ShieldAlert,
  FileText,
  User,
  AlertTriangle,
  ArrowLeft,
  Printer,
  ChevronRight,
  CheckCircle2,
  Ban,
  Building2,
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

export default function TermsOfServicePage() {
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
            Terms of Service
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
              title="Print Terms"
              aria-label="Print Terms"
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
            <Scale className="size-3" />
            <span>Personal Use Agreement • Legal Terms</span>
          </div>
          <h1 className="font-heading text-lg sm:text-xl font-bold tracking-tight text-foreground print:text-black">
            Terms of Service &amp; Conditions of Use
          </h1>
          <p className="text-xs text-muted-foreground w-full leading-relaxed print:text-gray-700">
            Please read these terms carefully before using TrackBasata. TrackBasata is an independent personal productivity project created by an individual developer to keep personal track of daily tasks and work.
          </p>
          <div className="flex flex-wrap items-center gap-3 text-2xs font-mono text-muted-foreground pt-1 print:text-gray-600">
            <span>Effective Date: January 1, 2026</span>
            <span>•</span>
            <span>Last Updated: October 22, 2026</span>
            <span className="print:hidden">•</span>
            <Link to="/privacy" className="text-primary hover:underline flex items-center gap-1 print:hidden">
              Privacy Policy <ChevronRight className="size-3" />
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
        {/* Section 1: Agreement & Nature */}
        <section id="nature" className="scroll-mt-20 space-y-2.5 p-4 sm:p-5 rounded-xl border border-border/70 bg-card shadow-2xs w-full break-inside-avoid print:break-inside-avoid print:border-gray-300 print:bg-white print:p-3.5 print:shadow-none">
          <div className="flex items-center gap-2.5 text-foreground font-heading font-semibold text-xs sm:text-sm print:text-black">
            <div className="size-7 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0 print:border-gray-300 print:bg-gray-100 print:text-gray-800">
              <User className="size-3.5" />
            </div>
            <h2>1. Personal Nature of Project &amp; Acceptance of Terms</h2>
          </div>
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs text-foreground/90 flex items-start gap-2 print:border-gray-300 print:bg-gray-50 print:text-gray-900">
            <CheckCircle2 className="size-3.5 text-primary shrink-0 mt-0.5 print:text-gray-800" />
            <div className="leading-relaxed">
              <strong>Personal Utility:</strong> TrackBasata is a personal software application built and operated by an individual developer solely for personal organization and job-related productivity tracking.
            </div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed print:text-gray-700">
            By creating an account, accessing, or using TrackBasata, you acknowledge that you have read, understood, and agreed to be bound by these Terms of Service. If you do not agree to every provision in these terms, do not access or use TrackBasata.
          </p>
        </section>

        {/* Section 2: Non-Affiliation */}
        <section id="non-affiliation" className="scroll-mt-20 space-y-2.5 p-4 sm:p-5 rounded-xl border border-border/70 bg-card shadow-2xs w-full break-inside-avoid print:break-inside-avoid print:border-gray-300 print:bg-white print:p-3.5 print:shadow-none">
          <div className="flex items-center gap-2.5 text-foreground font-heading font-semibold text-xs sm:text-sm print:text-black">
            <div className="size-7 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0 print:border-gray-300 print:bg-gray-100 print:text-gray-800">
              <Building2 className="size-3.5" />
            </div>
            <h2>2. Employer &amp; Corporate Non-Affiliation Disclaimer</h2>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed print:text-gray-700">
            TrackBasata is <strong className="text-foreground print:text-black">completely independent</strong> and is <strong className="text-foreground print:text-black">not affiliated with, endorsed by, sponsored by, authorized by, or in any way associated with Basata.ai</strong>, any healthcare institution, medical facility, hospital network, or corporate employer.
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed print:text-gray-700">
            All brand names, product titles, hospital identifiers, and facility names mentioned within this tool are the property of their respective trademark holders. Their reference here is purely descriptive for individual workflow classification and does not imply any official relationship, endorsement, or commercial connection.
          </p>
        </section>

        {/* Section 3: Strict No-PHI & NDA Rules */}
        <section id="prohibited-data" className="scroll-mt-20 space-y-2.5 p-4 sm:p-5 rounded-xl border border-border/70 bg-card shadow-2xs w-full break-inside-avoid print:break-inside-avoid print:border-gray-300 print:bg-white print:p-3.5 print:shadow-none">
          <div className="flex items-center gap-2.5 text-foreground font-heading font-semibold text-xs sm:text-sm print:text-black">
            <div className="size-7 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive flex items-center justify-center shrink-0 print:border-gray-300 print:bg-gray-100 print:text-gray-800">
              <Ban className="size-3.5" />
            </div>
            <h2>3. Strict Prohibition of Protected Health Information (PHI) &amp; Confidential Trade Secrets</h2>
          </div>
          <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20 text-xs text-foreground/90 flex items-start gap-2 print:border-gray-300 print:bg-gray-50 print:text-gray-900">
            <AlertTriangle className="size-3.5 text-destructive shrink-0 mt-0.5 print:text-gray-800" />
            <div className="leading-relaxed">
              <strong className="text-destructive font-semibold">Zero PHI Mandate:</strong> You are strictly forbidden from submitting, storing, or uploading any real patient Protected Health Information (PHI), full Social Security Numbers (SSNs), full legal patient names, complete medical charts, or confidential trade secrets.
            </div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed print:text-gray-700">
            TrackBasata is a personal productivity aid and is <strong className="text-foreground print:text-black">NOT a HIPAA-certified Business Associate</strong>, nor is it designed to store or transmit sensitive patient health records. You are solely and exclusively responsible for ensuring that all account codes, test identifiers, or personal notes you log comply with HIPAA, state privacy statutes, and any non-disclosure agreements (NDAs) or employment contracts you have signed.
          </p>
        </section>

        {/* Section 4: Not an Official System of Record */}
        <section id="not-official-record" className="scroll-mt-20 space-y-2.5 p-4 sm:p-5 rounded-xl border border-border/70 bg-card shadow-2xs w-full break-inside-avoid print:break-inside-avoid print:border-gray-300 print:bg-white print:p-3.5 print:shadow-none">
          <div className="flex items-center gap-2.5 text-foreground font-heading font-semibold text-xs sm:text-sm print:text-black">
            <div className="size-7 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0 print:border-gray-300 print:bg-gray-100 print:text-gray-800">
              <FileText className="size-3.5" />
            </div>
            <h2>4. Not an Electronic Health Record (EHR) or Official System of Record</h2>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed print:text-gray-700">
            TrackBasata does not substitute for, interface with, or replace any authorized hospital Electronic Health Record (EHR), practice management system, medical billing clearinghouse, or official company timekeeping ledger.
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed print:text-gray-700">
            You must always submit official production work and claim records directly through your employer's or facility's designated systems. The maintainer disclaims all liability for discrepancies between your personal TrackBasata logs and your employer's official billing records, payroll logs, or performance audits.
          </p>
        </section>

        {/* Section 5: Disclaimer of Warranties */}
        <section id="disclaimer-warranties" className="scroll-mt-20 space-y-2.5 p-4 sm:p-5 rounded-xl border border-border/70 bg-card shadow-2xs w-full break-inside-avoid print:break-inside-avoid print:border-gray-300 print:bg-white print:p-3.5 print:shadow-none">
          <div className="flex items-center gap-2.5 text-foreground font-heading font-semibold text-xs sm:text-sm print:text-black">
            <div className="size-7 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center shrink-0 print:border-gray-300 print:bg-gray-100 print:text-gray-800">
              <AlertTriangle className="size-3.5" />
            </div>
            <h2>5. Disclaimer of Warranties ("AS IS" &amp; "AS AVAILABLE")</h2>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 border border-border/60 text-xs leading-relaxed font-mono uppercase text-muted-foreground print:border-gray-300 print:bg-gray-50 print:text-gray-800">
            THE APPLICATION IS PROVIDED ENTIRELY "AS IS" AND "AS AVAILABLE", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, ACCURACY, AND NON-INFRINGEMENT.
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed print:text-gray-700">
            The developer makes no representation or warranty that: (a) the application will meet your requirements or expectations; (b) the application will be uninterrupted, timely, secure, or bug-free; (c) the calculations or logs will be accurate or error-free; or (d) any defects will be corrected. Use of the software is entirely at your own discretion and risk.
          </p>
        </section>

        {/* Section 6: Limitation of Liability */}
        <section id="limitation-liability" className="scroll-mt-20 space-y-2.5 p-4 sm:p-5 rounded-xl border border-border/70 bg-card shadow-2xs w-full break-inside-avoid print:break-inside-avoid print:border-gray-300 print:bg-white print:p-3.5 print:shadow-none">
          <div className="flex items-center gap-2.5 text-foreground font-heading font-semibold text-xs sm:text-sm print:text-black">
            <div className="size-7 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0 print:border-gray-300 print:bg-gray-100 print:text-gray-800">
              <ShieldAlert className="size-3.5" />
            </div>
            <h2>6. Limitation of Liability</h2>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed print:text-gray-700">
            To the maximum extent permitted by applicable law, in no event shall the developer, maintainer, or host of TrackBasata be liable for any direct, indirect, incidental, special, consequential, or punitive damages whatsoever, including without limitation:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs text-muted-foreground print:text-gray-700">
            <li>Loss of wages, compensation, bonuses, or employment status;</li>
            <li>Employment termination, suspension, warnings, or disciplinary actions;</li>
            <li>Discrepancies in medical billing, accounts receivable, or insurance reimbursement;</li>
            <li>Data loss, database corruption, or inability to access recorded work history;</li>
            <li>Regulatory fines, penalties, or compliance investigations under HIPAA or other statutes; or</li>
            <li>Any other personal or commercial damages arising out of the use or inability to use this tool.</li>
          </ul>
          <p className="text-xs text-muted-foreground leading-relaxed print:text-gray-700">
            If any limitation of liability is deemed unenforceable in any jurisdiction, the developer's maximum aggregate liability shall not exceed zero dollars ($0.00).
          </p>
        </section>

        {/* Section 7: Indemnification */}
        <section id="indemnification" className="scroll-mt-20 space-y-2.5 p-4 sm:p-5 rounded-xl border border-border/70 bg-card shadow-2xs w-full break-inside-avoid print:break-inside-avoid print:border-gray-300 print:bg-white print:p-3.5 print:shadow-none">
          <div className="flex items-center gap-2.5 text-foreground font-heading font-semibold text-xs sm:text-sm print:text-black">
            <div className="size-7 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0 print:border-gray-300 print:bg-gray-100 print:text-gray-800">
              <Scale className="size-3.5" />
            </div>
            <h2>7. User Indemnification &amp; Hold Harmless</h2>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed print:text-gray-700">
            You agree to defend, indemnify, and hold harmless the individual developer and maintainer of TrackBasata from and against any and all claims, damages, liabilities, losses, judgments, costs, and expenses (including reasonable attorney fees) arising from or relating to:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs text-muted-foreground print:text-gray-700">
            <li>Your access to or use of the application;</li>
            <li>Your violation of any provision of these Terms of Service;</li>
            <li>Your violation of any third-party rights, including intellectual property, privacy, or confidentiality rights;</li>
            <li>Your breach of any employment agreement, workplace policy, or non-disclosure agreement; or</li>
            <li>Any unauthorized entry or disclosure of patient health information or employer confidential information.</li>
          </ul>
        </section>

        {/* Section 8: Termination & Modification */}
        <section id="termination" className="scroll-mt-20 space-y-2.5 p-4 sm:p-5 rounded-xl border border-border/70 bg-card shadow-2xs w-full break-inside-avoid print:break-inside-avoid print:border-gray-300 print:bg-white print:p-3.5 print:shadow-none">
          <div className="flex items-center gap-2.5 text-foreground font-heading font-semibold text-xs sm:text-sm print:text-black">
            <div className="size-7 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0 print:border-gray-300 print:bg-gray-100 print:text-gray-800">
              <Trash2 className="size-3.5" />
            </div>
            <h2>8. Right to Modify, Terminate &amp; Wipe Data</h2>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed print:text-gray-700">
            Because TrackBasata is a personal project without commercial contracts or service-level guarantees, the developer reserves the exclusive right to modify features, suspend access, take the application offline, or delete database tables and user accounts at any time, for any reason, without notice or liability to you.
          </p>
        </section>

        {/* Section 9: Governing Law & Contact */}
        <section id="governing-law" className="scroll-mt-20 space-y-2.5 p-4 sm:p-5 rounded-xl border border-border/70 bg-card shadow-2xs w-full break-inside-avoid print:break-inside-avoid print:border-gray-300 print:bg-white print:p-3.5 print:shadow-none">
          <div className="flex items-center gap-2.5 text-foreground font-heading font-semibold text-xs sm:text-sm print:text-black">
            <div className="size-7 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0 print:border-gray-300 print:bg-gray-100 print:text-gray-800">
              <FileText className="size-3.5" />
            </div>
            <h2>9. Governing Law, Severability &amp; Inquiries</h2>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed print:text-gray-700">
            If any provision of these Terms is found to be invalid, illegal, or unenforceable, the remaining provisions shall continue in full force and effect. For any inquiries regarding these terms, you may communicate through the personal repository issue tracker.
          </p>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/60 bg-muted/20 py-4 px-4 sm:px-8 lg:px-12 text-center text-2xs text-muted-foreground w-full print:px-0 print:py-2.5 print:border-t print:border-gray-300 print:bg-transparent print:text-gray-600">
        <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <span>&copy; {new Date().getFullYear()} TrackBasata (Personal Project). All rights reserved.</span>
          <div className="flex items-center gap-3 print:hidden">
            <Link to="/terms" className="text-foreground font-medium hover:underline">Terms of Service</Link>
            <span>•</span>
            <Link to="/privacy" className="text-muted-foreground hover:text-foreground hover:underline">Privacy Policy</Link>
            <span>•</span>
            <Link to="/cookies" className="text-muted-foreground hover:text-foreground hover:underline">Cookie Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

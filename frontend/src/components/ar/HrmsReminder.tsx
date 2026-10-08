import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Clock } from "@/components/ui/icons";
import { ackToday, readAck, reminderDue } from "@/lib/hrms-reminder";

// Daily nudge, shown once per org day (Phoenix time, not local) after login.
export function HrmsReminder() {
  const [open, setOpen] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const timerRef = useRef<number | null>(null);
  const reduce = useReducedMotion();

  // Re-check every minute so the reminder also appears if the app stays open
  // across the org's midnight.
  useEffect(() => {
    const check = () => setOpen(reminderDue(readAck()));
    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, []);

  // Clear the auto-close timer if the dialog unmounts mid-celebration.
  useEffect(() => () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
  }, []);

  const dismiss = (note?: string) => {
    ackToday();
    setOpen(false);
    setCelebrating(false);
    if (note) toast.info(note);
  };

  const confirmYes = () => {
    ackToday();
    if (reduce) {
      dismiss();
      return;
    }
    setCelebrating(true);
    timerRef.current = window.setTimeout(() => dismiss(), 1700);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Any way of closing counts as acknowledged for the day.
        if (!next) dismiss();
        else setOpen(true);
      }}
    >
      <DialogContent className="rounded-3xl border border-border/70 bg-card/95 backdrop-blur-2xl shadow-2xl p-6 sm:p-7 max-w-[390px] select-none">
        {celebrating ? (
          <Celebration />
        ) : (
          <div className="flex flex-col items-center text-center space-y-4 pt-1">
            <div className="size-14 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-2xs">
              <Clock className="size-7" />
            </div>

            <DialogHeader className="space-y-1.5 text-center sm:text-center">
              <DialogTitle className="text-lg font-bold tracking-tight text-foreground font-heading">
                Daily Shift Reminder
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-[13px] text-muted-foreground leading-relaxed">
                Have you logged into the HRMS system for today&apos;s shift?
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-2.5 w-full pt-2">
              <Button
                variant="outline"
                className="h-11 rounded-xl border-border/70 text-sm font-semibold hover:bg-muted/70 text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                onClick={() => dismiss("Don't forget to log into HRMS.")}
              >
                Not yet
              </Button>
              <Button
                className="h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold shadow-xs shadow-emerald-600/25 active:scale-[0.98] transition-all cursor-pointer"
                onClick={confirmYes}
              >
                Yes, I&apos;m logged in
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

const CONFETTI_COLORS = ["#10b981", "#34d399", "#6ee7b7", "#059669", "#3b82f6"];

function Celebration() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => ({
        id: i,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        x: (Math.random() - 0.5) * 260,
        y: -40 - Math.random() * 160,
        rotate: (Math.random() - 0.5) * 540,
        delay: Math.random() * 0.15,
        wide: Math.random() > 0.5,
      })),
    [],
  );

  return (
    <div className="relative py-3 flex flex-col items-center text-center space-y-4" aria-live="polite">
      <div className="absolute inset-0 overflow-visible pointer-events-none" aria-hidden>
        {pieces.map((p) => (
          <motion.span
            key={p.id}
            className={p.wide ? "absolute left-1/2 top-1/2 w-1.5 h-3 rounded-sm" : "absolute left-1/2 top-1/2 w-2 h-2 rounded-full"}
            style={{ backgroundColor: p.color }}
            initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }}
            animate={{ x: p.x, y: p.y, opacity: 0, rotate: p.rotate, scale: 0.7 }}
            transition={{ duration: 1.3, ease: "easeOut", delay: p.delay }}
          />
        ))}
      </div>
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 320, damping: 16 }}
        className="size-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 grid place-items-center shadow-lg shadow-emerald-500/15"
      >
        <svg viewBox="0 0 24 24" className="size-8" aria-hidden>
          <motion.path
            d="M5 13l4 4L19 7"
            fill="none"
            stroke="#10b981"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.35, delay: 0.2, ease: "easeOut" }}
          />
        </svg>
      </motion.div>
      <div className="space-y-1">
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="text-base font-bold font-heading text-foreground"
        >
          All set for today!
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-xs text-muted-foreground"
        >
          Your attendance confirmation has been recorded.
        </motion.p>
      </div>
    </div>
  );
}
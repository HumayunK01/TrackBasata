import { User } from "@/components/ui/icons";
import { Separator } from "@/components/ui/separator";

interface AccountCardProps {
  email?: string;
  createdAt?: string;
}

export function AccountCard({ email, createdAt }: AccountCardProps) {
  return (
    <div className="bg-card border border-border rounded-md p-4 sm:p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <User className="size-4 text-primary" />
        </div>
        <h2 className="text-sm font-semibold font-heading">Account</h2>
      </div>
      <div className="space-y-3">
        <div className="space-y-1">
          <p className="text-xs text-foreground uppercase tracking-wide font-heading">Email address</p>
          <p className="text-sm font-semibold truncate text-foreground">
            {email || "Not logged in"}
          </p>
        </div>

        <Separator className="bg-border/40" />

        <div className="space-y-1">
          <p className="text-xs text-foreground uppercase tracking-wide font-heading">Associate Member since</p>
          <p className="text-sm font-medium text-foreground/90" suppressHydrationWarning>
            {createdAt
              ? new Date(createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
              : "—"}
          </p>
        </div>
      </div>
    </div>
  );
}

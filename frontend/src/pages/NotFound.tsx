import { Link } from "react-router-dom";
import { AppLogo } from "@/components/ar/AppLogo";

const NotFound = () => {
  return (
    <div className="flex fixed inset-0 items-center justify-center bg-background p-6">
      <div className="flex flex-col items-center text-center gap-8 animate-fade-in">
        <AppLogo className="h-8 object-contain" />

        <div className="space-y-1">
          <p className="font-mono text-[10px] font-medium text-foreground uppercase tracking-[0.3em]">
            Error 404
          </p>
          <h1 className="font-heading text-5xl sm:text-6xl font-bold text-foreground tracking-tight leading-[1.05]">
            Page not found
          </h1>
        </div>

        <p className="text-xs text-foreground max-w-xs leading-relaxed">
          The page you are looking for does not exist or has been moved.
        </p>

        <Link
          to="/console"
          className="inline-flex items-center justify-center h-9 px-5 text-xs font-semibold tracking-wider uppercase bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Back to Daily Log
        </Link>

        <span className="text-[10px] font-medium tracking-wider text-muted-foreground/70 uppercase">
          PHOENIX HEART
        </span>
      </div>
    </div>
  );
};

export default NotFound;

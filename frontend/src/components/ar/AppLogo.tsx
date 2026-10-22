import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

interface AppLogoProps {
  className?: string;
  style?: React.CSSProperties;
}

export function AppLogo({ className, style }: AppLogoProps) {
  const { theme } = useTheme();

  return (
    <>
      {/* Light logo: shown in light mode on screen, and ALWAYS when printing */}
      <img
        src="/lightlogo.png"
        alt="TrackBasata"
        className={cn(className, theme === "light" ? "inline-block" : "hidden print:inline-block")}
        style={style}
      />
      {/* Dark logo: shown in dark mode on screen, hidden when printing */}
      <img
        src="/logo.png"
        alt="TrackBasata"
        className={cn(className, theme === "dark" ? "inline-block print:hidden" : "hidden")}
        style={style}
      />
    </>
  );
}

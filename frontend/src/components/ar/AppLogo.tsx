import { useTheme } from "@/hooks/useTheme";

interface AppLogoProps {
  className?: string;
  style?: React.CSSProperties;
}

export function AppLogo({ className, style }: AppLogoProps) {
  const { theme } = useTheme();
  const src = theme === "light" ? "/lightlogo.png" : "/logo.png";
  return <img src={src} alt="Basata.ai Tracker" className={className} style={style} />;
}

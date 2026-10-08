import { useTheme } from "@/hooks/useTheme";

interface AppFaviconProps {
  className?: string;
  style?: React.CSSProperties;
  alt?: string;
}

export function AppFavicon({ className, style, alt = "Basata.ai Tracker" }: AppFaviconProps) {
  const { theme } = useTheme();
  const src = theme === "light" ? "/lightfavicon.png?v=2" : "/favicon.png?v=2";
  return <img src={src} alt={alt} className={className} style={style} />;
}

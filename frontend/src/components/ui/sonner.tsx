import { useTheme } from "@/hooks/useTheme";
import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="top-right"
      duration={3000}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:rounded-md group-[.toaster]:shadow-lg",
          title: "group-[.toast]:text-sm group-[.toast]:font-semibold",
          description: "group-[.toast]:text-foreground group-[.toast]:text-xs",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-foreground",
          success: "group-[.toaster]:[&_svg]:text-success",
          error: "group-[.toaster]:[&_svg]:text-destructive",
          warning: "group-[.toaster]:[&_svg]:text-warning",
          info: "group-[.toaster]:[&_svg]:text-info",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };

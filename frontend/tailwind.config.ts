import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  future: {
    // hover: styles only on devices with a real pointer — prevents
    // sticky hover states on touch (mobile/tablet)
    hoverOnlyWhenSupported: true,
  },
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    screens: {
      xs: "480px",
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
    },
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-sans, system-ui)", "-apple-system", "BlinkMacSystemFont", "'Segoe UI'", "Roboto", "sans-serif"],
        heading: ["var(--font-heading, 'Hubot Sans Variable')", "'Hubot Sans'", "sans-serif"],
        hubot: ["var(--font-hubot, 'Hubot Sans Variable')", "'Hubot Sans'", "sans-serif"],
        mono: ["var(--font-mono, 'Hubot Sans Variable')", "monospace"],
      },
      fontSize: {
        "2xs": ["var(--text-2xs, 0.6875rem)", { lineHeight: "1rem" }],
        xs: ["var(--text-xs, 0.8125rem)", { lineHeight: "1.2rem" }],
        sm: ["var(--text-sm, 0.9375rem)", { lineHeight: "1.375rem" }],
        base: ["var(--text-base, 1.0625rem)", { lineHeight: "1.625rem" }],
        lg: ["var(--text-lg, 1.1875rem)", { lineHeight: "1.75rem" }],
        xl: ["var(--text-xl, 1.375rem)", { lineHeight: "1.875rem" }],
        "2xl": ["var(--text-2xl, 1.625rem)", { lineHeight: "2.125rem" }],
      },
      colors: {
        border: "hsl(var(--border) / <alpha-value>)",
        input: "hsl(var(--input) / <alpha-value>)",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "var(--app-border, rgba(255, 255, 255, 0.15))",
          ring: "hsl(var(--sidebar-ring))",
        },
        cat: {
          0: "hsl(var(--cat-0))",
          1: "hsl(var(--cat-1))",
          2: "hsl(var(--cat-2))",
          3: "hsl(var(--cat-3))",
          4: "hsl(var(--cat-4))",
          5: "hsl(var(--cat-5))",
          6: "hsl(var(--cat-6))",
          7: "hsl(var(--cat-7))",
          8: "hsl(var(--cat-8))",
          9: "hsl(var(--cat-9))",
          10: "hsl(var(--cat-10))",
          11: "hsl(var(--cat-11))",
          12: "hsl(var(--cat-12))",
          13: "hsl(var(--cat-13))",
          14: "hsl(var(--cat-14))",
          15: "hsl(var(--cat-15))",
        },
        skeleton: {
          base: "hsl(var(--skeleton-base))",
          highlight: "hsl(var(--skeleton-highlight))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      transitionTimingFunction: {
        // Strong custom easings — backed by CSS vars in index.css
        out: "var(--ease-out)",
        "in-out": "var(--ease-in-out)",
        drawer: "var(--ease-drawer)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;

import type { Config } from "tailwindcss";

// Contrato único de valores visuais: docs/Design-System.md (Seções 2-7).
// Não adicionar/alterar valores aqui sem atualizar o Design-System primeiro.
const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Seção 2.1 — Neutros
        cinza: {
          0: "#FFFFFF",
          50: "#F8FAFC",
          100: "#F1F5F9",
          200: "#E2E8F0",
          300: "#CBD5E1",
          400: "#94A3B8",
          500: "#64748B",
          600: "#475569",
          700: "#334155",
          800: "#1E293B",
          900: "#0F172A",
        },
        // Seção 2.2 — Cor de destaque
        accent: {
          DEFAULT: "#2563EB",
          hover: "#1D4ED8",
          active: "#1E40AF",
          subtle: "#EFF6FF",
          border: "#BFDBFE",
        },
        // Seção 2.3 — Semânticas
        sucesso: { DEFAULT: "#16A34A", subtle: "#F0FDF4" },
        erro: { DEFAULT: "#DC2626", subtle: "#FEF2F2" },
        aviso: { DEFAULT: "#D97706", subtle: "#FFFBEB" },
        // Seção 2.4 — Mapeamento shadcn/ui (CSS variables definidas na Task 5.2)
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
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
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      // Seção 3 — Tipografia
      fontFamily: {
        sans: [
          "var(--font-inter)",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      fontSize: {
        display: ["28px", { lineHeight: "1.25" }],
        "titulo-secao": ["20px", { lineHeight: "1.3" }],
        "titulo-card": ["16px", { lineHeight: "1.4" }],
        corpo: ["14px", { lineHeight: "1.5" }],
        "corpo-pequeno": ["13px", { lineHeight: "1.5" }],
        legenda: ["12px", { lineHeight: "1.4" }],
        "valor-destaque": ["24px", { lineHeight: "1.2" }],
      },
      // Seção 4 — Espaçamento (aliases nomeados; escala default 4px já cobre o resto)
      spacing: {
        xs: "4px",
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "24px",
        "2xl": "32px",
        "3xl": "48px",
        "4xl": "64px",
      },
      // Seção 5 — Raios e elevação
      borderRadius: {
        sm: "6px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        full: "999px",
      },
      boxShadow: {
        xs: "0 1px 2px rgba(15,23,42,0.04)",
        sm: "0 1px 3px rgba(15,23,42,0.08), 0 1px 2px rgba(15,23,42,0.04)",
        md: "0 4px 6px -1px rgba(15,23,42,0.08), 0 2px 4px -2px rgba(15,23,42,0.04)",
        lg: "0 10px 15px -3px rgba(15,23,42,0.1), 0 4px 6px -4px rgba(15,23,42,0.05)",
      },
      // Seção 6.1 — duração de transição do Button (120ms). Registrada como
      // token nomeado (não arbitrário) porque `tailwindcss-animate` também
      // registra um utilitário `duration-*` (mapeado para `animationDuration`)
      // que colide com o `duration-*` nativo do Tailwind (`transitionDuration`)
      // quando usado com valor arbitrário (`duration-[120ms]`) — o build acusa
      // "class is ambiguous and matches multiple utilities" e a classe não
      // gera CSS nenhum. Com o valor nomeado abaixo, `duration-120` deixa de
      // ser ambíguo.
      transitionDuration: {
        "120": "120ms",
      },
      // Seção 7 — Breakpoints
      screens: {
        sm: "480px",
        md: "768px",
        lg: "960px",
        xl: "1280px",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;

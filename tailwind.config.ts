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
        // Seção 2.2 — Cor de destaque (v2, ainda em uso pelas telas
        // antigas — `/`, `/modulo`, `/biblioteca`, `/ambientes` — via
        // `Button`/`Alert`/etc. de `components/ui`). NÃO alterado nesta
        // task (13.3a): o Design-System v3 (Seção 2.3) redefine `accent`
        // para um laranja, mas recolorir este token aqui mudaria o visual
        // de toda tela já existente que consome `bg-accent`/`text-accent` —
        // exatamente o que o contrato da 13.3a proíbe ("não mexa no visual
        // das telas antigas"). Ver `marinho`/`marca` abaixo: tokens v3
        // isolados, usados só pelas telas novas desta task (/login,
        // /signup). A Task 13.3b (shell + retrofit v3) é quem substitui
        // este `accent` pelos valores de `marca` em todo o app e então
        // remove `marca` (fica redundante).
        accent: {
          DEFAULT: "#2563EB",
          hover: "#1D4ED8",
          active: "#1E40AF",
          subtle: "#EFF6FF",
          border: "#BFDBFE",
        },
        // Seção 2.3 — Semânticas (idem: valores v2, não tocados nesta task)
        sucesso: { DEFAULT: "#16A34A", subtle: "#F0FDF4" },
        erro: { DEFAULT: "#DC2626", subtle: "#FEF2F2" },
        aviso: { DEFAULT: "#D97706", subtle: "#FFFBEB" },
        // Seção 2.2 — Navy (marinho), NOVO na v3. Chave nova (nenhuma tela
        // antiga referencia `marinho-*`), portanto pura adição sem risco de
        // regressão visual — usado pelo painel de marca de /login e /signup
        // (Task 13.3a).
        marinho: {
          900: "#0E1420",
          800: "#141B2B",
          700: "#1B2436",
          600: "#232C3F",
          300: "#8D96A8",
        },
        // Seção 2.3 — Laranja da v3 ("cor de marca"), isolado do `accent`
        // v2 acima pelo motivo já explicado. Valores idênticos aos de
        // `docs/Design-System.md` Seção 2.3 (`accent.DEFAULT/hover/active/
        // subtle/border/vivid`), só sob outro nome de chave para não colidir
        // com o token já em uso. Consumido apenas por /login e /signup
        // (Task 13.3a) via override pontual de classe (ex.:
        // `bg-marca hover:bg-marca-hover`) sobre o `Button` primary
        // compartilhado — não duplica o componente, só substitui a cor.
        marca: {
          DEFAULT: "#B45309",
          hover: "#92400E",
          active: "#78350F",
          subtle: "#FFF3E0",
          border: "#F3C88F",
          vivid: "#D97706",
        },
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

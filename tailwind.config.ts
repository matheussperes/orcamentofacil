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
        // Seção 2.3 — `accent` (laranja, cor de marca/ação primária da v3).
        // Task 13.3b: RETROFIT — este token era o azul `#2563EB` da v2. A
        // partir desta task ele passa a valer os tons laranja de
        // `docs/Design-System.md` Seção 2.3 em todo o app — qualquer tela já
        // construída com `bg-accent`/`text-accent`/`border-accent` (Button,
        // Alert de foco, links) recolore automaticamente pra laranja sem
        // precisar editar cada arquivo. O token temporário `marca` (13.3a,
        // usado só em /login e /signup) foi consolidado aqui e removido —
        // ele tinha exatamente estes mesmos valores sob outro nome.
        accent: {
          DEFAULT: "#B45309",
          hover: "#92400E",
          active: "#78350F",
          subtle: "#FFF3E0",
          border: "#F3C88F",
          vivid: "#D97706", // logo, ícone ativo da sidebar, contorno de seleção do canvas — NUNCA fundo de botão com texto branco
        },
        // Seção 2.4 — Semânticas
        sucesso: { DEFAULT: "#16A34A", subtle: "#F0FDF4", border: "#86EFAC" },
        erro: { DEFAULT: "#DC2626", subtle: "#FEF2F2", border: "#FCA5A5" },
        // Task 13.3b (fix de retrofit): `aviso.DEFAULT` era `#D97706` (o
        // mesmo hex do agora `accent.vivid`) — colisão de acidente de
        // implementação que a Seção 2.4 do Design-System v3 pede para
        // corrigir explicitamente (aviso não pode ler igual a "cor de marca/
        // seleção"). Valor correto: `#A16207` (dourado/amarelo-mostarda).
        aviso: { DEFAULT: "#A16207", subtle: "#FFFBEB", border: "#FDE68A" },
        // Seção 2.4 — NOVO na v3: reaproveita o hex que era o `accent` azul
        // da v2 (`#2563EB`) — deixa de ser cor de marca/ação e passa a ser
        // puramente semântica (informativo/neutro-frio).
        informacao: { DEFAULT: "#2563EB", subtle: "#EFF6FF", border: "#BFDBFE" },
        // Seção 2.4 — NOVO na v3: status "Fechado", KPI icon roxo, tag de categoria.
        roxo: { DEFAULT: "#7C3AED", subtle: "#F3E8FF", border: "#DDD6FE" },
        // Seção 2.6 — NOVO na v3: 5º par de ícone de KPI (ex.: Catálogo com 5
        // KPIs) — uso exclusivo de ícone de KPI, não é status nem semântica.
        rosa: { DEFAULT: "#DB2777", subtle: "#FCE7F3" },
        // Seção 2.2 — Navy (marinho), NOVO na v3, confirmado como token
        // PERMANENTE (cor de superfície fixa da sidebar, não um "modo
        // escuro" alternável — Seção 2.9).
        marinho: {
          900: "#0E1420",
          800: "#141B2B",
          700: "#1B2436",
          600: "#232C3F",
          300: "#8D96A8",
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
        // Seção 3 — NOVO na v3: total de proposta/pré-pedido (destaque
        // máximo de uma tela).
        "valor-destaque-lg": ["32px", { lineHeight: "1.15" }],
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
        // Seção 5 — NOVO na v3: borda-sombra sutil entre a sidebar e o
        // conteúdo (ambos têm cor sólida diferente, então não dá pra usar
        // `border`).
        sidebar: "1px 0 0 0 rgba(0,0,0,0.4)",
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
        // Seção 12 — Task 13.3b: entrada/saída de drawer (mobile) e
        // microinteração de UI. Nomeados pelo mesmo motivo do `120` acima
        // (evitar ambiguidade com `tailwindcss-animate`).
        "150": "150ms",
        "200": "200ms",
      },
      // Seção 12 — curva nomeada "ease-out-back" (entrada de modal/drawer,
      // Task 13.3b).
      transitionTimingFunction: {
        "out-back": "cubic-bezier(0.16, 1, 0.3, 1)",
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

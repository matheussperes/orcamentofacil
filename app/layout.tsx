import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Task 5.2 — Design-System Seção 3: Inter via next/font/google (self-hosted
// no build, sem chamada a fonts.googleapis.com em runtime), expondo
// `--font-inter` consumida por `fontFamily.sans` em tailwind.config.ts.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Budget Planner AI — Orçamento Fácil",
  description:
    "Motor paramétrico de orçamento para móveis planejados. Do módulo ao preço em segundos.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.variable} font-sans`}>{children}</body>
    </html>
  );
}

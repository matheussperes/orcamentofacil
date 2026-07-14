import type { Metadata } from "next";
import "./globals.css";

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
      <body>{children}</body>
    </html>
  );
}

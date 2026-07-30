"use client";

import { AmbientesLab } from "@/components/ambientes/AmbientesLab";

// Task 13.3c (contrato .maestro/tmp/13.3c-contract.md) — a lógica de desenho
// (parede, itens, elementos contínuos, validação Tier 1/2) migrou para
// `components/ambientes/AmbientesLab.tsx` (agora também a aba "Ambientes" de
// `/orcamento/[id]`). Este arquivo virou um wrapper fino.
//
// Decisão sobre o standalone `/ambientes` (contrato deixou a critério do
// Frontend Engineer, "pode continuar ou redirecionar"): MANTIDO, não
// redireciona. Razões: (1) não duplica nenhuma lógica de desenho — delega
// inteiramente pro mesmo `AmbientesLab` usado dentro do orçamento; (2)
// continua útil como laboratório isolado de depuração/demonstração do motor
// de parede sem precisar criar um orçamento primeiro; (3) já está atrás do
// gate de auth (Task 13.3a) e fora do shell v3 — não é um destino do menu
// principal (`docs/Mapa-de-Telas.md`), então não compete visualmente com
// `/orcamento/[id]`. Usa `chavePrefixo="standalone"` — estado próprio,
// isolado de qualquer orçamento real.
export default function AmbientesPage() {
  return (
    <div className="wrap">
      <header className="mb-6">
        <h1 className="text-display font-bold text-cinza-900">Ambientes — Elevação de parede</h1>
        <p className="mt-1 text-corpo text-cinza-500">
          Laboratório local: parede editável, elementos e itens posicionados por faixa — validação
          Tier 1/2 em tempo real.
        </p>
        <nav className="mt-4 text-corpo">
          <a href="/" className="text-accent hover:text-accent-hover hover:underline">
            ← Voltar
          </a>
        </nav>
      </header>

      <AmbientesLab chavePrefixo="standalone" />
    </div>
  );
}

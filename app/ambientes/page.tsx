"use client";

import { AmbientesLabStandalone } from "@/components/ambientes/AmbientesLabStandalone";

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
// `/orcamento/[id]`.
//
// Task 13.3d (contrato .maestro/tmp/13.3d-contract.md): `AmbientesLab` virou
// presentational (props `estadoInicial`/`onSalvar`, sem I/O próprio) — este
// laboratório não tem orçamento pai pra persistir em Supabase, então
// `AmbientesLabStandalone` assume o load/save via localStorage
// (`lib/ambiente/persistenciaLocal.ts`, escopo `"standalone"`), no lugar do
// antigo `chavePrefixo="standalone"` que vivia dentro do próprio
// `AmbientesLab`.
export default function AmbientesPage() {
  return (
    <div className="mx-auto max-w-[1080px] px-5 pb-20 pt-6">
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

      <AmbientesLabStandalone />
    </div>
  );
}

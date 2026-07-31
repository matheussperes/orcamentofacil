import type { ComponentType } from "react";
import { Boxes, Layers, Package, Puzzle, Wrench } from "lucide-react";
import type { ProdutoRow } from "@/lib/produto/tipos";

// Task 13.7b (contrato .maestro/tmp/13.7b-contract.md) — KPI Card do
// Catálogo (Design-System.md Seção 7.3 + 2.6): "Catálogo tem 5 [KPIs]" é o
// próprio exemplo citado na Seção 2.6 pro 5º par de cor (`rosa`). Decisão de
// escopo (sem pedido explícito no contrato, documentada aqui): o contrato só
// pede "CRUD funcionando pras 5 categorias", sem citar KPIs — inclui-se
// mesmo assim porque a Seção 2.6 do Design System já reserva e nomeia
// explicitamente este layout de 5 KPIs para esta tela ("Total de produtos /
// Chapas / Ferragens / LEDs / Acessórios"), e a Seção 7.3 é o padrão
// consistente de toda tela de listagem do produto (Dashboard já usa) — não
// construir os KPIs deixaria a tela visualmente incompleta frente ao
// restante do Design System sem economizar trabalho real (mesma contagem já
// precisa existir para popular as Tabs). Fita entra só no total (KPI 1),
// sem card dedicado — só 5 posições estão reservadas e ela tipicamente tem 1
// linha só (contrato: "Fita (preço, tipicamente 1 linha)").
interface DefinicaoKpi {
  rotulo: string;
  Icone: ComponentType<{ className?: string }>;
  bg: string;
  cor: string;
  contar: (produtos: ProdutoRow[]) => number;
}

const KPIS: DefinicaoKpi[] = [
  {
    rotulo: "Total de produtos",
    Icone: Boxes,
    bg: "bg-accent-subtle",
    cor: "text-accent",
    contar: (p) => p.filter((x) => x.ativo).length,
  },
  {
    rotulo: "Chapas",
    Icone: Layers,
    bg: "bg-sucesso-subtle",
    cor: "text-sucesso",
    contar: (p) => p.filter((x) => x.ativo && x.tipo === "chapa").length,
  },
  {
    rotulo: "Ferragens",
    Icone: Wrench,
    bg: "bg-informacao-subtle",
    cor: "text-informacao",
    contar: (p) => p.filter((x) => x.ativo && x.tipo === "ferragem").length,
  },
  {
    rotulo: "LEDs",
    Icone: Package,
    bg: "bg-roxo-subtle",
    cor: "text-roxo",
    contar: (p) => p.filter((x) => x.ativo && x.tipo === "led").length,
  },
  {
    rotulo: "Acessórios",
    Icone: Puzzle,
    bg: "bg-rosa-subtle",
    cor: "text-rosa",
    contar: (p) => p.filter((x) => x.ativo && x.tipo === "acessorio").length,
  },
];

export function KpisCatalogo({ produtos }: { produtos: ProdutoRow[] }) {
  return (
    <div className="grid grid-cols-2 gap-md sm:grid-cols-3 xl:grid-cols-5">
      {KPIS.map(({ rotulo, Icone, bg, cor, contar }) => (
        <div key={rotulo} className="rounded-lg border border-cinza-200 bg-cinza-0 p-lg">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${bg}`}>
            <Icone className={`h-5 w-5 ${cor}`} />
          </div>
          <p className="mt-sm text-legenda font-semibold uppercase tracking-[0.03em] text-cinza-500">
            {rotulo}
          </p>
          <p className="text-valor-destaque tabular-nums text-cinza-900">{contar(produtos)}</p>
        </div>
      ))}
    </div>
  );
}

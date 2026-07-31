"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Library, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GabaritoCard } from "./GabaritoCard";
import { CATEGORIAS_PADRAO } from "@/lib/categorias";
import type { GabaritoRow } from "@/lib/gabarito/tipos";

const FILTRO_TODAS = "todas";

// Task 13.7c (contrato .maestro/tmp/13.7c-contract.md) — componente
// PRESENTACIONAL de `/biblioteca` (mesmo espírito de `CatalogoLab`/
// `PerfilLab`): recebe os gabaritos já carregados pelo Server Component da
// rota e a Server Action de exclusão injetada por `GabaritoConectado` (real)
// ou pelo harness `/dev/preview/biblioteca` (mock). Estado da lista é dono
// deste componente — exclusão bem-sucedida remove local, sem re-buscar.
//
// Filtro por categoria (contrato: "sem tabela de categorias própria no
// schema — derive a lista de opções dos valores distintos de
// `gabarito.categoria`... pode usar as 8 categorias padrão de
// `lib/categorias.ts::CATEGORIAS_PADRAO` como sugestão inicial, mas não crie
// CRUD de categoria"): a lista de opções é a UNIÃO das 8 categorias padrão
// com as categorias realmente usadas pelos gabaritos visíveis (global +
// próprios) — nenhuma delas é persistida além do campo texto de cada
// gabarito, sem tela de gerenciamento de categoria (diferente do mockup
// `5.Biblioteca.png`, que mostra "Gerenciar categorias" — decisão de escopo
// documentada aqui, sem resposta explícita no contrato: essa ação NÃO existe
// nesta tela, porque não há onde persistir uma categoria fora do texto livre
// de cada gabarito).
export interface GabaritoLabProps {
  gabaritosIniciais: GabaritoRow[];
  erroCarregamento?: boolean;
  onExcluir: (id: string) => Promise<{ ok: boolean; erro?: string }>;
}

export function GabaritoLab({ gabaritosIniciais, erroCarregamento = false, onExcluir }: GabaritoLabProps) {
  const [gabaritos, setGabaritos] = useState<GabaritoRow[]>(gabaritosIniciais);
  const [filtroCategoria, setFiltroCategoria] = useState(FILTRO_TODAS);

  const categorias = useMemo(
    () => Array.from(new Set([...CATEGORIAS_PADRAO, ...gabaritos.map((g) => g.categoria)])).sort((a, b) => a.localeCompare(b, "pt-BR")),
    [gabaritos]
  );

  const gabaritosFiltrados = useMemo(
    () => (filtroCategoria === FILTRO_TODAS ? gabaritos : gabaritos.filter((g) => g.categoria === filtroCategoria)),
    [gabaritos, filtroCategoria]
  );

  function removerLocal(id: string) {
    setGabaritos((atuais) => atuais.filter((g) => g.id !== id));
  }

  if (erroCarregamento) {
    return (
      <Alert variant="erro">
        <AlertDescription>
          Não foi possível carregar a biblioteca de módulos. Atualize a página e tente novamente.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex flex-wrap items-center justify-between gap-md">
        <div className="w-56">
          <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
            <SelectTrigger aria-label="Filtrar por categoria">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={FILTRO_TODAS}>Todas as categorias</SelectItem>
              {categorias.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button variant="primary" asChild>
          <Link href="/modulo">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Novo módulo
          </Link>
        </Button>
      </div>

      {gabaritosFiltrados.length === 0 ? (
        <div className="flex flex-col items-center gap-sm rounded-lg border border-cinza-200 bg-cinza-0 py-3xl text-center shadow-xs">
          <Library className="h-8 w-8 text-cinza-300" aria-hidden="true" />
          <h2 className="text-titulo-card text-cinza-700">Nenhum módulo nesta categoria</h2>
          <p className="max-w-sm text-corpo-pequeno text-cinza-500">
            Gabaritos prontos de módulos-caixa aparecem aqui, prontos para usar nos seus
            orçamentos. Crie um novo módulo ou escolha outra categoria.
          </p>
          <Button variant="primary" asChild className="mt-2">
            <Link href="/modulo">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Novo módulo
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-lg sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {gabaritosFiltrados.map((g) => (
            <GabaritoCard key={g.id} gabarito={g} onExcluir={onExcluir} onExcluido={removerLocal} />
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { Lightbulb, Package, Puzzle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KpisCatalogo } from "./KpisCatalogo";
import { TabelaChapas } from "./TabelaChapas";
import { TabelaFerragens } from "./TabelaFerragens";
import { TabelaSimples } from "./TabelaSimples";
import type { DadosProduto, ResultadoProduto } from "@/lib/produto/acoes";
import type { ProdutoRow } from "@/lib/produto/tipos";

// Task 13.7b (contrato .maestro/tmp/13.7b-contract.md) — componente
// PRESENTACIONAL de `/catalogo` (mesmo espírito de `PerfilLab`/
// `CorteMaterialLab`): recebe os produtos já carregados pelo Server
// Component da rota e as Server Actions de CRUD injetadas por
// `CatalogoConectado` (real) ou pelo harness `/dev/preview/catalogo`
// (no-op). Estado da lista é dono deste componente (mesmo padrão de
// `itensManuais` em `CorteMaterialLab`) — cada mutação bem-sucedida faz
// upsert local via `atualizarListaLocal`, sem re-buscar do servidor.
//
// Estado ERRO (Design-System.md Seção 8): `erroCarregamento` vem de
// `listarProdutos` quando a consulta falhou de verdade (distinto de "lista
// vazia", ver `lib/produto/listar.ts`) — substitui TODO o conteúdo, mesmo
// padrão de `CorteMaterialLab`/`FinanceiroLab` quando o motor não calcula.
//
// Abas (Design-System.md Seção 7.8: "abas do catálogo (Todos/Chapas/
// Ferragens/LEDs/Acessórios/Outros)"). Decisão de escopo (sem resposta
// explícita no contrato, documentada aqui): a última aba é rotulada "Fita"
// em vez do genérico "Outros" da Seção 7.8 — os 5 `tipo` reais da tabela
// `produto` (chapa/ferragem/fita/led/acessorio) já têm nome próprio, um
// rótulo "Outros" agruparia só fita e seria mais vago sem necessidade.
export interface CatalogoLabProps {
  produtosIniciais: ProdutoRow[];
  erroCarregamento?: boolean;
  onCriar: (dados: DadosProduto) => Promise<ResultadoProduto>;
  onAtualizar: (id: string, dados: DadosProduto) => Promise<ResultadoProduto>;
  onAlternarAtivo: (id: string, ativo: boolean) => Promise<ResultadoProduto>;
}

export function CatalogoLab({
  produtosIniciais,
  erroCarregamento = false,
  onCriar,
  onAtualizar,
  onAlternarAtivo,
}: CatalogoLabProps) {
  const [produtos, setProdutos] = useState<ProdutoRow[]>(produtosIniciais);

  function atualizarListaLocal(produto: ProdutoRow) {
    setProdutos((atuais) => {
      const indice = atuais.findIndex((p) => p.id === produto.id);
      if (indice === -1) return [...atuais, produto];
      const novos = [...atuais];
      novos[indice] = produto;
      return novos;
    });
  }

  if (erroCarregamento) {
    return (
      <Alert variant="erro">
        <AlertDescription>
          Não foi possível carregar o catálogo de produtos. Atualize a página e tente novamente.
        </AlertDescription>
      </Alert>
    );
  }

  const chapas = produtos.filter((p) => p.tipo === "chapa");
  const ferragens = produtos.filter((p) => p.tipo === "ferragem");
  const fitas = produtos.filter((p) => p.tipo === "fita");
  const leds = produtos.filter((p) => p.tipo === "led");
  const acessorios = produtos.filter((p) => p.tipo === "acessorio");

  return (
    <div className="flex flex-col gap-lg">
      <KpisCatalogo produtos={produtos} />

      <Tabs defaultValue="todos">
        <TabsList>
          <TabsTrigger value="todos">Todos</TabsTrigger>
          <TabsTrigger value="chapas">Chapas</TabsTrigger>
          <TabsTrigger value="ferragens">Ferragens</TabsTrigger>
          <TabsTrigger value="leds">LEDs</TabsTrigger>
          <TabsTrigger value="acessorios">Acessórios</TabsTrigger>
          <TabsTrigger value="fita">Fita</TabsTrigger>
        </TabsList>

        <TabsContent value="todos" className="flex flex-col gap-lg">
          <TabelaChapas produtos={chapas} onCriar={onCriar} onAtualizar={onAtualizar} onAlternarAtivo={onAlternarAtivo} onSucesso={atualizarListaLocal} />
          <TabelaFerragens produtos={ferragens} onCriar={onCriar} onAtualizar={onAtualizar} onAlternarAtivo={onAlternarAtivo} onSucesso={atualizarListaLocal} />
          <TabelaSimples
            tipo="fita"
            titulo="Fita de borda"
            descricao="Preço por metro — usado como valor único de referência em todo o orçamento."
            Icone={Package}
            unidade="m"
            produtos={fitas}
            onCriar={onCriar}
            onAtualizar={onAtualizar}
            onAlternarAtivo={onAlternarAtivo}
            onSucesso={atualizarListaLocal}
          />
          <TabelaSimples
            tipo="led"
            titulo="LEDs"
            descricao="Catalogados para referência — ainda sem correspondência automática no motor de cálculo."
            Icone={Lightbulb}
            unidade={null}
            produtos={leds}
            onCriar={onCriar}
            onAtualizar={onAtualizar}
            onAlternarAtivo={onAlternarAtivo}
            onSucesso={atualizarListaLocal}
          />
          <TabelaSimples
            tipo="acessorio"
            titulo="Acessórios"
            descricao="Catalogados para referência — ainda sem correspondência automática no motor de cálculo."
            Icone={Puzzle}
            unidade={null}
            produtos={acessorios}
            onCriar={onCriar}
            onAtualizar={onAtualizar}
            onAlternarAtivo={onAlternarAtivo}
            onSucesso={atualizarListaLocal}
          />
        </TabsContent>

        <TabsContent value="chapas">
          <TabelaChapas produtos={chapas} onCriar={onCriar} onAtualizar={onAtualizar} onAlternarAtivo={onAlternarAtivo} onSucesso={atualizarListaLocal} />
        </TabsContent>

        <TabsContent value="ferragens">
          <TabelaFerragens produtos={ferragens} onCriar={onCriar} onAtualizar={onAtualizar} onAlternarAtivo={onAlternarAtivo} onSucesso={atualizarListaLocal} />
        </TabsContent>

        <TabsContent value="leds">
          <TabelaSimples
            tipo="led"
            titulo="LEDs"
            descricao="Catalogados para referência — ainda sem correspondência automática no motor de cálculo."
            Icone={Lightbulb}
            unidade={null}
            produtos={leds}
            onCriar={onCriar}
            onAtualizar={onAtualizar}
            onAlternarAtivo={onAlternarAtivo}
            onSucesso={atualizarListaLocal}
          />
        </TabsContent>

        <TabsContent value="acessorios">
          <TabelaSimples
            tipo="acessorio"
            titulo="Acessórios"
            descricao="Catalogados para referência — ainda sem correspondência automática no motor de cálculo."
            Icone={Puzzle}
            unidade={null}
            produtos={acessorios}
            onCriar={onCriar}
            onAtualizar={onAtualizar}
            onAlternarAtivo={onAlternarAtivo}
            onSucesso={atualizarListaLocal}
          />
        </TabsContent>

        <TabsContent value="fita">
          <TabelaSimples
            tipo="fita"
            titulo="Fita de borda"
            descricao="Preço por metro — usado como valor único de referência em todo o orçamento."
            Icone={Package}
            unidade="m"
            produtos={fitas}
            onCriar={onCriar}
            onAtualizar={onAtualizar}
            onAlternarAtivo={onAlternarAtivo}
            onSucesso={atualizarListaLocal}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

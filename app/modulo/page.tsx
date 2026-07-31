"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { buscarGabaritoPorId } from "@/lib/gabarito/buscar";
import { criarGabarito } from "@/lib/gabarito/criar";
import { atualizarGabarito } from "@/lib/gabarito/atualizar";
import { forkGabarito } from "@/lib/gabarito/fork";
import { carregarCatalogo, coresDisponiveis } from "@/lib/catalog";
import { listarCategorias } from "@/lib/categorias";
import type { ModuloOrcamento } from "@/lib/orcamento";
import type { BoxModule } from "@/lib/engine/box/types";
import { EditorItemNucleo, caixaInicial, placaInicial, type ResultadoSalvarItem } from "./EditorItemNucleo";

// Task 13.3e (contrato .maestro/tmp/13.3e-contract.md) — este arquivo deixou
// de conter o editor inteiro (accordion + custo + peças + plano de corte,
// Task 13.1): esse NÚCLEO foi extraído para `EditorItemNucleo.tsx`, o mesmo
// componente reaproveitado por `/orcamento/[id]/item/[itemId]` (edição de um
// item real dentro de um orçamento — ver `lib/orcamento/salvarItem.ts`).
// `/modulo` continua exatamente com o mesmo comportamento de antes: seletor
// "Módulo-caixa / Placa" e leitura de `?preset=ID` na URL — só que agora só
// orquestra ISSO, delegando a UI de edição em si ao núcleo.
//
// Atualização (Task 13.7c, contrato .maestro/tmp/13.7c-contract.md): a
// biblioteca de presets do lado Módulo-caixa deixou de ser
// `lib/boxPresets.ts` (localStorage) e passou a ser a tabela `gabarito`
// (Supabase) — `lib/gabarito/{buscar,criar,atualizar,fork}.ts`, todos
// CLIENT-SIDE (`lib/supabase/client.ts`) porque este componente é
// `"use client"` sem Server Component pai que já busque isso. Ver
// `onSalvarBox` abaixo pra lógica de FORK-ON-SAVE (D-15): editar um gabarito
// GLOBAL nunca altera a linha global, a primeira alteração salva bifurca uma
// cópia própria via RPC `fork_gabarito`.
//
// Duas instâncias de `EditorItemNucleo` ficam montadas ao mesmo tempo (uma
// por origem) e alternam de VISIBILIDADE via CSS — nunca desmontam ao trocar
// de aba — para preservar o progresso de edição dos dois lados
// independentemente (mesmo padrão `data-[state=inactive]:hidden` que
// `components/orcamento/OrcamentoAbas.tsx` já usa pra aba "Ambientes").
//
// `key` muda UMA VEZ (de "inicial-*" pra "pronto-*") assim que o efeito abaixo
// resolve o catálogo/preset — força as duas instâncias a remontar com o
// `estadoInicial` DEFINITIVO (preset carregado da URL, ou cor/categoria
// padrão do catálogo). Isso reproduz o comportamento de antes (a mesma janela
// de "patch pós-mount"), sem violar o contrato de `EditorItemNucleo` de só
// ler `estadoInicial` na primeira renderização.
export default function EditorModulo() {
  const [origemAtual, setOrigemAtual] = useState<ModuloOrcamento["origem"]>("custom_box");
  // `organizacaoId: null` = o gabarito sendo editado é da base GLOBAL
  // (read-only) — decide o fork-on-save em `onSalvarBox` (D-15).
  const [presetEditando, setPresetEditando] = useState<{ id: string; organizacaoId: string | null } | null>(
    null
  );
  const [pronto, setPronto] = useState(false);
  const [estadoInicialBox, setEstadoInicialBox] = useState<ModuloOrcamento>({
    origem: "custom_box",
    box: caixaInicial("Branco TX", "Cozinha"),
  });
  const [estadoInicialPlaca, setEstadoInicialPlaca] = useState<ModuloOrcamento>({
    origem: "placa",
    placa: placaInicial("Branco TX"),
  });

  useEffect(() => {
    let cancelado = false;

    async function iniciar() {
      const cat = carregarCatalogo();
      const cats = listarCategorias();

      const params = new URLSearchParams(window.location.search);
      const presetId = params.get("preset");
      const gabarito = presetId ? await buscarGabaritoPorId(presetId) : null;
      if (cancelado) return;

      if (gabarito) {
        setEstadoInicialBox({ origem: "custom_box", box: gabarito.definicao });
        setPresetEditando({ id: gabarito.id, organizacaoId: gabarito.organizacaoId });
      } else {
        const branco = coresDisponiveis(cat).find((c) => c.toLowerCase().includes("branco"));
        setEstadoInicialBox({
          origem: "custom_box",
          box: caixaInicial(branco ?? "Branco TX", cats[0] ?? "Cozinha"),
        });
        setEstadoInicialPlaca({ origem: "placa", placa: placaInicial(branco ?? "Branco TX") });
      }
      setPronto(true);
    }

    iniciar();
    return () => {
      cancelado = true;
    };
  }, []);

  // Preset: só existe biblioteca pra módulo-caixa (Placa não tem persistência
  // ainda — ver nota original desta task no botão "Salvar" abaixo).
  //
  // Fork-on-save (Task 13.7c, D-15): editar um gabarito GLOBAL
  // (`presetEditando.organizacaoId === null`) NUNCA altera a linha global — a
  // primeira vez que o usuário salva, bifurca (RPC `fork_gabarito`) uma cópia
  // própria da organização e IMEDIATAMENTE grava o `box` recém-editado nessa
  // cópia (senão o fork sozinho perderia a diferença entre o que veio do
  // global e o que acabou de mudar). `presetEditando` passa a apontar pro
  // NOVO id — próximas alterações da MESMA sessão de edição viram `UPDATE`
  // direto, sem fork de novo.
  async function onSalvarBox(modulo: ModuloOrcamento): Promise<ResultadoSalvarItem> {
    if (modulo.origem !== "custom_box") return { ok: false, erro: "Item inválido." };
    const box: BoxModule = modulo.box;
    const nome = box.nome || "Módulo";
    const categoria = box.categoria || "Cozinha";

    if (presetEditando && presetEditando.organizacaoId === null) {
      const fork = await forkGabarito(presetEditando.id);
      if (!fork.ok || !fork.novoId) {
        return { ok: false, erro: fork.erro ?? "Não foi possível criar sua cópia deste módulo global." };
      }
      const atualizado = await atualizarGabarito(fork.novoId, nome, categoria, box);
      if (!atualizado.ok) {
        return { ok: false, erro: atualizado.erro };
      }
      setPresetEditando({ id: fork.novoId, organizacaoId: atualizado.gabarito?.organizacaoId ?? null });
      return { ok: true, mensagem: "Cópia própria criada — as próximas alterações são só suas." };
    }

    if (presetEditando) {
      const atualizado = await atualizarGabarito(presetEditando.id, nome, categoria, box);
      if (!atualizado.ok) return { ok: false, erro: atualizado.erro };
      return { ok: true };
    }

    const criado = await criarGabarito(nome, categoria, box);
    if (!criado.ok || !criado.gabarito) return { ok: false, erro: criado.erro };
    setPresetEditando({ id: criado.gabarito.id, organizacaoId: criado.gabarito.organizacaoId });
    return { ok: true };
  }

  return (
    <div className="wrap">
      <header className="top">
        <h1>Editor de item (módulo-caixa + placa)</h1>
        <p>
          Monte a caixa vazia, divida em vãos e aplique portas/gavetas nos vãos selecionados — ou
          configure uma placa avulsa (prateleira, fechamento, painel).{" "}
          <a href="/">← calculadora</a> · <a href="/biblioteca">Biblioteca de módulos</a> ·{" "}
          <a href="/catalogo">Catálogo</a>
        </p>
        {presetEditando && origemAtual === "custom_box" && (
          <p className="muted" style={{ fontSize: 12, marginTop: -12 }}>
            {presetEditando.organizacaoId === null
              ? "Editando um módulo da base global (somente leitura) — “Salvar este módulo” cria uma cópia própria na sua biblioteca, sem alterar o original."
              : "Editando um módulo já cadastrado na sua biblioteca — “Salvar este módulo” atualiza esse gabarito (não cria um novo)."}
          </p>
        )}
        {/* Seletor de tipo de item: troca qual núcleo (custom_box × placa)
            fica visível. Os dois ficam sempre montados (ver nota de escopo
            no topo do arquivo) — trocar não reseta o progresso de nenhum
            dos dois lados. */}
        <div className="flex flex-wrap gap-sm" style={{ marginTop: 4 }}>
          <Button
            variant={origemAtual === "custom_box" ? "iconActive" : "ghost"}
            size="sm"
            onClick={() => setOrigemAtual("custom_box")}
          >
            Módulo-caixa
          </Button>
          <Button
            variant={origemAtual === "placa" ? "iconActive" : "ghost"}
            size="sm"
            onClick={() => setOrigemAtual("placa")}
          >
            Placa
          </Button>
        </div>
      </header>

      <div className={origemAtual === "custom_box" ? "" : "hidden"}>
        <EditorItemNucleo
          key={pronto ? "pronto-box" : "inicial-box"}
          estadoInicial={estadoInicialBox}
          onSalvar={onSalvarBox}
          rotuloBotaoSalvar="Salvar este módulo"
        />
      </div>
      <div className={origemAtual === "placa" ? "" : "hidden"}>
        <EditorItemNucleo
          key={pronto ? "pronto-placa" : "inicial-placa"}
          estadoInicial={estadoInicialPlaca}
          onSalvar={async () => ({ ok: false, erro: "Placa ainda não tem biblioteca de presets." })}
          exibirAcaoSalvar={false}
        />
      </div>
    </div>
  );
}

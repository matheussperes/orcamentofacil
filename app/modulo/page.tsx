"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { atualizarPreset, buscarPreset, salvarPreset, seedPresetsPadrao } from "@/lib/boxPresets";
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
// `/modulo` continua exatamente com o mesmo comportamento de antes: biblioteca
// de presets em localStorage (`lib/boxPresets.ts`), seletor "Módulo-caixa /
// Placa" e leitura de `?preset=ID` na URL — só que agora só orquestra ISSO,
// delegando a UI de edição em si ao núcleo.
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
  const [presetEditando, setPresetEditando] = useState<{ id: string } | null>(null);
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
    const cat = carregarCatalogo();
    seedPresetsPadrao();
    const cats = listarCategorias();

    const params = new URLSearchParams(window.location.search);
    const presetId = params.get("preset");
    const preset = presetId ? buscarPreset(presetId) : undefined;

    if (preset) {
      setEstadoInicialBox({ origem: "custom_box", box: preset.box });
      setPresetEditando({ id: preset.id });
    } else {
      const branco = coresDisponiveis(cat).find((c) => c.toLowerCase().includes("branco"));
      setEstadoInicialBox({
        origem: "custom_box",
        box: caixaInicial(branco ?? "Branco TX", cats[0] ?? "Cozinha"),
      });
      setEstadoInicialPlaca({ origem: "placa", placa: placaInicial(branco ?? "Branco TX") });
    }
    setPronto(true);
  }, []);

  // Preset: só existe biblioteca pra módulo-caixa (Placa não tem persistência
  // ainda — ver nota original desta task no botão "Salvar" abaixo).
  async function onSalvarBox(modulo: ModuloOrcamento): Promise<ResultadoSalvarItem> {
    if (modulo.origem !== "custom_box") return { ok: false, erro: "Item inválido." };
    const box: BoxModule = modulo.box;
    if (presetEditando) {
      atualizarPreset(presetEditando.id, { nome: box.nome || "Módulo", categoria: box.categoria || "Cozinha", box });
      return { ok: true };
    }
    const p = salvarPreset(box.nome || "Módulo", box.categoria || "Cozinha", box);
    setPresetEditando({ id: p.id });
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
          <a href="/configuracoes/materiais">Materiais</a>
        </p>
        {presetEditando && origemAtual === "custom_box" && (
          <p className="muted" style={{ fontSize: 12, marginTop: -12 }}>
            Editando um módulo já cadastrado — &quot;Salvar este módulo&quot; atualiza esse preset (não cria um novo).
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

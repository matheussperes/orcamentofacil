"use client";

import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import type { Catalogo } from "@/lib/catalog";
import { espessurasDaCor } from "@/lib/catalog";
import type { GrupoPortas, SentidoAbrir, SentidoCorrer } from "@/lib/engine/box/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { SecaoHeader } from "./SecaoHeader";

export interface ConfigPortas {
  tipoAbertura: "abrir" | "correr";
  sentido: SentidoAbrir | SentidoCorrer;
  qtd: number;
  cor: string;
  espessura: number;
}

const SENTIDOS_ABRIR: { value: SentidoAbrir; label: string }[] = [
  { value: "basculante_pia", label: "Basculante Pia" },
  { value: "basculante_aereo", label: "Basculante Aéreo" },
  { value: "direita", label: "Direita" },
  { value: "esquerda", label: "Esquerda" },
];
const SENTIDOS_CORRER: { value: SentidoCorrer; label: string }[] = [
  { value: "direita", label: "Direita" },
  { value: "esquerda", label: "Esquerda" },
];

export function PortasCard({
  vaosSelecionados,
  cores,
  catalogo,
  modoSelecaoPortas,
  onSelecionarModoPortas,
  grupoEmEdicao,
  onAplicarVaosSelecionados,
  onSalvarEdicao,
  onExcluirGrupo,
  onCancelarEdicao,
  onExcluirPorVaos,
  aberta,
  onAbrir,
  onSalvar,
}: {
  vaosSelecionados: string[];
  cores: string[];
  catalogo: Catalogo | null;
  /** true quando o canvas está no modo "Selecionar portas" (destaca o botão). */
  modoSelecaoPortas: boolean;
  onSelecionarModoPortas: () => void;
  /** Grupo de porta selecionado no canvas (modo "Selecionar portas") pra editar/excluir. */
  grupoEmEdicao: GrupoPortas | null;
  onAplicarVaosSelecionados: (cfg: ConfigPortas) => void;
  onSalvarEdicao: (id: string, cfg: ConfigPortas) => void;
  onExcluirGrupo: (id: string) => void;
  onCancelarEdicao: () => void;
  onExcluirPorVaos: () => void;
  aberta: boolean;
  onAbrir: () => void;
  onSalvar: () => void;
}) {
  const [tipoAbertura, setTipoAbertura] = useState<"abrir" | "correr">("abrir");
  const [sentido, setSentido] = useState<SentidoAbrir | SentidoCorrer>("direita");
  const [qtd, setQtd] = useState(2);
  const [cor, setCor] = useState(cores[0] ?? "Branco TX");
  const [espessura, setEspessura] = useState(18);

  // Vão selecionou um grupo existente (modo "Selecionar portas") -> carrega a
  // config dele no formulário pra edição.
  useEffect(() => {
    if (!grupoEmEdicao) return;
    setTipoAbertura(grupoEmEdicao.tipoAbertura);
    setSentido(grupoEmEdicao.sentido);
    setQtd(grupoEmEdicao.qtd);
    setCor(grupoEmEdicao.material.cor);
    setEspessura(grupoEmEdicao.material.espessura);
  }, [grupoEmEdicao]);

  const opcoesSentido = tipoAbertura === "abrir" ? SENTIDOS_ABRIR : SENTIDOS_CORRER;

  function trocarTipoAbertura(t: "abrir" | "correr") {
    setTipoAbertura(t);
    const opcoes = t === "abrir" ? SENTIDOS_ABRIR : SENTIDOS_CORRER;
    setSentido(opcoes[0].value);
  }

  function cfg(): ConfigPortas {
    return { tipoAbertura, sentido, qtd, cor, espessura };
  }

  return (
    <div
      className={
        aberta
          ? "rounded-lg border border-cinza-200 bg-cinza-0 p-4 shadow-xs"
          : "cursor-pointer rounded-lg border border-cinza-200 bg-cinza-50 p-3 hover:bg-cinza-100 transition-colors duration-150"
      }
    >
      <SecaoHeader titulo="Portas" aberta={aberta} onAbrir={onAbrir} />
      {aberta && (
        <>
          <div className="flex flex-wrap gap-sm mb-sm">
            <Button
              variant={modoSelecaoPortas ? "iconActive" : "ghost"}
              size="sm"
              onClick={onSelecionarModoPortas}
            >
              Selecionar portas
            </Button>
          </div>

          {grupoEmEdicao && (
            <p className="mb-sm text-corpo-pequeno text-cinza-500">
              Editando a porta selecionada no desenho.
            </p>
          )}

          <div className="grid grid-cols-2 gap-md sm:grid-cols-3">
            <div>
              <Label htmlFor="portas-tipo">Tipos</Label>
              <Select value={tipoAbertura} onValueChange={(v) => trocarTipoAbertura(v as "abrir" | "correr")}>
                <SelectTrigger id="portas-tipo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="abrir">Abrir</SelectItem>
                  <SelectItem value="correr">Correr</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="portas-sentido">Sentido</Label>
              <Select value={sentido} onValueChange={(v) => setSentido(v as SentidoAbrir | SentidoCorrer)}>
                <SelectTrigger id="portas-sentido">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {opcoesSentido.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-md grid grid-cols-2 gap-md sm:grid-cols-3">
            <div>
              <Label htmlFor="portas-qtd">Quantidade</Label>
              <Input
                id="portas-qtd"
                type="number"
                min={1}
                value={qtd}
                onChange={(e) => setQtd(Number(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="portas-cor">Cor</Label>
              <Select value={cor} onValueChange={setCor}>
                <SelectTrigger id="portas-cor">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {cores.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="portas-espessura">Espessura</Label>
              <Select value={String(espessura)} onValueChange={(v) => setEspessura(Number(v))}>
                <SelectTrigger id="portas-espessura">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(catalogo ? espessurasDaCor(catalogo, cor) : [15, 18]).map((esp) => (
                    <SelectItem key={esp} value={String(esp)}>{esp} mm</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-md flex flex-wrap items-center gap-xs">
            {grupoEmEdicao ? (
              <>
                <Button onClick={() => onSalvarEdicao(grupoEmEdicao.id, cfg())}>
                  Salvar alterações
                </Button>
                <Button variant="danger" onClick={() => onExcluirGrupo(grupoEmEdicao.id)}>Excluir</Button>
                <Button variant="ghost" onClick={onCancelarEdicao}>Cancelar</Button>
              </>
            ) : (
              <>
                <Button
                  disabled={vaosSelecionados.length === 0}
                  onClick={() => onAplicarVaosSelecionados(cfg())}
                >
                  Aplicar em vãos selecionados
                </Button>
                <Button variant="danger" onClick={onExcluirPorVaos}>Excluir Portas</Button>
              </>
            )}
            <Button variant="outline" onClick={onSalvar}>
              Avançar
              <ChevronRight size={14} />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import type { Catalogo } from "@/lib/catalog";
import { espessurasDaCor } from "@/lib/catalog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SecaoHeader } from "./SecaoHeader";

export interface ConfigGaveta {
  interna: boolean;
  qtd: number;
  profundidade: number;
  cor: string;
  espessura: number;
}

export interface GavetaEmEdicao {
  vaoId: string;
  config: ConfigGaveta;
}

export function GavetasCard({
  vaosSelecionados,
  cores,
  catalogo,
  modoSelecaoGavetas,
  onSelecionarModoGavetas,
  gavetaEmEdicao,
  onAplicar,
  onSalvarEdicao,
  onExcluirEdicao,
  onCancelarEdicao,
  onExcluir,
  aberta,
  onAbrir,
  onSalvar,
}: {
  vaosSelecionados: string[];
  cores: string[];
  catalogo: Catalogo | null;
  /** true quando o canvas está no modo "Selecionar gaveta" (destaca o botão). */
  modoSelecaoGavetas: boolean;
  onSelecionarModoGavetas: () => void;
  /** Vão com gaveta selecionado no canvas (modo "Selecionar gaveta") pra editar/excluir. */
  gavetaEmEdicao: GavetaEmEdicao | null;
  onAplicar: (cfg: ConfigGaveta) => void;
  onSalvarEdicao: (vaoId: string, cfg: ConfigGaveta) => void;
  onExcluirEdicao: (vaoId: string) => void;
  onCancelarEdicao: () => void;
  onExcluir: () => void;
  aberta: boolean;
  onAbrir: () => void;
  onSalvar: () => void;
}) {
  const [interna, setInterna] = useState(false);
  const [qtd, setQtd] = useState(4);
  const [profundidade, setProfundidade] = useState(450);
  const [cor, setCor] = useState(cores[0] ?? "Branco TX");
  const [espessura, setEspessura] = useState(18);

  useEffect(() => {
    if (!gavetaEmEdicao) return;
    setInterna(gavetaEmEdicao.config.interna);
    setQtd(gavetaEmEdicao.config.qtd);
    setProfundidade(gavetaEmEdicao.config.profundidade);
    setCor(gavetaEmEdicao.config.cor);
    setEspessura(gavetaEmEdicao.config.espessura);
  }, [gavetaEmEdicao]);

  function cfg(): ConfigGaveta {
    return { interna, qtd, profundidade, cor, espessura };
  }

  return (
    <div
      className={
        aberta
          ? "rounded-lg border border-cinza-200 bg-cinza-0 p-4 shadow-xs"
          : "cursor-pointer rounded-lg border border-cinza-200 bg-cinza-50 p-3 hover:bg-cinza-100"
      }
    >
      <SecaoHeader titulo="Gavetas" aberta={aberta} onAbrir={onAbrir} />
      {aberta && (
        <>
          <div className="flex flex-wrap gap-sm mb-sm">
            <Button
              variant={modoSelecaoGavetas ? "iconActive" : "ghost"}
              size="sm"
              onClick={onSelecionarModoGavetas}
            >
              Selecionar gaveta
            </Button>
          </div>

          {gavetaEmEdicao && (
            <p className="mb-sm text-corpo-pequeno text-cinza-500">
              Editando o conjunto de gavetas selecionado no desenho.
            </p>
          )}

          <div className="grid grid-cols-2 gap-md sm:grid-cols-3">
            <div>
              <Label htmlFor="gavetas-tipo">Tipo</Label>
              <Select value={interna ? "int" : "ext"} onValueChange={(v) => setInterna(v === "int")}>
                <SelectTrigger id="gavetas-tipo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ext">Externa</SelectItem>
                  <SelectItem value="int">Interna (guarda-roupa)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="gavetas-qtd">Quantidade</Label>
              <Input
                id="gavetas-qtd"
                type="number"
                min={1}
                value={qtd}
                onChange={(e) => setQtd(Number(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="gavetas-profundidade">Profundidade</Label>
              <Input
                id="gavetas-profundidade"
                type="number"
                value={profundidade}
                onChange={(e) => setProfundidade(Number(e.target.value))}
              />
            </div>
            {!interna && (
              <>
                <div>
                  <Label htmlFor="gavetas-cor">Cor</Label>
                  <Select value={cor} onValueChange={setCor}>
                    <SelectTrigger id="gavetas-cor">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {cores.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="gavetas-espessura">Espessura</Label>
                  <Select value={String(espessura)} onValueChange={(v) => setEspessura(Number(v))}>
                    <SelectTrigger id="gavetas-espessura">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(catalogo ? espessurasDaCor(catalogo, cor) : [15, 18]).map((esp) => (
                        <SelectItem key={esp} value={String(esp)}>{esp} mm</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>

          <div className="mt-md flex flex-wrap items-center gap-xs">
            {gavetaEmEdicao ? (
              <>
                <Button onClick={() => onSalvarEdicao(gavetaEmEdicao.vaoId, cfg())}>
                  Salvar alterações
                </Button>
                <Button variant="danger" onClick={() => onExcluirEdicao(gavetaEmEdicao.vaoId)}>Excluir</Button>
                <Button variant="ghost" onClick={onCancelarEdicao}>Cancelar</Button>
              </>
            ) : (
              <>
                <Button disabled={vaosSelecionados.length === 0} onClick={() => onAplicar(cfg())}>
                  Aplicar no vão
                </Button>
                <Button variant="danger" disabled={vaosSelecionados.length === 0} onClick={onExcluir}>
                  Excluir Gavetas
                </Button>
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

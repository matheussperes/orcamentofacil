"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ReferenciaVao } from "@/lib/engine/parede";
import type { Faixa } from "@/lib/engine/parede";
import type { TipoPuxador } from "@/lib/engine/box/types";
import type { BoxPreset } from "@/lib/boxPresets";
import { coresDisponiveis, espessurasDaCor, type Catalogo } from "@/lib/catalog";
import { FAIXAS, ROTULO_FAIXA, ROTULO_REF_VAO } from "../AmbientesLab.constants";
import { numero } from "../AmbientesLab.helpers";
import type { useItensPosicionados } from "./useItensPosicionados";

/** Task R.3a — extraído de AmbientesLab.tsx (decomposição pura). Formulário
 * de "adicionar item posicionado" + personalização da instância (Task
 * 2.18-2.23). */
export function SecaoItensPosicionadosForm({
  itensHook,
  presets,
  catalogo,
}: {
  itensHook: ReturnType<typeof useItensPosicionados>;
  presets: BoxPreset[];
  catalogo: Catalogo | null;
}) {
  return (
    <>
      <div className="mb-3 flex flex-wrap items-end gap-sm">
        <div>
          <Label htmlFor="item-faixa">Faixa</Label>
          <Select
            value={itensHook.faixaSelecionada ?? ""}
            onValueChange={(v) => {
              itensHook.setFaixaSelecionada(v as Faixa);
              itensHook.setPresetSelecionado("");
            }}
          >
            <SelectTrigger id="item-faixa" className="w-32">
              <SelectValue placeholder="Selecione a faixa" />
            </SelectTrigger>
            <SelectContent>
              {FAIXAS.map((f) => (
                <SelectItem key={f} value={f}>
                  {ROTULO_FAIXA[f]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="item-preset">Módulo</Label>
          <Select
            value={itensHook.presetSelecionado}
            onValueChange={itensHook.setPresetSelecionado}
            disabled={!itensHook.faixaSelecionada}
          >
            <SelectTrigger id="item-preset" className="w-48">
              <SelectValue placeholder="Selecione a faixa primeiro" />
            </SelectTrigger>
            <SelectContent>
              {presets.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="item-ref-vao">Referência</Label>
          <Select value={itensHook.refVaoItem} onValueChange={(v) => itensHook.setRefVaoItem(v as ReferenciaVao)}>
            <SelectTrigger id="item-ref-vao" className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="esquerda">{ROTULO_REF_VAO.esquerda}</SelectItem>
              <SelectItem value="direita">{ROTULO_REF_VAO.direita}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="item-vao">Vão (mm)</Label>
          <Input
            id="item-vao"
            type="number"
            className="w-24"
            value={itensHook.vaoItem}
            onChange={(e) => itensHook.setVaoItem(numero(e.target.value))}
          />
        </div>
        <Button variant="primary" onClick={itensHook.adicionarItem}>
          Adicionar
        </Button>
      </div>

      <div className="mb-3 rounded-md border border-cinza-200 bg-cinza-50 p-3">
        <h3 className="mb-2 text-corpo-pequeno font-medium text-cinza-700">Personalizar módulo</h3>
        <div className="flex flex-wrap items-end gap-sm">
          <div>
            <Label htmlFor="item-largura">Largura (mm)</Label>
            <Input
              id="item-largura"
              type="number"
              className="w-24"
              value={itensHook.larguraItem}
              onChange={(e) => itensHook.setLarguraItem(numero(e.target.value))}
            />
          </div>
          <div>
            <Label htmlFor="item-altura">Altura (mm)</Label>
            <Input
              id="item-altura"
              type="number"
              className="w-24"
              value={itensHook.alturaItem}
              onChange={(e) => itensHook.setAlturaItem(numero(e.target.value))}
            />
          </div>
          <div>
            <Label htmlFor="item-profundidade">Profundidade (mm)</Label>
            <Input
              id="item-profundidade"
              type="number"
              className="w-24"
              value={itensHook.profundidadeItem}
              onChange={(e) => itensHook.setProfundidadeItem(numero(e.target.value))}
            />
          </div>
          <div>
            <Label htmlFor="item-cor-caixa">Cor da caixa</Label>
            <Select value={itensHook.corCaixaItem} onValueChange={itensHook.setCorCaixaItem}>
              <SelectTrigger id="item-cor-caixa" className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(catalogo ? coresDisponiveis(catalogo) : ["Branco TX", "Madeirado"]).map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="item-espessura-caixa">Espessura da caixa</Label>
            <Select
              value={String(itensHook.espessuraCaixaItem)}
              onValueChange={(v) => itensHook.setEspessuraCaixaItem(numero(v))}
            >
              <SelectTrigger id="item-espessura-caixa" className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(catalogo && itensHook.corCaixaItem ? espessurasDaCor(catalogo, itensHook.corCaixaItem) : [15, 18, 25]).map(
                  (esp) => (
                    <SelectItem key={esp} value={String(esp)}>
                      {esp} mm
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>
          {itensHook.temPortasNoPresetAtual && (
            <>
              <div>
                <Label htmlFor="item-cor-portas">Cor das portas</Label>
                <Select value={itensHook.corPortasItem} onValueChange={itensHook.setCorPortasItem}>
                  <SelectTrigger id="item-cor-portas" className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(catalogo ? coresDisponiveis(catalogo) : ["Branco TX", "Madeirado"]).map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="item-espessura-portas">Espessura das portas</Label>
                <Select
                  value={String(itensHook.espessuraPortasItem)}
                  onValueChange={(v) => itensHook.setEspessuraPortasItem(numero(v))}
                >
                  <SelectTrigger id="item-espessura-portas" className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(catalogo && itensHook.corPortasItem
                      ? espessurasDaCor(catalogo, itensHook.corPortasItem)
                      : [15, 18, 25]
                    ).map((esp) => (
                      <SelectItem key={esp} value={String(esp)}>
                        {esp} mm
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
          <div>
            <Label htmlFor="item-fundo">Fundo</Label>
            <Select
              value={itensHook.temFundoItem ? "sim" : "nao"}
              onValueChange={(v) => itensHook.setTemFundoItem(v === "sim")}
            >
              <SelectTrigger id="item-fundo" className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sim">Sim</SelectItem>
                <SelectItem value="nao">Não</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="item-puxador">Puxador</Label>
            <Select value={itensHook.puxadorItem} onValueChange={(v) => itensHook.setPuxadorItem(v as TipoPuxador)}>
              <SelectTrigger id="item-puxador" className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="haste">Haste</SelectItem>
                <SelectItem value="perfil">Perfil</SelectItem>
                <SelectItem value="sem_puxador">Sem puxador</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </>
  );
}

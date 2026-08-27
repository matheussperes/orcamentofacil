"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ModeloTampo, PosicaoElemento, TipoElementoContinuo } from "@/lib/engine/elemento-continuo/types";
import { OPCOES_ESPESSURA_ENGROSSAMENTO } from "@/lib/engine/elemento-continuo/types";
import { trocarModeloTampo } from "@/lib/engine/elemento-continuo/explode";
import { coresDisponiveis, espessurasDaCor, type Catalogo } from "@/lib/catalog";
import { numero } from "../AmbientesLab.helpers";
import { ROTULO_MODELO_TAMPO, ROTULO_POSICAO_ELEMENTO, ROTULO_TIPO_ELEMENTO_CONTINUO } from "../AmbientesLab.constants";
import type { useConjuntos } from "./useConjuntos";
import type { useElementosContinuos } from "./useElementosContinuos";

/** Task R.3a — extraído de AmbientesLab.tsx (decomposição pura). Formulário
 * "adicionar elemento contínuo" (tampo/rodapé/tamponamento/fechamento —
 * Task 13.2c/3.10-3.11). */
export function SecaoElementosContinuosForm({
  elementosContinuosHook,
  nomeDoItem,
  catalogo,
}: {
  elementosContinuosHook: ReturnType<typeof useElementosContinuos>;
  nomeDoItem: ReturnType<typeof useConjuntos>["nomeDoItem"];
  catalogo: Catalogo | null;
}) {
  const h = elementosContinuosHook;
  if (!h.selecao) return null;

  return (
    <div className="mb-3 flex flex-wrap items-end gap-sm">
      <div>
        <Label htmlFor="ec-tipo">Tipo</Label>
        <Select
          value={h.novoTipoElemento}
          onValueChange={(v) => h.setNovoTipoElemento(v as TipoElementoContinuo)}
        >
          <SelectTrigger id="ec-tipo" className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(ROTULO_TIPO_ELEMENTO_CONTINUO) as TipoElementoContinuo[]).map((t) => (
              <SelectItem key={t} value={t}>
                {ROTULO_TIPO_ELEMENTO_CONTINUO[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {h.novoTipoElemento === "tamponamento" &&
        h.selecao.tipo === "conjunto" &&
        h.itensDaSelecao.length > 1 && (
          <div>
            <Label htmlFor="ec-modulo">Módulo do bloco</Label>
            <Select value={h.moduloTamponamentoAtual} onValueChange={h.setModuloTamponamento}>
              <SelectTrigger id="ec-modulo" className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {h.itensDaSelecao.map((itemId, idx) => (
                  <SelectItem key={itemId} value={itemId}>
                    {idx + 1}. {nomeDoItem(itemId)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

      <div>
        <Label htmlFor="ec-posicao">Posição</Label>
        <Select
          value={h.novaPosicaoElemento}
          onValueChange={(v) => h.setNovaPosicaoElemento(v as PosicaoElemento)}
        >
          <SelectTrigger id="ec-posicao" className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {h.posicoesDisponiveis.map((p) => (
              <SelectItem key={p} value={p}>
                {ROTULO_POSICAO_ELEMENTO[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="ec-cor">Cor</Label>
        <Select value={h.corElemento} onValueChange={h.setCorElemento}>
          <SelectTrigger id="ec-cor" className="w-36">
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

      {h.novoTipoElemento === "tampo" && (
        <div>
          <Label htmlFor="ec-modelo">Modelo</Label>
          <Select
            value={h.selecaoTampo.modelo}
            onValueChange={(v) => h.setSelecaoTampo(trocarModeloTampo(h.selecaoTampo, v as ModeloTampo))}
          >
            <SelectTrigger id="ec-modelo" className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(ROTULO_MODELO_TAMPO) as ModeloTampo[]).map((m) => (
                <SelectItem key={m} value={m}>
                  {ROTULO_MODELO_TAMPO[m]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div>
        <Label htmlFor="ec-espessura">Espessura</Label>
        {h.novoTipoElemento === "tampo" ? (
          <Select
            value={h.selecaoTampo.espessuraFinal !== undefined ? String(h.selecaoTampo.espessuraFinal) : ""}
            onValueChange={(v) => h.setSelecaoTampo((s) => ({ ...s, espessuraFinal: numero(v) }))}
          >
            <SelectTrigger id="ec-espessura" className="w-24">
              <SelectValue placeholder="mm" />
            </SelectTrigger>
            <SelectContent>
              {h.selecaoTampo.modelo === "simples"
                ? h.espessurasTampoSimples.map((esp) => (
                    <SelectItem key={esp} value={String(esp)}>
                      {esp} mm
                    </SelectItem>
                  ))
                : OPCOES_ESPESSURA_ENGROSSAMENTO.map((o) => (
                    <SelectItem key={o.espessuraFinal} value={String(o.espessuraFinal)}>
                      {o.espessuraFinal}mm
                    </SelectItem>
                  ))}
            </SelectContent>
          </Select>
        ) : (
          <Select
            value={String(h.espessuraElemento)}
            onValueChange={(v) => h.setEspessuraElemento(numero(v))}
          >
            <SelectTrigger id="ec-espessura" className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(catalogo && h.corElemento ? espessurasDaCor(catalogo, h.corElemento) : [15, 18, 25]).map(
                (esp) => (
                  <SelectItem key={esp} value={String(esp)}>
                    {esp} mm
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
        )}
      </div>

      <Button
        variant="outline"
        onClick={h.adicionarElementoContinuo}
        disabled={h.novoTipoElemento === "tampo" && h.selecaoTampo.espessuraFinal === undefined}
      >
        Adicionar
      </Button>
    </div>
  );
}

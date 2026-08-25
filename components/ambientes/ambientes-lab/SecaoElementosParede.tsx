"use client";

import { X, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ElementoParede } from "@/lib/engine/parede";
import type { ReferenciaX, ReferenciaY } from "@/lib/engine/parede/referenciaMedida";
import { ROTULO_REF_X, ROTULO_REF_Y, ROTULO_TIPO_ELEMENTO, TIPOS_ELEMENTO } from "../AmbientesLab.constants";
import { numero } from "../AmbientesLab.helpers";
import type { ParedeComMeta } from "@/lib/ambiente/estado";
import type { useElementosParede } from "./useElementosParede";

/** Task R.3a — extraído de AmbientesLab.tsx (decomposição pura). Formulário
 * e lista de "Elementos de parede" (janela/porta/tomada/ponto
 * hidráulico/pedra — Task 2.7-2.12). */
export function SecaoElementosParede({
  parede,
  form,
}: {
  parede: ParedeComMeta;
  form: ReturnType<typeof useElementosParede>;
}) {
  return (
    <section className="rounded-lg border border-cinza-200 bg-cinza-0 p-4 shadow-xs">
      <h2 className="mb-3 text-titulo-secao text-cinza-900">Elementos de parede</h2>

      {/* Task 2.12 (front) — presets de elemento de parede (Modelo de
          Domínio 3.2.3): aplicar copia nome/largura/altura pro formulário
          abaixo, sem vínculo vivo. Select fica vazio quando não há
          presets (`AmbientesLabStandalone`/`AmbientesTabMock`, sem
          Supabase real, sempre caem neste caso — prop opcional default
          `[]`). */}
      <div className="mb-3 flex flex-wrap items-end gap-sm">
        <div>
          <Label htmlFor="elemento-preset">Aplicar preset</Label>
          <Select
            value={form.presetParedeSelecionado}
            onValueChange={form.selecionarPresetParede}
            disabled={form.listaPresetsParede.length === 0}
          >
            <SelectTrigger id="elemento-preset" className="w-52">
              <SelectValue placeholder="Nenhum preset salvo" />
            </SelectTrigger>
            <SelectContent>
              {form.listaPresetsParede.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {form.listaPresetsParede.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            {form.listaPresetsParede.map((p) => (
              <span
                key={p.id}
                className="inline-flex items-center gap-1 rounded-md border border-cinza-200 bg-cinza-0 py-1 pl-2 pr-1 text-corpo-pequeno text-cinza-700"
              >
                {p.nome}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={() => form.excluirPresetParede(p.id)}
                  aria-label={`Excluir preset ${p.nome}`}
                >
                  <X size={12} />
                </Button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="mb-3 flex flex-wrap items-end gap-sm">
        <div>
          <Label htmlFor="elemento-tipo">Tipo</Label>
          <Select value={form.novoTipo} onValueChange={(v) => form.setNovoTipo(v as ElementoParede["tipo"])}>
            <SelectTrigger id="elemento-tipo" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIPOS_ELEMENTO.map((t) => (
                <SelectItem key={t} value={t}>
                  {ROTULO_TIPO_ELEMENTO[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="elemento-nome">Nome (opcional)</Label>
          <Input
            id="elemento-nome"
            type="text"
            className="w-40"
            value={form.novoNome}
            onChange={(e) => form.setNovoNome(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="elemento-ref-x">Referência X</Label>
          <Select value={form.novoRefX} onValueChange={(v) => form.mudarRefX(v as ReferenciaX)}>
            <SelectTrigger id="elemento-ref-x" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="esquerda">{ROTULO_REF_X.esquerda}</SelectItem>
              <SelectItem value="direita">{ROTULO_REF_X.direita}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="elemento-x">{ROTULO_REF_X[form.novoRefX]} (mm)</Label>
          <Input
            id="elemento-x"
            type="number"
            className="w-24"
            value={form.novoX}
            onChange={(e) => form.setNovoX(numero(e.target.value))}
          />
        </div>
        <div>
          <Label htmlFor="elemento-ref-y">Referência Y</Label>
          <Select value={form.novoRefY} onValueChange={(v) => form.mudarRefY(v as ReferenciaY)}>
            <SelectTrigger id="elemento-ref-y" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="chao">{ROTULO_REF_Y.chao}</SelectItem>
              <SelectItem value="teto">{ROTULO_REF_Y.teto}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="elemento-y">{ROTULO_REF_Y[form.novoRefY]} (mm)</Label>
          <Input
            id="elemento-y"
            type="number"
            className="w-24"
            value={form.novoY}
            onChange={(e) => form.setNovoY(numero(e.target.value))}
          />
        </div>
        <div>
          <Label htmlFor="elemento-largura">Largura (mm)</Label>
          <Input
            id="elemento-largura"
            type="number"
            className="w-24"
            value={form.novaLargura}
            onChange={(e) => form.setNovaLargura(numero(e.target.value))}
          />
        </div>
        <div>
          <Label htmlFor="elemento-altura">Altura (mm)</Label>
          <Input
            id="elemento-altura"
            type="number"
            className="w-24"
            value={form.novaAltura}
            onChange={(e) => form.setNovaAltura(numero(e.target.value))}
          />
        </div>
        <Button variant="primary" onClick={form.salvarElemento}>
          {form.elementoEditandoIndice !== null ? "Salvar" : "Adicionar"}
        </Button>
        {form.elementoEditandoIndice !== null && (
          <Button variant="ghost" onClick={form.limparFormularioElemento}>
            Cancelar
          </Button>
        )}
        <Button variant="ghost" onClick={form.salvarComoPresetParede} disabled={form.salvandoPreset}>
          Salvar como preset
        </Button>
      </div>

      {form.erroPreset && (
        <Alert variant="erro" className="mb-3">
          <AlertDescription>{form.erroPreset}</AlertDescription>
        </Alert>
      )}

      {parede.elementos.length === 0 ? (
        <p className="text-corpo-pequeno text-cinza-500">Nenhum elemento adicionado.</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">X</TableHead>
                <TableHead className="text-right">Y</TableHead>
                <TableHead className="text-right">Largura</TableHead>
                <TableHead className="text-right">Altura</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {parede.elementos.map((el, i) => (
                <TableRow
                  key={el.id}
                  className={form.elementoEditandoIndice === i ? "bg-accent-subtle" : undefined}
                >
                  <TableCell>{ROTULO_TIPO_ELEMENTO[el.tipo]}</TableCell>
                  <TableCell className="text-right tabular-nums">{el.x}</TableCell>
                  <TableCell className="text-right tabular-nums">{el.y}</TableCell>
                  <TableCell className="text-right tabular-nums">{el.largura}</TableCell>
                  <TableCell className="text-right tabular-nums">{el.altura}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => form.editarElemento(i)}
                        aria-label={`Editar elemento ${ROTULO_TIPO_ELEMENTO[el.tipo]}`}
                      >
                        <Pencil size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => form.removerElemento(i)}
                        aria-label={`Remover elemento ${ROTULO_TIPO_ELEMENTO[el.tipo]}`}
                      >
                        <X size={14} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}

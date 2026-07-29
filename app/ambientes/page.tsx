"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BoxCanvas, type ItemDoConjunto } from "../components/BoxCanvas";
import { ElevacaoParede } from "./ElevacaoParede";
import {
  validarParedeTier1,
  validarParedeTier2,
  type AlturasFaixas,
  type ElementoParede,
  type Faixa,
  type ItemPosicionado,
  type Parede,
  type ResolvedorItens,
} from "@/lib/engine/parede";
import { aplicarOverrides, detectarConjuntos, type OverrideJuncao } from "@/lib/engine/conjunto";
import type { EngineWarning } from "@/lib/engine/types";
import { larguraDoItem, type ModuloOrcamento } from "@/lib/orcamento";
import { listarPresets, seedPresetsPadrao, type BoxPreset } from "@/lib/boxPresets";

// Task 13.2b — overrides do handle de junção (localStorage nesta task, ver
// contrato: a coluna `parede.overrides_juncao` já existe no schema, Backend,
// mas quem persiste de verdade é este laboratório local, igual a
// `lib/boxPresets.ts` — migra para Supabase quando a task de Fase C que
// persiste `/ambientes` de verdade chegar).
const CHAVE_OVERRIDES = "ambientes_overrides_juncao";

function overridesIniciais(): OverrideJuncao[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(CHAVE_OVERRIDES) ?? "[]");
  } catch {
    return [];
  }
}

// Task 13.2a — `/ambientes`: laboratório local (React state, sem Supabase),
// mesmo espírito de `/modulo`. Consome inteiramente o motor já existente em
// `lib/engine/parede` (derivarY, validarParedeTier1/Tier2) e a biblioteca de
// presets (`lib/boxPresets.ts`) — nenhuma lógica de validação/geometria de
// item é reimplementada aqui.

const TIPOS_ELEMENTO: ElementoParede["tipo"][] = ["janela", "porta", "tomada", "ponto_hidraulico"];
const ROTULO_TIPO_ELEMENTO: Record<ElementoParede["tipo"], string> = {
  janela: "Janela",
  porta: "Porta",
  tomada: "Tomada",
  ponto_hidraulico: "Ponto hidráulico",
};
const FAIXAS: Faixa[] = ["inferior", "bancada", "aereo", "torre"];
const ROTULO_FAIXA: Record<Faixa, string> = {
  inferior: "Inferior",
  bancada: "Bancada",
  aereo: "Aéreo",
  torre: "Torre",
};

function paredeInicial(): Parede {
  return { id: "parede-1", largura: 3000, altura: 2700, elementos: [], itens: [] };
}

function alturasIniciais(): AlturasFaixas {
  return { alturaRodape: 100, alturaBancada: 900, alturaInstalacaoAereo: 1400, peDireito: 2700 };
}

// Cada item posicionado guarda um `itemId` de INSTÂNCIA sintético (não o id
// do preset) — decisão de design: `ResolvedorItens` é um `Map<itemId,
// ModuloOrcamento>` (chave única), então reaproveitar o id do preset como
// `itemId` impediria posicionar o MESMO preset duas vezes na parede (a
// segunda sobrescreveria a primeira no Map). `presetId` fica como metadado
// de UI (rótulo/rastreio), fora do `ItemPosicionado` que o motor enxerga.
interface ItemColocado {
  itemId: string;
  presetId: string;
  x: number;
  faixa: Faixa;
}

let contadorInstancia = 0;
function novoItemId(): string {
  contadorInstancia += 1;
  return `instancia-${contadorInstancia}`;
}

function numero(valor: string): number {
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
}

export default function AmbientesPage() {
  const [parede, setParede] = useState<Parede>(paredeInicial);
  const [alturas, setAlturas] = useState<AlturasFaixas>(alturasIniciais);
  const [presets, setPresets] = useState<BoxPreset[]>([]);
  const [itensColocados, setItensColocados] = useState<ItemColocado[]>([]);

  const [novoTipo, setNovoTipo] = useState<ElementoParede["tipo"]>("janela");
  const [novoX, setNovoX] = useState(0);
  const [novoY, setNovoY] = useState(900);
  const [novaLargura, setNovaLargura] = useState(600);
  const [novaAltura, setNovaAltura] = useState(1000);

  const [presetSelecionado, setPresetSelecionado] = useState<string>("");
  const [faixaSelecionada, setFaixaSelecionada] = useState<Faixa>("inferior");
  const [xItem, setXItem] = useState(0);

  // Task 13.2b — overrides do handle de junção, local-first (mesmo padrão de
  // `lib/boxPresets.ts`): carrega uma vez do localStorage e persiste a cada
  // mudança. `overridesCarregadosRef` evita que o efeito de persistência
  // rode com o array vazio inicial ANTES do efeito de carga concluir (o que
  // sobrescreveria o localStorage com `[]` por uma fração de render).
  const [overrides, setOverrides] = useState<OverrideJuncao[]>([]);
  const overridesCarregadosRef = useRef(false);

  useEffect(() => {
    seedPresetsPadrao();
    const lista = listarPresets();
    setPresets(lista);
    if (lista[0]) setPresetSelecionado(lista[0].id);
  }, []);

  useEffect(() => {
    setOverrides(overridesIniciais());
    overridesCarregadosRef.current = true;
  }, []);

  useEffect(() => {
    if (!overridesCarregadosRef.current) return;
    window.localStorage.setItem(CHAVE_OVERRIDES, JSON.stringify(overrides));
  }, [overrides]);

  function atualizarParede(patch: Partial<Parede>) {
    setParede((p) => ({ ...p, ...patch }));
  }
  function atualizarAlturas(patch: Partial<AlturasFaixas>) {
    setAlturas((a) => ({ ...a, ...patch }));
  }

  function adicionarElemento() {
    const elemento: ElementoParede = {
      tipo: novoTipo,
      x: novoX,
      y: novoY,
      largura: novaLargura,
      altura: novaAltura,
    };
    setParede((p) => ({ ...p, elementos: [...p.elementos, elemento] }));
  }
  function removerElemento(indice: number) {
    setParede((p) => ({ ...p, elementos: p.elementos.filter((_, i) => i !== indice) }));
  }

  function adicionarItem() {
    if (!presetSelecionado) return;
    const item: ItemColocado = {
      itemId: novoItemId(),
      presetId: presetSelecionado,
      x: xItem,
      faixa: faixaSelecionada,
    };
    setItensColocados((its) => [...its, item]);
  }
  function removerItem(itemId: string) {
    setItensColocados((its) => its.filter((i) => i.itemId !== itemId));
  }

  const resolvedor: ResolvedorItens = useMemo(() => {
    const m = new Map<string, ModuloOrcamento>();
    for (const ic of itensColocados) {
      const preset = presets.find((p) => p.id === ic.presetId);
      if (preset) m.set(ic.itemId, { origem: "custom_box", box: preset.box });
    }
    return m;
  }, [itensColocados, presets]);

  const paredeComItens: Parede = useMemo(
    () => ({
      ...parede,
      itens: itensColocados.map(
        (i): ItemPosicionado => ({ itemId: i.itemId, x: i.x, faixa: i.faixa })
      ),
    }),
    [parede, itensColocados]
  );

  // Tier 1 + Tier 2 rodam a cada mudança de posicionamento/parede/alturas
  // (useMemo recalcula sempre que qualquer dependência muda — não há botão
  // "validar", é reativo).
  const warnings: EngineWarning[] = useMemo(
    () => [
      ...validarParedeTier1(paredeComItens, resolvedor),
      ...validarParedeTier2(paredeComItens, alturas, resolvedor),
    ],
    [paredeComItens, alturas, resolvedor]
  );

  // itemId -> pior severidade (erro > aviso), consumido pelo destaque visual
  // do BoxCanvas modo conjunto (ver Nota de Escopo do contrato / comentário
  // em BoxCanvas.tsx).
  const itensComAviso = useMemo(() => {
    const m = new Map<string, "erro" | "aviso">();
    for (const w of warnings) {
      if (!w.moduloId) continue;
      if (m.get(w.moduloId) !== "erro") m.set(w.moduloId, w.severidade);
    }
    return m;
  }, [warnings]);

  const itensDoConjunto: ItemDoConjunto[] = useMemo(
    () =>
      itensColocados
        .map((ic) => {
          const item = resolvedor.get(ic.itemId);
          if (!item) return null;
          const posicao: ItemPosicionado = { itemId: ic.itemId, x: ic.x, faixa: ic.faixa };
          return { item, posicao };
        })
        .filter((v): v is ItemDoConjunto => v !== null),
    [itensColocados, resolvedor]
  );

  // Task 13.2b — Conjuntos automáticos (detecção pura, sem override) + finais
  // (override do handle de junção por cima). Nenhuma lógica de agrupamento é
  // reimplementada aqui — só consome `detectarConjuntos`/`aplicarOverrides`
  // (lib/engine/conjunto/detectar.ts, já testadas).
  const conjuntosAutomaticos = useMemo(
    () => detectarConjuntos(paredeComItens, alturas, resolvedor),
    [paredeComItens, alturas, resolvedor]
  );

  const conjuntosFinais = useMemo(
    () => aplicarOverrides(conjuntosAutomaticos, paredeComItens.itens, overrides),
    [conjuntosAutomaticos, paredeComItens.itens, overrides]
  );

  // Alterna união/quebra do par (handle de junção do BoxCanvas modo
  // conjunto): remove qualquer override existente para o par e adiciona um
  // novo com `forcar` invertido do estado atual (lido de `conjuntosFinais`,
  // nunca reconstruído aqui — é `aplicarOverrides` quem decide se o par está
  // unido). Quebrar um conjunto de 3 no meio vira 2 conjuntos de 2 (nunca
  // sobra 1) porque essa é a regra de `aplicarOverrides`, não algo garantido
  // por este callback.
  function alternarJuncao(itemIdA: string, itemIdB: string) {
    const unidoAtualmente = conjuntosFinais.some(
      (c) => c.itensIds.includes(itemIdA) && c.itensIds.includes(itemIdB)
    );
    setOverrides((atuais) => [
      ...atuais.filter(
        (o) =>
          !(
            (o.itemIdA === itemIdA && o.itemIdB === itemIdB) ||
            (o.itemIdA === itemIdB && o.itemIdB === itemIdA)
          )
      ),
      { itemIdA, itemIdB, forcar: unidoAtualmente ? "quebrado" : "unido" },
    ]);
  }

  return (
    <div className="wrap">
      <header className="mb-6">
        <h1 className="text-display font-bold text-cinza-900">Ambientes — Elevação de parede</h1>
        <p className="mt-1 text-corpo text-cinza-500">
          Laboratório local: parede editável, elementos e itens posicionados por faixa — validação
          Tier 1/2 em tempo real.
        </p>
        <nav className="mt-4 text-corpo">
          <a href="/" className="text-accent hover:text-accent-hover hover:underline">
            ← Voltar
          </a>
        </nav>
      </header>

      <div className="mb-4 grid grid-cols-1 gap-lg md:grid-cols-2">
        <section className="rounded-lg border border-cinza-200 bg-cinza-0 p-4 shadow-xs">
          <h2 className="mb-3 text-titulo-secao text-cinza-900">Parede</h2>
          <div className="grid grid-cols-2 gap-sm">
            <div>
              <Label htmlFor="parede-largura">Largura (mm)</Label>
              <Input
                id="parede-largura"
                type="number"
                value={parede.largura}
                onChange={(e) => atualizarParede({ largura: numero(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="parede-altura">Altura (mm)</Label>
              <Input
                id="parede-altura"
                type="number"
                value={parede.altura}
                onChange={(e) => atualizarParede({ altura: numero(e.target.value) })}
              />
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-cinza-200 bg-cinza-0 p-4 shadow-xs">
          <h2 className="mb-3 text-titulo-secao text-cinza-900">Alturas do perfil</h2>
          <div className="grid grid-cols-2 gap-sm">
            <div>
              <Label htmlFor="altura-rodape">Rodapé (mm)</Label>
              <Input
                id="altura-rodape"
                type="number"
                value={alturas.alturaRodape}
                onChange={(e) => atualizarAlturas({ alturaRodape: numero(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="altura-bancada">Bancada (mm)</Label>
              <Input
                id="altura-bancada"
                type="number"
                value={alturas.alturaBancada}
                onChange={(e) => atualizarAlturas({ alturaBancada: numero(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="altura-aereo">Instalação aéreo (mm)</Label>
              <Input
                id="altura-aereo"
                type="number"
                value={alturas.alturaInstalacaoAereo}
                onChange={(e) =>
                  atualizarAlturas({ alturaInstalacaoAereo: numero(e.target.value) })
                }
              />
            </div>
            <div>
              <Label htmlFor="pe-direito">Pé-direito (mm)</Label>
              <Input
                id="pe-direito"
                type="number"
                value={alturas.peDireito}
                onChange={(e) => atualizarAlturas({ peDireito: numero(e.target.value) })}
              />
            </div>
          </div>
        </section>
      </div>

      <section className="mb-4 rounded-lg border border-cinza-200 bg-cinza-0 p-4 shadow-xs">
        <h2 className="mb-3 text-titulo-secao text-cinza-900">Elementos de parede</h2>
        <div className="mb-3 flex flex-wrap items-end gap-sm">
          <div>
            <Label htmlFor="elemento-tipo">Tipo</Label>
            <Select value={novoTipo} onValueChange={(v) => setNovoTipo(v as ElementoParede["tipo"])}>
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
            <Label htmlFor="elemento-x">X (mm)</Label>
            <Input
              id="elemento-x"
              type="number"
              className="w-24"
              value={novoX}
              onChange={(e) => setNovoX(numero(e.target.value))}
            />
          </div>
          <div>
            <Label htmlFor="elemento-y">Y (mm)</Label>
            <Input
              id="elemento-y"
              type="number"
              className="w-24"
              value={novoY}
              onChange={(e) => setNovoY(numero(e.target.value))}
            />
          </div>
          <div>
            <Label htmlFor="elemento-largura">Largura (mm)</Label>
            <Input
              id="elemento-largura"
              type="number"
              className="w-24"
              value={novaLargura}
              onChange={(e) => setNovaLargura(numero(e.target.value))}
            />
          </div>
          <div>
            <Label htmlFor="elemento-altura">Altura (mm)</Label>
            <Input
              id="elemento-altura"
              type="number"
              className="w-24"
              value={novaAltura}
              onChange={(e) => setNovaAltura(numero(e.target.value))}
            />
          </div>
          <Button variant="primary" onClick={adicionarElemento}>
            Adicionar
          </Button>
        </div>

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
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {parede.elementos.map((el, i) => (
                  <TableRow key={i}>
                    <TableCell>{ROTULO_TIPO_ELEMENTO[el.tipo]}</TableCell>
                    <TableCell className="text-right tabular-nums">{el.x}</TableCell>
                    <TableCell className="text-right tabular-nums">{el.y}</TableCell>
                    <TableCell className="text-right tabular-nums">{el.largura}</TableCell>
                    <TableCell className="text-right tabular-nums">{el.altura}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removerElemento(i)}
                        aria-label={`Remover elemento ${ROTULO_TIPO_ELEMENTO[el.tipo]}`}
                      >
                        <X size={14} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <section className="mb-4 rounded-lg border border-cinza-200 bg-cinza-0 p-4 shadow-xs">
        <h2 className="mb-3 text-titulo-secao text-cinza-900">Itens posicionados</h2>
        {presets.length === 0 ? (
          <p className="text-corpo-pequeno text-cinza-500">
            Nenhum preset disponível. Crie um módulo em{" "}
            <a href="/modulo" className="text-accent hover:underline">
              /modulo
            </a>{" "}
            e salve como preset da biblioteca.
          </p>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-end gap-sm">
              <div>
                <Label htmlFor="item-preset">Preset</Label>
                <Select value={presetSelecionado} onValueChange={setPresetSelecionado}>
                  <SelectTrigger id="item-preset" className="w-48">
                    <SelectValue />
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
                <Label htmlFor="item-faixa">Faixa</Label>
                <Select value={faixaSelecionada} onValueChange={(v) => setFaixaSelecionada(v as Faixa)}>
                  <SelectTrigger id="item-faixa" className="w-32">
                    <SelectValue />
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
                <Label htmlFor="item-x">X (mm)</Label>
                <Input
                  id="item-x"
                  type="number"
                  className="w-24"
                  value={xItem}
                  onChange={(e) => setXItem(numero(e.target.value))}
                />
              </div>
              <Button variant="primary" onClick={adicionarItem}>
                Adicionar
              </Button>
            </div>

            {itensColocados.length === 0 ? (
              <p className="text-corpo-pequeno text-cinza-500">Nenhum item posicionado ainda.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Preset</TableHead>
                      <TableHead>Faixa</TableHead>
                      <TableHead className="text-right">X</TableHead>
                      <TableHead className="text-right">Largura</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itensColocados.map((ic) => {
                      const preset = presets.find((p) => p.id === ic.presetId);
                      const modulo = resolvedor.get(ic.itemId);
                      const severidade = itensComAviso.get(ic.itemId);
                      return (
                        <TableRow
                          key={ic.itemId}
                          className={
                            severidade === "erro"
                              ? "bg-erro-subtle"
                              : severidade === "aviso"
                                ? "bg-aviso-subtle"
                                : undefined
                          }
                        >
                          <TableCell>{preset?.nome ?? "—"}</TableCell>
                          <TableCell>{ROTULO_FAIXA[ic.faixa]}</TableCell>
                          <TableCell className="text-right tabular-nums">{ic.x}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {modulo ? larguraDoItem(modulo) : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removerItem(ic.itemId)}
                              aria-label={`Remover item ${preset?.nome ?? ic.itemId}`}
                            >
                              <X size={14} />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </>
        )}
      </section>

      <div className="mb-4 grid grid-cols-1 gap-lg lg:grid-cols-2">
        <section className="rounded-lg border border-cinza-200 bg-cinza-0 p-4 shadow-xs">
          <h2 className="mb-3 text-titulo-secao text-cinza-900">Elevação da parede</h2>
          <div className="max-w-full overflow-x-auto rounded-md border border-cinza-200 bg-cinza-50 p-2">
            <ElevacaoParede parede={parede} alturas={alturas} />
          </div>
        </section>
        <section className="rounded-lg border border-cinza-200 bg-cinza-0 p-4 shadow-xs">
          <h2 className="mb-3 text-titulo-secao text-cinza-900">Itens posicionados (conjunto)</h2>
          {itensDoConjunto.length > 0 ? (
            <BoxCanvas
              itens={itensDoConjunto}
              alturas={alturas}
              itensComAviso={itensComAviso}
              conjuntos={conjuntosFinais}
              onToggleJuncao={alternarJuncao}
            />
          ) : (
            <p className="text-corpo-pequeno text-cinza-500">Adicione um item para visualizar.</p>
          )}
        </section>
      </div>

      <section className="rounded-lg border border-cinza-200 bg-cinza-0 p-4 shadow-xs">
        <h2 className="mb-3 text-titulo-secao text-cinza-900">Validação (Tier 1 + Tier 2)</h2>
        {warnings.length === 0 ? (
          <Alert variant="sucesso">
            <AlertDescription>Nenhum problema encontrado.</AlertDescription>
          </Alert>
        ) : (
          <div className="flex flex-col gap-sm">
            {warnings.map((w, i) => (
              <Alert key={i} variant={w.severidade === "erro" ? "erro" : "aviso"}>
                <AlertDescription>{w.mensagem}</AlertDescription>
              </Alert>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

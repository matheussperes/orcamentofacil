"use client";

import { useEffect, useState } from "react";
import { ImageOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { listarTexturas, urlPublicaTextura, type Textura } from "@/lib/produto/texturas";

// Task 3.13 (catálogo-front) — seletor de textura embutido em
// `FormularioChapaDialog`. Não existe componente de galeria de imagens
// reutilizável no projeto (`components/perfil/PerfilLab.tsx` usa campo de
// URL livre + preview, não grid de seleção) — decisão documentada no
// contrato: implementar aqui, direto, sem forçar abstração inexistente.
// Segundo `Dialog` aninhado (em vez de `Popover`, que o projeto não tem
// instalado) pro grid de miniaturas, pra não apertar o formulário principal.
//
// Seleção entre imagens JÁ existentes no bucket público `texturas` — nunca
// upload livre pelo marceneiro (bucket read-only para `authenticated`,
// nenhum `.upload()` neste componente nem em `lib/produto/texturas.ts`).
export interface SeletorTexturaChapaProps {
  /** Caminho relativo no bucket `texturas`, ou `undefined` (sem textura —
   * fallback de cor sólida, comportamento atual do produto). */
  value?: string;
  onChange: (path: string | undefined) => void;
}

export function SeletorTexturaChapa({ value, onChange }: SeletorTexturaChapaProps) {
  const [galeriaAberta, setGaleriaAberta] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [texturas, setTexturas] = useState<Textura[]>([]);

  useEffect(() => {
    if (!galeriaAberta) return;
    let cancelado = false;
    setCarregando(true);
    listarTexturas().then((lista) => {
      if (!cancelado) {
        setTexturas(lista);
        setCarregando(false);
      }
    });
    return () => {
      cancelado = true;
    };
  }, [galeriaAberta]);

  function selecionar(path: string) {
    onChange(path);
    setGaleriaAberta(false);
  }

  return (
    <div>
      <Label>Textura</Label>
      <div className="flex items-center gap-md">
        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-md border border-cinza-200 bg-cinza-50">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element -- domínio Supabase Storage arbitrário por projeto, sem remotePatterns fixo
            <img src={urlPublicaTextura(value)} alt={value} className="h-full w-full object-cover" />
          ) : (
            <ImageOff className="h-6 w-6 text-cinza-300" aria-hidden />
          )}
        </div>
        <div className="flex flex-col gap-sm">
          <Dialog open={galeriaAberta} onOpenChange={setGaleriaAberta}>
            <DialogTrigger asChild>
              <Button type="button" variant="ghost" size="sm">
                {value ? "Trocar textura" : "Escolher textura"}
              </Button>
            </DialogTrigger>
            <DialogContent tamanho="formulario">
              <DialogHeader>
                <DialogTitle>Escolher textura</DialogTitle>
              </DialogHeader>

              {carregando && (
                <div className="grid grid-cols-4 gap-sm" aria-label="Carregando texturas">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="aspect-square animate-pulse rounded-md bg-cinza-100" />
                  ))}
                </div>
              )}

              {!carregando && texturas.length === 0 && (
                <div className="flex flex-col items-center gap-sm py-xl text-center">
                  <ImageOff className="h-8 w-8 text-cinza-300" aria-hidden />
                  <p className="text-titulo-card text-cinza-700">Nenhuma textura disponível</p>
                  <p className="text-corpo-pequeno text-cinza-500">
                    Ainda não há imagens curadas no catálogo de texturas.
                  </p>
                </div>
              )}

              {!carregando && texturas.length > 0 && (
                <div className="grid grid-cols-4 gap-sm">
                  {texturas.map((textura) => (
                    <button
                      key={textura.path}
                      type="button"
                      onClick={() => selecionar(textura.path)}
                      className="group flex flex-col gap-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-subtle"
                    >
                      <span className="aspect-square overflow-hidden rounded-md border border-cinza-200 transition-colors duration-120 group-hover:border-accent">
                        {/* eslint-disable-next-line @next/next/no-img-element -- ver justificativa acima */}
                        <img
                          src={textura.url}
                          alt={textura.nome}
                          className="h-full w-full object-cover"
                        />
                      </span>
                      <span className="truncate text-corpo-pequeno text-cinza-500">{textura.nome}</span>
                    </button>
                  ))}
                </div>
              )}

              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setGaleriaAberta(false)}>
                  Fechar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          {value && (
            <Button type="button" variant="danger" size="sm" onClick={() => onChange(undefined)}>
              Remover textura
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

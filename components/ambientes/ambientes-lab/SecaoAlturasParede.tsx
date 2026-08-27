"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TituloSecao } from "@/components/ui/titulo-secao";
import { CAMPOS_ALTURA } from "../AmbientesLab.constants";
import { numero } from "../AmbientesLab.helpers";
import type { useAlturas } from "./useAlturas";

/** Task R.3a — extraído de AmbientesLab.tsx (decomposição pura). Override de
 * alturas por parede (Task 2.3-2.6) — herdado do perfil até ser customizado
 * aqui. */
export function SecaoAlturasParede({ alturasHook }: { alturasHook: ReturnType<typeof useAlturas> }) {
  return (
    <section className="rounded-lg border border-cinza-200 bg-cinza-0 p-xl shadow-xs">
      <TituloSecao className="mb-1">Alturas desta parede</TituloSecao>
      <p className="mb-3 text-corpo-pequeno text-cinza-500">
        Cada altura herda o valor do perfil da organização até ser customizada aqui — a
        customização vale só para esta parede.
      </p>
      <div className="grid grid-cols-2 gap-sm">
        {CAMPOS_ALTURA.map(({ campo, rotulo, id }) => {
          const customizada = alturasHook.alturaCustomizada(campo);
          return (
            <div key={campo}>
              <div className="mb-1 flex items-center justify-between gap-sm">
                <Label htmlFor={id}>{rotulo}</Label>
                <Badge variant={customizada ? "enviado" : "neutro"}>
                  {customizada ? "Customizado" : "Herdado"}
                </Badge>
              </div>
              <Input
                id={id}
                type="number"
                value={alturasHook.alturaEfetiva(campo)}
                onChange={(e) => alturasHook.setAlturaOverride(campo, numero(e.target.value))}
              />
              {customizada && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-1"
                  onClick={() => alturasHook.voltarAoHerdado(campo)}
                >
                  Voltar ao herdado
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

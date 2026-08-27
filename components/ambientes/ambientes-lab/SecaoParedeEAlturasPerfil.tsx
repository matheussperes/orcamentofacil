"use client";

import { AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TituloSecao } from "@/components/ui/titulo-secao";
import { numero } from "../AmbientesLab.helpers";
import type { useSelecaoAmbiente } from "./useSelecaoAmbiente";
import type { useAlturas } from "./useAlturas";

/** Task R.3a — extraído de AmbientesLab.tsx (decomposição pura). Dimensões
 * da parede selecionada + perfil de alturas da organização (Task 2.3-2.6) —
 * lado a lado, mesmo grid do original. */
export function SecaoParedeEAlturasPerfil({
  selecao,
  alturasHook,
}: {
  selecao: ReturnType<typeof useSelecaoAmbiente>;
  alturasHook: ReturnType<typeof useAlturas>;
}) {
  return (
    <div className="grid grid-cols-1 items-start gap-lg md:grid-cols-2">
      <section className="rounded-lg border border-cinza-200 bg-cinza-0 p-xl shadow-xs">
        <TituloSecao>Parede</TituloSecao>
        <div className="grid grid-cols-2 gap-sm">
          <div>
            <Label htmlFor="parede-largura">Largura (mm)</Label>
            <Input
              id="parede-largura"
              type="number"
              value={selecao.parede.largura}
              onChange={(e) => selecao.atualizarParede({ largura: numero(e.target.value) })}
            />
          </div>
          <div>
            <Label htmlFor="parede-altura">Altura (mm)</Label>
            <Input
              id="parede-altura"
              type="number"
              value={selecao.parede.altura}
              onChange={(e) => selecao.atualizarParede({ altura: numero(e.target.value) })}
            />
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-cinza-200 bg-cinza-0 p-xl shadow-xs">
        <TituloSecao className="mb-1">Alturas do perfil</TituloSecao>
        <p className="mb-3 text-corpo-pequeno text-cinza-500">
          Perfil de alturas da marcenaria — ao salvar, vale para todos os orçamentos da
          organização, não só este.
        </p>
        {/* Task 2.3-2.6 (alturas) — o formulário de alturas padrão da
            organização vive só aqui (decisão documentada da Task 13.7a:
            `/perfil` deliberadamente não duplica este campo). O aviso de
            propagação pedido pelo contrato entra ao lado deste salvamento,
            que é o único lugar real onde `organizacao.alturas_padrao` é
            editado. */}
        <Alert variant="aviso" className="mb-3">
          <AlertTriangle className="h-4 w-4 text-aviso" aria-hidden="true" />
          <AlertDescription>
            Mudar uma altura aqui afeta todas as paredes que não têm essa altura customizada
            individualmente — paredes com override próprio continuam com o valor delas.
          </AlertDescription>
        </Alert>
        <div className="grid grid-cols-2 gap-sm">
          <div>
            <Label htmlFor="altura-rodape">Rodapé (mm)</Label>
            <Input
              id="altura-rodape"
              type="number"
              value={alturasHook.alturas.alturaRodape}
              onChange={(e) => alturasHook.atualizarAlturas({ alturaRodape: numero(e.target.value) })}
            />
          </div>
          <div>
            <Label htmlFor="altura-bancada">Meio (mm)</Label>
            <Input
              id="altura-bancada"
              type="number"
              value={alturasHook.alturas.alturaBancada}
              onChange={(e) => alturasHook.atualizarAlturas({ alturaBancada: numero(e.target.value) })}
            />
          </div>
          <div>
            <Label htmlFor="altura-aereo">Instalação aéreo (mm)</Label>
            <Input
              id="altura-aereo"
              type="number"
              value={alturasHook.alturas.alturaInstalacaoAereo}
              onChange={(e) =>
                alturasHook.atualizarAlturas({ alturaInstalacaoAereo: numero(e.target.value) })
              }
            />
          </div>
          <div>
            <Label htmlFor="pe-direito">Limite superior do aéreo (mm)</Label>
            <Input
              id="pe-direito"
              type="number"
              value={alturasHook.alturas.peDireito}
              onChange={(e) => alturasHook.atualizarAlturas({ peDireito: numero(e.target.value) })}
            />
          </div>
        </div>
      </section>
    </div>
  );
}

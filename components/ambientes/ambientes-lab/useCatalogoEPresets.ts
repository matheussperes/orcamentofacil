"use client";

import { useEffect, useState } from "react";
import { listarPresets, seedPresetsPadrao, type BoxPreset } from "@/lib/boxPresets";
import { carregarCatalogo, type Catalogo } from "@/lib/catalog";

/** Task R.3a — extraído de AmbientesLab.tsx (decomposição pura). Carrega,
 * uma única vez na montagem, a biblioteca de módulos (presets de caixa) e o
 * catálogo de cores/espessuras da organização. */
export function useCatalogoEPresets() {
  const [presets, setPresets] = useState<BoxPreset[]>([]);
  const [catalogo, setCatalogo] = useState<Catalogo | null>(null);

  useEffect(() => {
    seedPresetsPadrao();
    setPresets(listarPresets());
    setCatalogo(carregarCatalogo());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { presets, catalogo };
}

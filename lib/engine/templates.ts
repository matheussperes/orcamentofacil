import type { ModuloTemplate } from "./types";

// Carrega a Biblioteca de Engenharia (doc 04). No MVP os templates são
// estáticos e versionados no repositório; importá-los como JSON garante que
// sejam empacotados na função serverless (Vercel) sem depender de fs/path.
import basePortas from "../../engine/templates/base_portas.json";
import gaveteiro from "../../engine/templates/gaveteiro.json";
import aereoPortas from "../../engine/templates/aereo_portas.json";
import torreQuente from "../../engine/templates/torre_quente.json";
import cantoReto from "../../engine/templates/canto_reto.json";
import nicho from "../../engine/templates/nicho.json";

const LISTA = [
  basePortas,
  gaveteiro,
  aereoPortas,
  torreQuente,
  cantoReto,
  nicho,
] as unknown as ModuloTemplate[];

const PORCODIGO = new Map<string, ModuloTemplate>(
  LISTA.map((t) => [t.codigo, t])
);

export function listarTemplates(): ModuloTemplate[] {
  return LISTA;
}

export function getTemplate(codigo: string): ModuloTemplate {
  const t = PORCODIGO.get(codigo);
  if (!t) throw new Error(`Template não encontrado: ${codigo}`);
  return t;
}

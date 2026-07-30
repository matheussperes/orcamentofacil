import { formatarDataHora, formatarMoeda } from "@/lib/format";
import type { SnapshotListaMaterial } from "./tipos";

// Task 13.4 (contrato .maestro/tmp/13.4-contract.md, D-08 "extraível
// texto/CSV") — geração client-side, sem endpoint novo (mesmo espírito de
// simplicidade do resto do app nesta fase, contrato explícito). Funções
// puras (testáveis sem DOM); o efeito colateral de disparar o download
// (Blob + `<a download>`) fica isolado em `baixarArquivo`, chamado só pelo
// componente (`CorteMaterialLab`), nunca por estas.

export function gerarTextoListaMaterial(snapshot: SnapshotListaMaterial): string {
  const linhas: string[] = [];
  linhas.push(`Lista de material — gerada em ${formatarDataHora(snapshot.geradoEm)}`);
  linhas.push("");

  linhas.push("Plano de corte");
  if (snapshot.planoDeCorte.length === 0) {
    linhas.push("  Nenhuma peça no plano de corte.");
  } else {
    for (const grupo of snapshot.planoDeCorte) {
      linhas.push(
        `  MDF ${grupo.cor} ${grupo.espessuraMm}mm — ${grupo.chapas} chapa(s) · ${grupo.areaConsumidaM2.toFixed(2)} m²`
      );
      if (grupo.pecasForaDaChapa.length > 0) {
        linhas.push(`    Fora da chapa: ${grupo.pecasForaDaChapa.join(", ")}`);
      }
    }
  }
  linhas.push("");

  linhas.push("Lista de material / pré-pedido");
  if (snapshot.linhas.length === 0 && snapshot.itensManuais.length === 0) {
    linhas.push("  Nenhum item.");
  } else {
    for (const item of snapshot.linhas) {
      linhas.push(
        `  [${item.categoria}] ${item.item} — ${item.qtd} — ${formatarMoeda(item.unit)}/un — total ${formatarMoeda(item.total)}`
      );
    }
    for (const item of snapshot.itensManuais) {
      linhas.push(
        `  [Serviço] ${item.descricao} — ${item.quantidade} — ${formatarMoeda(item.valorUnitario)}/un — total ${formatarMoeda(item.quantidade * item.valorUnitario)}`
      );
    }
  }
  linhas.push("");

  linhas.push(`Subtotal material: ${formatarMoeda(snapshot.subtotalMaterial)}`);
  linhas.push(`Subtotal itens manuais: ${formatarMoeda(snapshot.subtotalManual)}`);
  linhas.push(`Total do pré-pedido: ${formatarMoeda(snapshot.total)}`);
  if (snapshot.frete !== null) {
    linhas.push(
      `Frete (informativo — valor final definido na aba Financeiro): ${formatarMoeda(snapshot.frete)}`
    );
  }

  return linhas.join("\n");
}

function escaparCampoCsv(valor: string): string {
  if (/[;"\n]/.test(valor)) {
    return `"${valor.replace(/"/g, '""')}"`;
  }
  return valor;
}

// Delimitador `;` (não `,`) — convenção de CSV pt-BR/Excel, evita conflito
// com vírgula decimal nos valores monetários.
export function gerarCsvListaMaterial(snapshot: SnapshotListaMaterial): string {
  const linhas: string[][] = [["Categoria", "Item", "Quantidade", "Valor unitário", "Total"]];

  for (const item of snapshot.linhas) {
    linhas.push([item.categoria, item.item, item.qtd, item.unit.toFixed(2), item.total.toFixed(2)]);
  }
  for (const item of snapshot.itensManuais) {
    linhas.push([
      "Serviço",
      item.descricao,
      String(item.quantidade),
      item.valorUnitario.toFixed(2),
      (item.quantidade * item.valorUnitario).toFixed(2),
    ]);
  }
  linhas.push(["", "Subtotal material", "", "", snapshot.subtotalMaterial.toFixed(2)]);
  linhas.push(["", "Subtotal itens manuais", "", "", snapshot.subtotalManual.toFixed(2)]);
  linhas.push(["", "Total do pré-pedido", "", "", snapshot.total.toFixed(2)]);
  if (snapshot.frete !== null) {
    linhas.push(["", "Frete (informativo)", "", "", snapshot.frete.toFixed(2)]);
  }

  return linhas.map((colunas) => colunas.map(escaparCampoCsv).join(";")).join("\r\n");
}

/** Único ponto que toca o DOM/browser (Blob + `<a download>`) — não
 * chamado em ambiente sem `document` (SSR/testes) por construção, já que só
 * é invocado a partir de um handler de clique no componente. */
export function baixarArquivo(nomeArquivo: string, conteudo: string, tipoMime: string): void {
  const blob = new Blob([conteudo], { type: tipoMime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

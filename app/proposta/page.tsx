"use client";

import { useEffect, useState } from "react";
import { PRECOS_REFERENCIA } from "@/lib/engine/prices";
import type { EngineOutput } from "@/lib/engine/types";
import type { ParametrosComerciais } from "@/lib/engine/pricing";
import "./proposta.css";

interface Payload {
  geradoEm: string;
  ambiente: string;
  cliente: string;
  engine: EngineOutput;
  financeiro: {
    custoDireto: number;
    precoComDesconto: number;
    lucroBruto: number;
    margemEfetiva: number;
  };
  comercial: ParametrosComerciais;
}

interface Linha {
  item: string;
  categoria: string;
  qtd: string;
  unit: number;
  total: number;
}

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// Monta a lista unificada de insumos (BOM + custo) no formato de pré-orçamento
// de fornecedor (parte do ajuste V2-5, já entregue aqui).
function montarLinhas(engine: EngineOutput): Linha[] {
  const p = PRECOS_REFERENCIA;
  const linhas: Linha[] = [];

  for (const g of engine.consolidado.mdf) {
    const unit = p.chapaPorEspessura[g.espessura_mm] ?? 0;
    linhas.push({
      item: `MDF ${g.cor} ${g.espessura_mm}mm`,
      categoria: "Chapas",
      qtd: `${g.chapas} chapa(s) · ${g.area_m2.toFixed(2)} m²`,
      unit,
      total: g.chapas * unit,
    });
  }

  linhas.push({
    item: "Fita de borda",
    categoria: "Acabamento",
    qtd: `${engine.consolidado.fitaTotalM.toFixed(1)} m`,
    unit: p.fitaMetro,
    total: engine.consolidado.fitaTotalM * p.fitaMetro,
  });

  for (const f of engine.consolidado.ferragens) {
    const unit = p.ferragens[f.item] ?? 0;
    linhas.push({
      item: f.item.replace(/_/g, " "),
      categoria: "Ferragens",
      qtd: `${f.quantidade}`,
      unit,
      total: f.quantidade * unit,
    });
  }

  return linhas;
}

export default function Proposta() {
  const [dados, setDados] = useState<Payload | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("proposta");
    if (raw) setDados(JSON.parse(raw));
  }, []);

  if (!dados) {
    return (
      <div className="proposta-vazia">
        <p>Nenhuma proposta carregada.</p>
        <p>
          Volte à <a href="/">calculadora</a>, calcule um orçamento e clique em
          “Gerar proposta”.
        </p>
      </div>
    );
  }

  const { engine, financeiro } = dados;
  const linhas = montarLinhas(engine);
  const subtotalMateriais = linhas.reduce((s, l) => s + l.total, 0);
  const data = new Date(dados.geradoEm).toLocaleDateString("pt-BR");

  return (
    <div className="proposta">
      <div className="acoes-print">
        <button onClick={() => window.print()}>Imprimir / Salvar em PDF</button>
        <a href="/">← voltar</a>
      </div>

      {/* Capa */}
      <header className="capa">
        <div className="marca">Budget Planner AI</div>
        <h1>Proposta Comercial</h1>
        <div className="meta">
          <div>
            <strong>Cliente:</strong> {dados.cliente}
          </div>
          <div>
            <strong>Ambiente:</strong> {dados.ambiente}
          </div>
          <div>
            <strong>Data:</strong> {data}
          </div>
          <div>
            <strong>Validade:</strong> 15 dias
          </div>
        </div>
      </header>

      {/* Resumo do investimento */}
      <section>
        <h2>Investimento</h2>
        <div className="preco-destaque">
          <span>Valor total do projeto</span>
          <strong>{brl(financeiro.precoComDesconto)}</strong>
        </div>
        <p className="cond">
          Condições: entrada de 50% e saldo na entrega · prazo de produção de 30
          dias úteis · garantia de 5 anos contra defeitos de fabricação.
        </p>
      </section>

      {/* Pré-orçamento unificado de insumos */}
      <section>
        <h2>Composição de materiais (pré-orçamento de insumos)</h2>
        <table>
          <thead>
            <tr>
              <th>Item / Insumo</th>
              <th>Categoria</th>
              <th>Qtd</th>
              <th className="num">Custo unit.</th>
              <th className="num">Total</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l, i) => (
              <tr key={i}>
                <td>{l.item}</td>
                <td>{l.categoria}</td>
                <td>{l.qtd}</td>
                <td className="num">{brl(l.unit)}</td>
                <td className="num">{brl(l.total)}</td>
              </tr>
            ))}
            <tr className="subtotal">
              <td colSpan={4}>Subtotal de materiais</td>
              <td className="num">{brl(subtotalMateriais)}</td>
            </tr>
          </tbody>
        </table>
        <p className="obs">
          Montagem, frete e serviços já estão contemplados no valor total do
          projeto. Esta composição é referência de insumos.
        </p>
      </section>

      {engine.globais.length > 0 && (
        <section>
          <h2>Elementos de acabamento</h2>
          <ul>
            {engine.globais.map((g, i) => (
              <li key={i}>
                {g.tipo === "tampo" ? "Tampo" : "Rodapé"} contínuo — parede{" "}
                {g.parede}: {(g.comprimento_mm / 1000).toFixed(2)} m cobrindo{" "}
                {g.modulos} módulos.
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="rodape">
        <div>Budget Planner AI · orçamento gerado automaticamente</div>
        <div>Proposta sujeita a confirmação de medidas no local.</div>
      </footer>
    </div>
  );
}

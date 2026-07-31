import type { ClienteProposta } from "@/lib/proposta-pdf/carregar";

// Task 13.6b — bloco de dados do cliente (Mapa-de-Telas.md Seção 3.8: nome,
// telefone, endereço, vindos do cadastro de Cliente capturado na criação do
// orçamento).
export function PropostaPdfCliente({ cliente }: { cliente: ClienteProposta }) {
  return (
    <section>
      <h2 className="proposta-pdf__secao-titulo">Cliente</h2>
      <div className="proposta-pdf__cliente">
        <p className="proposta-pdf__cliente-nome">{cliente.nome}</p>
        {cliente.telefone && <p className="proposta-pdf__cliente-linha">{cliente.telefone}</p>}
        {cliente.endereco && <p className="proposta-pdf__cliente-linha">{cliente.endereco}</p>}
      </div>
    </section>
  );
}

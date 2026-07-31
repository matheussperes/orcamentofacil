import type { OrganizacaoProposta } from "@/lib/proposta-pdf/carregar";

// Task 13.6b — cabeçalho do documento (fundo `marinho-900`, Design-System.md
// Seção 7.22). `logoUrl` vem de `organizacao.logo_url`; hoje é sempre `null`
// (ninguém cadastrou logo própria ainda — Task 13.7 futura), então o
// fallback para o asset estático de marca é o caminho normal, não uma
// exceção. Usa `<img>` puro (não `next/image`): quando `logoUrl` vier
// preenchido no futuro será uma URL externa (Storage), mesmo padrão já
// adotado em `components/orcamento/LinhaPropostaCard.tsx` para imagens de
// origem dinâmica.
export function PropostaPdfCabecalho({ organizacao }: { organizacao: OrganizacaoProposta }) {
  const src = organizacao.logoUrl ?? "/logo/logo-dark.png";

  return (
    <header className="proposta-pdf__cabecalho">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="OrçaFácil" className="proposta-pdf__logo" />
      <div className="proposta-pdf__emitente">
        <p className="proposta-pdf__emitente-nome">{organizacao.nome}</p>
        {organizacao.cnpj && <p className="proposta-pdf__emitente-linha">CNPJ {organizacao.cnpj}</p>}
        {organizacao.endereco && <p className="proposta-pdf__emitente-linha">{organizacao.endereco}</p>}
        {organizacao.telefone && <p className="proposta-pdf__emitente-linha">{organizacao.telefone}</p>}
      </div>
    </header>
  );
}

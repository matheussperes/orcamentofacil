// Task 13.6b — rodapé do documento: mesmo fundo `marinho-900` e mesma logo
// (variante fundo escuro) do cabeçalho (Design-System.md Seção 7.22).
export function PropostaPdfRodape() {
  return (
    <footer className="proposta-pdf__rodape">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo/logo-dark.png" alt="OrçaFácil" className="proposta-pdf__rodape-logo" />
      <p className="proposta-pdf__rodape-nota">Proposta sujeita a confirmação de medidas no local.</p>
    </footer>
  );
}

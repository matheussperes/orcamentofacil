// Task 13.6b — card de citação de destaque (Design-System.md Seção 7.22:
// `bg-marinho-900 text-cinza-0 rounded-lg p-lg`, aspas decorativas em
// `accent-vivid`). Texto EXATO transcrito do mockup
// `docs/Imagem das Telas/12.Proposta em PDF.png` — não é copy livre desta
// task, é fixo por design (contrato: "use literalmente, não invente outro
// texto").
export function PropostaPdfCitacao() {
  return (
    <div className="proposta-pdf__citacao">
      <span className="proposta-pdf__citacao-aspas" aria-hidden="true">
        &ldquo;
      </span>
      <p className="proposta-pdf__citacao-texto">
        Soluções personalizadas que unem funcionalidade, design e qualidade para transformar seus ambientes.
      </p>
    </div>
  );
}

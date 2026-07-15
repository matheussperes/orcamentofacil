"use client";

// Placeholder: sem efeito no motor de cálculo ainda. Fica registrado no
// gabarito (`box.puxadorPadrao`) até definirmos o que essa configuração deve
// disparar (catálogo de puxadores? ferragem própria?).
export function PuxadorCard({
  tipo,
  onChange,
}: {
  tipo: string;
  onChange: (tipo: string) => void;
}) {
  return (
    <div className="card">
      <h2>Puxador</h2>
      <div className="campos">
        <div>
          <label>Tipo</label>
          <select value={tipo} onChange={(e) => onChange(e.target.value)}>
            <option value="externa">Externa</option>
            <option value="perfil">Perfil</option>
            <option value="embutido">Embutido</option>
          </select>
        </div>
      </div>
    </div>
  );
}

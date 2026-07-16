"use client";

// Cabeçalho clicável usado por todo card de configuração do módulo: quando a
// sessão está colapsada, clicar no título reabre ela (o card some o corpo,
// mas o header continua visível pra permitir voltar e editar).
export function SecaoHeader({
  titulo,
  aberta,
  onAbrir,
}: {
  titulo: string;
  aberta: boolean;
  onAbrir: () => void;
}) {
  return (
    <h2
      onClick={aberta ? undefined : onAbrir}
      style={{
        cursor: aberta ? "default" : "pointer",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      {titulo}
      {!aberta && (
        <span style={{ fontSize: 11, textTransform: "none", letterSpacing: 0, color: "var(--accent)" }}>
          editar
        </span>
      )}
    </h2>
  );
}

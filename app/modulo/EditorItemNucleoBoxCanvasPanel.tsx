// Task R.3c — decomposição pura de `EditorItemNucleo.tsx`: painel de
// visualização/seleção do lado `custom_box` (tabs 2D técnico / 3D estático +
// ações Salvar/Limpar/Resetar + alerta de resultado), extraído sem nenhuma
// mudança de comportamento ou de aparência.

import dynamic from "next/dynamic";
import { Box, RectangleHorizontal, PanelTop, PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ModuleViewerAngulo } from "@/components/modulo/ModuleViewer";
import { BoxCanvas, type ModoSelecao } from "../components/BoxCanvas";
import type { BoxModule } from "@/lib/engine/box";
import type { DivisaoSel, ResultadoSalvarItem } from "./EditorItemNucleoTipos";

// Task 3.13-front — `ModuleViewer` (3D estático, Design-System §9.6) carrega
// `three`/`@react-three/fiber`/`@react-three/drei` (bundle pesado): SEMPRE
// via `next/dynamic({ ssr: false })`, skeleton de canvas técnico (Seção 8/
// §9.6) enquanto carrega — mesmo `bg-cinza-50 border-cinza-200`, ícone `Box`
// centralizado em `text-cinza-300`, sem desenho.
const ModuleViewer = dynamic(
  () => import("@/components/modulo/ModuleViewer").then((m) => m.ModuleViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center">
        <Box className="h-8 w-8 text-cinza-300" aria-hidden />
      </div>
    ),
  }
);

// Controles de ângulo do modo "3D estático" (Design-System §9.6) — próprios e
// distintos dos botões Frontal/Traseira/Esquerda/Direita/Explodida do 2D,
// mapeados 1:1 às 4 props fechadas de `ModuleViewer`.
const ANGULOS_MODULE_VIEWER: { view: ModuleViewerAngulo; rotulo: string; Icone: typeof Box }[] = [
  { view: "isometric", rotulo: "Isométrica", Icone: Box },
  { view: "front", rotulo: "Frontal", Icone: RectangleHorizontal },
  { view: "top", rotulo: "Superior", Icone: PanelTop },
  { view: "side", rotulo: "Lateral", Icone: PanelLeft },
];

export interface EditorItemNucleoBoxCanvasPanelProps {
  box: BoxModule;
  modoVisualizacao: "2d" | "3d";
  onChangeModoVisualizacao: (modo: "2d" | "3d") => void;
  modoSelecao: ModoSelecao;
  multiSelecaoVaos: boolean;
  onClicarSelecionarVaos: () => void;
  vaosSelecionados: string[];
  onToggleVao: (id: string) => void;
  divisaoSelecionada: DivisaoSel | null;
  onSelecionarDivisoria: (sel: DivisaoSel | null) => void;
  portaSelecionada: string | null;
  onSelecionarPorta: (id: string | null) => void;
  vaoGavetaSelecionado: string | null;
  onSelecionarVaoGaveta: (id: string | null) => void;
  anguloModuleViewer: ModuleViewerAngulo;
  onChangeAnguloModuleViewer: (angulo: ModuleViewerAngulo) => void;
  corModuleViewer: string;
  texturaUrlModuleViewer: string | undefined;
  exibirAcaoSalvar: boolean;
  rotuloBotaoSalvar: string;
  salvando: boolean;
  onSalvar: () => void;
  onLimpar: () => void;
  onResetar: () => void;
  resultadoSalvar: ResultadoSalvarItem | null;
}

export function EditorItemNucleoBoxCanvasPanel({
  box,
  modoVisualizacao,
  onChangeModoVisualizacao,
  modoSelecao,
  multiSelecaoVaos,
  onClicarSelecionarVaos,
  vaosSelecionados,
  onToggleVao,
  divisaoSelecionada,
  onSelecionarDivisoria,
  portaSelecionada,
  onSelecionarPorta,
  vaoGavetaSelecionado,
  onSelecionarVaoGaveta,
  anguloModuleViewer,
  onChangeAnguloModuleViewer,
  corModuleViewer,
  texturaUrlModuleViewer,
  exibirAcaoSalvar,
  rotuloBotaoSalvar,
  salvando,
  onSalvar,
  onLimpar,
  onResetar,
  resultadoSalvar,
}: EditorItemNucleoBoxCanvasPanelProps) {
  return (
    <Card>
      <CardContent>
        <Tabs value={modoVisualizacao} onValueChange={(v) => onChangeModoVisualizacao(v as "2d" | "3d")}>
          <TabsList>
            <TabsTrigger value="2d">2D técnico</TabsTrigger>
            <TabsTrigger value="3d">3D estático</TabsTrigger>
          </TabsList>
          <TabsContent value="2d">
            <h3 className="mb-sm text-corpo font-medium text-cinza-700">Vãos (clique para selecionar)</h3>
            <div className="flex flex-wrap gap-sm mb-sm">
              <Button
                variant={modoSelecao === "vaos" ? "iconActive" : "ghost"}
                size="sm"
                onClick={onClicarSelecionarVaos}
              >
                Selecionar vãos{modoSelecao === "vaos" && multiSelecaoVaos ? " (múltiplos)" : ""}
              </Button>
            </div>
            <BoxCanvas
              box={box}
              modoSelecao={modoSelecao}
              vaosSelecionados={vaosSelecionados}
              onToggleVao={onToggleVao}
              divisaoSelecionada={divisaoSelecionada}
              onSelecionarDivisoria={onSelecionarDivisoria}
              portaSelecionada={portaSelecionada}
              onSelecionarPorta={onSelecionarPorta}
              vaoGavetaSelecionado={vaoGavetaSelecionado}
              onSelecionarVaoGaveta={onSelecionarVaoGaveta}
            />
          </TabsContent>
          <TabsContent value="3d">
            <div className="flex flex-wrap gap-sm mb-sm">
              {ANGULOS_MODULE_VIEWER.map(({ view, rotulo, Icone }) => (
                <Button
                  key={view}
                  variant={anguloModuleViewer === view ? "iconActive" : "ghost"}
                  size="icon"
                  aria-label={rotulo}
                  title={rotulo}
                  onClick={() => onChangeAnguloModuleViewer(view)}
                >
                  <Icone aria-hidden />
                </Button>
              ))}
            </div>
            <div className="aspect-square max-w-full rounded-md border border-cinza-200 bg-cinza-50 p-2">
              <ModuleViewer
                width={box.largura}
                height={box.altura}
                depth={box.profundidade}
                view={anguloModuleViewer}
                color={corModuleViewer}
                textureUrl={texturaUrlModuleViewer}
              />
            </div>
          </TabsContent>
        </Tabs>
        <div className="mt-md flex flex-wrap items-center gap-xs">
          {exibirAcaoSalvar && (
            <Button onClick={onSalvar} disabled={salvando}>
              {salvando ? "Salvando…" : rotuloBotaoSalvar}
            </Button>
          )}
          <Button variant="ghost" onClick={onLimpar}>Limpar</Button>
          <Button variant="danger" onClick={onResetar}>Resetar</Button>
        </div>
        {resultadoSalvar && (
          <Alert variant={resultadoSalvar.ok ? "sucesso" : "erro"} className="mt-3">
            <AlertDescription>
              {resultadoSalvar.ok
                ? (resultadoSalvar.mensagem ?? "Salvo com sucesso.")
                : (resultadoSalvar.erro ?? "Não foi possível salvar.")}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

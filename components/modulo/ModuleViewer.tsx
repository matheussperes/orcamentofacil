"use client";

import { Suspense, useLayoutEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";

// Task 3.13-front (contrato .maestro/state/contracts/3.13-front.md) —
// exceção pontual e estreita autorizada pelo operador (Design-System.md
// Seção 9.6, Modelo-de-Dominio.md Seção 4.1): visualização 3D ESTÁTICA
// (câmera ortográfica fixa, sem `OrbitControls`, sem rotação livre) do
// módulo em edição. NÃO é precedente — `BoxCanvas`/`ElevacaoParede`/
// `PlanoCorteCanvas` continuam 2D para sempre (Design-System.md Seção 9).
//
// Carregado sempre via `next/dynamic({ ssr: false })` pelo consumidor
// (`app/modulo/EditorItemNucleo.tsx`) — este módulo importa `three`/
// `@react-three/fiber`/`@react-three/drei` diretamente, sem guarda de SSR
// própria, porque a responsabilidade de não renderizar no servidor é do
// `dynamic()` no ponto de uso.

export type ModuleViewerAngulo = "isometric" | "front" | "top" | "side";

export interface ModuleViewerProps {
  /** mm — mesma fonte que `BoxCanvas.tsx` (`BoxModule.largura`), proibido
   * segundo caminho de derivação de geometria. */
  width: number;
  /** mm — `BoxModule.altura`. */
  height: number;
  /** mm — `BoxModule.profundidade`. */
  depth: number;
  view?: ModuleViewerAngulo;
  /** Hex derivado de `BoxModule.material.cor` via `corParaHex()`
   * (`app/components/ModulePreview.tsx`) — único fallback de cor. */
  color?: string;
  /** URL pública (WebP) resolvida a partir de
   * `especificacao.texturaUrl` do Produto tipo `chapa`. Presente ⇒ material
   * texturizado; ausente ⇒ `color`. Nunca os dois nem um terceiro caminho. */
  textureUrl?: string;
}

// Direção normalizada da câmera + vetor "up" por ângulo — `up` diferente em
// "top" evita câmera/up colineares (matriz de vista degenerada) quando se
// olha de cima para baixo.
const DIRECAO_CAMERA: Record<ModuleViewerAngulo, [THREE.Vector3, THREE.Vector3]> = {
  isometric: [new THREE.Vector3(1, 1, 1), new THREE.Vector3(0, 1, 0)],
  front: [new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0)],
  top: [new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, -1)],
  side: [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0)],
};

function CameraEstatica({ view, maxDim }: { view: ModuleViewerAngulo; maxDim: number }) {
  const { camera, size } = useThree();

  // Sem animação de rotação (Design-System §9.6/§12): a troca de ângulo é
  // instantânea — reposiciona a câmera direto, sem interpolação.
  useLayoutEffect(() => {
    const [direcao, up] = DIRECAO_CAMERA[view];
    const distancia = maxDim * 3;
    camera.position.copy(direcao).multiplyScalar(distancia);
    camera.up.copy(up);
    camera.lookAt(0, 0, 0);
    if (camera instanceof THREE.OrthographicCamera) {
      // Enquadra o módulo com folga (65% da menor dimensão do canvas).
      camera.zoom = (Math.min(size.width, size.height) * 0.65) / maxDim;
      camera.updateProjectionMatrix();
    }
  }, [camera, view, maxDim, size.width, size.height]);

  return null;
}

function MaterialTexturizado({ url }: { url: string }) {
  const texture = useTexture(url);
  texture.colorSpace = THREE.SRGBColorSpace;
  return <meshStandardMaterial map={texture} />;
}

function Caixa({ width, height, depth, color, textureUrl }: Omit<ModuleViewerProps, "view">) {
  return (
    <mesh>
      <boxGeometry args={[width, height, depth]} />
      {textureUrl ? (
        <Suspense fallback={<meshStandardMaterial color={color ?? "#eef0f2"} />}>
          <MaterialTexturizado url={textureUrl} />
        </Suspense>
      ) : (
        <meshStandardMaterial color={color ?? "#eef0f2"} />
      )}
    </mesh>
  );
}

export function ModuleViewer({
  width,
  height,
  depth,
  view = "isometric",
  color,
  textureUrl,
}: ModuleViewerProps) {
  const maxDim = Math.max(width, height, depth, 1);

  return (
    <Canvas
      orthographic
      camera={{ near: 0.1, far: maxDim * 20 }}
      className="max-w-full"
    >
      <CameraEstatica view={view} maxDim={maxDim} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[maxDim, maxDim * 2, maxDim]} intensity={1} />
      <Caixa width={width} height={height} depth={depth} color={color} textureUrl={textureUrl} />
    </Canvas>
  );
}

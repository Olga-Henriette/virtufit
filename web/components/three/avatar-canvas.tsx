"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, OrbitControls, ContactShadows } from "@react-three/drei";
import { Spinner } from "@/components/ui/spinner";

interface AvatarCanvasProps {
  children: React.ReactNode;
  className?: string;
}

export function AvatarCanvas({ children, className }: AvatarCanvasProps) {
  return (
    <div className={className ?? "h-full w-full"}>
      <Canvas
        camera={{ position: [0, 1.1, 3.2], fov: 38 }}
        shadows
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: false }}
      >
        <color attach="background" args={["#dde3ea"]} />

        <ambientLight intensity={0.7} />
        <directionalLight
          position={[3, 5, 3]}
          intensity={1.4}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-bias={-0.0005}
        />
        <directionalLight position={[-3, 3, -2]} intensity={0.5} />
        <hemisphereLight args={["#ffffff", "#888888", 0.6]} />

        {/* Environnement neutre à faible intensité pour éviter
            les reflets bleutés/colorés sur les matériaux clairs */}
        <Environment preset="apartment" environmentIntensity={0.25} />

        <Suspense fallback={null}>
          {children}
          <ContactShadows
            position={[0, 0.01, 0]}
            opacity={0.45}
            scale={6}
            blur={2.2}
            far={3}
          />
        </Suspense>

        <OrbitControls
          target={[0, 0.95, 0]}
          minDistance={0.8}
          maxDistance={5}
          maxPolarAngle={Math.PI / 1.7}
          enablePan={false}
        />
      </Canvas>
    </div>
  );
}

export function AvatarCanvasFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-surface-muted">
      <Spinner />
    </div>
  );
}
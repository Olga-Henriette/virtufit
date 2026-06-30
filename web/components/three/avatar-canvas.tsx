"use client";

import { Suspense, useRef, useImperativeHandle, forwardRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, ContactShadows, Lightformer, Environment } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { Spinner } from "@/components/ui/spinner";

export interface AvatarCanvasHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
}

interface AvatarCanvasProps {
  children: React.ReactNode;
  className?: string;
}

const DEFAULT_CAMERA_POSITION = [0, 1.1, 3.2] as const;
const DEFAULT_TARGET = [0, 0.95, 0] as const;
const ZOOM_STEP = 0.35;
const MIN_DISTANCE = 0.8;
const MAX_DISTANCE = 5;

export const AvatarCanvas = forwardRef<AvatarCanvasHandle, AvatarCanvasProps>(
  function AvatarCanvas({ children, className }, ref) {
    const controlsRef = useRef<OrbitControlsImpl>(null);

    function moveAlongView(delta: number) {
      const controls = controlsRef.current;
      if (!controls) return;
      const camera = controls.object;
      const direction = camera.position.clone().sub(controls.target).normalize();
      const currentDistance = camera.position.distanceTo(controls.target);
      const newDistance = Math.min(
        MAX_DISTANCE,
        Math.max(MIN_DISTANCE, currentDistance + delta),
      );
      camera.position.copy(controls.target).add(direction.multiplyScalar(newDistance));
      controls.update();
    }

    useImperativeHandle(ref, () => ({
      zoomIn: () => moveAlongView(-ZOOM_STEP),
      zoomOut: () => moveAlongView(ZOOM_STEP),
      resetView: () => {
        const controls = controlsRef.current;
        if (!controls) return;
        controls.object.position.set(...DEFAULT_CAMERA_POSITION);
        controls.target.set(...DEFAULT_TARGET);
        controls.update();
      },
    }));

    return (
      <div className={className ?? "h-full w-full"}>
        <Canvas
          camera={{ position: [...DEFAULT_CAMERA_POSITION], fov: 38 }}
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

          <Environment resolution={256}>
            <group>
              <Lightformer intensity={2} color="white" position={[0, 4, -3]} scale={[6, 4, 1]} />
              <Lightformer
                intensity={0.7}
                color="white"
                position={[-4, 2, 2]}
                scale={[3, 4, 1]}
                rotation={[0, Math.PI / 3, 0]}
              />
              <Lightformer
                intensity={0.7}
                color="white"
                position={[4, 2, 2]}
                scale={[3, 4, 1]}
                rotation={[0, -Math.PI / 3, 0]}
              />
            </group>
          </Environment>

          <Suspense fallback={null}>
            {children}
            <ContactShadows position={[0, 0.01, 0]} opacity={0.45} scale={6} blur={2.2} far={3} />
          </Suspense>

          <OrbitControls
            ref={controlsRef}
            target={[...DEFAULT_TARGET]}
            minDistance={MIN_DISTANCE}
            maxDistance={MAX_DISTANCE}
            maxPolarAngle={Math.PI / 1.7}
            enablePan={false}
          />
        </Canvas>
      </div>
    );
  },
);

export function AvatarCanvasFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-surface-muted">
      <Spinner />
    </div>
  );
}
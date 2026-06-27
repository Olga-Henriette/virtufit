"use client";

import { useState, useCallback } from "react";
import type { Vector3 } from "three";
import { AvatarCanvas } from "@/components/three/avatar-canvas";
import { HumanModel } from "@/components/three/human-model";

export default function Test3DPage() {
  const [modelInfo, setModelInfo] = useState<{ size: Vector3; center: Vector3 } | null>(null);

  const handleReady = useCallback((size: Vector3, center: Vector3) => {
    setModelInfo({ size, center });
  }, []);

  return (
    <div className="flex h-screen flex-col">
      <div className="border-b border-border bg-surface px-6 py-4">
        <h1 className="text-lg font-semibold">Test rendu 3D — Avatar de base</h1>
        <p className="text-sm text-text-secondary">
          {modelInfo
            ? `Dimensions du modèle : ${modelInfo.size.x.toFixed(2)} × ${modelInfo.size.y.toFixed(2)} × ${modelInfo.size.z.toFixed(2)} unités`
            : "Chargement du modèle…"}
        </p>
      </div>
      <div className="flex-1">
        <AvatarCanvas>
          <HumanModel modelPath="/models/avatar-base-male.glb" onReady={handleReady} />
        </AvatarCanvas>
      </div>
    </div>
  );
}
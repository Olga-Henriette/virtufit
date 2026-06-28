"use client";

import { useState, useCallback } from "react";
import type { Vector3 } from "three";
import { AvatarCanvas } from "./avatar-canvas";
import { HumanModel } from "./human-model";
import { getAvatarModelPath } from "../../lib/three/avatar-models.config";
import type { Gender } from "@/lib/types";

interface AvatarViewer3DProps {
  gender?: Gender | string;
  className?: string;
  showDimensions?: boolean;
}

export function AvatarViewer3D({
  gender,
  className,
  showDimensions = false,
}: AvatarViewer3DProps) {
  const [dimensions, setDimensions] = useState<Vector3 | null>(null);
  const modelPath = getAvatarModelPath(gender);

  const handleReady = useCallback((size: Vector3) => {
    setDimensions(size);
  }, []);

  return (
    <div className={className ?? "relative h-full w-full"}>
      <AvatarCanvas>
        <HumanModel modelPath={modelPath} onReady={handleReady} />
      </AvatarCanvas>

      {showDimensions && dimensions && (
        <div className="absolute bottom-3 left-3 rounded-md bg-black/60 px-2.5 py-1 text-xs text-white">
          {dimensions.x.toFixed(2)} × {dimensions.y.toFixed(2)} × {dimensions.z.toFixed(2)} m
        </div>
      )}
    </div>
  );
}
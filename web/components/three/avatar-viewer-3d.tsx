"use client";

import { useState, useCallback, useRef } from "react";
import type { Vector3 } from "three";
import { AvatarCanvas, type AvatarCanvasHandle } from "./avatar-canvas";
import { AvatarZoomControls } from "./avatar-zoom-controls";
import { HumanModel } from "./human-model";
import { getAvatarModelPath } from "@/lib/three/avatar-models.config";
import type { Gender, MeasurementInput } from "@/lib/types";

interface AvatarViewer3DProps {
  gender?: Gender | string;
  measurements?: Partial<MeasurementInput> | null;
  className?: string;
  showDimensions?: boolean;
  showZoomControls?: boolean;
}

export function AvatarViewer3D({
  gender,
  measurements,
  className,
  showDimensions = false,
  showZoomControls = true,
}: AvatarViewer3DProps) {
  const [dimensions, setDimensions] = useState<Vector3 | null>(null);
  const canvasRef = useRef<AvatarCanvasHandle>(null);
  const modelPath = getAvatarModelPath(gender);

  const handleReady = useCallback((size: Vector3) => {
    setDimensions(size);
  }, []);

  return (
    <div className={className ?? "relative h-full w-full"}>
      <AvatarCanvas ref={canvasRef}>
        <HumanModel modelPath={modelPath} measurements={measurements} onReady={handleReady} />
      </AvatarCanvas>

      {showZoomControls && <AvatarZoomControls canvasRef={canvasRef} />}

      {showDimensions && dimensions && (
        <div className="absolute bottom-3 left-3 rounded-md bg-black/60 px-2.5 py-1 text-xs text-white">
          {dimensions.x.toFixed(2)} × {dimensions.y.toFixed(2)} × {dimensions.z.toFixed(2)} m
        </div>
      )}
    </div>
  );
}
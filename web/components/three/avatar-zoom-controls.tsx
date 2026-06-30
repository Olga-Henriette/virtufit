"use client";

import { Plus, Minus, RotateCcw } from "lucide-react";
import type { AvatarCanvasHandle } from "./avatar-canvas";

interface AvatarZoomControlsProps {
  canvasRef: React.RefObject<AvatarCanvasHandle | null>;
}

export function AvatarZoomControls({ canvasRef }: AvatarZoomControlsProps) {
  return (
    <div className="absolute right-3 top-3 flex flex-col gap-1.5">
      <ControlButton
        icon={Plus}
        label="Zoomer"
        onClick={() => canvasRef.current?.zoomIn()}
      />
      <ControlButton
        icon={Minus}
        label="Dézoomer"
        onClick={() => canvasRef.current?.zoomOut()}
      />
      <ControlButton
        icon={RotateCcw}
        label="Réinitialiser la vue"
        onClick={() => canvasRef.current?.resetView()}
      />
    </div>
  );
}

function ControlButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Plus;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="flex size-9 items-center justify-center rounded-md bg-white/90 text-text-secondary shadow-sm transition-colors hover:bg-white hover:text-primary-600"
    >
      <Icon className="size-4" />
    </button>
  );
}
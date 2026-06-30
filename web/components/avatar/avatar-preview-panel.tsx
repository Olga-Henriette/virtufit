"use client";

import { useRef, useState } from "react";
import { RotateCcw, ArrowLeftRight, Maximize2, Minimize2 } from "lucide-react";
import { AvatarViewer3D } from "@/components/three/avatar-viewer-3d";
import { useAvatarHistoryStore } from "@/lib/store/avatar-history.store";
import type { Gender, MeasurementInput} from "@/lib/types";
import { cn } from "@/lib/utils/cn";

interface AvatarPreviewPanelProps {
  gender: Gender | string;
  /** Mensurations en cours de saisie/actives — utilisées en mode "current" */
  liveMeasurements: Partial<MeasurementInput> | null;
  liveGender: Gender | string;
}

export function AvatarPreviewPanel({
  gender,
  liveMeasurements,
  liveGender,
}: AvatarPreviewPanelProps) {
  const [panelHeight, setPanelHeight] = useState(460);
  const [isExpanded, setIsExpanded] = useState(false);
  const resizeStartY = useRef<number | null>(null);
  const resizeStartH = useRef<number>(460);

  const { previous, current, viewMode, toggleComparison, resetToNeutral } =
    useAvatarHistoryStore();

  // Détermine quoi afficher selon le mode de vue actif
  const displayMeasurements =
    viewMode === "neutral"
      ? null
      : viewMode === "previous"
        ? previous?.measurements ?? null
        : (current?.measurements ?? liveMeasurements);

  const displayGender =
    viewMode === "neutral"
      ? gender
      : viewMode === "previous"
        ? previous?.avatar.gender ?? gender
        : (current?.avatar.gender ?? liveGender);

  function onResizeStart(e: React.PointerEvent) {
    resizeStartY.current = e.clientY;
    resizeStartH.current = panelHeight;
    window.addEventListener("pointermove", onResizeMove);
    window.addEventListener("pointerup", onResizeEnd);
  }
  function onResizeMove(e: PointerEvent) {
    if (resizeStartY.current === null) return;
    const delta = e.clientY - resizeStartY.current;
    setPanelHeight(Math.min(900, Math.max(280, resizeStartH.current + delta)));
  }
  function onResizeEnd() {
    resizeStartY.current = null;
    window.removeEventListener("pointermove", onResizeMove);
    window.removeEventListener("pointerup", onResizeEnd);
  }

  const modeLabel = {
    neutral: "Avatar de base (non personnalisé)",
    current: "Avatar actuel",
    previous: "Avatar précédent",
  }[viewMode];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-text-primary">{modeLabel}</p>
          {viewMode === "current" && current && (
            <p className="text-xs text-text-muted">Mis à jour à {current.label}</p>
          )}
          {viewMode === "previous" && previous && (
            <p className="text-xs text-text-muted">Enregistré à {previous.label}</p>
          )}
        </div>

        <div className="flex gap-1.5">
          {previous && (
            <PanelButton
              icon={ArrowLeftRight}
              label={viewMode === "previous" ? "Voir actuel" : "Voir précédent"}
              onClick={toggleComparison}
              active={viewMode === "previous"}
            />
          )}
          <PanelButton
            icon={RotateCcw}
            label="Réinitialiser (avatar de base)"
            onClick={resetToNeutral}
            active={viewMode === "neutral"}
          />
          <PanelButton
            icon={isExpanded ? Minimize2 : Maximize2}
            label={isExpanded ? "Réduire" : "Agrandir"}
            onClick={() => {
              setIsExpanded((v) => !v);
              setPanelHeight(isExpanded ? 460 : 700);
            }}
          />
        </div>
      </div>

      <div
        className="relative overflow-auto rounded-lg border border-border bg-surface shadow-sm"
        style={{ height: panelHeight }}
      >
        <div className="sticky top-0 h-full w-full min-w-[280px]">
          <AvatarViewer3D
            gender={displayGender}
            measurements={displayMeasurements}
            showDimensions
            showZoomControls
            className="h-full w-full"
          />
        </div>

        {viewMode === "previous" && (
          <div className="absolute left-3 top-3 rounded-full bg-amber-500/90 px-2.5 py-1 text-xs font-medium text-white">
            ← Précédent
          </div>
        )}
        {viewMode === "neutral" && (
          <div className="absolute left-3 top-3 rounded-full bg-slate-500/90 px-2.5 py-1 text-xs font-medium text-white">
            Modèle de base
          </div>
        )}
      </div>

      <div
        className="flex h-4 cursor-ns-resize items-center justify-center"
        onPointerDown={onResizeStart}
        title="Glisser pour redimensionner"
      >
        <div className="h-1 w-12 rounded-full bg-border transition-colors hover:bg-primary-300" />
      </div>
    </div>
  );
}

function PanelButton({
  icon: Icon,
  label,
  onClick,
  active = false,
}: {
  icon: typeof RotateCcw;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        "flex size-8 items-center justify-center rounded-md border border-border text-text-secondary transition-colors hover:text-primary-600",
        active ? "border-primary-400 bg-primary-50 text-primary-600" : "bg-surface",
      )}
    >
      <Icon className="size-3.5" />
    </button>
  );
}
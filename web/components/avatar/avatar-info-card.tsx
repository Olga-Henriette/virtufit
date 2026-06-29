"use client";

import { Activity, Box, Clock, Ruler, Weight } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import type { Avatar } from "@/lib/types";

function bmiCategory(bmi: number): { label: string; color: string } {
  if (bmi < 18.5) return { label: "Maigreur", color: "text-amber-600 bg-amber-50" };
  if (bmi < 25) return { label: "Normal", color: "text-green-600 bg-green-50" };
  if (bmi < 30) return { label: "Surpoids", color: "text-amber-600 bg-amber-50" };
  return { label: "Obésité", color: "text-red-600 bg-red-50" };
}

export function AvatarInfoCard({ avatar }: { avatar: Avatar }) {
  const bmi = bmiCategory(avatar.bmi);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Informations de l&apos;avatar</CardTitle>
      </CardHeader>

      <div className="grid grid-cols-2 gap-3">
        <InfoRow icon={Ruler} label="Taille" value={`${avatar.heightCm.toFixed(0)} cm`} />
        <InfoRow icon={Weight} label="Poids" value={`${avatar.weightKg.toFixed(0)} kg`} />
        <InfoRow
          icon={Activity}
          label="IMC"
          value={avatar.bmi.toFixed(1)}
          badge={bmi.label}
          badgeColor={bmi.color}
        />
        <InfoRow
          icon={Clock}
          label="Génération"
          value={`${avatar.generationTimeMs.toFixed(0)} ms`}
        />
        <InfoRow
          icon={Box}
          label="Sommets du maillage"
          value={avatar.mesh.verticesCount.toLocaleString("fr-FR")}
        />
        <InfoRow
          icon={Box}
          label="Faces"
          value={avatar.mesh.facesCount.toLocaleString("fr-FR")}
        />
      </div>
    </Card>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  badge,
  badgeColor,
}: {
  icon: typeof Ruler;
  label: string;
  value: string;
  badge?: string;
  badgeColor?: string;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-md bg-surface-muted px-3 py-2.5">
      <Icon className="size-4 shrink-0 text-primary-600" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-text-muted">{label}</p>
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-semibold text-text-primary">{value}</p>
          {badge && (
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${badgeColor}`}>
              {badge}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
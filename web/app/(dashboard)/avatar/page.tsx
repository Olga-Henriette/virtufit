"use client";

import { useState, type FormEvent } from "react";
import { Ruler, Weight, User2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AvatarViewer3D } from "@/components/three/avatar-viewer-3d";
import { useAuthStore } from "@/lib/store/auth.store";
import { useActiveMeasurement, useCreateMeasurement } from "@/lib/hooks/use-measurements";
import { extractErrorMessage } from "@/lib/api/error";
import type { Gender, MeasurementInput } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

const genderOptions: { value: Gender; label: string }[] = [
  { value: "male", label: "Homme" },
  { value: "female", label: "Femme" },
  { value: "neutral", label: "Neutre" },
];

export default function AvatarMeasurementsPage() {
  const user = useAuthStore((s) => s.user);
  const { data: activeMeasurement } = useActiveMeasurement(user?.id);
  const createMeasurement = useCreateMeasurement(user?.id);

  const [gender, setGender] = useState<Gender>("neutral");
  const [form, setForm] = useState<Partial<MeasurementInput>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function updateField(key: keyof MeasurementInput, value: string) {
    const num = value === "" ? undefined : Number(value);
    setForm((f) => ({ ...f, [key]: num }));
  }

  function validate(): string | null {
    const required: (keyof MeasurementInput)[] = [
      "heightCm",
      "weightKg",
      "chestCm",
      "waistCm",
      "hipsCm",
      "shoulderWidthCm",
    ];
    for (const key of required) {
      if (form[key] === undefined || Number.isNaN(form[key])) {
        return "Veuillez renseigner toutes les mensurations principales.";
      }
    }
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    const payload: MeasurementInput = {
      heightCm: form.heightCm!,
      weightKg: form.weightKg!,
      chestCm: form.chestCm!,
      waistCm: form.waistCm!,
      hipsCm: form.hipsCm!,
      shoulderWidthCm: form.shoulderWidthCm!,
      ...(form.inseamCm !== undefined && { inseamCm: form.inseamCm }),
      ...(form.neckCm !== undefined && { neckCm: form.neckCm }),
      ...(form.armLengthCm !== undefined && { armLengthCm: form.armLengthCm }),
      ...(form.thighCm !== undefined && { thighCm: form.thighCm }),
    };

    try {
      await createMeasurement.mutateAsync(payload);
      setSuccess(true);
    } catch (err) {
      setError(extractErrorMessage(err, "Impossible d'enregistrer les mensurations."));
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="text-2xl font-bold text-text-primary">Mon avatar 3D</h1>
      <p className="mt-1 text-text-secondary">
        Renseignez vos mensurations pour générer votre avatar réaliste.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Formulaire  */}
        <Card>
          <CardHeader>
            <CardTitle>Mensurations</CardTitle>
            <CardDescription>
              Requises pour générer un avatar fidèle à votre morphologie.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm text-danger">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                {error}
              </div>
            )}
            {success && (
              <div className="flex items-start gap-2 rounded-md bg-green-50 p-3 text-sm text-green-700">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                Mensurations enregistrées avec succès.
              </div>
            )}

            <div>
              <p className="mb-2 text-sm font-medium text-text-primary">Genre</p>
              <div className="grid grid-cols-3 gap-2">
                {genderOptions.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setGender(value)}
                    className={cn(
                      "rounded-md border-2 py-2.5 text-sm font-medium transition-colors",
                      gender === value
                        ? "border-primary-600 bg-primary-50 text-primary-700"
                        : "border-border text-text-secondary hover:bg-surface-muted",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Taille (cm)"
                type="number"
                icon={Ruler}
                onChange={(e) => updateField("heightCm", e.target.value)}
                placeholder="175"
              />
              <Input
                label="Poids (kg)"
                type="number"
                icon={Weight}
                onChange={(e) => updateField("weightKg", e.target.value)}
                placeholder="70"
              />
            </div>

            <Input
              label="Tour de poitrine (cm)"
              type="number"
              icon={User2}
              onChange={(e) => updateField("chestCm", e.target.value)}
              placeholder="95"
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Tour de taille (cm)"
                type="number"
                onChange={(e) => updateField("waistCm", e.target.value)}
                placeholder="80"
              />
              <Input
                label="Tour de hanches (cm)"
                type="number"
                onChange={(e) => updateField("hipsCm", e.target.value)}
                placeholder="98"
              />
            </div>

            <Input
              label="Largeur d'épaules (cm)"
              type="number"
              onChange={(e) => updateField("shoulderWidthCm", e.target.value)}
              placeholder="45"
            />

            <details className="rounded-md border border-border p-3">
              <summary className="cursor-pointer text-sm font-medium text-text-primary">
                Mensurations optionnelles
              </summary>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Input
                  label="Entrejambe (cm)"
                  type="number"
                  onChange={(e) => updateField("inseamCm", e.target.value)}
                />
                <Input
                  label="Tour de cou (cm)"
                  type="number"
                  onChange={(e) => updateField("neckCm", e.target.value)}
                />
                <Input
                  label="Longueur de bras (cm)"
                  type="number"
                  onChange={(e) => updateField("armLengthCm", e.target.value)}
                />
                <Input
                  label="Tour de cuisse (cm)"
                  type="number"
                  onChange={(e) => updateField("thighCm", e.target.value)}
                />
              </div>
            </details>

            <Button type="submit" className="w-full" isLoading={createMeasurement.isPending}>
              Enregistrer et continuer
            </Button>
          </form>
        </Card>

        {/* Aperçu 3D */}
        <Card className="flex flex-col p-0 overflow-hidden">
          <div className="border-b border-border p-4">
            <CardTitle>Aperçu de l&apos;avatar</CardTitle>
            <CardDescription>
              {activeMeasurement
                ? "Avatar basé sur vos mensurations actuelles."
                : "Aperçu générique — sera personnalisé après enregistrement."}
            </CardDescription>
          </div>
          <div className="h-[500px] flex-1">
            <AvatarViewer3D gender={gender} />
          </div>
        </Card>
      </div>
    </div>
  );
}
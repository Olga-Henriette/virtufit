"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AvatarViewer3D } from "@/components/three/avatar-viewer-3d";
import { PhotoUploadZone } from "@/components/avatar/photo-upload-zone";
import { useAuthStore } from "@/lib/store/auth.store";
import { useActiveAvatar } from "@/lib/hooks/use-avatar";
import { useUploadPersonalizationPhoto } from "@/lib/hooks/use-personalization";
import { rgbToHex } from "@/lib/three/skin-color.utils";
import { extractErrorMessage } from "@/lib/api/error";
import { useActiveMeasurement } from "@/lib/hooks/use-measurements";

export default function PersonalizeAvatarPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { data: activeAvatar, refetch } = useActiveAvatar(user?.id);
  const { data: activeMeasurement } = useActiveMeasurement(user?.id);
  const uploadPhoto = useUploadPersonalizationPhoto(user?.id);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [previewSkinHex, setPreviewSkinHex] = useState<string | null>(null);

  async function handleAnalyze() {
    if (!selectedFile) return;
    setError(null);
    setSuccess(false);

    try {
      const result = await uploadPhoto.mutateAsync(selectedFile);
      setPreviewSkinHex(rgbToHex(result.skinRgb));
      setSuccess(true);
      await refetch();
    } catch (err) {
      setError(extractErrorMessage(err, "Impossible d'analyser la photo."));
    }
  }

  const displaySkinHex = previewSkinHex ?? rgbToHex(activeAvatar?.skinRgb);

  if (!activeAvatar) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <p className="text-text-secondary">
          Générez d&apos;abord votre avatar avant de le personnaliser.
        </p>
        <Button className="mt-4" onClick={() => router.push("/avatar")}>
          Créer mon avatar
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <button
        onClick={() => router.push("/avatar")}
        className="mb-4 flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft className="size-4" />
        Retour à mon avatar
      </button>

      <h1 className="text-2xl font-bold text-text-primary">Personnaliser l&apos;avatar</h1>
      <p className="mt-1 text-text-secondary">
        Ajoutez une photo de visage pour appliquer votre teint réel à l&apos;avatar 3D.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Photo de référence</CardTitle>
            <CardDescription>
              Une photo de visage bien éclairée donne les meilleurs résultats.
            </CardDescription>
          </CardHeader>

          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm text-danger">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 flex items-start gap-2 rounded-md bg-green-50 p-3 text-sm text-green-700">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
              Teint appliqué avec succès à votre avatar.
            </div>
          )}

          <PhotoUploadZone
            onFileSelected={setSelectedFile}
            isUploading={uploadPhoto.isPending}
          />

          <Button
            className="mt-5 w-full"
            onClick={handleAnalyze}
            disabled={!selectedFile}
            isLoading={uploadPhoto.isPending}
          >
            <Sparkles className="size-4" />
            {uploadPhoto.isPending ? "Analyse en cours…" : "Analyser et appliquer"}
          </Button>

          <button
            onClick={() => router.push("/avatar")}
            className="mt-3 w-full text-center text-sm text-text-secondary hover:text-text-primary"
          >
            Passer cette étape
          </button>
        </Card>

        <Card className="flex flex-col overflow-hidden p-0">
          <div className="border-b border-border p-4">
            <CardTitle>Aperçu</CardTitle>
            <CardDescription>
              {displaySkinHex
                ? "Teint personnalisé appliqué"
                : "Teint par défaut — sera mis à jour après analyse"}
            </CardDescription>
          </div>
          <div className="h-[460px] flex-1">
            <AvatarViewer3D
              gender={activeAvatar.gender}
              measurements={activeMeasurement}
              skinColorHex={displaySkinHex}
              showZoomControls
            />
          </div>
        </Card>
      </div>
    </div>
  );
}
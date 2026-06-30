import {
  type Mesh,
  type Object3D,
  type BufferGeometry,
  BufferAttribute,
  Box3,
  Vector3,
  Matrix4,
} from "three";
import type { BodyRegionScale } from "./morphology-deform";

const ANATOMY_CENTERS: Record<
  keyof Omit<BodyRegionScale, "height">,
  { center: number; spread: number }
> = {
  hips:      { center: 0.22, spread: 0.13 },
  waist:     { center: 0.46, spread: 0.09 },
  chest:     { center: 0.60, spread: 0.09 },
  shoulders: { center: 0.74, spread: 0.06 },
};

function gaussian(x: number, center: number, spread: number): number {
  const d = (x - center) / spread;
  return Math.exp(-(d * d));
}

function continuousScaleFactor(heightFraction: number, scale: BodyRegionScale): number {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const key of Object.keys(ANATOMY_CENTERS) as Array<keyof typeof ANATOMY_CENTERS>) {
    const { center, spread } = ANATOMY_CENTERS[key];
    const weight = gaussian(heightFraction, center, spread);
    weightedSum += weight * scale[key];
    totalWeight += weight;
  }

  const neutralWeight = Math.max(0, 1 - totalWeight);
  weightedSum += neutralWeight * 1.0;
  totalWeight += neutralWeight;

  return totalWeight > 0 ? weightedSum / totalWeight : 1;
}

/**
 * Enveloppe ellipsoïdale stricte du tronc : ne contient QUE le torse,
 * le ventre et les hanches — jamais les bras, mains, ou jambes, même
 * si ces derniers passent momentanément près de l'axe central (ex:
 * mains posées le long du corps).
 *
 * Le rayon autorisé est volontairement étroit et fixe (en fraction de
 * la largeur d'épaules typique), pas dépendant du rayon max du modèle
 * entier (qui est faussé par l'envergure des bras tendus).
 */
function torsoEnvelopeFactor(
  heightFraction: number,
  radialFraction: number,
): number {
  // Rayon maximal autorisé pour appartenir au "tronc", par hauteur.
  // Resserré aux épaules/cou, plus large aux hanches, quasi nul
  // en dehors de la plage verticale du buste (0.15 à 0.80).
  if (heightFraction < 0.12 || heightFraction > 0.82) return 0;

  // Rayon du tronc attendu (forme ovoïde naturelle), normalisé 0–1
  // par rapport à la largeur d'épaules de référence du modèle.
  let envelopeRadius: number;
  if (heightFraction < 0.30) {
    envelopeRadius = 0.42; // hanches : large
  } else if (heightFraction < 0.55) {
    envelopeRadius = 0.30; // taille : resserré
  } else if (heightFraction < 0.70) {
    envelopeRadius = 0.38; // poitrine : large
  } else {
    envelopeRadius = 0.22; // cou/épaules hautes : resserré
  }

  if (radialFraction > envelopeRadius) return 0;

  // Transition douce vers 0 au bord de l'enveloppe (évite une coupure nette)
  const t = radialFraction / envelopeRadius;
  return 1 - t * t * t; // décroissance cubique douce
}

function deformMeshGeometry(
  mesh: Mesh,
  worldMatrix: Matrix4,
  globalMinY: number,
  globalMaxY: number,
  pivotX: number,
  pivotZ: number,
  shoulderWidthRef: number,
  scale: BodyRegionScale,
): void {
  const geometry = mesh.geometry as BufferGeometry;
  const positionAttr = geometry.getAttribute("position") as BufferAttribute;
  if (!positionAttr) return;

  const totalHeight = globalMaxY - globalMinY;
  if (totalHeight <= 0 || shoulderWidthRef <= 0) return;

  const positions = positionAttr.array as Float32Array;
  const worldVertex = new Vector3();
  const inverseMatrix = worldMatrix.clone().invert();

  for (let i = 0; i < positions.length; i += 3) {
    worldVertex.set(positions[i], positions[i + 1], positions[i + 2]);
    worldVertex.applyMatrix4(worldMatrix);

    const heightFraction = Math.min(
      1,
      Math.max(0, (worldVertex.y - globalMinY) / totalHeight),
    );

    const dx = worldVertex.x - pivotX;
    const dz = worldVertex.z - pivotZ;
    const radius = Math.sqrt(dx * dx + dz * dz);
    // Normalisé par la largeur d'épaules (référence stable, contrairement
    // au rayon max du modèle qui varie selon la pose des bras).
    const radialFraction = radius / shoulderWidthRef;

    const rawFactor = continuousScaleFactor(heightFraction, scale);
    const envelope = torsoEnvelopeFactor(heightFraction, radialFraction);

    // Si hors de l'enveloppe du tronc : aucune déformation (facteur = 1)
    const factor = 1.0 + (rawFactor - 1.0) * envelope;

    worldVertex.x = pivotX + dx * factor;
    worldVertex.z = pivotZ + dz * factor;

    worldVertex.applyMatrix4(inverseMatrix);

    positions[i]     = worldVertex.x;
    positions[i + 1] = worldVertex.y;
    positions[i + 2] = worldVertex.z;
  }

  positionAttr.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
}

export function applyBodyDeformation(root: Object3D, scale: BodyRegionScale): boolean {
  root.updateMatrixWorld(true);
  const globalBox = new Box3().setFromObject(root);
  const size = new Vector3();
  const center = new Vector3();
  globalBox.getSize(size);
  globalBox.getCenter(center);

  if (size.y <= 0) return false;

  // Référence stable pour le rayon du tronc : largeur du modèle À HAUTEUR
  // DE LA POITRINE uniquement (pas la largeur totale incluant les bras
  // tendus), approximée à 30% de la hauteur totale du modèle.
  const shoulderWidthRef = size.y * 0.13; // ratio empirique torse/hauteur

  let deformedAny = false;

  root.traverse((child) => {
    const mesh = child as Mesh;
    if (mesh.isMesh && mesh.geometry) {
      deformMeshGeometry(
        mesh,
        mesh.matrixWorld,
        globalBox.min.y,
        globalBox.max.y,
        center.x,
        center.z,
        shoulderWidthRef,
        scale,
      );
      deformedAny = true;
    }
  });

  root.scale.y *= scale.height;

  return deformedAny;
}

export function resetBoneScales(): void {
  // no-op
}
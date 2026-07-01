"use client";

import { useGLTF } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import {
  Box3,
  Vector3,
  type Group,
  type Mesh,
  MeshStandardMaterial,
  type Object3D,
} from "three";
import {
  computeBodyRegionScale,
  NEUTRAL_BODY_SCALE,
  type BodyRegionScale,
} from "@/lib/three/morphology-deform";
import { applyBodyDeformation } from "@/lib/three/apply-body-deformation";
import type { MeasurementInput } from "@/lib/types";

const TARGET_HEIGHT_M = 1.75;

interface HumanModelProps {
  modelPath: string;
  measurements?: Partial<MeasurementInput> | null;
  skinColorHex?: string | null;
  onReady?: (size: Vector3, center: Vector3) => void;
}

/**
 * Clone une scène glTF en PROFONDEUR, y compris les géométries des meshes.
 *
 * `Object3D.clone(true)` clone uniquement la hiérarchie de nœuds (transforms,
 * parenté) — il NE clone PAS les BufferGeometry sous-jacentes, qui restent
 * partagées par référence avec l'asset mis en cache par useGLTF. Sans ce
 * clonage explicite, toute déformation de géométrie modifierait l'asset
 * source de façon cumulative et irréversible entre les rendus.
 */
function deepCloneSceneWithGeometry(source: Object3D): Object3D {
  const cloned = source.clone(true);

  const sourceMeshes: Mesh[] = [];
  source.traverse((child) => {
    if ((child as Mesh).isMesh) sourceMeshes.push(child as Mesh);
  });

  const clonedMeshes: Mesh[] = [];
  cloned.traverse((child) => {
    if ((child as Mesh).isMesh) clonedMeshes.push(child as Mesh);
  });

  // Les deux traversées préservent le même ordre (clone(true) garde la
  // hiérarchie identique), donc on peut associer terme à terme.
  for (let i = 0; i < clonedMeshes.length; i++) {
    const original = sourceMeshes[i];
    const copy = clonedMeshes[i];
    if (original?.geometry) {
      copy.geometry = original.geometry.clone();
    }
  }

  return cloned;
}

function prepareAvatarScene(
  scene: Object3D,
  bodyScale: BodyRegionScale,
  skinColorHex: string | null,
): { size: Vector3; center: Vector3 } {
  let hasAnyTexture = false;

  scene.traverse((child) => {
    const mesh = child as Mesh;
    if (mesh.isMesh) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const material = mesh.material as MeshStandardMaterial;
      if (material?.map) hasAnyTexture = true;
    }
  });

  if (!hasAnyTexture) {
    const color = skinColorHex ?? "#d9a583";
    scene.traverse((child) => {
      const mesh = child as Mesh;
      if (mesh.isMesh) {
        mesh.material = new MeshStandardMaterial({
          color,
          roughness: 0.75,
          metalness: 0.0,
          envMapIntensity: 0.3,
        });
      }
    });
  }

  scene.scale.set(1, 1, 1);
  scene.position.set(0, 0, 0);

  const rawBox = new Box3().setFromObject(scene);
  const rawSize = new Vector3();
  rawBox.getSize(rawSize);

  const normalizeFactor = rawSize.y > 0 ? TARGET_HEIGHT_M / rawSize.y : 1;
  scene.scale.setScalar(normalizeFactor);

  applyBodyDeformation(scene, bodyScale);

  const box = new Box3().setFromObject(scene);
  const size = new Vector3();
  const center = new Vector3();
  box.getSize(size);
  box.getCenter(center);

  scene.position.x -= center.x;
  scene.position.z -= center.z;
  scene.position.y -= box.min.y;

  return { size, center };
}

export function HumanModel({ modelPath, measurements, skinColorHex, onReady }: HumanModelProps) {
  const groupRef = useRef<Group>(null);
  const { scene } = useGLTF(modelPath);

  const bodyScale: BodyRegionScale = useMemo(
    () => (measurements ? computeBodyRegionScale(measurements) : NEUTRAL_BODY_SCALE),
    [measurements],
  );

  const preparedScene = useMemo(() => {
    // Clonage profond INCLUANT les géométries — l'asset en cache par
    // useGLTF n'est jamais modifié, donc aucune mutation cumulative
    // possible entre les rendus, peu importe le nombre de régénérations.
    const cloned = deepCloneSceneWithGeometry(scene);
    const { size, center } = prepareAvatarScene(cloned, bodyScale, skinColorHex ?? null);
    return { scene: cloned, size, center };
  }, [scene, bodyScale, skinColorHex]);

  useEffect(() => {
    onReady?.(preparedScene.size, preparedScene.center);
  }, [preparedScene, onReady]);

  return (
    <group ref={groupRef}>
      <primitive object={preparedScene.scene} />
    </group>
  );
}

export function preloadHumanModel(modelPath: string) {
  useGLTF.preload(modelPath);
}
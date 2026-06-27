"use client";

import { useGLTF } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import { Box3, Vector3, type Group, type Mesh, MeshStandardMaterial } from "three";

const TARGET_HEIGHT_M = 1.75; // Hauteur humaine standard de référence

interface HumanModelProps {
  modelPath: string;
  onReady?: (size: Vector3, center: Vector3) => void;
}

/**
 * Charge un modèle humain glTF, le met à l'échelle pour correspondre
 * à une hauteur humaine standard (peu importe l'unité d'origine du fichier),
 * le recentre sur l'origine, et applique un matériau de remplacement
 * réaliste si aucune texture n'est embarquée.
 */
export function HumanModel({ modelPath, onReady }: HumanModelProps) {
  const groupRef = useRef<Group>(null);
  const { scene } = useGLTF(modelPath);

  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);

    // 1. Force la taille d'origine à zéro pour mesurer proprement
    clone.scale.set(1, 1, 1);
    clone.position.set(0, 0, 0);

    const rawBox = new Box3().setFromObject(clone);
    const rawSize = new Vector3();
    rawBox.getSize(rawSize);

    // 2. Ajuste la hauteur automatique à 1.75m (TARGET_HEIGHT_M)
    const scaleFactor = rawSize.y > 0 ? TARGET_HEIGHT_M / rawSize.y : 1;
    clone.scale.setScalar(scaleFactor);

    // 3. Calcule le nouveau centre après le changement de taille
    const box = new Box3().setFromObject(clone);
    const center = new Vector3();
    box.getCenter(center);

    // 4. Positionne le clone en toute sécurité ici 
    clone.position.x -= center.x;
    clone.position.z -= center.z;
    clone.position.y -= box.min.y;

    return clone;
  }, [scene]);

  useEffect(() => {
    let hasAnyTexture = false;

    clonedScene.traverse((child) => {
      const mesh = child as Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        const material = mesh.material as MeshStandardMaterial;
        if (material?.map) hasAnyTexture = true;
      }
    });

    if (!hasAnyTexture) {
      clonedScene.traverse((child) => {
        const mesh = child as Mesh;
        if (mesh.isMesh) {
          mesh.material = new MeshStandardMaterial({
            color: "#d9a583",
            roughness: 0.75,
            metalness: 0.0,
            envMapIntensity: 0.3,
          });
        }
      });
    }

    // Calcule la boîte, la taille et le centre de manière propre
    const box = new Box3().setFromObject(clonedScene);
    const size = new Vector3();
    const center = new Vector3();
    box.getSize(size);
    box.getCenter(center);

    onReady?.(size, center);
  }, [clonedScene, onReady]);

  return (
    <group ref={groupRef}>
      <primitive object={clonedScene} />
    </group>
  );
}

export function preloadHumanModel(modelPath: string) {
  useGLTF.preload(modelPath);
}
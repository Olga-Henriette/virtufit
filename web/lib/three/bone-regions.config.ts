/**
 * Mapping région anatomique → noms de bones candidats.
 * Les noms varient selon la convention de rig (Mixamo, RPM, etc.),
 * donc on liste plusieurs alias possibles par région ; le premier
 * bone trouvé dans le squelette est utilisé.
 */
export const BONE_REGION_ALIASES: Record<keyof Omit<import("./morphology-deform").BodyRegionScale, "height">, string[]> = {
  chest: ["Spine2", "Chest", "spine2", "chest", "UpperChest", "mixamorig:Spine2"],
  waist: ["Spine1", "Waist", "spine1", "waist", "mixamorig:Spine1"],
  hips: ["Hips", "Pelvis", "hips", "pelvis", "mixamorig:Hips"],
  shoulders: ["Shoulders", "Spine2", "shoulders", "mixamorig:Spine2"],
};

export function findBoneByAliases(
  root: import("three").Object3D,
  aliases: string[],
): import("three").Bone | null {
  for (const name of aliases) {
    const found = root.getObjectByName(name);
    if (found && (found as import("three").Bone).isBone) {
      return found as import("three").Bone;
    }
  }
  return null;
}
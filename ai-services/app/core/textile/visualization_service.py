"""
Prépare et sérialise les données de simulation pour
une consommation optimale par Unity Engine.

Responsabilités :
- Extraire les frames depuis un résultat de simulation
- Calculer les normales à partir des déplacements
- Construire la configuration de scène Unity
- Formater les données pour le protocole WebSocket
"""

from functools import lru_cache

import numpy as np

from app.schemas.simulation     import SimulationResponse
from app.schemas.visualization  import (
    ClothingFrameData,
    ClothingMetadata,
    StreamStatus,
    UnitySceneConfig,
)
from app.utils.logger import get_logger

logger = get_logger(__name__)


class VisualizationService:
    """
    Transforme les résultats de simulation en données
    consommables par Unity Engine.
    """

    def __init__(self) -> None:
        logger.info("VisualizationService initialisé.")

    # Configuration de scène

    def build_scene_config(
        self,
        sim_result:        SimulationResponse,
        avatar_mesh_ref:   str,
        clothing_mesh_ref: str,
        smpl_betas:        list[float],
        fabric_type:       str,
        animation_type:    str,
    ) -> UnitySceneConfig:
        """
        Construit la configuration complète de la scène Unity.
        Envoyée une seule fois au début de la session.
        """
        logger.info(
            "Configuration scène Unity — session=%s frames=%d",
            sim_result.session_id,
            sim_result.frame_count,
        )

        return UnitySceneConfig(
            session_id=sim_result.session_id,
            avatar_mesh_ref=avatar_mesh_ref,
            clothing_mesh_ref=clothing_mesh_ref,
            animation_type=animation_type,
            frame_count=sim_result.frame_count,
            frame_rate=60,
            smpl_betas=smpl_betas,
            fabric_type=fabric_type,
            fit_score=sim_result.fit_analysis.fit_score,
        )

    # Extraction de frames

    def extract_frame(
        self,
        sim_result:       SimulationResponse,
        frame_index:      int,
        mesh_reference:   str,
        fabric_type:      str,
        elasticity_coeff: float,
        friction_coeff:   float,
        animation_type:   str,
    ) -> ClothingFrameData:
        """
        Extrait et prépare une frame spécifique pour Unity.

        Calcule les normales approximatives à partir
        des déplacements des sommets.
        """
        if frame_index >= len(sim_result.frames):
            frame_index = len(sim_result.frames) - 1

        frame         = sim_result.frames[frame_index]
        vertex_deltas = frame.vertex_deltas

        # Calcule les normales approximatives
        normals = self._compute_normals(vertex_deltas)

        vertex_count = len(vertex_deltas) // 3

        metadata = ClothingMetadata(
            fabric_type=fabric_type,
            elasticity_coeff=elasticity_coeff,
            friction_coeff=friction_coeff,
            vertex_count=vertex_count,
            animation_type=animation_type,
        )

        return ClothingFrameData(
            session_id=sim_result.session_id,
            frame_index=frame_index,
            vertex_deltas=vertex_deltas,
            normals=normals,
            energy=frame.energy,
            mesh_reference=mesh_reference,
            metadata=metadata,
        )

    def extract_all_frames(
        self,
        sim_result:       SimulationResponse,
        mesh_reference:   str,
        fabric_type:      str,
        elasticity_coeff: float,
        friction_coeff:   float,
        animation_type:   str,
    ) -> list[ClothingFrameData]:
        """Extrait toutes les frames d'une simulation."""
        return [
            self.extract_frame(
                sim_result=sim_result,
                frame_index=i,
                mesh_reference=mesh_reference,
                fabric_type=fabric_type,
                elasticity_coeff=elasticity_coeff,
                friction_coeff=friction_coeff,
                animation_type=animation_type,
            )
            for i in range(len(sim_result.frames))
        ]

    # Statut de streaming

    @staticmethod
    def build_stream_status(
        session_id:   str,
        frames_sent:  int,
        total_frames: int,
    ) -> StreamStatus:
        """Construit le statut de progression du streaming."""
        raw_progress = frames_sent / max(total_frames, 1)
        
        # On limite le progrès à 1.0 maximum pour respecter le contrat d'interface
        progress    = min(raw_progress, 1.0)
        is_complete = frames_sent >= total_frames

        return StreamStatus(
            session_id=session_id,
            frames_sent=frames_sent,
            total_frames=total_frames,
            progress=round(progress, 3),
            is_complete=is_complete,
        )

    # Calcul des normales

    @staticmethod
    def _compute_normals(vertex_deltas: list[float]) -> list[float]:
        """
        Calcule des normales approximatives à partir
        des déplacements des sommets.

        Approche : normalise chaque vecteur déplacement.
        """
        n_verts = len(vertex_deltas) // 3
        if n_verts == 0:
            return []

        deltas  = np.array(vertex_deltas).reshape(-1, 3)
        norms   = np.linalg.norm(deltas, axis=1, keepdims=True)

        # Évite la division par zéro
        safe_norms = np.where(norms < 1e-8, 1.0, norms)
        normalized = deltas / safe_norms

        # Normale par défaut orientée vers le haut si vecteur nul
        zero_mask              = (norms.flatten() < 1e-8)
        normalized[zero_mask]  = np.array([0.0, 1.0, 0.0])

        return normalized.flatten().tolist()

    # Compression des données

    @staticmethod
    def compress_frame_data(frame: ClothingFrameData) -> dict:
        """
        Compresse les données d'une frame pour le transfert WebSocket.

        Stratégie : quantification sur 16 bits pour réduire
        la bande passante de ~50% par rapport au float32.
        """
        # Quantifie les deltas sur [-2, 2] → uint16
        deltas = np.array(frame.vertex_deltas, dtype=np.float32)
        scale  = 2.0
        quantized = np.clip(
            ((deltas + scale) / (2 * scale) * 65535),
            0, 65535,
        ).astype(np.uint16)

        return {
            "session_id":     frame.session_id,
            "frame_index":    frame.frame_index,
            "vertex_count":   frame.metadata.vertex_count,
            "energy":         frame.energy,
            "mesh_reference": frame.mesh_reference,
            "fabric_type":    frame.metadata.fabric_type,
            # Données compressées en base64 pour transport JSON
            "deltas_b64":     _to_base64(quantized.tobytes()),
            "scale":          scale,
            "encoding":       "uint16_quantized",
        }


def _to_base64(data: bytes) -> str:
    """Encode des bytes en base64 pour transport JSON."""
    import base64
    return base64.b64encode(data).decode("ascii")


@lru_cache(maxsize=1)
def get_visualization_service() -> VisualizationService:
    """Retourne l'instance singleton."""
    return VisualizationService()
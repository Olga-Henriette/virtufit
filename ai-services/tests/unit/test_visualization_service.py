import pytest
from app.core.textile.visualization_service import VisualizationService
from app.core.textile.mass_spring_engine    import MassSpringEngine
from app.core.textile.fabric_properties     import get_fabric_properties
from app.schemas.simulation import (
    AnimationType, AvatarSimData, ClothingSimData,
)


# Fixtures

@pytest.fixture
def viz_service() -> VisualizationService:
    return VisualizationService()


@pytest.fixture
def sim_result():
    """Résultat de simulation réel pour les tests."""
    engine  = MassSpringEngine()
    fabric  = get_fabric_properties("cotton")
    avatar  = AvatarSimData(
        avatar_id="avatar-viz-test",
        smpl_betas=[0.0] * 10,
        height_cm=175.0,
        weight_kg=70.0,
    )
    clothing = ClothingSimData(
        clothing_id="cloth-viz-test",
        mesh_reference="meshes/test.glb",
        fabric=fabric,
        category="top",
    )
    return engine.simulate(
        avatar=avatar,
        clothing=clothing,
        animation=AnimationType.STANDING,
        session_id="session-viz-test",
    )


# Tests UnitySceneConfig

class TestBuildSceneConfig:

    def test_scene_config_has_correct_session_id(
        self, viz_service: VisualizationService, sim_result
    ) -> None:
        config = viz_service.build_scene_config(
            sim_result=sim_result,
            avatar_mesh_ref="meshes/avatar.glb",
            clothing_mesh_ref="meshes/cloth.glb",
            smpl_betas=[0.0] * 10,
            fabric_type="cotton",
            animation_type="standing",
        )
        assert config.session_id == sim_result.session_id

    def test_scene_config_frame_count_matches(
        self, viz_service: VisualizationService, sim_result
    ) -> None:
        config = viz_service.build_scene_config(
            sim_result=sim_result,
            avatar_mesh_ref="meshes/avatar.glb",
            clothing_mesh_ref="meshes/cloth.glb",
            smpl_betas=[0.0] * 10,
            fabric_type="cotton",
            animation_type="standing",
        )
        assert config.frame_count == sim_result.frame_count

    def test_scene_config_frame_rate_is_60(
        self, viz_service: VisualizationService, sim_result
    ) -> None:
        config = viz_service.build_scene_config(
            sim_result=sim_result,
            avatar_mesh_ref="meshes/avatar.glb",
            clothing_mesh_ref="meshes/cloth.glb",
            smpl_betas=[0.0] * 10,
            fabric_type="cotton",
            animation_type="standing",
        )
        assert config.frame_rate == 60

    def test_scene_config_fit_score_matches(
        self, viz_service: VisualizationService, sim_result
    ) -> None:
        config = viz_service.build_scene_config(
            sim_result=sim_result,
            avatar_mesh_ref="meshes/avatar.glb",
            clothing_mesh_ref="meshes/cloth.glb",
            smpl_betas=[0.0] * 10,
            fabric_type="cotton",
            animation_type="standing",
        )
        assert config.fit_score == sim_result.fit_analysis.fit_score


# Tests ClothingFrameData

class TestExtractFrame:

    def test_extract_frame_returns_correct_index(
        self, viz_service: VisualizationService, sim_result
    ) -> None:
        frame = viz_service.extract_frame(
            sim_result=sim_result,
            frame_index=0,
            mesh_reference="meshes/cloth.glb",
            fabric_type="cotton",
            elasticity_coeff=0.25,
            friction_coeff=0.55,
            animation_type="standing",
        )
        assert frame.frame_index == 0

    def test_extract_frame_has_vertex_deltas(
        self, viz_service: VisualizationService, sim_result
    ) -> None:
        frame = viz_service.extract_frame(
            sim_result=sim_result,
            frame_index=0,
            mesh_reference="meshes/cloth.glb",
            fabric_type="cotton",
            elasticity_coeff=0.25,
            friction_coeff=0.55,
            animation_type="standing",
        )
        assert len(frame.vertex_deltas) > 0

    def test_extract_frame_has_normals(
        self, viz_service: VisualizationService, sim_result
    ) -> None:
        frame = viz_service.extract_frame(
            sim_result=sim_result,
            frame_index=0,
            mesh_reference="meshes/cloth.glb",
            fabric_type="cotton",
            elasticity_coeff=0.25,
            friction_coeff=0.55,
            animation_type="standing",
        )
        assert len(frame.normals) == len(frame.vertex_deltas)

    def test_extract_frame_clamps_out_of_range_index(
        self, viz_service: VisualizationService, sim_result
    ) -> None:
        """Un index hors plage doit retourner la dernière frame."""
        frame = viz_service.extract_frame(
            sim_result=sim_result,
            frame_index=9999,
            mesh_reference="meshes/cloth.glb",
            fabric_type="cotton",
            elasticity_coeff=0.25,
            friction_coeff=0.55,
            animation_type="standing",
        )
        assert frame.frame_index == len(sim_result.frames) - 1

    def test_extract_all_frames_count(
        self, viz_service: VisualizationService, sim_result
    ) -> None:
        frames = viz_service.extract_all_frames(
            sim_result=sim_result,
            mesh_reference="meshes/cloth.glb",
            fabric_type="cotton",
            elasticity_coeff=0.25,
            friction_coeff=0.55,
            animation_type="standing",
        )
        assert len(frames) == sim_result.frame_count

    def test_metadata_contains_fabric_type(
        self, viz_service: VisualizationService, sim_result
    ) -> None:
        frame = viz_service.extract_frame(
            sim_result=sim_result,
            frame_index=0,
            mesh_reference="meshes/cloth.glb",
            fabric_type="denim",
            elasticity_coeff=0.10,
            friction_coeff=0.65,
            animation_type="rotating",
        )
        assert frame.metadata.fabric_type    == "denim"
        assert frame.metadata.animation_type == "rotating"


# Tests StreamStatus

class TestStreamStatus:

    def test_progress_is_correct(self) -> None:
        status = VisualizationService.build_stream_status(
            session_id="s-001", frames_sent=5, total_frames=10,
        )
        assert status.progress == 0.5

    def test_not_complete_when_frames_remaining(self) -> None:
        status = VisualizationService.build_stream_status(
            session_id="s-001", frames_sent=5, total_frames=10,
        )
        assert status.is_complete is False

    def test_complete_when_all_frames_sent(self) -> None:
        status = VisualizationService.build_stream_status(
            session_id="s-001", frames_sent=10, total_frames=10,
        )
        assert status.is_complete is True

    def test_progress_capped_at_one(self) -> None:
        status = VisualizationService.build_stream_status(
            session_id="s-001", frames_sent=15, total_frames=10,
        )
        assert status.progress <= 1.0


# Tests Compression

class TestCompressFrameData:

    def test_compress_returns_dict(
        self, viz_service: VisualizationService, sim_result
    ) -> None:
        frame = viz_service.extract_frame(
            sim_result=sim_result,
            frame_index=0,
            mesh_reference="meshes/cloth.glb",
            fabric_type="cotton",
            elasticity_coeff=0.25,
            friction_coeff=0.55,
            animation_type="standing",
        )
        compressed = viz_service.compress_frame_data(frame)
        assert isinstance(compressed, dict)

    def test_compress_contains_required_keys(
        self, viz_service: VisualizationService, sim_result
    ) -> None:
        frame = viz_service.extract_frame(
            sim_result=sim_result,
            frame_index=0,
            mesh_reference="meshes/cloth.glb",
            fabric_type="cotton",
            elasticity_coeff=0.25,
            friction_coeff=0.55,
            animation_type="standing",
        )
        compressed = viz_service.compress_frame_data(frame)
        required   = {"session_id", "frame_index", "vertex_count",
                      "energy", "encoding", "deltas_b64", "scale"}
        assert required.issubset(compressed.keys())

    def test_compress_encoding_is_uint16(
        self, viz_service: VisualizationService, sim_result
    ) -> None:
        frame = viz_service.extract_frame(
            sim_result=sim_result,
            frame_index=0,
            mesh_reference="meshes/cloth.glb",
            fabric_type="cotton",
            elasticity_coeff=0.25,
            friction_coeff=0.55,
            animation_type="standing",
        )
        compressed = viz_service.compress_frame_data(frame)
        assert compressed["encoding"] == "uint16_quantized"

# Tests Normales

class TestComputeNormals:

    def test_normals_same_length_as_deltas(
        self, viz_service: VisualizationService, sim_result
    ) -> None:
        frame = viz_service.extract_frame(
            sim_result=sim_result,
            frame_index=0,
            mesh_reference="meshes/cloth.glb",
            fabric_type="cotton",
            elasticity_coeff=0.25,
            friction_coeff=0.55,
            animation_type="standing",
        )
        assert len(frame.normals) == len(frame.vertex_deltas)

    def test_empty_deltas_returns_empty_normals(self) -> None:
        normals = VisualizationService._compute_normals([])
        assert normals == []
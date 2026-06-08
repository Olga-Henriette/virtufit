import io
import pytest
from PIL import Image
from app.core.textile.digitization_pipeline import DigitizationPipeline
from app.schemas.clothing import ClothingCategory, FabricType, ViewAngle


@pytest.fixture
def pipeline() -> DigitizationPipeline:
    return DigitizationPipeline()


def _make_photo(
    rgb: tuple[int, int, int] = (45, 80, 150),
    size: tuple = (400, 600),
) -> bytes:
    img = Image.new("RGB", size, rgb)
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


class TestDigitizationPipeline:

    def test_process_single_photo_returns_result(
        self, pipeline: DigitizationPipeline
    ) -> None:
        result = pipeline.process(
            images_bytes=[_make_photo()],
            view_angles=[ViewAngle.FRONT],
            clothing_id="cloth-test-001",
            vendor_id="vendor-test-001",
            category=ClothingCategory.TOP,
        )
        assert result.clothing_id == "cloth-test-001"
        assert result.vendor_id   == "vendor-test-001"
        assert result.category    == ClothingCategory.TOP

    def test_process_multiple_photos(
        self, pipeline: DigitizationPipeline
    ) -> None:
        photos = [_make_photo() for _ in range(3)]
        angles = [ViewAngle.FRONT, ViewAngle.BACK, ViewAngle.LEFT]

        result = pipeline.process(
            images_bytes=photos,
            view_angles=angles,
            clothing_id="cloth-multi-001",
            vendor_id="vendor-001",
            category=ClothingCategory.BOTTOM,
        )
        assert len(result.photo_analyses) >= 1

    def test_mesh_reference_format(
        self, pipeline: DigitizationPipeline
    ) -> None:
        result = pipeline.process(
            images_bytes=[_make_photo()],
            view_angles=[ViewAngle.FRONT],
            clothing_id="cloth-ref-001",
            vendor_id="vendor-ref-001",
            category=ClothingCategory.DRESS,
        )
        assert "cloth-ref-001" in result.mesh_reference
        assert result.mesh_reference.endswith(".glb")

    def test_texture_reference_format(
        self, pipeline: DigitizationPipeline
    ) -> None:
        result = pipeline.process(
            images_bytes=[_make_photo()],
            view_angles=[ViewAngle.FRONT],
            clothing_id="cloth-tex-001",
            vendor_id="vendor-tex-001",
            category=ClothingCategory.TOP,
        )
        assert result.texture_reference.endswith(".png")

    def test_digitization_ms_is_positive(
        self, pipeline: DigitizationPipeline
    ) -> None:
        result = pipeline.process(
            images_bytes=[_make_photo()],
            view_angles=[ViewAngle.FRONT],
            clothing_id="cloth-time-001",
            vendor_id="vendor-001",
            category=ClothingCategory.TOP,
        )
        assert result.digitization_ms > 0

    def test_color_info_dominant_rgb_has_three_values(
        self, pipeline: DigitizationPipeline
    ) -> None:
        result = pipeline.process(
            images_bytes=[_make_photo((200, 50, 50))],
            view_angles=[ViewAngle.FRONT],
            clothing_id="cloth-color-001",
            vendor_id="vendor-001",
            category=ClothingCategory.TOP,
        )
        analysis = result.photo_analyses[0]
        assert len(analysis.color_info.dominant_rgb) == 3

    def test_quality_score_in_range(
        self, pipeline: DigitizationPipeline
    ) -> None:
        result = pipeline.process(
            images_bytes=[_make_photo()],
            view_angles=[ViewAngle.FRONT],
            clothing_id="cloth-qual-001",
            vendor_id="vendor-001",
            category=ClothingCategory.TOP,
        )
        for analysis in result.photo_analyses:
            assert 0.0 <= analysis.quality_score <= 1.0

    def test_symmetry_score_in_range(
        self, pipeline: DigitizationPipeline
    ) -> None:
        result = pipeline.process(
            images_bytes=[_make_photo()],
            view_angles=[ViewAngle.FRONT],
            clothing_id="cloth-sym-001",
            vendor_id="vendor-001",
            category=ClothingCategory.TOP,
        )
        for analysis in result.photo_analyses:
            assert 0.0 <= analysis.contour_info.symmetry_score <= 1.0

    def test_estimated_size_is_valid(
        self, pipeline: DigitizationPipeline
    ) -> None:
        result = pipeline.process(
            images_bytes=[_make_photo()],
            view_angles=[ViewAngle.FRONT],
            clothing_id="cloth-size-001",
            vendor_id="vendor-001",
            category=ClothingCategory.TOP,
        )
        assert result.estimated_size in ("XS", "S", "M", "L", "XL", "XXL")

    def test_fabric_type_is_valid_enum(
        self, pipeline: DigitizationPipeline
    ) -> None:
        result = pipeline.process(
            images_bytes=[_make_photo()],
            view_angles=[ViewAngle.FRONT],
            clothing_id="cloth-fabric-001",
            vendor_id="vendor-001",
            category=ClothingCategory.TOP,
        )
        assert result.fabric_type in [f.value for f in FabricType]
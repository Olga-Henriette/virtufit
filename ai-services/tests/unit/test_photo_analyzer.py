import io
import pytest
from PIL import Image
from app.core.morphology.photo_analyzer import PhotoAnalyzer
from app.schemas.personalization import SkinToneEnum, HairColorEnum


@pytest.fixture
def analyzer() -> PhotoAnalyzer:
    return PhotoAnalyzer()


def _make_image_bytes(rgb: tuple[int, int, int], size: tuple = (200, 200)) -> bytes:
    """Génère une image PNG de couleur uniforme en mémoire."""
    img = Image.new("RGB", size, rgb)
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


class TestPhotoAnalyzer:

    def test_analyze_returns_valid_response(
        self, analyzer: PhotoAnalyzer
    ) -> None:
        """analyze() retourne une réponse complète."""
        img_bytes = _make_image_bytes((200, 160, 130))
        result    = analyzer.analyze(img_bytes, "user-photo-test")

        assert result.user_id         == "user-photo-test"
        assert result.photo_reference is not None
        assert result.visual_features is not None
        assert result.analysis_time_ms > 0

    def test_skin_rgb_has_three_components(
        self, analyzer: PhotoAnalyzer
    ) -> None:
        """skin_rgb doit avoir exactement 3 composantes [R, G, B]."""
        img_bytes = _make_image_bytes((180, 140, 110))
        result    = analyzer.analyze(img_bytes, "user-rgb-test")
        assert len(result.visual_features.skin_rgb) == 3

    def test_hair_rgb_has_three_components(
        self, analyzer: PhotoAnalyzer
    ) -> None:
        """hair_rgb doit avoir exactement 3 composantes [R, G, B]."""
        img_bytes = _make_image_bytes((50, 35, 25))
        result    = analyzer.analyze(img_bytes, "user-hair-rgb")
        assert len(result.visual_features.hair_rgb) == 3

    def test_confidence_score_in_range(
        self, analyzer: PhotoAnalyzer
    ) -> None:
        """Le score de confiance doit être entre 0 et 1."""
        img_bytes = _make_image_bytes((200, 160, 130))
        result    = analyzer.analyze(img_bytes, "user-conf-test")
        score     = result.visual_features.confidence_score
        assert 0.0 <= score <= 1.0

    def test_very_light_image_classified_as_very_light(
        self, analyzer: PhotoAnalyzer
    ) -> None:
        """Une image très claire doit être classifiée VERY_LIGHT."""
        img_bytes = _make_image_bytes((240, 235, 230))
        result    = analyzer.analyze(img_bytes, "user-light")
        assert result.visual_features.skin_tone == SkinToneEnum.VERY_LIGHT

    def test_dark_image_classified_as_dark(
        self, analyzer: PhotoAnalyzer
    ) -> None:
        """Une image sombre doit être classifiée DARK."""
        img_bytes = _make_image_bytes((80, 55, 40))
        result    = analyzer.analyze(img_bytes, "user-dark")
        assert result.visual_features.skin_tone in (
            SkinToneEnum.DARK, SkinToneEnum.VERY_DARK
        )

    def test_photo_reference_contains_user_id(
        self, analyzer: PhotoAnalyzer
    ) -> None:
        """La référence photo doit contenir le user_id."""
        user_id   = "user-ref-check"
        img_bytes = _make_image_bytes((200, 160, 130))
        result    = analyzer.analyze(img_bytes, user_id)
        assert user_id in result.photo_reference

    def test_white_hair_classified_correctly(
        self, analyzer: PhotoAnalyzer
    ) -> None:
        """Une zone supérieure blanche doit donner WHITE ou GRAY."""
        img_bytes = _make_image_bytes((240, 240, 240))
        result    = analyzer.analyze(img_bytes, "user-white-hair")
        assert result.visual_features.hair_color in (
            HairColorEnum.WHITE, HairColorEnum.GRAY, HairColorEnum.BLONDE
        )

    def test_black_hair_classified_correctly(
        self, analyzer: PhotoAnalyzer
    ) -> None:
        """Une zone supérieure noire doit donner BLACK ou DARK_BROWN."""
        img_bytes = _make_image_bytes((20, 15, 10))
        result    = analyzer.analyze(img_bytes, "user-black-hair")
        assert result.visual_features.hair_color in (
            HairColorEnum.BLACK, HairColorEnum.DARK_BROWN
        )
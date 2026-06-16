"""
Centralise la validation des entrées critiques et les
corrections des edge cases identifiés lors de l'audit.
"""

from __future__ import annotations

import math
from typing import Any

from app.utils.exceptions import InvalidInputException
from app.utils.logger      import get_logger

logger = get_logger(__name__)


# Validateurs de mensurations 

def validate_measurements_coherence(
    height_cm:         float,
    weight_kg:         float,
    chest_cm:          float,
    waist_cm:          float,
    hips_cm:           float,
    shoulder_width_cm: float,
) -> None:
    """
    Valide la cohérence globale des mensurations.

    Vérifie des invariants anthropométriques :
    - L'IMC doit être dans une plage réaliste [10, 60]
    - Les mensurations doivent être cohérentes entre elles
    - Pas de valeurs NaN ou infinies

    Raises:
        InvalidInputException si une incohérence est détectée.
    """
    # Valeurs finies 
    values = {
        "height_cm":         height_cm,
        "weight_kg":         weight_kg,
        "chest_cm":          chest_cm,
        "waist_cm":          waist_cm,
        "hips_cm":           hips_cm,
        "shoulder_width_cm": shoulder_width_cm,
    }

    for name, value in values.items():
        if not math.isfinite(value):
            raise InvalidInputException(
                f"Mensuration invalide : {name}={value} (NaN ou infini)"
            )

    # IMC réaliste
    height_m = height_cm / 100.0
    bmi      = weight_kg / (height_m ** 2)
    if not (10.0 <= bmi <= 60.0):
        logger.warning(
            "IMC hors plage réaliste : %.1f (height=%.1f weight=%.1f)",
            bmi, height_cm, weight_kg,
        )

    # Cohérence taille/mensurations
    if chest_cm > height_cm * 0.8:
        raise InvalidInputException(
            f"Tour de poitrine ({chest_cm} cm) incohérent avec "
            f"la taille ({height_cm} cm)."
        )

    if shoulder_width_cm > chest_cm * 0.7:
        raise InvalidInputException(
            f"Largeur d'épaules ({shoulder_width_cm} cm) incohérente "
            f"avec le tour de poitrine ({chest_cm} cm)."
        )


# Sécurisation des calculs numériques

def safe_divide(numerator: float, denominator: float, default: float = 0.0) -> float:
    """Division sécurisée — retourne `default` si dénominateur est zéro."""
    if abs(denominator) < 1e-10:
        return default
    result = numerator / denominator
    return result if math.isfinite(result) else default


def safe_mean(values: list[float], default: float = 0.0) -> float:
    """Moyenne sécurisée — retourne `default` si liste vide."""
    finite = [v for v in values if math.isfinite(v)]
    return safe_divide(sum(finite), len(finite), default)


def clamp(value: float, min_val: float, max_val: float) -> float:
    """Clamp une valeur dans [min_val, max_val]."""
    return max(min_val, min(max_val, value))


# Validation des payloads JSON

def validate_uuid(value: str, field_name: str = "id") -> str:
    """
    Valide qu'une chaîne est un UUID valide.

    Raises:
        InvalidInputException si invalide.
    """
    import re
    uuid_pattern = re.compile(
        r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
        re.IGNORECASE,
    )
    if not uuid_pattern.match(value):
        raise InvalidInputException(
            f"'{field_name}' doit être un UUID valide. Reçu : '{value}'"
        )
    return value


def sanitize_string(
    value: str,
    max_length: int = 255,
    field_name: str = "champ",
) -> str:
    """
    Nettoie et valide une chaîne de caractères.
    Supprime les espaces superflus et vérifie la longueur.
    """
    if not isinstance(value, str):
        raise InvalidInputException(
            f"'{field_name}' doit être une chaîne. Reçu : {type(value).__name__}"
        )

    cleaned = value.strip()

    if len(cleaned) == 0:
        raise InvalidInputException(f"'{field_name}' ne peut pas être vide.")

    if len(cleaned) > max_length:
        raise InvalidInputException(
            f"'{field_name}' trop long ({len(cleaned)} chars > {max_length})."
        )

    return cleaned


# Validation des images

def validate_image_bytes(
    image_bytes: bytes,
    max_size_mb: float = 10.0,
    field_name:  str   = "image",
) -> bytes:
    """
    Valide les bytes d'une image.

    Vérifie :
    - Taille non nulle
    - Ne dépasse pas max_size_mb
    - Magic bytes valides (JPEG, PNG, WebP)
    """
    if not image_bytes:
        raise InvalidInputException(f"'{field_name}' est vide.")

    max_bytes = int(max_size_mb * 1024 * 1024)
    if len(image_bytes) > max_bytes:
        size_mb = len(image_bytes) / (1024 * 1024)
        raise InvalidInputException(
            f"'{field_name}' trop volumineuse ({size_mb:.1f} Mo > {max_size_mb} Mo)."
        )

    # Vérifie les magic bytes
    magic_signatures = {
        b'\xff\xd8\xff':             'JPEG',
        b'\x89PNG\r\n\x1a\n':       'PNG',
        b'RIFF':                     'WebP (potentiel)',
    }

    for sig, fmt in magic_signatures.items():
        if image_bytes[:len(sig)] == sig:
            return image_bytes

    raise InvalidInputException(
        f"'{field_name}' format non reconnu. "
        f"Formats acceptés : JPEG, PNG, WebP."
    )
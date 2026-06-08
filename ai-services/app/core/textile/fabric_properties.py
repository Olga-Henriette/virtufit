"""
Catalogue des propriétés mécaniques des tissus.

Chaque tissu est défini par ses paramètres physiques utilisés
dans le moteur Mass-Spring pour simuler le drapé.

Sources :
- Baraff & Witkin (1998) — Large Steps in Cloth Simulation
- Choi & Ko (2002) — Stable but Responsive Cloth
"""

from app.schemas.simulation import FabricProperties


# Catalogue des propriétés par type de tissu

FABRIC_CATALOGUE: dict[str, FabricProperties] = {

    "cotton": FabricProperties(
        fabric_type="cotton",
        elasticity_coeff=0.25,   # peu élastique
        friction_coeff=0.55,     # friction modérée
        weight_per_sqm=150.0,    # g/m² — coton standard
        stiffness=0.35,          # semi-rigide
        damping=0.015,
    ),

    "denim": FabricProperties(
        fabric_type="denim",
        elasticity_coeff=0.10,   # très peu élastique
        friction_coeff=0.65,     # forte friction
        weight_per_sqm=400.0,    # g/m² — denim lourd
        stiffness=0.75,          # très rigide
        damping=0.025,
    ),

    "wool": FabricProperties(
        fabric_type="wool",
        elasticity_coeff=0.40,   # modérément élastique
        friction_coeff=0.60,     # friction élevée (fibre naturelle)
        weight_per_sqm=250.0,    # g/m²
        stiffness=0.30,          # souple
        damping=0.020,
    ),

    "silk": FabricProperties(
        fabric_type="silk",
        elasticity_coeff=0.15,   # peu élastique
        friction_coeff=0.20,     # très glissant
        weight_per_sqm=80.0,     # g/m² — très léger
        stiffness=0.10,          # très souple
        damping=0.005,
    ),

    "polyester": FabricProperties(
        fabric_type="polyester",
        elasticity_coeff=0.55,   # assez élastique
        friction_coeff=0.35,     # friction faible
        weight_per_sqm=120.0,    # g/m²
        stiffness=0.20,          # souple
        damping=0.010,
    ),

    "linen": FabricProperties(
        fabric_type="linen",
        elasticity_coeff=0.08,   # très peu élastique
        friction_coeff=0.50,     # friction modérée
        weight_per_sqm=200.0,    # g/m²
        stiffness=0.60,          # rigide (se froisse)
        damping=0.018,
    ),

    "unknown": FabricProperties(
        fabric_type="unknown",
        elasticity_coeff=0.30,   # valeurs moyennes par défaut
        friction_coeff=0.50,
        weight_per_sqm=180.0,
        stiffness=0.35,
        damping=0.015,
    ),
}


def get_fabric_properties(fabric_type: str) -> FabricProperties:
    """
    Retourne les propriétés du tissu demandé.
    Retourne 'unknown' si le type n'est pas dans le catalogue.
    """
    return FABRIC_CATALOGUE.get(fabric_type, FABRIC_CATALOGUE["unknown"])
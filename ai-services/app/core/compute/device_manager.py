"""
Gestionnaire du device de calcul — VirtuFit AI Services.

Détecte et configure automatiquement le meilleur device disponible :
- CUDA (GPU NVIDIA) → performances maximales
- MPS  (GPU Apple Silicon) → performances intermédiaires
- CPU  → fallback universel

Expose un singleton thread-safe pour toute l'application.
"""

from __future__ import annotations

import os
import threading
from dataclasses import dataclass, field
from functools import lru_cache
from typing import Optional

from app.core.config import get_settings
from app.utils.logger import get_logger

logger = get_logger(__name__)


@dataclass(frozen=True)
class DeviceInfo:
    """Informations sur le device de calcul sélectionné."""
    device_type:      str            # "cuda" | "mps" | "cpu"
    device_name:      str            
    device_index:     int            # Index GPU (0 pour CPU/MPS)
    total_memory_mb:  Optional[float] = None   # Mémoire totale GPU
    compute_capability: Optional[str] = None   # Capacité CUDA (ex: "8.6")
    is_gpu:           bool = False
    supports_fp16:    bool = False   # Calcul demi-précision


class DeviceManager:
    """
    Gestionnaire singleton du device de calcul.

    Sélectionne automatiquement le device optimal et expose
    des utilitaires pour le monitoring des ressources.
    """

    _instance:  Optional[DeviceManager] = None
    _lock:      threading.Lock          = threading.Lock()

    def __new__(cls) -> DeviceManager:
        with cls._lock:
            if cls._instance is None:
                cls._instance = super().__new__(cls)
                cls._instance._initialized = False
        return cls._instance

    def __init__(self) -> None:
        if self._initialized:
            return
        self._initialized = True
        self._settings    = get_settings()
        self._device_info = self._detect_device()
        self._log_device_info()

    # Propriétés publiques

    @property
    def device_type(self) -> str:
        return self._device_info.device_type

    @property
    def device_name(self) -> str:
        return self._device_info.device_name

    @property
    def is_gpu(self) -> bool:
        return self._device_info.is_gpu

    @property
    def supports_fp16(self) -> bool:
        return self._device_info.supports_fp16

    @property
    def info(self) -> DeviceInfo:
        return self._device_info

    # Détection du device

    def _detect_device(self) -> DeviceInfo:
        """
        Détecte le meilleur device disponible.
        Priorité : setting explicite > CUDA > MPS > CPU.
        """
        config_device = self._settings.device.lower()

        if config_device == "cuda":
            return self._try_cuda() or self._cpu_info()
        if config_device == "mps":
            return self._try_mps() or self._cpu_info()
        if config_device == "cpu":
            return self._cpu_info()

        # auto
        return (
            self._try_cuda()
            or self._try_mps()
            or self._cpu_info()
        )

    def _try_cuda(self) -> Optional[DeviceInfo]:
        """Tente d'initialiser CUDA."""
        try:
            import torch
            if not torch.cuda.is_available():
                return None

            idx          = torch.cuda.current_device()
            name         = torch.cuda.get_device_name(idx)
            props        = torch.cuda.get_device_properties(idx)
            mem_mb       = props.total_memory / (1024 ** 2)
            cap          = f"{props.major}.{props.minor}"
            supports_fp16 = props.major >= 7   # Volta+ pour FP16 natif

            return DeviceInfo(
                device_type="cuda",
                device_name=name,
                device_index=idx,
                total_memory_mb=round(mem_mb, 1),
                compute_capability=cap,
                is_gpu=True,
                supports_fp16=supports_fp16,
            )
        except Exception as exc:
            logger.debug("CUDA non disponible : %s", exc)
            return None

    def _try_mps(self) -> Optional[DeviceInfo]:
        """Tente d'initialiser MPS (Apple Silicon)."""
        try:
            import torch
            if not (
                hasattr(torch.backends, "mps")
                and torch.backends.mps.is_available()
            ):
                return None

            return DeviceInfo(
                device_type="mps",
                device_name="Apple Silicon GPU",
                device_index=0,
                is_gpu=True,
                supports_fp16=True,
            )
        except Exception as exc:
            logger.debug("MPS non disponible : %s", exc)
            return None

    @staticmethod
    def _cpu_info() -> DeviceInfo:
        """Retourne les informations du CPU."""
        import platform
        cpu_name = platform.processor() or "CPU"
        return DeviceInfo(
            device_type="cpu",
            device_name=cpu_name,
            device_index=0,
            is_gpu=False,
            supports_fp16=False,
        )

    # Monitoring des ressources

    def get_memory_usage(self) -> dict[str, float]:
        """
        Retourne l'utilisation mémoire du device.

        Returns:
            Dict avec used_mb, total_mb, percent (GPU ou RAM).
        """
        if self._device_info.device_type == "cuda":
            return self._gpu_memory_usage()
        return self._cpu_memory_usage()

    @staticmethod
    def _gpu_memory_usage() -> dict[str, float]:
        try:
            import torch
            used_bytes  = torch.cuda.memory_allocated()
            total_bytes = torch.cuda.get_device_properties(0).total_memory
            used_mb     = used_bytes / (1024 ** 2)
            total_mb    = total_bytes / (1024 ** 2)
            return {
                "used_mb":  round(used_mb, 1),
                "total_mb": round(total_mb, 1),
                "percent":  round(used_mb / total_mb * 100, 1),
            }
        except Exception:
            return {"used_mb": 0.0, "total_mb": 0.0, "percent": 0.0}

    @staticmethod
    def _cpu_memory_usage() -> dict[str, float]:
        try:
            import psutil
            vm      = psutil.virtual_memory()
            used_mb = vm.used / (1024 ** 2)
            tot_mb  = vm.total / (1024 ** 2)
            return {
                "used_mb":  round(used_mb, 1),
                "total_mb": round(tot_mb, 1),
                "percent":  round(vm.percent, 1),
            }
        except Exception:
            return {"used_mb": 0.0, "total_mb": 0.0, "percent": 0.0}

    def get_cpu_usage(self) -> float:
        """Retourne le % d'utilisation CPU."""
        try:
            import psutil
            return psutil.cpu_percent(interval=0.1)
        except Exception:
            return 0.0

    # Logging

    def _log_device_info(self) -> None:
        info = self._device_info
        logger.info("═" * 50)
        logger.info("Device de calcul sélectionné")
        logger.info("   Type    : %s", info.device_type.upper())
        logger.info("   Nom     : %s", info.device_name)
        logger.info("   GPU     : %s", "TRUE" if info.is_gpu else "FALSE")
        if info.total_memory_mb:
            logger.info("   VRAM    : %.0f Mo", info.total_memory_mb)
        if info.compute_capability:
            logger.info("   CUDA    : sm_%s", info.compute_capability.replace(".", ""))
        logger.info("   FP16    : %s", "TRUE" if info.supports_fp16 else "FALSE")
        logger.info("═" * 50)


@lru_cache(maxsize=1)
def get_device_manager() -> DeviceManager:
    """Retourne le singleton DeviceManager."""
    return DeviceManager()
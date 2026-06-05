"""
Serveur gRPC des AI Services VirtuFit.

Expose les services de génération d\'avatar et de simulation
via le protocole gRPC pour une communication haute performance
avec le Backend NestJS.

"""

import asyncio
from concurrent import futures

import grpc

from app.core.config import get_settings
from app.core.morphology.avatar_service import get_avatar_service
from app.proto import avatar_pb2, avatar_pb2_grpc
from app.schemas.avatar import AvatarGenerationRequest, MeasurementsInput, GenderEnum
from app.utils.logger import get_logger

logger   = get_logger(__name__)
settings = get_settings()


class AvatarServicer(avatar_pb2_grpc.AvatarServiceServicer):
    """
    Implémentation gRPC du service d'avatar.
    Délègue au AvatarService existant.
    """

    def __init__(self) -> None:
        self._service = get_avatar_service()

    def GenerateAvatar(
        self,
        request: avatar_pb2.AvatarGenerationRequest,
        context: grpc.ServicerContext,
    ) -> avatar_pb2.AvatarGenerationResponse:
        """Génère un avatar depuis les mensurations reçues via gRPC."""
        try:
            m = request.measurements

            measurements = MeasurementsInput(
                height_cm=m.height_cm,
                weight_kg=m.weight_kg,
                chest_cm=m.chest_cm,
                waist_cm=m.waist_cm,
                hips_cm=m.hips_cm,
                shoulder_width_cm=m.shoulder_width_cm,
                inseam_cm=m.inseam_cm     or None,
                neck_cm=m.neck_cm         or None,
                arm_length_cm=m.arm_length_cm or None,
                thigh_cm=m.thigh_cm       or None,
                gender=GenderEnum(m.gender) if m.gender else GenderEnum.NEUTRAL,
            )

            avatar_request = AvatarGenerationRequest(
                user_id=request.user_id,
                measurements=measurements,
            )

            result = self._service.generate_avatar(avatar_request)

            return avatar_pb2.AvatarGenerationResponse(
                avatar_id=result.avatar_id,
                user_id=result.user_id,
                smpl=avatar_pb2.SMPLParameters(
                    betas=result.smpl_parameters.betas,
                    thetas=result.smpl_parameters.thetas,
                ),
                mesh=avatar_pb2.MeshMetadata(
                    mesh_reference=result.mesh.mesh_reference,
                    mesh_format=result.mesh.mesh_format,
                    vertices_count=result.mesh.vertices_count,
                    faces_count=result.mesh.faces_count,
                ),
                bmi=result.bmi,
                generation_ms=result.generation_time_ms,
            )

        except Exception as exc:
            logger.error("gRPC GenerateAvatar error: %s", exc)
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(exc))
            return avatar_pb2.AvatarGenerationResponse()

    def GetAvatar(
        self,
        request: avatar_pb2.GetAvatarRequest,
        context: grpc.ServicerContext,
    ) -> avatar_pb2.AvatarData:
        """Non implémenté dans cette version — nécessite accès MongoDB."""
        context.set_code(grpc.StatusCode.UNIMPLEMENTED)
        context.set_details("GetAvatar sera implémenté avec MongoDB.")
        return avatar_pb2.AvatarData()

    def StreamAvatarUpdates(self, request, context):
        """Non implémenté dans cette version."""
        context.set_code(grpc.StatusCode.UNIMPLEMENTED)
        return iter([])


def serve_grpc() -> None:
    """Démarre le serveur gRPC sur le port configuré."""
    host = settings.grpc_host
    port = settings.grpc_port
    addr = f"{host}:{port}"

    server = grpc.server(
        futures.ThreadPoolExecutor(max_workers=10),
        options=[
            ("grpc.max_send_message_length",    50 * 1024 * 1024),
            ("grpc.max_receive_message_length",  50 * 1024 * 1024),
        ],
    )

    avatar_pb2_grpc.add_AvatarServiceServicer_to_server(
        AvatarServicer(), server
    )

    server.add_insecure_port(addr)
    server.start()
    logger.info("Serveur gRPC démarré sur %s", addr)

    return server
export interface AiSmplParameters {
  betas: number[];
  thetas: number[];
}

export interface AiAvatarMesh {
  vertices_count: number;
  faces_count: number;
  mesh_format: string;
  mesh_reference: string;
}

export interface AiAvatarResponse {
  user_id: string;
  avatar_id: string;

  smpl_parameters: AiSmplParameters;

  mesh: AiAvatarMesh;

  bmi: number;

  generation_time_ms: number;
}

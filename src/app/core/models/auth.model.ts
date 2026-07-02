// Roles must match GridPulse.Domain.Enums.UserRole
export type UserRole = 'Admin' | 'Viewer';

export interface LoginRequest {
  username: string;
  password: string;
}

// Mirrors GridPulse.Application.Auth.Dtos.AuthResponseDto
export interface AuthResponse {
  token: string;
  username: string;
  role: UserRole;
  expiresAtUtc: string;
}

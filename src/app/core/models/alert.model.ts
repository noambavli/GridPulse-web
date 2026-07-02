// Mirrors GridPulse.Application.Alerts.Dtos.AlertDto
export interface Alert {
  id: string;
  deviceId: string;
  type: string;
  severity: string;
  message: string;
  triggeredAt: string;
  resolvedAt: string | null;
  isResolved: boolean;
}

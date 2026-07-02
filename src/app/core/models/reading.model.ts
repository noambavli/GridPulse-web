// Mirrors GridPulse.Application.Readings.Dtos.ReadingDto
export interface Reading {
  id: string;
  deviceId: string;
  timestamp: string;
  consumptionKwh: number;
  voltage: number;
  current: number;
  powerFactor: number;
}

// Mirrors GridPulse.Application.Readings.Dtos.ConsumptionBucketDto
export interface ConsumptionBucket {
  periodStart: string;
  totalKwh: number;
  averageKwh: number;
  peakKwh: number;
  readingCount: number;
}

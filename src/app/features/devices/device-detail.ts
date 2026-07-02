import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  Component,
  ElementRef,
  OnDestroy,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { RealtimeService } from '../../core/services/realtime.service';
import { ConsumptionBucket, Device, Reading } from '../../core/models';

Chart.register(...registerables);

@Component({
  selector: 'app-device-detail',
  imports: [RouterLink],
  templateUrl: './device-detail.html',
  styleUrl: './device-detail.scss',
})
export class DeviceDetail implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiService);
  private readonly realtime = inject(RealtimeService);

  private readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('chart');
  private chart: Chart | null = null;

  // Plain mirror of the charted buckets so live updates don't retrigger a full re-render.
  private chartBuckets: ConsumptionBucket[] = [];

  private readonly deviceId = this.route.snapshot.paramMap.get('id') ?? '';

  protected readonly device = signal<Device | null>(null);
  protected readonly buckets = signal<ConsumptionBucket[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly connected = this.realtime.connected;

  constructor() {
    // No single-device endpoint, so pull the list and pick the one we need.
    forkJoin({
      devices: this.api.getDevices(),
      buckets: this.api.getHourlyConsumption(this.deviceId),
    }).subscribe({
      next: ({ devices, buckets }) => {
        this.device.set(devices.find((d) => d.id === this.deviceId) ?? null);
        this.buckets.set(buckets);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load device data.');
        this.loading.set(false);
      },
    });

    // Draw once both canvas and initial data are ready.
    effect(() => {
      const canvas = this.canvasRef();
      const buckets = this.buckets();
      if (canvas && buckets.length > 0) {
        this.renderChart(canvas.nativeElement, buckets);
      }
    });

    // Live readings fold into the current hour's bucket.
    void this.realtime.ensureStarted();
    this.realtime.readings$.pipe(takeUntilDestroyed()).subscribe((reading) => {
      if (reading.deviceId === this.deviceId) {
        this.applyLiveReading(reading);
      }
    });
  }

  private renderChart(canvas: HTMLCanvasElement, buckets: ConsumptionBucket[]): void {
    this.chart?.destroy();
    this.chartBuckets = [...buckets];
    this.chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: this.chartBuckets.map((b) => this.label(b.periodStart)),
        datasets: [
          {
            label: 'Total kWh',
            data: this.chartBuckets.map((b) => b.totalKwh),
            borderColor: '#2563eb',
            backgroundColor: 'rgba(37, 99, 235, 0.15)',
            fill: true,
            tension: 0.3,
            pointRadius: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { maxTicksLimit: 8, color: '#94a3b8' }, grid: { display: false } },
          y: { beginAtZero: true, ticks: { color: '#94a3b8' }, grid: { color: '#e2e8f0' } },
        },
      },
    });
  }

  private applyLiveReading(reading: Reading): void {
    if (!this.chart) {
      return;
    }

    const hourStart = this.floorToHour(reading.timestamp);
    const last = this.chartBuckets.at(-1);

    if (last && new Date(last.periodStart).getTime() === hourStart.getTime()) {
      // Same hour: accumulate into the existing bucket / last point.
      last.totalKwh = Math.round((last.totalKwh + reading.consumptionKwh) * 10000) / 10000;
      last.peakKwh = Math.max(last.peakKwh, reading.consumptionKwh);
      last.readingCount += 1;
      const data = this.chart.data.datasets[0].data as number[];
      data[data.length - 1] = last.totalKwh;
    } else {
      // New hour: start a fresh bucket / point.
      const bucket: ConsumptionBucket = {
        periodStart: hourStart.toISOString(),
        totalKwh: reading.consumptionKwh,
        averageKwh: reading.consumptionKwh,
        peakKwh: reading.consumptionKwh,
        readingCount: 1,
      };
      this.chartBuckets.push(bucket);
      this.chart.data.labels?.push(this.label(bucket.periodStart));
      (this.chart.data.datasets[0].data as number[]).push(bucket.totalKwh);
    }

    this.chart.update();
  }

  private floorToHour(timestamp: string): Date {
    const date = new Date(timestamp);
    date.setMinutes(0, 0, 0);
    return date;
  }

  private label(periodStart: string): string {
    return new Date(periodStart).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
    });
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }
}

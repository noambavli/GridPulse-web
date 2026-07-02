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
import { ConsumptionBucket, Device } from '../../core/models';

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

  private readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('chart');
  private chart: Chart | null = null;

  protected readonly device = signal<Device | null>(null);
  protected readonly buckets = signal<ConsumptionBucket[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  constructor() {
    const id = this.route.snapshot.paramMap.get('id') ?? '';

    // No single-device endpoint, so pull the list and pick the one we need.
    forkJoin({
      devices: this.api.getDevices(),
      buckets: this.api.getHourlyConsumption(id),
    }).subscribe({
      next: ({ devices, buckets }) => {
        this.device.set(devices.find((d) => d.id === id) ?? null);
        this.buckets.set(buckets);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load device data.');
        this.loading.set(false);
      },
    });

    // Draw (or redraw) once both the canvas and data are available.
    effect(() => {
      const canvas = this.canvasRef();
      const buckets = this.buckets();
      if (canvas && buckets.length > 0) {
        this.renderChart(canvas.nativeElement, buckets);
      }
    });
  }

  private renderChart(canvas: HTMLCanvasElement, buckets: ConsumptionBucket[]): void {
    this.chart?.destroy();
    this.chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: buckets.map((b) =>
          new Date(b.periodStart).toLocaleString([], {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
          }),
        ),
        datasets: [
          {
            label: 'Total kWh',
            data: buckets.map((b) => b.totalKwh),
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
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { maxTicksLimit: 8, color: '#94a3b8' }, grid: { display: false } },
          y: { beginAtZero: true, ticks: { color: '#94a3b8' }, grid: { color: '#e2e8f0' } },
        },
      },
    });
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }
}

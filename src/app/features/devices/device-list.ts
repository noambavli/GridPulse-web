import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { Device } from '../../core/models';

@Component({
  selector: 'app-device-list',
  imports: [RouterLink, DatePipe],
  templateUrl: './device-list.html',
  styleUrl: './device-list.scss',
})
export class DeviceList {
  private readonly api = inject(ApiService);

  protected readonly devices = signal<Device[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  constructor() {
    this.api.getDevices().subscribe({
      next: (devices) => {
        this.devices.set(devices);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load devices.');
        this.loading.set(false);
      },
    });
  }
}

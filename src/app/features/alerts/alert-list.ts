import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { Alert } from '../../core/models';

@Component({
  selector: 'app-alert-list',
  imports: [DatePipe],
  templateUrl: './alert-list.html',
  styleUrl: './alert-list.scss',
})
export class AlertList {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  protected readonly isAdmin = this.auth.isAdmin;

  protected readonly alerts = signal<Alert[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly resolvingId = signal<string | null>(null);

  private readonly severity = signal('');
  private readonly status = signal('');

  constructor() {
    this.load();
  }

  onSeverityChange(value: string): void {
    this.severity.set(value);
    this.load();
  }

  onStatusChange(value: string): void {
    this.status.set(value);
    this.load();
  }

  resolve(id: string): void {
    this.resolvingId.set(id);
    this.error.set(null);
    this.api.resolveAlert(id).subscribe({
      next: () => {
        this.resolvingId.set(null);
        this.load();
      },
      error: () => {
        this.resolvingId.set(null);
        this.error.set('Failed to resolve alert.');
      },
    });
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(null);

    const filters: { severity?: string; isResolved?: boolean } = {};
    if (this.severity()) filters.severity = this.severity();
    if (this.status()) filters.isResolved = this.status() === 'resolved';

    this.api.getAlerts(filters).subscribe({
      next: (alerts) => {
        this.alerts.set(alerts);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load alerts.');
        this.loading.set(false);
      },
    });
  }
}

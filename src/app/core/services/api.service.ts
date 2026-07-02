import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Alert, ConsumptionBucket, Device, Reading } from '../models';

// Thin wrapper over the GridPulse REST API. Auth headers are added by the interceptor.
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  getDevices(): Observable<Device[]> {
    return this.http.get<Device[]>(`${this.baseUrl}/devices`);
  }

  getReadings(
    deviceId: string,
    options?: { from?: string; to?: string; maxResults?: number },
  ): Observable<Reading[]> {
    let params = new HttpParams();
    if (options?.from) params = params.set('from', options.from);
    if (options?.to) params = params.set('to', options.to);
    if (options?.maxResults != null) params = params.set('maxResults', options.maxResults);
    return this.http.get<Reading[]>(`${this.baseUrl}/readings/${deviceId}`, { params });
  }

  getHourlyConsumption(
    deviceId: string,
    options?: { from?: string; to?: string },
  ): Observable<ConsumptionBucket[]> {
    let params = new HttpParams();
    if (options?.from) params = params.set('from', options.from);
    if (options?.to) params = params.set('to', options.to);
    return this.http.get<ConsumptionBucket[]>(`${this.baseUrl}/readings/${deviceId}/hourly`, {
      params,
    });
  }

  getAlerts(filters?: {
    deviceId?: string;
    severity?: string;
    isResolved?: boolean;
  }): Observable<Alert[]> {
    let params = new HttpParams();
    if (filters?.deviceId) params = params.set('deviceId', filters.deviceId);
    if (filters?.severity) params = params.set('severity', filters.severity);
    if (filters?.isResolved != null) params = params.set('isResolved', filters.isResolved);
    return this.http.get<Alert[]>(`${this.baseUrl}/alerts`, { params });
  }

  // Admin-only on the server; 403 for viewers.
  resolveAlert(id: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/alerts/${id}/resolve`, {});
  }
}

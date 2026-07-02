import { Injectable, inject, signal } from '@angular/core';
import {
  HubConnection,
  HubConnectionBuilder,
  LogLevel,
} from '@microsoft/signalr';
import { Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Alert, Reading } from '../models';
import { AuthService } from './auth.service';

// Wraps the SignalR hub connection and re-exposes its events as RxJS streams.
@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private readonly auth = inject(AuthService);
  private connection: HubConnection | null = null;

  private readonly readingSubject = new Subject<Reading>();
  private readonly alertSubject = new Subject<Alert>();

  readonly readings$ = this.readingSubject.asObservable();
  readonly alerts$ = this.alertSubject.asObservable();
  readonly connected = signal(false);

  // Idempotent: the first caller opens the connection, later callers reuse it.
  async ensureStarted(): Promise<void> {
    if (this.connection) {
      return;
    }

    this.connection = new HubConnectionBuilder()
      // JWT goes on the query string; browsers can't set headers on the WS handshake.
      .withUrl(environment.hubUrl, { accessTokenFactory: () => this.auth.token ?? '' })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();

    this.connection.on('ReadingReceived', (reading: Reading) => this.readingSubject.next(reading));
    this.connection.on('AlertRaised', (alert: Alert) => this.alertSubject.next(alert));
    this.connection.onreconnected(() => this.connected.set(true));
    this.connection.onclose(() => this.connected.set(false));

    try {
      await this.connection.start();
      this.connected.set(true);
    } catch {
      this.connected.set(false);
    }
  }

  async stop(): Promise<void> {
    await this.connection?.stop();
    this.connection = null;
    this.connected.set(false);
  }
}

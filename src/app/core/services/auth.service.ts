import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, LoginRequest, UserRole } from '../models';

const STORAGE_KEY = 'gridpulse.auth';

// Holds the JWT session in a signal (and localStorage) and exposes role-based state.
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  private readonly session = signal<AuthResponse | null>(this.readStoredSession());

  readonly currentUser = this.session.asReadonly();
  readonly isAuthenticated = computed(() => this.session() !== null && !this.isExpired());
  readonly role = computed<UserRole | null>(() => this.session()?.role ?? null);
  readonly isAdmin = computed(() => this.role() === 'Admin');

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/auth/login`, credentials)
      .pipe(tap((response) => this.setSession(response)));
  }

  logout(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.session.set(null);
  }

  get token(): string | null {
    return this.session()?.token ?? null;
  }

  private setSession(response: AuthResponse): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(response));
    this.session.set(response);
  }

  private readStoredSession(): AuthResponse | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthResponse;
    } catch {
      return null;
    }
  }

  private isExpired(): boolean {
    const expiry = this.session()?.expiresAtUtc;
    if (!expiry) return true;
    return new Date(expiry).getTime() <= Date.now();
  }
}

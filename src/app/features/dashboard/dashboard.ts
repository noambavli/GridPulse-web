import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

// Placeholder shell — the device list and charts are added in later steps.
@Component({
  selector: 'app-dashboard',
  imports: [],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly user = this.auth.currentUser;
  protected readonly isAdmin = this.auth.isAdmin;

  logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}

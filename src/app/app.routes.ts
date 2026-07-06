import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/login/login').then((m) => m.Login),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
    children: [
      {
        path: '',
        loadComponent: () => import('./features/devices/device-list').then((m) => m.DeviceList),
      },
      {
        path: 'devices/:id',
        loadComponent: () => import('./features/devices/device-detail').then((m) => m.DeviceDetail),
      },
      {
        path: 'alerts',
        loadComponent: () => import('./features/alerts/alert-list').then((m) => m.AlertList),
      },
      {
        path: 'assistant',
        loadComponent: () => import('./features/assistant/assistant').then((m) => m.Assistant),
      },
    ],
  },
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: '**', redirectTo: 'dashboard' },
];

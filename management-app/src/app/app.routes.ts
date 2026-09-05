import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/register.page').then((m) => m.RegisterPage),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/shell.component').then((m) => m.ShellComponent),
    children: [
      {
        path: '',
        loadComponent: () => import('./features/dashboard/home.page').then((m) => m.HomePage),
      },
      {
        path: 'activas',
        loadComponent: () =>
          import('./features/active/active-votings.page').then((m) => m.ActiveVotingsPage),
      },
      {
        path: 'votaciones',
        loadComponent: () =>
          import('./features/votings/votings-list.page').then((m) => m.VotingsListPage),
      },
      {
        path: 'votaciones/nueva',
        loadComponent: () =>
          import('./features/votings/voting-form.page').then((m) => m.VotingFormPage),
      },
      {
        path: 'votaciones/:id',
        loadComponent: () =>
          import('./features/votings/voting-form.page').then((m) => m.VotingFormPage),
      },
      {
        path: 'items',
        loadComponent: () =>
          import('./features/items/items-list.page').then((m) => m.ItemsListPage),
      },
      {
        path: 'items/nuevo',
        loadComponent: () => import('./features/items/item-form.page').then((m) => m.ItemFormPage),
      },
      {
        path: 'items/:id',
        loadComponent: () => import('./features/items/item-form.page').then((m) => m.ItemFormPage),
      },
      {
        path: 'puntos',
        loadComponent: () =>
          import('./features/voting-points/points-list.page').then((m) => m.PointsListPage),
      },
      {
        path: 'puntos/nuevo',
        loadComponent: () =>
          import('./features/voting-points/point-form.page').then((m) => m.PointFormPage),
      },
      {
        path: 'puntos/:id',
        loadComponent: () =>
          import('./features/voting-points/point-form.page').then((m) => m.PointFormPage),
      },
      {
        path: 'estadisticas',
        loadComponent: () =>
          import('./features/stats/stats-list.page').then((m) => m.StatsListPage),
      },
      {
        path: 'estadisticas/:id',
        loadComponent: () =>
          import('./features/stats/stats-detail.page').then((m) => m.StatsDetailPage),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];

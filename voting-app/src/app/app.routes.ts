import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: 'p/:code', loadComponent: () => import('./pages/vote.page').then((m) => m.VotePage) },
  { path: '**', loadComponent: () => import('./pages/not-found.page').then((m) => m.NotFoundPage) },
];

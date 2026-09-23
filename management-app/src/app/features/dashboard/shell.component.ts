import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../core/auth.service';
import { ICONS } from '../../shared/icons';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LucideAngularModule],
  template: `
    <div class="shell" [class.open]="menuOpen()">
      <aside class="sidebar">
        <div class="brand">
          <img class="logo" src="favicon.svg" alt="" />
          <span>Krate</span>
          <button
            type="button"
            class="btn btn-ghost btn-icon only-mobile"
            (click)="menuOpen.set(false)"
            aria-label="Cerrar menú"
          >
            <lucide-icon [img]="icons.close" [size]="20" />
          </button>
        </div>
        <nav>
          @for (link of links; track link.path) {
            <a
              [routerLink]="link.path"
              routerLinkActive="active"
              [routerLinkActiveOptions]="{ exact: link.path === '/' }"
              (click)="menuOpen.set(false)"
            >
              <lucide-icon [img]="link.icon" [size]="18" />
              <span>{{ link.label }}</span>
            </a>
          }
        </nav>
        <div class="user">
          <div class="avatar"><lucide-icon [img]="icons.user" [size]="16" /></div>
          <div class="who">
            <div class="truncate">{{ auth.user()?.name }}</div>
            <div class="muted small truncate">{{ auth.user()?.email }}</div>
          </div>
          <button
            type="button"
            class="btn btn-ghost btn-icon"
            (click)="auth.logout()"
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
          >
            <lucide-icon [img]="icons.logout" [size]="18" />
          </button>
        </div>
      </aside>
      <div class="backdrop only-mobile" (click)="menuOpen.set(false)"></div>
      <main>
        <div class="topbar only-mobile">
          <button
            type="button"
            class="btn btn-ghost btn-icon"
            (click)="menuOpen.set(true)"
            aria-label="Abrir menú"
          >
            <lucide-icon [img]="icons.menu" [size]="22" />
          </button>
          <img class="logo-sm" src="favicon.svg" alt="" />
          <span class="brand-sm">Krate</span>
        </div>
        <div class="content">
          <router-outlet />
        </div>
      </main>
    </div>
  `,
  styles: `
    .shell {
      display: grid;
      grid-template-columns: 240px 1fr;
      min-height: 100dvh;
    }
    .sidebar {
      background: var(--surface);
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      padding: 1rem 0.75rem;
      position: sticky;
      top: 0;
      height: 100dvh;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      font-weight: 700;
      font-size: 1.1rem;
      padding: 0.25rem 0.5rem 1rem;
    }
    .brand .only-mobile {
      margin-left: auto;
    }
    .logo {
      width: 32px;
      height: 32px;
    }
    nav {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
      flex: 1;
    }
    nav a {
      display: flex;
      align-items: center;
      gap: 0.7rem;
      padding: 0.6rem 0.75rem;
      border-radius: var(--radius-sm);
      color: var(--text-2);
      font-weight: 500;
      text-decoration: none;
    }
    nav a:hover {
      background: var(--surface-2);
      color: var(--text);
      text-decoration: none;
    }
    nav a.active {
      background: var(--primary-soft);
      color: var(--primary);
    }
    .user {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.6rem 0.5rem 0;
      border-top: 1px solid var(--border);
      font-size: 0.9rem;
    }
    .who {
      flex: 1;
      min-width: 0;
    }
    .avatar {
      display: grid;
      place-items: center;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--surface-2);
      color: var(--text-2);
      flex-shrink: 0;
    }
    main {
      min-width: 0;
    }
    .content {
      padding: 2rem;
      max-width: 1200px;
    }
    .topbar {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.6rem 1rem;
      background: var(--surface);
      border-bottom: 1px solid var(--border);
    }
    .logo-sm {
      width: 26px;
      height: 26px;
    }
    .brand-sm {
      font-weight: 700;
    }
    .only-mobile {
      display: none;
    }
    .backdrop {
      position: fixed;
      inset: 0;
      background: rgba(20, 24, 40, 0.45);
      z-index: 40;
    }
    @media (max-width: 860px) {
      .shell {
        grid-template-columns: 1fr;
      }
      .only-mobile {
        display: inline-flex;
      }
      .topbar.only-mobile {
        display: flex;
      }
      .sidebar {
        position: fixed;
        z-index: 50;
        left: 0;
        top: 0;
        width: 260px;
        transform: translateX(-100%);
        transition: transform 0.2s;
      }
      .shell.open .sidebar {
        transform: none;
      }
      .backdrop {
        display: none;
      }
      .shell.open .backdrop {
        display: block;
      }
      .content {
        padding: 1.25rem;
      }
    }
  `,
})
export class ShellComponent {
  readonly auth = inject(AuthService);
  readonly icons = ICONS;
  readonly menuOpen = signal(false);
  readonly links = [
    { path: '/', label: 'Inicio', icon: ICONS.dashboard },
    { path: '/activas', label: 'Votaciones activas', icon: ICONS.live },
    { path: '/votaciones', label: 'Votaciones', icon: ICONS.voting },
    { path: '/items', label: 'Items', icon: ICONS.item },
    { path: '/puntos', label: 'Puntos de votación', icon: ICONS.point },
    { path: '/estadisticas', label: 'Estadísticas', icon: ICONS.stats },
  ];
}

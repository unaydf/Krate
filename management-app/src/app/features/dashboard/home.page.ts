import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { describeError } from '../../core/errors';
import { Instance, InstanceStatsSummary, Item, Voting, VotingPoint } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { ICONS } from '../../shared/icons';
import { LoadingComponent } from '../../shared/loading.component';
import { PageHeaderComponent } from '../../shared/page-header.component';

@Component({
  selector: 'app-home-page',
  imports: [DatePipe, RouterLink, LucideAngularModule, PageHeaderComponent, LoadingComponent],
  template: `
    <app-page-header [title]="greeting()" subtitle="Resumen de tu plataforma de votaciones" />

    @if (loading()) {
      <app-loading />
    } @else {
      <div class="tiles">
        <a routerLink="/activas" class="tile primary">
          <span class="tile-icon"><lucide-icon [img]="icons.live" [size]="26" /></span>
          <span class="tile-num">{{ active().length }}</span>
          <span class="tile-title">Votaciones activas</span>
          <span class="tile-desc">Lanzar y detener votaciones en los puntos</span>
        </a>
        <a routerLink="/votaciones" class="tile">
          <span class="tile-icon"><lucide-icon [img]="icons.voting" [size]="26" /></span>
          <span class="tile-num">{{ votings().length }}</span>
          <span class="tile-title">Votaciones</span>
          <span class="tile-desc">Crear y editar votaciones y sus items</span>
        </a>
        <a routerLink="/items" class="tile">
          <span class="tile-icon"><lucide-icon [img]="icons.item" [size]="26" /></span>
          <span class="tile-num">{{ items().length }}</span>
          <span class="tile-title">Items</span>
          <span class="tile-desc">Opciones votables con imagen</span>
        </a>
        <a routerLink="/puntos" class="tile">
          <span class="tile-icon"><lucide-icon [img]="icons.point" [size]="26" /></span>
          <span class="tile-num">{{ points().length }}</span>
          <span class="tile-title">Puntos de votación</span>
          <span class="tile-desc">{{ withVoting() }} con votación asignada</span>
        </a>
        <a routerLink="/estadisticas" class="tile">
          <span class="tile-icon"><lucide-icon [img]="icons.stats" [size]="26" /></span>
          <span class="tile-num">{{ finished().length }}</span>
          <span class="tile-title">Estadísticas</span>
          <span class="tile-desc">{{ totalBallots() }} participaciones en total</span>
        </a>
      </div>

      <div class="grid layout" style="margin-top: 1.25rem">
        <section class="card">
          <div class="card-header">
            <h2 class="row">
              <lucide-icon [img]="icons.live" [size]="18" class="live" /> En marcha ahora
            </h2>
            <a routerLink="/activas" class="btn btn-ghost btn-sm">Gestionar</a>
          </div>
          @if (active().length === 0) {
            <div class="card-body muted">
              No hay ninguna votación activa.
              <a routerLink="/activas">Lanzar una votación</a>
            </div>
          } @else {
            <ul class="list">
              @for (i of active(); track i.id) {
                <li>
                  <div class="list-main">
                    <strong>{{ i.votingName }}</strong>
                    <span class="muted small"
                      >{{ i.votingPointName }} · desde {{ i.startedAt | date: 'HH:mm' }}</span
                    >
                  </div>
                  <span class="badge badge-success">{{ ballotsOf(i.id) }} participaciones</span>
                  <a
                    [routerLink]="['/estadisticas', i.id]"
                    class="btn btn-ghost btn-sm"
                    aria-label="Ver resultados"
                  >
                    <lucide-icon [img]="icons.stats" [size]="15" />
                  </a>
                </li>
              }
            </ul>
          }
        </section>

        <section class="card">
          <div class="card-header">
            <h2 class="row"><lucide-icon [img]="icons.clock" [size]="18" /> Últimos resultados</h2>
            <a routerLink="/estadisticas" class="btn btn-ghost btn-sm">Ver todos</a>
          </div>
          @if (recentFinished().length === 0) {
            <div class="card-body muted">Todavía no hay votaciones finalizadas.</div>
          } @else {
            <ul class="list">
              @for (r of recentFinished(); track r.id) {
                <li>
                  <div class="list-main">
                    <strong>{{ r.votingName }}</strong>
                    <span class="muted small"
                      >{{ r.votingPointName }} · {{ r.endedAt | date: 'd MMM, HH:mm' }}</span
                    >
                  </div>
                  <span class="badge badge-neutral">{{ r.totalVotes }} participaciones</span>
                  <a
                    [routerLink]="['/estadisticas', r.id]"
                    class="btn btn-ghost btn-sm"
                    aria-label="Ver resultados"
                  >
                    <lucide-icon [img]="icons.stats" [size]="15" />
                  </a>
                </li>
              }
            </ul>
          }
        </section>
      </div>
    }
  `,
  styles: `
    .tiles {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 1rem;
    }
    @media (min-width: 1180px) {
      .tiles {
        grid-template-columns: repeat(5, 1fr);
      }
    }
    .tile {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      padding: 1.25rem;
      border-radius: var(--radius);
      background: var(--surface);
      border: 1px solid var(--border);
      box-shadow: var(--shadow);
      color: var(--text);
      text-decoration: none !important;
      transition:
        transform 0.12s,
        border-color 0.12s;
      min-height: 160px;
    }
    .tile:hover {
      transform: translateY(-2px);
      border-color: var(--primary);
    }
    .tile.primary {
      background: var(--primary);
      border-color: var(--primary);
      color: #fff;
    }
    .tile.primary .tile-icon {
      background: rgba(255, 255, 255, 0.2);
      color: #fff;
    }
    .tile.primary .tile-desc {
      color: rgba(255, 255, 255, 0.85);
    }
    .tile-icon {
      display: grid;
      place-items: center;
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: var(--primary-soft);
      color: var(--primary-text);
      margin-bottom: 0.5rem;
    }
    .tile-num {
      font-size: 2rem;
      font-weight: 800;
      line-height: 1.1;
    }
    .tile-title {
      font-weight: 700;
      font-size: 1.05rem;
    }
    .tile-desc {
      font-size: 0.85rem;
      color: var(--text-2);
    }
    .layout {
      grid-template-columns: 1fr 1fr;
    }
    .live {
      color: var(--primary);
    }
    .list {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .list li {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.8rem 1.25rem;
      border-bottom: 1px solid var(--border);
    }
    .list li:last-child {
      border-bottom: 0;
    }
    .list-main {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
    }
    @media (max-width: 960px) {
      .layout {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class HomePage {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  readonly icons = ICONS;

  readonly loading = signal(true);
  readonly points = signal<VotingPoint[]>([]);
  readonly votings = signal<Voting[]>([]);
  readonly items = signal<Item[]>([]);
  readonly active = signal<Instance[]>([]);
  readonly stats = signal<InstanceStatsSummary[]>([]);

  readonly greeting = computed(() => {
    const name = this.auth.user()?.name?.split(' ')[0];
    return name ? `Hola, ${name}` : 'Inicio';
  });
  readonly withVoting = computed(() => this.points().filter((p) => p.voting).length);
  readonly finished = computed(() => this.stats().filter((s) => s.status === 'CLOSED'));
  readonly recentFinished = computed(() => this.finished().slice(0, 4));
  readonly totalBallots = computed(() => this.stats().reduce((acc, s) => acc + s.totalVotes, 0));

  constructor() {
    void this.load();
  }

  ballotsOf(instanceId: number): number {
    return this.stats().find((s) => s.id === instanceId)?.totalVotes ?? 0;
  }

  private async load(): Promise<void> {
    try {
      const [points, votings, items, active, stats] = await Promise.all([
        this.api.listPoints(),
        this.api.listVotings(),
        this.api.listItems(),
        this.api.listInstances('ACTIVE'),
        this.api.listStats(),
      ]);
      this.points.set(points);
      this.votings.set(votings);
      this.items.set(items);
      this.active.set(active);
      this.stats.set(stats);
    } catch (err) {
      this.toast.error(describeError(err).message);
    } finally {
      this.loading.set(false);
    }
  }
}

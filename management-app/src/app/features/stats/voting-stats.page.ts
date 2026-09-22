import { Component, DestroyRef, OnInit, computed, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ApiService } from '../../core/api.service';
import { describeError } from '../../core/errors';
import { VotingStatsDetail } from '../../core/models';
import { votingTypeIcon, votingTypeLabel } from '../../core/voting-types';
import { ToastService } from '../../core/toast.service';
import { ICONS } from '../../shared/icons';
import { LoadingComponent } from '../../shared/loading.component';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { ResultsListComponent } from '../../shared/results-list.component';

const REFRESH_MS = 5000;

/** Resultados agregados de una votación (todos sus lanzamientos), con filtro por punto. */
@Component({
  selector: 'app-voting-stats-page',
  imports: [
    DatePipe,
    FormsModule,
    RouterLink,
    LucideAngularModule,
    PageHeaderComponent,
    LoadingComponent,
    ResultsListComponent,
  ],
  template: `
    <app-page-header title="Resultados de la votación" [subtitle]="subtitle()">
      <a routerLink="/estadisticas" class="btn btn-secondary"
        ><lucide-icon [img]="icons.back" [size]="16" /> Volver</a
      >
    </app-page-header>

    @if (!data()) {
      <app-loading />
    } @else if (data(); as d) {
      <div class="card card-body filters">
        <span class="muted small row"
          ><lucide-icon [img]="icons.filter" [size]="14" /> Filtrar</span
        >
        <div class="field">
          <label for="point">Punto de votación</label>
          <select id="point" class="select" [(ngModel)]="pointId" (ngModelChange)="load()">
            <option [ngValue]="null">Todos los puntos</option>
            @for (p of d.points; track p.id) {
              <option [ngValue]="p.id">{{ p.name }}</option>
            }
          </select>
        </div>
      </div>

      <div class="grid summary">
        <div class="card card-body">
          <span class="muted small">Votación</span><strong>{{ d.votingName }}</strong>
          <span class="row">
            <span class="badge badge-neutral">
              <lucide-icon [img]="typeIcon(d.type)" [size]="12" />
              {{ typeLabel(d.type, d.maxSelections) }}
            </span>
            @if (d.votingDeleted) {
              <span class="badge badge-neutral">Votación eliminada</span>
            }
          </span>
        </div>
        <div class="card card-body">
          <span class="muted small">Punto</span><strong>{{ pointName() }}</strong>
        </div>
        <div class="card card-body">
          <span class="muted small">Lanzamientos</span
          ><strong class="big">{{ d.instanceCount }}</strong>
          @if (anyActive()) {
            <span class="badge badge-success" style="align-self: flex-start"
              ><lucide-icon [img]="icons.live" [size]="12" /> En marcha · se actualiza cada 5
              s</span
            >
          }
        </div>
        <div class="card card-body">
          <span class="muted small">Participaciones</span
          ><strong class="big">{{ d.totalVotes }}</strong>
        </div>
      </div>

      <section class="card" style="margin-top: 1rem">
        <div class="card-header">
          <h2>{{ d.type === 'RANKING' ? 'Puntuación por item' : 'Votos por item' }}</h2>
          <span class="muted small"
            >Suma de {{ d.instanceCount }}
            {{ d.instanceCount === 1 ? 'lanzamiento' : 'lanzamientos' }}</span
          >
        </div>
        <div class="card-body">
          <app-results-list [results]="d.results" [type]="d.type" [scoringLabel]="d.scoringLabel" />
        </div>
      </section>

      <section class="card table-wrap" style="margin-top: 1rem">
        <div class="card-header"><h2>Lanzamientos incluidos</h2></div>
        <table class="table">
          <thead>
            <tr>
              <th>Punto</th>
              <th>Estado</th>
              <th>Inicio</th>
              <th>Fin</th>
              <th style="text-align: right">Votos</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (r of d.instances; track r.id) {
              <tr>
                <td>
                  <strong>{{ r.votingPointName }}</strong>
                </td>
                <td>
                  @if (r.status === 'ACTIVE') {
                    <span class="badge badge-success"
                      ><lucide-icon [img]="icons.live" [size]="12" /> Activa</span
                    >
                  } @else {
                    <span class="badge badge-neutral">Finalizada</span>
                  }
                </td>
                <td class="muted">{{ r.startedAt | date: 'd MMM y, HH:mm' }}</td>
                <td class="muted">{{ r.endedAt ? (r.endedAt | date: 'd MMM y, HH:mm') : '—' }}</td>
                <td style="text-align: right">
                  <strong>{{ r.totalVotes }}</strong>
                </td>
                <td>
                  <div class="actions">
                    <a [routerLink]="['/estadisticas', r.id]" class="btn btn-ghost btn-sm"
                      ><lucide-icon [img]="icons.stats" [size]="15" /> Ver resultados</a
                    >
                  </div>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="6" class="muted">
                  Esta votación no se ha lanzado en el punto elegido.
                </td>
              </tr>
            }
          </tbody>
        </table>
      </section>
    }
  `,
  styles: `
    .filters {
      display: flex;
      align-items: flex-end;
      gap: 1rem;
      flex-wrap: wrap;
      margin-bottom: 1rem;
    }
    .filters .row {
      align-self: center;
    }
    .filters .field {
      margin: 0;
      flex: 1;
      max-width: 360px;
    }
    .summary {
      grid-template-columns: repeat(4, 1fr);
    }
    .summary .card-body {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .big {
      font-size: 1.6rem;
    }
    @media (max-width: 960px) {
      .summary {
        grid-template-columns: repeat(2, 1fr);
      }
    }
  `,
})
export class VotingStatsPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  readonly icons = ICONS;

  readonly id = input.required<string>();
  readonly data = signal<VotingStatsDetail | null>(null);
  readonly typeLabel = votingTypeLabel;
  readonly typeIcon = votingTypeIcon;
  pointId: number | null = null;

  readonly subtitle = computed(() => this.data()?.votingName ?? '');
  readonly pointName = computed(() => {
    const d = this.data();
    if (!d || d.votingPointId === null) return 'Todos';
    return d.points.find((p) => p.id === d.votingPointId)?.name ?? 'Todos';
  });
  readonly anyActive = computed(
    () => this.data()?.instances.some((i) => i.status === 'ACTIVE') ?? false,
  );

  private timer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => this.stopPolling());
  }

  ngOnInit(): void {
    void this.load(true);
  }

  async load(first = false): Promise<void> {
    try {
      const d = await this.api.votingStats(Number(this.id()), this.pointId);
      this.data.set(d);
      const active = d.instances.some((i) => i.status === 'ACTIVE');
      if (active && !this.timer) {
        this.timer = setInterval(() => void this.load(), REFRESH_MS);
      } else if (!active) {
        this.stopPolling();
      }
    } catch (err) {
      this.toast.error(describeError(err).message);
      this.stopPolling();
      if (first) await this.router.navigateByUrl('/estadisticas');
    }
  }

  private stopPolling(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ApiService } from '../../core/api.service';
import { describeError } from '../../core/errors';
import { InstanceStatsSummary, PointRef } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { EmptyStateComponent } from '../../shared/empty-state.component';
import { ICONS } from '../../shared/icons';
import { LoadingComponent } from '../../shared/loading.component';
import { PageHeaderComponent } from '../../shared/page-header.component';

@Component({
  selector: 'app-stats-list-page',
  imports: [
    DatePipe,
    FormsModule,
    RouterLink,
    LucideAngularModule,
    PageHeaderComponent,
    EmptyStateComponent,
    LoadingComponent,
  ],
  template: `
    <app-page-header title="Estadísticas" subtitle="Resultados de cada lanzamiento de votación" />

    @if (loading()) {
      <app-loading />
    } @else if (points().length === 0) {
      <div class="card">
        <app-empty-state
          title="Aún no hay resultados"
          message="Cuando lances una votación, sus resultados aparecerán aquí en tiempo real."
        />
      </div>
    } @else {
      <div class="card card-body filters">
        <span class="muted small row"
          ><lucide-icon [img]="icons.filter" [size]="14" /> Filtrar</span
        >
        <div class="field">
          <label for="point">Punto de votación</label>
          <select id="point" class="select" [(ngModel)]="pointId" (ngModelChange)="reload()">
            <option [ngValue]="null">Todos los puntos</option>
            @for (p of points(); track p.id) {
              <option [ngValue]="p.id">{{ p.name }}</option>
            }
          </select>
        </div>
        <div class="field">
          <label for="voting">Votación</label>
          <select id="voting" class="select" [(ngModel)]="votingId" (ngModelChange)="reload()">
            <option [ngValue]="null">Todas las votaciones</option>
            @for (v of votings(); track v.id) {
              <option [ngValue]="v.id">{{ v.name }}</option>
            }
          </select>
        </div>
        @if (filtered()) {
          <button type="button" class="btn btn-ghost btn-sm" (click)="clear()">
            <lucide-icon [img]="icons.close" [size]="14" /> Quitar filtros
          </button>
        }
      </div>

      @if (rows().length === 0) {
        <div class="card">
          <app-empty-state
            title="Ningún lanzamiento coincide con el filtro"
            message="Prueba con otro punto u otra votación."
          />
        </div>
      } @else {
        <div class="card table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>Punto</th>
                <th>Votación</th>
                <th>Estado</th>
                <th>Inicio</th>
                <th>Fin</th>
                <th style="text-align: right">Votos</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (r of rows(); track r.id) {
                <tr>
                  <td>
                    <strong>{{ r.votingPointName }}</strong>
                  </td>
                  <td>{{ r.votingName }}</td>
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
                  <td class="muted">
                    {{ r.endedAt ? (r.endedAt | date: 'd MMM y, HH:mm') : '—' }}
                  </td>
                  <td style="text-align: right">
                    <strong>{{ r.totalVotes }}</strong>
                  </td>
                  <td>
                    <div class="actions">
                      <a
                        [routerLink]="['/estadisticas/votaciones', r.votingId]"
                        class="btn btn-ghost btn-sm"
                        title="Resultados agregados de todos los lanzamientos de la votación"
                        ><lucide-icon [img]="icons.voting" [size]="15" /> Por votación</a
                      >
                      <a [routerLink]="['/estadisticas', r.id]" class="btn btn-ghost btn-sm"
                        ><lucide-icon [img]="icons.stats" [size]="15" /> Ver resultados</a
                      >
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
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
      min-width: 200px;
    }
  `,
})
export class StatsListPage {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  readonly icons = ICONS;
  readonly loading = signal(true);
  readonly rows = signal<InstanceStatsSummary[]>([]);
  /** Opciones de los selectores, derivadas de la carga sin filtros (incluyen puntos y votaciones ya borrados). */
  readonly points = signal<PointRef[]>([]);
  readonly votings = signal<PointRef[]>([]);

  pointId: number | null = null;
  votingId: number | null = null;

  filtered(): boolean {
    return this.pointId !== null || this.votingId !== null;
  }

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    try {
      const all = await this.api.listStats();
      this.rows.set(all);
      this.points.set(distinct(all.map((r) => ({ id: r.votingPointId, name: r.votingPointName }))));
      this.votings.set(distinct(all.map((r) => ({ id: r.votingId, name: r.votingName }))));
    } catch (err) {
      this.toast.error(describeError(err).message);
    } finally {
      this.loading.set(false);
    }
  }

  async reload(): Promise<void> {
    try {
      this.rows.set(
        await this.api.listStats({ votingPointId: this.pointId, votingId: this.votingId }),
      );
    } catch (err) {
      this.toast.error(describeError(err).message);
    }
  }

  clear(): void {
    this.pointId = null;
    this.votingId = null;
    void this.reload();
  }
}

function distinct(refs: PointRef[]): PointRef[] {
  const byId = new Map<number, PointRef>();
  for (const r of refs) {
    if (!byId.has(r.id)) byId.set(r.id, r);
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

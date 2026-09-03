import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ApiService } from '../../core/api.service';
import { describeError } from '../../core/errors';
import { InstanceStatsSummary } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { EmptyStateComponent } from '../../shared/empty-state.component';
import { ICONS } from '../../shared/icons';
import { LoadingComponent } from '../../shared/loading.component';
import { PageHeaderComponent } from '../../shared/page-header.component';

@Component({
  selector: 'app-stats-list-page',
  imports: [
    DatePipe,
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
    } @else if (rows().length === 0) {
      <div class="card">
        <app-empty-state
          title="Aún no hay resultados"
          message="Cuando lances una votación, sus resultados aparecerán aquí en tiempo real."
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
            }
          </tbody>
        </table>
      </div>
    }
  `,
})
export class StatsListPage {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  readonly icons = ICONS;
  readonly loading = signal(true);
  readonly rows = signal<InstanceStatsSummary[]>([]);

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    try {
      this.rows.set(await this.api.listStats());
    } catch (err) {
      this.toast.error(describeError(err).message);
    } finally {
      this.loading.set(false);
    }
  }
}

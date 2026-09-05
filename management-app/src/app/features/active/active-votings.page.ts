import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ApiService } from '../../core/api.service';
import { ConfirmService } from '../../core/confirm.service';
import { describeError } from '../../core/errors';
import { Instance, InstanceStatsSummary, VotingPoint } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { votingTypeLabel } from '../../core/voting-types';
import { CopyButtonComponent } from '../../shared/copy-button.component';
import { EmptyStateComponent } from '../../shared/empty-state.component';
import { ICONS } from '../../shared/icons';
import { LoadingComponent } from '../../shared/loading.component';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { QrButtonComponent } from '../../shared/qr-button.component';

/** Instancia activa enriquecida con el número de papeletas de las estadísticas. */
interface ActiveRow extends Instance {
  totalVotes: number;
}

const RECENT_FINISHED = 5;
const REFRESH_MS = 10000;

@Component({
  selector: 'app-active-votings-page',
  imports: [
    DatePipe,
    FormsModule,
    RouterLink,
    LucideAngularModule,
    PageHeaderComponent,
    EmptyStateComponent,
    CopyButtonComponent,
    QrButtonComponent,
    LoadingComponent,
  ],
  template: `
    <app-page-header
      title="Votaciones activas"
      subtitle="Lanza votaciones en tus puntos y detén las que estén en marcha"
    />

    @if (loading()) {
      <app-loading />
    } @else {
      <section class="card launcher">
        <div class="card-body">
          <div class="launch-row">
            <div class="field" style="margin: 0; flex: 1">
              <label for="point">Lanzar votación en un punto</label>
              <select id="point" class="select" [(ngModel)]="selectedPointId">
                <option [ngValue]="null">
                  {{
                    launchable().length
                      ? 'Selecciona un punto de votación…'
                      : 'No hay puntos disponibles para lanzar'
                  }}
                </option>
                @for (p of launchable(); track p.id) {
                  <option [ngValue]="p.id">
                    {{ p.name }} · {{ p.voting?.name }} ({{
                      typeLabel(p.voting!.type, p.voting!.maxSelections)
                    }})
                  </option>
                }
              </select>
            </div>
            <button
              type="button"
              class="btn btn-primary"
              [disabled]="selectedPointId === null || busy()"
              (click)="launch()"
            >
              <lucide-icon [img]="icons.play" [size]="16" /> Lanzar
            </button>
          </div>
          @if (launchable().length === 0) {
            <p class="muted small" style="margin-top: 0.6rem">
              Un punto se puede lanzar si tiene una votación asignada y no está activo.
              <a routerLink="/puntos">Gestionar puntos de votación</a>
            </p>
          }
        </div>
      </section>

      <section class="card" style="margin-top: 1rem">
        <div class="card-header">
          <h2 class="row">
            <lucide-icon [img]="icons.live" [size]="18" class="live" /> En marcha ahora
          </h2>
          <span class="badge badge-success">{{ active().length }}</span>
        </div>
        @if (active().length === 0) {
          <app-empty-state
            title="No hay votaciones activas"
            message="Elige un punto en el selector de arriba para lanzar una."
          />
        } @else {
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th>Punto</th>
                  <th>Votación</th>
                  <th>Inicio</th>
                  <th style="text-align: right">Participaciones</th>
                  <th>Enlace público</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (i of active(); track i.id) {
                  <tr>
                    <td>
                      <strong>{{ i.votingPointName }}</strong>
                    </td>
                    <td>{{ i.votingName }}</td>
                    <td class="muted">{{ i.startedAt | date: 'd MMM, HH:mm' }}</td>
                    <td style="text-align: right">
                      <strong>{{ i.totalVotes }}</strong>
                    </td>
                    <td>
                      <div class="row">
                        <a [href]="i.publicUrl" target="_blank" rel="noopener" class="mono small"
                          >/p/{{ i.code }}</a
                        >
                        <app-copy-button [value]="i.publicUrl" label="Copiar" />
                        <app-qr-button
                          [value]="i.publicUrl"
                          [fileName]="'votacion-' + i.code"
                          [title]="i.votingPointName"
                          [subtitle]="i.votingName"
                        />
                      </div>
                    </td>
                    <td>
                      <div class="actions">
                        <a [routerLink]="['/estadisticas', i.id]" class="btn btn-ghost btn-sm"
                          ><lucide-icon [img]="icons.stats" [size]="15" /> Resultados</a
                        >
                        <button
                          type="button"
                          class="btn btn-danger btn-sm"
                          (click)="stop(i)"
                          [disabled]="busy()"
                        >
                          <lucide-icon [img]="icons.stop" [size]="14" /> Detener
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </section>

      <section class="card" style="margin-top: 1rem">
        <div class="card-header">
          <h2 class="row"><lucide-icon [img]="icons.clock" [size]="18" /> Últimas finalizadas</h2>
          <a routerLink="/estadisticas" class="btn btn-ghost btn-sm">Ver todas</a>
        </div>
        @if (recentFinished().length === 0) {
          <app-empty-state title="Aún no hay votaciones finalizadas" />
        } @else {
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th>Punto</th>
                  <th>Votación</th>
                  <th>Fin</th>
                  <th style="text-align: right">Participaciones</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (r of recentFinished(); track r.id) {
                  <tr>
                    <td>
                      <strong>{{ r.votingPointName }}</strong>
                    </td>
                    <td>{{ r.votingName }}</td>
                    <td class="muted">{{ r.endedAt | date: 'd MMM, HH:mm' }}</td>
                    <td style="text-align: right">
                      <strong>{{ r.totalVotes }}</strong>
                    </td>
                    <td>
                      <div class="actions">
                        <a [routerLink]="['/estadisticas', r.id]" class="btn btn-ghost btn-sm"
                          ><lucide-icon [img]="icons.stats" [size]="15" /> Resultados</a
                        >
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </section>
    }
  `,
  styles: `
    .launch-row {
      display: flex;
      align-items: flex-end;
      gap: 0.75rem;
      flex-wrap: wrap;
    }
    .launch-row .btn {
      min-height: 42px;
    }
    .live {
      color: var(--primary);
    }
  `,
})
export class ActiveVotingsPage {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  readonly icons = ICONS;
  readonly typeLabel = votingTypeLabel;

  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly points = signal<VotingPoint[]>([]);
  readonly active = signal<ActiveRow[]>([]);
  readonly finished = signal<InstanceStatsSummary[]>([]);
  selectedPointId: number | null = null;

  readonly launchable = computed(() => this.points().filter((p) => p.voting && !p.activeInstance));
  readonly recentFinished = computed(() => this.finished().slice(0, RECENT_FINISHED));

  private timer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    void this.load();
    this.timer = setInterval(() => void this.load(true), REFRESH_MS);
    inject(DestroyRef).onDestroy(() => this.timer && clearInterval(this.timer));
  }

  async load(silent = false): Promise<void> {
    try {
      const [points, instances, stats] = await Promise.all([
        this.api.listPoints(),
        this.api.listInstances('ACTIVE'),
        this.api.listStats(),
      ]);
      const totals = new Map(stats.map((s) => [s.id, s.totalVotes]));
      this.points.set(points);
      this.active.set(instances.map((i) => ({ ...i, totalVotes: totals.get(i.id) ?? 0 })));
      this.finished.set(stats.filter((s) => s.status === 'CLOSED'));
      if (
        this.selectedPointId !== null &&
        !this.launchable().some((p) => p.id === this.selectedPointId)
      ) {
        this.selectedPointId = null;
      }
    } catch (err) {
      if (!silent) this.toast.error(describeError(err).message);
    } finally {
      this.loading.set(false);
    }
  }

  async launch(): Promise<void> {
    if (this.selectedPointId === null) return;
    this.busy.set(true);
    try {
      const instance = await this.api.launch(this.selectedPointId);
      this.toast.success(`"${instance.votingName}" lanzada en ${instance.votingPointName}`);
      this.selectedPointId = null;
      await this.load();
    } catch (err) {
      this.toast.error(describeError(err).message);
    } finally {
      this.busy.set(false);
    }
  }

  async stop(instance: Instance): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Detener votación',
      message: `Se detendrá "${instance.votingName}" en ${instance.votingPointName}. El enlace mostrará la pantalla de votación desactivada.`,
      confirmLabel: 'Detener',
      danger: true,
    });
    if (!ok) return;
    this.busy.set(true);
    try {
      await this.api.stop(instance.id);
      this.toast.success('Votación detenida');
      await this.load();
    } catch (err) {
      this.toast.error(describeError(err).message);
    } finally {
      this.busy.set(false);
    }
  }
}

import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ApiService } from '../../core/api.service';
import { ConfirmService } from '../../core/confirm.service';
import { describeError } from '../../core/errors';
import { Instance, VotingPoint } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { CopyButtonComponent } from '../../shared/copy-button.component';
import { QrButtonComponent } from '../../shared/qr-button.component';
import { EmptyStateComponent } from '../../shared/empty-state.component';
import { ICONS } from '../../shared/icons';
import { LoadingComponent } from '../../shared/loading.component';
import { PageHeaderComponent } from '../../shared/page-header.component';

@Component({
  selector: 'app-home-page',
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
    <app-page-header title="Inicio" subtitle="Lanza y detén votaciones en tus puntos de votación" />

    @if (loading()) {
      <app-loading />
    } @else {
      <div class="grid layout">
        <section class="card">
          <div class="card-header"><h2>Lanzar votación</h2></div>
          <div class="card-body">
            @if (launchable().length === 0) {
              <p class="muted">
                No hay puntos disponibles para lanzar. Un punto debe tener una votación asignada y
                no estar activo.
                <a routerLink="/puntos">Gestionar puntos</a>
              </p>
            } @else {
              <div class="field">
                <label for="point">Punto de votación</label>
                <select id="point" class="select" [(ngModel)]="selectedPointId">
                  <option [ngValue]="null">Selecciona un punto…</option>
                  @for (p of launchable(); track p.id) {
                    <option [ngValue]="p.id">{{ p.name }} · {{ p.voting?.name }}</option>
                  }
                </select>
              </div>
              <button
                type="button"
                class="btn btn-primary"
                [disabled]="selectedPointId === null || busy()"
                (click)="launch()"
              >
                <lucide-icon [img]="icons.play" [size]="16" /> Lanzar votación
              </button>
            }
          </div>
        </section>

        <section class="card">
          <div class="card-header">
            <h2>Resumen</h2>
          </div>
          <div class="card-body stats">
            <div>
              <span class="num">{{ active().length }}</span
              ><span class="muted small">activas ahora</span>
            </div>
            <div>
              <span class="num">{{ points().length }}</span
              ><span class="muted small">puntos de votación</span>
            </div>
            <div>
              <span class="num">{{ withVoting() }}</span
              ><span class="muted small">con votación asignada</span>
            </div>
          </div>
        </section>
      </div>

      <section class="card" style="margin-top: 1rem">
        <div class="card-header">
          <h2 class="row">
            <lucide-icon [img]="icons.live" [size]="18" class="live" /> Votaciones activas
          </h2>
          <span class="badge badge-success">{{ active().length }}</span>
        </div>
        @if (active().length === 0) {
          <app-empty-state
            title="No hay votaciones activas"
            message="Lanza una votación desde el panel de arriba para que aparezca aquí."
          />
        } @else {
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th>Punto</th>
                  <th>Votación</th>
                  <th>Inicio</th>
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
                    <td class="muted">{{ i.startedAt | date: 'd MMM y, HH:mm' }}</td>
                    <td>
                      <div class="row">
                        <a [href]="i.publicUrl" target="_blank" rel="noopener" class="mono small">{{
                          i.publicUrl
                        }}</a>
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
    }
  `,
  styles: `
    .layout {
      grid-template-columns: 2fr 1fr;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
    }
    .stats > div {
      display: flex;
      flex-direction: column;
    }
    .num {
      font-size: 1.8rem;
      font-weight: 700;
      line-height: 1.1;
    }
    .live {
      color: var(--success);
    }
    @media (max-width: 860px) {
      .layout {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class HomePage {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  readonly icons = ICONS;

  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly points = signal<VotingPoint[]>([]);
  readonly active = signal<Instance[]>([]);
  selectedPointId: number | null = null;

  readonly launchable = computed(() => this.points().filter((p) => p.voting && !p.activeInstance));
  readonly withVoting = computed(() => this.points().filter((p) => p.voting).length);

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    try {
      const [points, active] = await Promise.all([
        this.api.listPoints(),
        this.api.listInstances('ACTIVE'),
      ]);
      this.points.set(points);
      this.active.set(active);
      if (
        this.selectedPointId !== null &&
        !this.launchable().some((p) => p.id === this.selectedPointId)
      ) {
        this.selectedPointId = null;
      }
    } catch (err) {
      this.toast.error(describeError(err).message);
    } finally {
      this.loading.set(false);
    }
  }

  async launch(): Promise<void> {
    if (this.selectedPointId === null) return;
    this.busy.set(true);
    try {
      const instance = await this.api.launch(this.selectedPointId);
      this.toast.success(
        `Votación "${instance.votingName}" lanzada en ${instance.votingPointName}`,
      );
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

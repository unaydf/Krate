import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ApiService } from '../../core/api.service';
import { ConfirmService } from '../../core/confirm.service';
import { describeError } from '../../core/errors';
import { Voting } from '../../core/models';
import { votingTypeIcon, votingTypeLabel } from '../../core/voting-types';
import { ToastService } from '../../core/toast.service';
import { EmptyStateComponent } from '../../shared/empty-state.component';
import { ICONS } from '../../shared/icons';
import { LoadingComponent } from '../../shared/loading.component';
import { PageHeaderComponent } from '../../shared/page-header.component';

@Component({
  selector: 'app-votings-list-page',
  imports: [
    RouterLink,
    LucideAngularModule,
    PageHeaderComponent,
    EmptyStateComponent,
    LoadingComponent,
  ],
  template: `
    <app-page-header
      title="Votaciones"
      subtitle="Cada votación agrupa los items entre los que se puede elegir"
    >
      <a routerLink="/votaciones/nueva" class="btn btn-primary"
        ><lucide-icon [img]="icons.plus" [size]="16" /> Nueva votación</a
      >
    </app-page-header>

    @if (loading()) {
      <app-loading />
    } @else if (votings().length === 0) {
      <div class="card">
        <app-empty-state
          title="Todavía no hay votaciones"
          message="Crea una votación y añade los items que se podrán votar."
        >
          <a routerLink="/votaciones/nueva" class="btn btn-primary"
            ><lucide-icon [img]="icons.plus" [size]="16" /> Crear la primera</a
          >
        </app-empty-state>
      </div>
    } @else {
      <div class="card table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Descripción</th>
              <th>Items</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (v of votings(); track v.id) {
              <tr>
                <td>
                  <strong>{{ v.name }}</strong>
                </td>
                <td class="muted truncate" style="max-width: 320px">{{ v.description || '—' }}</td>
                <td>
                  <span class="badge badge-neutral"
                    >{{ v.items.length }} {{ v.items.length === 1 ? 'item' : 'items' }}</span
                  >
                </td>
                <td>
                  @if (v.hasActiveInstance) {
                    <span class="badge badge-success"
                      ><lucide-icon [img]="icons.live" [size]="12" /> Activa</span
                    >
                  } @else {
                    <span class="badge badge-neutral">Inactiva</span>
                  }
                </td>
                <td>
                  <div class="actions">
                    <a [routerLink]="['/votaciones', v.id]" class="btn btn-ghost btn-sm"
                      ><lucide-icon [img]="icons.edit" [size]="15" /> Editar</a
                    >
                    <button
                      type="button"
                      class="btn btn-ghost btn-sm danger"
                      (click)="remove(v)"
                      [disabled]="v.hasActiveInstance"
                      [title]="v.hasActiveInstance ? 'Detén la votación antes de eliminarla' : ''"
                    >
                      <lucide-icon [img]="icons.trash" [size]="15" /> Eliminar
                    </button>
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
export class VotingsListPage {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  readonly icons = ICONS;
  readonly loading = signal(true);
  readonly votings = signal<Voting[]>([]);
  readonly typeLabel = votingTypeLabel;
  readonly typeIcon = votingTypeIcon;

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    try {
      this.votings.set(await this.api.listVotings());
    } catch (err) {
      this.toast.error(describeError(err).message);
    } finally {
      this.loading.set(false);
    }
  }

  async remove(v: Voting): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Eliminar votación',
      message: `"${v.name}" desaparecerá de la lista y los puntos que la tengan asignada quedarán sin votación. Los resultados históricos se conservan.`,
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (!ok) return;
    try {
      await this.api.deleteVoting(v.id);
      this.toast.success('Votación eliminada');
      await this.load();
    } catch (err) {
      this.toast.error(describeError(err).message);
    }
  }
}

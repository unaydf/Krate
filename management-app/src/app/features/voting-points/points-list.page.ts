import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ApiService } from '../../core/api.service';
import { ConfirmService } from '../../core/confirm.service';
import { describeError } from '../../core/errors';
import { VotingPoint } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { CopyButtonComponent } from '../../shared/copy-button.component';
import { QrButtonComponent } from '../../shared/qr-button.component';
import { EmptyStateComponent } from '../../shared/empty-state.component';
import { ICONS } from '../../shared/icons';
import { LoadingComponent } from '../../shared/loading.component';
import { PageHeaderComponent } from '../../shared/page-header.component';

@Component({
  selector: 'app-points-list-page',
  imports: [
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
      title="Puntos de votación"
      subtitle="Cada punto tiene un enlace público fijo donde se vota"
    >
      <a routerLink="/puntos/nuevo" class="btn btn-primary"
        ><lucide-icon [img]="icons.plus" [size]="16" /> Nuevo punto</a
      >
    </app-page-header>

    @if (loading()) {
      <app-loading />
    } @else if (points().length === 0) {
      <div class="card">
        <app-empty-state
          title="Todavía no hay puntos de votación"
          message="Crea un punto, asígnale una votación y comparte su enlace o código QR."
        >
          <a routerLink="/puntos/nuevo" class="btn btn-primary"
            ><lucide-icon [img]="icons.plus" [size]="16" /> Crear el primero</a
          >
        </app-empty-state>
      </div>
    } @else {
      <div class="card table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Votación asignada</th>
              <th>Enlace público</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (p of points(); track p.id) {
              <tr>
                <td>
                  <strong>{{ p.name }}</strong>
                  @if (p.description) {
                    <div class="muted small truncate" style="max-width: 260px">
                      {{ p.description }}
                    </div>
                  }
                </td>
                <td>
                  @if (p.voting) {
                    {{ p.voting.name }}
                  } @else {
                    <span class="muted">Sin votación asignada</span>
                  }
                </td>
                <td>
                  <div class="row">
                    <a [href]="p.publicUrl" target="_blank" rel="noopener" class="mono small"
                      >/p/{{ p.code }}</a
                    >
                    <app-copy-button [value]="p.publicUrl" label="Copiar" />
                    <app-qr-button
                      [value]="p.publicUrl"
                      [fileName]="'punto-' + p.code"
                      [title]="p.name"
                      [subtitle]="p.voting?.name ?? 'Sin votación asignada'"
                    />
                  </div>
                </td>
                <td>
                  @if (p.activeInstance) {
                    <span class="badge badge-success"
                      ><lucide-icon [img]="icons.live" [size]="12" /> Activo</span
                    >
                  } @else {
                    <span class="badge badge-neutral">Inactivo</span>
                  }
                </td>
                <td>
                  <div class="actions">
                    <a [routerLink]="['/puntos', p.id]" class="btn btn-ghost btn-sm"
                      ><lucide-icon [img]="icons.edit" [size]="15" /> Editar</a
                    >
                    <button
                      type="button"
                      class="btn btn-ghost btn-sm danger"
                      (click)="remove(p)"
                      [disabled]="!!p.activeInstance"
                      [title]="
                        p.activeInstance ? 'Detén la votación antes de eliminar el punto' : ''
                      "
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
export class PointsListPage {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  readonly icons = ICONS;
  readonly loading = signal(true);
  readonly points = signal<VotingPoint[]>([]);

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    try {
      this.points.set(await this.api.listPoints());
    } catch (err) {
      this.toast.error(describeError(err).message);
    } finally {
      this.loading.set(false);
    }
  }

  async remove(p: VotingPoint): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Eliminar punto de votación',
      message: `El enlace público de "${p.name}" dejará de funcionar. Los resultados históricos se conservan.`,
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (!ok) return;
    try {
      await this.api.deletePoint(p.id);
      this.toast.success('Punto eliminado');
      await this.load();
    } catch (err) {
      this.toast.error(describeError(err).message);
    }
  }
}

import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ApiService } from '../../core/api.service';
import { describeError } from '../../core/errors';
import { ItemHistory, ItemParticipation } from '../../core/models';
import { votingTypeIcon, votingTypeLabel } from '../../core/voting-types';
import { ToastService } from '../../core/toast.service';
import { EmptyStateComponent } from '../../shared/empty-state.component';
import { ICONS } from '../../shared/icons';
import { LoadingComponent } from '../../shared/loading.component';
import { PageHeaderComponent } from '../../shared/page-header.component';

/** Rendimiento histórico de un item en todos los lanzamientos en los que ha sido candidato. */
@Component({
  selector: 'app-item-history-page',
  imports: [
    DatePipe,
    DecimalPipe,
    RouterLink,
    LucideAngularModule,
    PageHeaderComponent,
    EmptyStateComponent,
    LoadingComponent,
  ],
  template: `
    <app-page-header title="Historial del item" [subtitle]="subtitle()">
      <a routerLink="/items" class="btn btn-secondary"
        ><lucide-icon [img]="icons.back" [size]="16" /> Volver</a
      >
    </app-page-header>

    @if (!data()) {
      <app-loading />
    } @else if (data(); as d) {
      <div class="grid summary">
        <div class="card card-body">
          <span class="muted small">Item</span>
          <span class="row">
            @if (d.imageUrl) {
              <img [src]="d.imageUrl" [alt]="d.itemName" class="thumb" />
            }
            <strong class="truncate">{{ d.itemName }}</strong>
          </span>
          @if (d.deleted) {
            <span class="badge badge-neutral" style="align-self: flex-start">Item eliminado</span>
          }
        </div>
        <div class="card card-body">
          <span class="muted small">Participaciones</span
          ><strong class="big">{{ d.participations }}</strong>
          <span class="muted small"
            >en {{ d.totalVotes }} {{ d.totalVotes === 1 ? 'papeleta' : 'papeletas' }}</span
          >
        </div>
        <div class="card card-body">
          <span class="muted small">Victorias</span><strong class="big">{{ d.wins }}</strong>
        </div>
        <div class="card card-body">
          <span class="muted small">Porcentaje medio</span
          ><strong class="big">{{
            d.averagePercentage !== null ? d.averagePercentage + '%' : '—'
          }}</strong>
        </div>
      </div>

      <section class="card table-wrap" style="margin-top: 1rem">
        <div class="card-header"><h2>Lanzamientos</h2></div>
        @if (d.history.length === 0) {
          <app-empty-state
            title="Este item aún no ha participado en ningún lanzamiento"
            message="Cuando forme parte de una votación lanzada, su rendimiento aparecerá aquí."
          />
        } @else {
          <table class="table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Votación</th>
                <th>Punto</th>
                <th>Posición</th>
                <th>Resultado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (p of d.history; track p.instanceId) {
                <tr>
                  <td class="muted">
                    {{ p.startedAt | date: 'd MMM y, HH:mm' }}
                    @if (p.status === 'ACTIVE') {
                      <span class="badge badge-success"
                        ><lucide-icon [img]="icons.live" [size]="12" /> Activa</span
                      >
                    }
                  </td>
                  <td>
                    <strong>{{ p.votingName }}</strong>
                    <span class="badge badge-neutral" style="margin-left: 0.4rem">
                      <lucide-icon [img]="typeIcon(p.type)" [size]="12" />
                      {{ typeLabel(p.type, null) }}
                    </span>
                  </td>
                  <td>{{ p.votingPointName }}</td>
                  <td>
                    <span
                      class="badge"
                      [class.badge-success]="isWin(p)"
                      [class.badge-neutral]="!isWin(p)"
                    >
                      {{ p.position }}º de {{ p.candidates }}
                    </span>
                  </td>
                  <td>
                    <strong>{{ p.points }}</strong>
                    <span class="muted"
                      >{{ unit(p.scoringLabel, p.points) }} · {{ p.percentage }}%</span
                    >
                    <div class="muted small">
                      @if (p.type === 'RANKING') {
                        posición media
                        {{ p.averageRank !== null ? (p.averageRank | number: '1.0-2') : '—' }} · en
                        {{ p.votes }} de {{ p.totalBallots }} papeletas
                      } @else {
                        de {{ p.totalBallots }}
                        {{ p.totalBallots === 1 ? 'papeleta' : 'papeletas' }}
                      }
                    </div>
                  </td>
                  <td>
                    <div class="actions">
                      <a [routerLink]="['/estadisticas', p.instanceId]" class="btn btn-ghost btn-sm"
                        ><lucide-icon [img]="icons.stats" [size]="15" /> Ver lanzamiento</a
                      >
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </section>
    }
  `,
  styles: `
    .summary {
      grid-template-columns: repeat(4, 1fr);
    }
    .summary .card-body {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      min-width: 0;
    }
    .big {
      font-size: 1.6rem;
    }
    .thumb {
      width: 32px;
      height: 32px;
    }
    @media (max-width: 960px) {
      .summary {
        grid-template-columns: repeat(2, 1fr);
      }
    }
  `,
})
export class ItemHistoryPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  readonly icons = ICONS;

  readonly id = input.required<string>();
  readonly data = signal<ItemHistory | null>(null);
  readonly typeLabel = votingTypeLabel;
  readonly typeIcon = votingTypeIcon;
  readonly subtitle = computed(() => this.data()?.itemName ?? '');

  ngOnInit(): void {
    void this.load();
  }

  isWin(p: ItemParticipation): boolean {
    return p.position === 1 && p.points > 0;
  }

  /** "puntos" → "punto" cuando la cifra es 1. */
  unit(label: string, n: number): string {
    return n === 1 && label.endsWith('s') ? label.slice(0, -1) : label;
  }

  private async load(): Promise<void> {
    try {
      this.data.set(await this.api.itemHistory(Number(this.id())));
    } catch (err) {
      this.toast.error(describeError(err).message);
      await this.router.navigateByUrl('/items');
    }
  }
}

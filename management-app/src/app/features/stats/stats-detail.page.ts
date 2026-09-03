import { Component, DestroyRef, OnInit, computed, inject, input, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ApiService } from '../../core/api.service';
import { describeError } from '../../core/errors';
import { InstanceStatsDetail } from '../../core/models';
import { votingTypeIcon, votingTypeLabel } from '../../core/voting-types';
import { ToastService } from '../../core/toast.service';
import { ICONS } from '../../shared/icons';
import { LoadingComponent } from '../../shared/loading.component';
import { PageHeaderComponent } from '../../shared/page-header.component';

const REFRESH_MS = 5000;

@Component({
  selector: 'app-stats-detail-page',
  imports: [
    DatePipe,
    DecimalPipe,
    RouterLink,
    LucideAngularModule,
    PageHeaderComponent,
    LoadingComponent,
  ],
  template: `
    <app-page-header title="Resultados" [subtitle]="subtitle()">
      <a routerLink="/estadisticas" class="btn btn-secondary"
        ><lucide-icon [img]="icons.back" [size]="16" /> Volver</a
      >
    </app-page-header>

    @if (!data()) {
      <app-loading />
    } @else if (data(); as d) {
      <div class="grid summary">
        <div class="card card-body">
          <span class="muted small">Votación</span><strong>{{ d.instance.votingName }}</strong>
          <span class="badge badge-neutral" style="align-self: flex-start">
            <lucide-icon [img]="typeIcon(d.type)" [size]="12" />
            {{ typeLabel(d.type, d.maxSelections) }}
          </span>
        </div>
        <div class="card card-body">
          <span class="muted small">Punto</span><strong>{{ d.instance.votingPointName }}</strong>
        </div>
        <div class="card card-body">
          <span class="muted small">Estado</span>
          @if (d.instance.status === 'ACTIVE') {
            <span class="badge badge-success"
              ><lucide-icon [img]="icons.live" [size]="12" /> Activa · se actualiza cada 5 s</span
            >
          } @else {
            <span class="badge badge-neutral">Finalizada</span>
          }
        </div>
        <div class="card card-body">
          <span class="muted small">Papeletas</span
          ><strong class="big">{{ d.instance.totalVotes }}</strong>
        </div>
      </div>

      <section class="card" style="margin-top: 1rem">
        <div class="card-header">
          <h2>{{ d.type === 'RANKING' ? 'Puntuación por item' : 'Votos por item' }}</h2>
          <span class="muted small">
            <lucide-icon [img]="icons.clock" [size]="14" />
            {{ d.instance.startedAt | date: 'd MMM y, HH:mm' }}
            @if (d.instance.endedAt) {
              hasta {{ d.instance.endedAt | date: 'd MMM y, HH:mm' }}
            }
          </span>
        </div>
        <div class="card-body results">
          @for (r of d.results; track r.itemId; let i = $index) {
            <div class="result" [class.winner]="i === 0 && r.points > 0">
              <div class="head">
                <span class="name row">
                  @if (r.imageUrl) {
                    <img [src]="r.imageUrl" [alt]="r.itemName" class="thumb" />
                  }
                  <span class="truncate">{{ r.itemName }}</span>
                  @if (r.deleted) {
                    <span class="badge badge-neutral">Item eliminado</span>
                  }
                </span>
                <span class="nums">
                  <span>
                    <strong>{{ r.points }}</strong
                    >&nbsp;<span class="muted"
                      >{{ unit(d.scoringLabel, r.points) }} · {{ r.percentage }}%</span
                    >
                  </span>
                  @if (d.type === 'RANKING') {
                    <span class="muted small detail">
                      posición media
                      {{ r.averageRank !== null ? (r.averageRank | number: '1.0-2') : '—' }} ·
                      {{ r.firstPlaces }}
                      {{ r.firstPlaces === 1 ? 'primer puesto' : 'primeros puestos' }} · en
                      {{ r.votes }} {{ r.votes === 1 ? 'papeleta' : 'papeletas' }}
                    </span>
                  }
                </span>
              </div>
              <div
                class="bar"
                role="progressbar"
                [attr.aria-valuenow]="r.percentage"
                aria-valuemin="0"
                aria-valuemax="100"
              >
                <div class="fill" [style.width.%]="r.percentage"></div>
              </div>
            </div>
          } @empty {
            <p class="muted">Esta votación no tiene items.</p>
          }
        </div>
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
    }
    .big {
      font-size: 1.6rem;
    }
    .results {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      margin-bottom: 0.4rem;
    }
    .name {
      min-width: 0;
      font-weight: 500;
    }
    .thumb {
      width: 32px;
      height: 32px;
    }
    .nums {
      white-space: nowrap;
      text-align: right;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 0.1rem;
    }
    .detail {
      white-space: normal;
      max-width: 260px;
    }
    .bar {
      height: 12px;
      background: var(--surface-2);
      border-radius: 999px;
      overflow: hidden;
      border: 1px solid var(--border);
    }
    .fill {
      height: 100%;
      background: var(--primary);
      border-radius: 999px;
      transition: width 0.4s ease;
    }
    .winner .fill {
      background: var(--success);
    }
    @media (max-width: 960px) {
      .summary {
        grid-template-columns: repeat(2, 1fr);
      }
    }
  `,
})
export class StatsDetailPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  readonly icons = ICONS;

  readonly id = input.required<string>();
  readonly data = signal<InstanceStatsDetail | null>(null);
  readonly typeLabel = votingTypeLabel;
  readonly typeIcon = votingTypeIcon;

  /** "puntos" → "punto" cuando la cifra es 1. */
  unit(label: string, n: number): string {
    return n === 1 && label.endsWith('s') ? label.slice(0, -1) : label;
  }
  readonly subtitle = computed(() => {
    const d = this.data();
    return d ? `${d.instance.votingName} en ${d.instance.votingPointName}` : '';
  });

  private timer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => this.stopPolling());
  }

  ngOnInit(): void {
    void this.load(true);
  }

  private async load(first = false): Promise<void> {
    try {
      const d = await this.api.statsDetail(Number(this.id()));
      this.data.set(d);
      if (d.instance.status === 'ACTIVE' && !this.timer) {
        this.timer = setInterval(() => void this.load(), REFRESH_MS);
      } else if (d.instance.status !== 'ACTIVE') {
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

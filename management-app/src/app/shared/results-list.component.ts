import { Component, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ItemResult, VotingType } from '../core/models';

/**
 * Clasificación de items con barra de porcentaje. La usan el detalle de un lanzamiento
 * y los resultados agregados de una votación. El nombre enlaza al historial del item.
 */
@Component({
  selector: 'app-results-list',
  imports: [DecimalPipe, RouterLink],
  template: `
    <div class="results">
      @for (r of results(); track r.itemId; let i = $index) {
        <div class="result" [class.winner]="i === 0 && r.points > 0">
          <div class="head">
            <span class="name row">
              @if (r.imageUrl) {
                <img [src]="r.imageUrl" [alt]="r.itemName" class="thumb" />
              }
              <a
                class="truncate item-link"
                [routerLink]="['/estadisticas/items', r.itemId]"
                title="Ver historial del item"
                >{{ r.itemName }}</a
              >
              @if (r.deleted) {
                <span class="badge badge-neutral">Item eliminado</span>
              }
            </span>
            <span class="nums">
              <span>
                <strong>{{ r.points }}</strong
                >&nbsp;<span class="muted">{{ unit(r.points) }} · {{ r.percentage }}%</span>
              </span>
              @if (type() === 'RANKING') {
                <span class="muted small detail">
                  posición media
                  {{ r.averageRank !== null ? (r.averageRank | number: '1.0-2') : '—' }} ·
                  {{ r.firstPlaces }}
                  {{ r.firstPlaces === 1 ? 'primer puesto' : 'primeros puestos' }} · en
                  {{ r.votes }} {{ r.votes === 1 ? 'participación' : 'participaciones' }}
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
  `,
  styles: `
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
    .item-link {
      color: inherit;
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
  `,
})
export class ResultsListComponent {
  readonly results = input.required<ItemResult[]>();
  readonly type = input.required<VotingType>();
  /** Unidad de la métrica principal: "votos" o "puntos". */
  readonly scoringLabel = input.required<string>();

  /** "puntos" → "punto" cuando la cifra es 1. */
  unit(n: number): string {
    const label = this.scoringLabel();
    return n === 1 && label.endsWith('s') ? label.slice(0, -1) : label;
  }
}

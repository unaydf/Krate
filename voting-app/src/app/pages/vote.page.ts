import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Ban,
  Check,
  CircleAlert,
  CircleCheck,
  ImageOff,
  LoaderCircle,
  LucideAngularModule,
  RotateCcw,
  SearchX,
  Vote,
} from 'lucide-angular';
import { ProblemDetail, PublicItem, PublicPoint, VotingType } from '../core/models';
import { PublicApiService } from '../core/public-api.service';
import { StatusScreenComponent } from './status-screen.component';

type View = 'loading' | 'not-found' | 'inactive' | 'vote' | 'done' | 'error';

@Component({
  selector: 'app-vote-page',
  imports: [LucideAngularModule, StatusScreenComponent],
  template: `
    @switch (view()) {
      @case ('loading') {
        <app-status-screen [icon]="icons.loader" title="Cargando votación…" />
      }
      @case ('not-found') {
        <app-status-screen
          [icon]="icons.notFound"
          title="Enlace no válido"
          tone="danger"
          message="Este punto de votación no existe o ya no está disponible."
        />
      }
      @case ('inactive') {
        <app-status-screen
          [icon]="icons.ban"
          [title]="'Votación desactivada'"
          tone="neutral"
          [message]="
            'Ahora mismo no hay ninguna votación activa en ' +
            (point()?.pointName ?? 'este punto') +
            '. Vuelve a intentarlo más tarde.'
          "
        >
          <button
            type="button"
            class="btn btn-secondary"
            style="max-width: 260px; margin-top: 1rem"
            (click)="load()"
          >
            Volver a comprobar
          </button>
        </app-status-screen>
      }
      @case ('done') {
        <app-status-screen
          [icon]="icons.done"
          title="Gracias por votar"
          tone="success"
          [message]="
            'Tu voto en «' +
            (point()?.voting?.name ?? 'la votación') +
            '» se ha registrado correctamente.'
          "
        />
      }
      @case ('error') {
        <app-status-screen
          [icon]="icons.alert"
          title="No se pudo cargar la votación"
          tone="danger"
          [message]="errorMessage()"
        >
          <button
            type="button"
            class="btn btn-secondary"
            style="max-width: 260px; margin-top: 1rem"
            (click)="load()"
          >
            Reintentar
          </button>
        </app-status-screen>
      }
      @case ('vote') {
        <main class="vote">
          <header>
            <span class="pill"
              ><lucide-icon [img]="icons.vote" [size]="14" /> {{ point()?.pointName }}</span
            >
            <h1>{{ point()?.voting?.name }}</h1>
            @if (point()?.voting?.description) {
              <p class="muted">{{ point()?.voting?.description }}</p>
            }
            <p class="small muted">{{ point()?.voting?.instructions }}</p>
            @if (type() === 'LIMITED') {
              <p class="counter" [class.full]="selected().length >= maxSelections()">
                {{ selected().length }} de {{ maxSelections() }} seleccionados
              </p>
            }
            @if (type() === 'RANKING' && selected().length > 0) {
              <div class="rank-tools">
                <span class="counter"
                  >{{ selected().length }} de {{ items().length }} ordenados</span
                >
                <button type="button" class="link" (click)="reset()">
                  <lucide-icon [img]="icons.reset" [size]="14" /> Reiniciar orden
                </button>
              </div>
            }
          </header>

          @if (submitError(); as msg) {
            <div class="alert"><lucide-icon [img]="icons.alert" [size]="18" /> {{ msg }}</div>
          }

          <ul
            class="options"
            [attr.role]="type() === 'SINGLE' ? 'radiogroup' : 'group'"
            aria-label="Opciones"
          >
            @for (item of items(); track item.id) {
              <li>
                <button
                  type="button"
                  class="option"
                  [attr.role]="type() === 'SINGLE' ? 'radio' : 'checkbox'"
                  [attr.aria-checked]="isSelected(item.id)"
                  [class.selected]="isSelected(item.id)"
                  [class.blocked]="isBlocked(item.id)"
                  (click)="select(item)"
                  [disabled]="submitting() || isBlocked(item.id)"
                >
                  @if (item.imageUrl) {
                    <img [src]="item.imageUrl" [alt]="item.name" />
                  } @else {
                    <span class="img placeholder"
                      ><lucide-icon [img]="icons.imageOff" [size]="22"
                    /></span>
                  }
                  <span class="text">
                    <span class="name">{{ item.name }}</span>
                    @if (item.description) {
                      <span class="desc muted small">{{ item.description }}</span>
                    }
                  </span>
                  <span class="mark" [class.square]="type() === 'LIMITED'" aria-hidden="true">
                    @if (type() === 'RANKING') {
                      @if (rankOf(item.id); as r) {
                        <span class="rank">{{ r }}</span>
                      }
                    } @else if (isSelected(item.id)) {
                      <lucide-icon
                        [img]="type() === 'LIMITED' ? icons.check : icons.done"
                        [size]="22"
                      />
                    }
                  </span>
                </button>
              </li>
            }
          </ul>

          <footer class="actions">
            <button
              type="button"
              class="btn btn-primary"
              [disabled]="selected().length === 0 || submitting()"
              (click)="submit()"
            >
              @if (submitting()) {
                <lucide-icon [img]="icons.loader" [size]="18" class="spin" /> Enviando…
              } @else {
                {{ confirmLabel() }}
              }
            </button>
          </footer>
        </main>
      }
    }
  `,
  styles: `
    .vote {
      max-width: 480px;
      margin: 0 auto;
      padding: 1.25rem 1rem calc(6rem + env(safe-area-inset-bottom));
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    header {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      padding: 0.5rem 0.25rem;
    }
    .pill {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      align-self: flex-start;
      padding: 0.2rem 0.6rem;
      border-radius: 999px;
      background: var(--primary-soft);
      color: var(--primary-text);
      font-size: 0.8rem;
      font-weight: 700;
    }
    .counter {
      font-size: 0.9rem;
      font-weight: 700;
      color: var(--primary-text);
    }
    .counter.full {
      color: var(--danger);
    }
    .rank-tools {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
    }
    .link {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      background: none;
      border: 0;
      padding: 0.3rem 0;
      font: inherit;
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--text-2);
      cursor: pointer;
    }
    .alert {
      display: flex;
      gap: 0.5rem;
      align-items: center;
      padding: 0.75rem 1rem;
      border-radius: var(--radius-sm);
      background: var(--danger-soft);
      color: var(--danger);
      font-size: 0.95rem;
    }
    .options {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .option {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      width: 100%;
      text-align: left;
      padding: 0.75rem;
      border-radius: var(--radius);
      border: 2px solid var(--border);
      background: var(--surface);
      box-shadow: var(--shadow);
      font: inherit;
      color: inherit;
      cursor: pointer;
      min-height: 76px;
      transition:
        border-color 0.15s,
        background 0.15s,
        opacity 0.15s;
    }
    .option:active:not(:disabled) {
      background: var(--surface-2);
    }
    .option.selected {
      border-color: var(--primary);
      background: var(--primary-soft);
    }
    .option.blocked {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .option img,
    .img {
      width: 60px;
      height: 60px;
      border-radius: var(--radius-sm);
      object-fit: cover;
      flex-shrink: 0;
      background: var(--surface-2);
    }
    .placeholder {
      display: grid;
      place-items: center;
      color: var(--text-3);
    }
    .text {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 0.1rem;
    }
    .name {
      font-weight: 700;
      font-size: 1.05rem;
    }
    .desc {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .mark {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      border: 2px solid var(--border);
      display: grid;
      place-items: center;
      flex-shrink: 0;
      color: var(--primary-hover);
      background: var(--surface);
    }
    .mark.square {
      border-radius: 8px;
    }
    .selected .mark {
      border-color: var(--primary);
    }
    .rank {
      display: grid;
      place-items: center;
      width: 100%;
      height: 100%;
      border-radius: inherit;
      background: var(--primary);
      color: #fff;
      font-weight: 800;
      font-size: 0.95rem;
    }
    .actions {
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
      padding: 0.9rem 1rem calc(0.9rem + env(safe-area-inset-bottom));
      background: linear-gradient(to top, var(--bg) 70%, transparent);
    }
    .actions .btn {
      max-width: 480px;
      margin: 0 auto;
      box-shadow: var(--shadow);
    }
  `,
})
export class VotePage implements OnInit {
  private readonly api = inject(PublicApiService);
  readonly icons = {
    loader: LoaderCircle,
    notFound: SearchX,
    ban: Ban,
    done: CircleCheck,
    check: Check,
    alert: CircleAlert,
    vote: Vote,
    imageOff: ImageOff,
    reset: RotateCcw,
  };

  /** Código del punto de votación (route param). */
  readonly code = input.required<string>();

  readonly view = signal<View>('loading');
  readonly point = signal<PublicPoint | null>(null);
  /** Ids elegidos, en orden de preferencia (el orden solo importa en RANKING). */
  readonly selected = signal<number[]>([]);
  readonly submitting = signal(false);
  readonly submitError = signal<string | null>(null);
  readonly errorMessage = signal('Comprueba tu conexión e inténtalo de nuevo.');

  readonly items = computed<PublicItem[]>(() => this.point()?.voting?.items ?? []);
  readonly type = computed<VotingType>(() => this.point()?.voting?.type ?? 'SINGLE');
  readonly maxSelections = computed(
    () => this.point()?.voting?.maxSelections ?? this.items().length,
  );
  readonly confirmLabel = computed(() => {
    const n = this.selected().length;
    switch (this.type()) {
      case 'RANKING':
        return n === 0 ? 'Confirmar orden' : `Confirmar orden (${n} ${n === 1 ? 'item' : 'items'})`;
      case 'LIMITED':
        return n <= 1 ? 'Confirmar voto' : `Confirmar ${n} votos`;
      default:
        return 'Confirmar voto';
    }
  });

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.view.set('loading');
    this.submitError.set(null);
    try {
      const point = await this.api.getPoint(this.code());
      this.point.set(point);
      if (point.status !== 'ACTIVE' || !point.voting) {
        this.view.set('inactive');
      } else if (point.alreadyVoted) {
        this.view.set('done');
      } else {
        this.selected.set([]);
        this.view.set('vote');
      }
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 404) {
        this.view.set('not-found');
      } else {
        this.errorMessage.set(detailOf(err) ?? 'Comprueba tu conexión e inténtalo de nuevo.');
        this.view.set('error');
      }
    }
  }

  isSelected(id: number): boolean {
    return this.selected().includes(id);
  }

  /** En LIMITED, un item no elegido se bloquea cuando ya se alcanzó el máximo. */
  isBlocked(id: number): boolean {
    return (
      this.type() === 'LIMITED' &&
      !this.isSelected(id) &&
      this.selected().length >= this.maxSelections()
    );
  }

  /** Posición (1 = mejor) del item en RANKING, o 0 si no está ordenado. */
  rankOf(id: number): number {
    return this.selected().indexOf(id) + 1;
  }

  select(item: PublicItem): void {
    this.submitError.set(null);
    switch (this.type()) {
      case 'SINGLE':
        this.selected.set([item.id]);
        break;
      case 'LIMITED':
        this.selected.update((ids) =>
          ids.includes(item.id)
            ? ids.filter((x) => x !== item.id)
            : ids.length < this.maxSelections()
              ? [...ids, item.id]
              : ids,
        );
        break;
      case 'RANKING':
        // Tocar añade al final; tocar de nuevo quita y renumera el resto
        this.selected.update((ids) =>
          ids.includes(item.id) ? ids.filter((x) => x !== item.id) : [...ids, item.id],
        );
        break;
    }
  }

  reset(): void {
    this.selected.set([]);
    this.submitError.set(null);
  }

  async submit(): Promise<void> {
    const itemIds = this.selected();
    if (itemIds.length === 0) return;
    this.submitting.set(true);
    this.submitError.set(null);
    try {
      await this.api.vote(this.code(), itemIds);
      this.view.set('done');
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 409) {
        // Ya votó o la votación se detuvo: recargamos el estado real
        await this.load();
        if (this.view() === 'vote')
          this.submitError.set(detailOf(err) ?? 'No se pudo registrar el voto');
      } else {
        this.submitError.set(detailOf(err) ?? 'No se pudo registrar el voto. Inténtalo de nuevo.');
      }
    } finally {
      this.submitting.set(false);
    }
  }
}

function detailOf(err: unknown): string | null {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) return 'No se pudo conectar con el servidor.';
    return (err.error as ProblemDetail | null)?.detail ?? null;
  }
  return null;
}

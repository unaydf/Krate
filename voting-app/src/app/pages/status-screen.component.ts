import { Component, input } from '@angular/core';
import { LucideAngularModule, LucideIconData } from 'lucide-angular';

/** Pantalla de estado a pantalla completa (desactivada, no encontrada, gracias). */
@Component({
  selector: 'app-status-screen',
  imports: [LucideAngularModule],
  template: `
    <section class="screen" [class]="'screen ' + tone()">
      <div class="icon"><lucide-icon [img]="icon()" [size]="40" /></div>
      <h1>{{ title() }}</h1>
      @if (message()) {
        <p class="muted">{{ message() }}</p>
      }
      <ng-content />
    </section>
  `,
  styles: `
    .screen {
      min-height: 100dvh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      gap: 0.75rem;
      padding: 2rem 1.5rem;
      max-width: 480px;
      margin: 0 auto;
    }
    .icon {
      display: grid;
      place-items: center;
      width: 84px;
      height: 84px;
      border-radius: 50%;
      margin-bottom: 0.5rem;
      background: var(--surface-2);
      color: var(--text-2);
    }
    .success .icon {
      background: var(--success-soft);
      color: var(--success);
    }
    .danger .icon {
      background: var(--danger-soft);
      color: var(--danger);
    }
    .primary .icon {
      background: var(--primary-soft);
      color: var(--primary);
    }
    p {
      max-width: 36ch;
    }
  `,
})
export class StatusScreenComponent {
  readonly icon = input.required<LucideIconData>();
  readonly title = input.required<string>();
  readonly message = input<string>();
  readonly tone = input<'neutral' | 'success' | 'danger' | 'primary'>('neutral');
}

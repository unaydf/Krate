import { Component, input } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { ICONS } from './icons';

@Component({
  selector: 'app-empty-state',
  imports: [LucideAngularModule],
  template: `
    <div class="empty">
      <lucide-icon [img]="icons.empty" [size]="36" />
      <h3>{{ title() }}</h3>
      @if (message()) {
        <p class="muted">{{ message() }}</p>
      }
      <div class="row"><ng-content /></div>
    </div>
  `,
  styles: `
    .empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      padding: 3rem 1rem;
      text-align: center;
      color: var(--text-3);
    }
    h3 {
      color: var(--text);
    }
    .row {
      margin-top: 0.5rem;
    }
  `,
})
export class EmptyStateComponent {
  readonly title = input.required<string>();
  readonly message = input<string>();
  readonly icons = ICONS;
}

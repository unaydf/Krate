import { Component, inject } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { ToastService } from '../core/toast.service';
import { ICONS } from './icons';

@Component({
  selector: 'app-toast',
  imports: [LucideAngularModule],
  template: `
    <div class="toasts" aria-live="polite">
      @for (t of toasts.toasts(); track t.id) {
        <div class="toast" [class]="'toast ' + t.kind" role="status">
          <lucide-icon
            [img]="
              t.kind === 'success' ? icons.success : t.kind === 'error' ? icons.alert : icons.info
            "
            [size]="18"
          />
          <span class="msg">{{ t.message }}</span>
          <button type="button" class="close" (click)="toasts.dismiss(t.id)" aria-label="Cerrar">
            <lucide-icon [img]="icons.close" [size]="16" />
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    .toasts {
      position: fixed;
      right: 1rem;
      bottom: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      z-index: 1000;
      max-width: min(380px, calc(100vw - 2rem));
    }
    .toast {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.7rem 0.9rem;
      border-radius: var(--radius-sm);
      background: var(--text);
      color: #fff;
      box-shadow: var(--shadow);
      font-size: 0.9rem;
    }
    .toast.success {
      background: var(--success);
    }
    .toast.error {
      background: var(--danger);
    }
    .toast.info {
      background: var(--primary);
    }
    .msg {
      flex: 1;
    }
    .close {
      background: transparent;
      border: 0;
      color: inherit;
      cursor: pointer;
      display: inline-flex;
      padding: 0.1rem;
      opacity: 0.8;
    }
    .close:hover {
      opacity: 1;
    }
  `,
})
export class ToastComponent {
  readonly toasts = inject(ToastService);
  readonly icons = ICONS;
}

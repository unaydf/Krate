import { Component, inject } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { ConfirmService } from '../core/confirm.service';
import { ICONS } from './icons';

@Component({
  selector: 'app-confirm-dialog',
  imports: [LucideAngularModule],
  template: `
    @if (confirm.pending(); as p) {
      <div class="backdrop" (click)="confirm.answer(false)"></div>
      <div class="dialog card" role="dialog" aria-modal="true" [attr.aria-label]="p.title">
        <div class="head">
          <lucide-icon
            [img]="p.danger ? icons.alert : icons.info"
            [size]="22"
            [class]="p.danger ? 'danger' : 'info'"
          />
          <h3>{{ p.title }}</h3>
        </div>
        <p class="muted">{{ p.message }}</p>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" (click)="confirm.answer(false)">
            {{ p.cancelLabel ?? 'Cancelar' }}
          </button>
          <button
            type="button"
            class="btn"
            [class.btn-danger]="p.danger"
            [class.btn-primary]="!p.danger"
            (click)="confirm.answer(true)"
          >
            {{ p.confirmLabel ?? 'Confirmar' }}
          </button>
        </div>
      </div>
    }
  `,
  styles: `
    .backdrop {
      position: fixed;
      inset: 0;
      background: rgba(20, 24, 40, 0.45);
      z-index: 900;
    }
    .dialog {
      position: fixed;
      z-index: 901;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      width: min(440px, calc(100vw - 2rem));
      padding: 1.4rem;
    }
    .head {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      margin-bottom: 0.6rem;
    }
    .danger {
      color: var(--danger);
    }
    .info {
      color: var(--primary);
    }
  `,
})
export class ConfirmDialogComponent {
  readonly confirm = inject(ConfirmService);
  readonly icons = ICONS;
}

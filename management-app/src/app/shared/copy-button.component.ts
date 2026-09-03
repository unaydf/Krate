import { Component, inject, input, signal } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { ToastService } from '../core/toast.service';
import { ICONS } from './icons';

@Component({
  selector: 'app-copy-button',
  imports: [LucideAngularModule],
  template: `
    <button
      type="button"
      class="btn btn-secondary btn-sm"
      (click)="copy()"
      [attr.aria-label]="'Copiar ' + label()"
    >
      <lucide-icon [img]="copied() ? icons.check : icons.copy" [size]="15" />
      {{ copied() ? 'Copiado' : label() }}
    </button>
  `,
})
export class CopyButtonComponent {
  readonly value = input.required<string>();
  readonly label = input('Copiar enlace');
  readonly copied = signal(false);
  readonly icons = ICONS;
  private readonly toast = inject(ToastService);

  async copy(): Promise<void> {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(this.value());
      } else {
        legacyCopy(this.value());
      }
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1500);
    } catch {
      this.toast.error('No se pudo copiar al portapapeles');
    }
  }
}

/** Fallback para contextos sin HTTPS, donde navigator.clipboard no está disponible. */
function legacyCopy(text: string): void {
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  const ok = document.execCommand('copy');
  document.body.removeChild(area);
  if (!ok) throw new Error('copy failed');
}

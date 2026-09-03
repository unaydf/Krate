import { Component } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { ICONS } from './icons';

@Component({
  selector: 'app-loading',
  imports: [LucideAngularModule],
  template: `
    <div class="loading muted">
      <lucide-icon [img]="icons.loader" [size]="22" class="spin" /> Cargando…
    </div>
  `,
  styles: `
    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.6rem;
      padding: 3rem;
    }
  `,
})
export class LoadingComponent {
  readonly icons = ICONS;
}

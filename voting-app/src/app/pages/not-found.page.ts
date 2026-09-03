import { Component } from '@angular/core';
import { SearchX } from 'lucide-angular';
import { StatusScreenComponent } from './status-screen.component';

@Component({
  selector: 'app-not-found-page',
  imports: [StatusScreenComponent],
  template: `
    <app-status-screen
      [icon]="icon"
      title="Enlace no válido"
      message="Este punto de votación no existe o ya no está disponible. Comprueba el enlace o el código QR."
      tone="danger"
    />
  `,
})
export class NotFoundPage {
  readonly icon = SearchX;
}

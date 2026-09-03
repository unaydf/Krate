import { Component, ElementRef, effect, inject, input, signal, viewChild } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { toCanvas } from 'qrcode';
import { ToastService } from '../core/toast.service';
import { ICONS } from './icons';

/**
 * Botón que genera un código QR del valor indicado, lo muestra en un diálogo
 * y permite descargarlo como PNG. El QR se genera en el navegador.
 */
@Component({
  selector: 'app-qr-button',
  imports: [LucideAngularModule],
  template: `
    <button
      type="button"
      class="btn btn-secondary btn-sm"
      (click)="open.set(true)"
      aria-label="Mostrar código QR"
    >
      <lucide-icon [img]="icons.qr" [size]="15" /> QR
    </button>

    @if (open()) {
      <div class="backdrop" (click)="open.set(false)"></div>
      <div class="dialog card" role="dialog" aria-modal="true" aria-label="Código QR">
        <div class="head">
          <div>
            <h3>{{ title() || 'Código QR' }}</h3>
            @if (subtitle()) {
              <p class="muted small">{{ subtitle() }}</p>
            }
          </div>
          <button
            type="button"
            class="btn btn-ghost btn-icon"
            (click)="open.set(false)"
            aria-label="Cerrar"
          >
            <lucide-icon [img]="icons.close" [size]="18" />
          </button>
        </div>
        <div class="qr">
          <canvas #canvas></canvas>
        </div>
        <p class="mono small url">{{ value() }}</p>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" (click)="open.set(false)">Cerrar</button>
          <button type="button" class="btn btn-primary" (click)="download()" [disabled]="!ready()">
            <lucide-icon [img]="icons.download" [size]="16" /> Descargar PNG
          </button>
        </div>
      </div>
    }
  `,
  styles: `
    .backdrop {
      position: fixed;
      inset: 0;
      background: rgba(31, 36, 48, 0.45);
      z-index: 900;
    }
    .dialog {
      position: fixed;
      z-index: 901;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      width: min(400px, calc(100vw - 2rem));
      padding: 1.4rem;
    }
    .head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.6rem;
      margin-bottom: 1rem;
    }
    .qr {
      display: grid;
      place-items: center;
      padding: 1rem;
      background: #fff;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
    }
    canvas {
      width: 100%;
      max-width: 280px;
      height: auto;
      image-rendering: pixelated;
    }
    .url {
      text-align: center;
      margin-top: 0.75rem;
      word-break: break-all;
      color: var(--text-2);
    }
  `,
})
export class QrButtonComponent {
  /** Texto codificado en el QR, normalmente la URL pública del punto. */
  readonly value = input.required<string>();
  /** Nombre del fichero descargado, sin extensión. */
  readonly fileName = input('codigo-qr');
  readonly title = input<string>();
  readonly subtitle = input<string>();

  readonly open = signal(false);
  readonly ready = signal(false);
  readonly icons = ICONS;

  private readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly toast = inject(ToastService);

  constructor() {
    // Dibuja el QR cada vez que el diálogo se abre o cambia el valor.
    effect(() => {
      const el = this.canvas()?.nativeElement;
      const value = this.value();
      if (!this.open() || !el) {
        this.ready.set(false);
        return;
      }
      toCanvas(el, value, { width: 640, margin: 2, errorCorrectionLevel: 'M' })
        .then(() => {
          // qrcode fija width/height en línea; los quitamos para que mande el CSS responsivo
          el.style.width = '';
          el.style.height = '';
          this.ready.set(true);
        })
        .catch(() => {
          this.ready.set(false);
          this.toast.error('No se pudo generar el código QR');
        });
    });
  }

  download(): void {
    const el = this.canvas()?.nativeElement;
    if (!el) return;
    const link = document.createElement('a');
    link.href = el.toDataURL('image/png');
    link.download = `${sanitize(this.fileName())}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

function sanitize(name: string): string {
  return (
    name
      .replace(/[^a-z0-9_-]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase() || 'codigo-qr'
  );
}

import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ApiService } from '../../core/api.service';
import { ConfirmService } from '../../core/confirm.service';
import { describeError } from '../../core/errors';
import { Item } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { EmptyStateComponent } from '../../shared/empty-state.component';
import { ICONS } from '../../shared/icons';
import { LoadingComponent } from '../../shared/loading.component';
import { PageHeaderComponent } from '../../shared/page-header.component';

@Component({
  selector: 'app-items-list-page',
  imports: [
    RouterLink,
    LucideAngularModule,
    PageHeaderComponent,
    EmptyStateComponent,
    LoadingComponent,
  ],
  template: `
    <app-page-header title="Items" subtitle="Elementos que se pueden incluir en las votaciones">
      <a routerLink="/items/nuevo" class="btn btn-primary"
        ><lucide-icon [img]="icons.plus" [size]="16" /> Nuevo item</a
      >
    </app-page-header>

    @if (loading()) {
      <app-loading />
    } @else if (items().length === 0) {
      <div class="card">
        <app-empty-state
          title="Todavía no hay items"
          message="Crea items con nombre, descripción e imagen para poder añadirlos a una votación."
        >
          <a routerLink="/items/nuevo" class="btn btn-primary"
            ><lucide-icon [img]="icons.plus" [size]="16" /> Crear el primero</a
          >
        </app-empty-state>
      </div>
    } @else {
      <div class="grid cards">
        @for (item of items(); track item.id) {
          <article class="card item">
            @if (item.imageUrl) {
              <img [src]="item.imageUrl" [alt]="item.name" class="cover" />
            } @else {
              <div class="cover placeholder">
                <lucide-icon [img]="icons.imageOff" [size]="28" />
              </div>
            }
            <div class="card-body">
              <h3 class="truncate">{{ item.name }}</h3>
              <p class="muted small clamp">{{ item.description || 'Sin descripción' }}</p>
              <div class="actions">
                <a
                  [routerLink]="['/estadisticas/items', item.id]"
                  class="btn btn-ghost btn-sm history"
                  title="Rendimiento en todas las votaciones"
                  ><lucide-icon [img]="icons.history" [size]="15" /> Historial</a
                >
                <a [routerLink]="['/items', item.id]" class="btn btn-ghost btn-sm"
                  ><lucide-icon [img]="icons.edit" [size]="15" /> Editar</a
                >
                <button type="button" class="btn btn-ghost btn-sm danger" (click)="remove(item)">
                  <lucide-icon [img]="icons.trash" [size]="15" /> Eliminar
                </button>
              </div>
            </div>
          </article>
        }
      </div>
    }
  `,
  styles: `
    .cards {
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    }
    .item {
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .cover {
      width: 100%;
      aspect-ratio: 4 / 3;
      object-fit: cover;
      background: var(--surface-2);
      display: block;
    }
    .placeholder {
      display: grid;
      place-items: center;
      color: var(--text-3);
      border-bottom: 1px solid var(--border);
    }
    .clamp {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      min-height: 2.6em;
      margin: 0.25rem 0 0.75rem;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem;
      justify-content: flex-end;
    }
    .actions .history {
      margin-right: auto;
    }
  `,
})
export class ItemsListPage {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  readonly icons = ICONS;
  readonly loading = signal(true);
  readonly items = signal<Item[]>([]);

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    try {
      this.items.set(await this.api.listItems());
    } catch (err) {
      this.toast.error(describeError(err).message);
    } finally {
      this.loading.set(false);
    }
  }

  async remove(item: Item): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Eliminar item',
      message: `"${item.name}" dejará de estar disponible y se quitará de las votaciones en las que aparece. Los resultados históricos se conservan.`,
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (!ok) return;
    try {
      await this.api.deleteItem(item.id);
      this.toast.success('Item eliminado');
      await this.load();
    } catch (err) {
      this.toast.error(describeError(err).message);
    }
  }
}

import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ApiService } from '../../core/api.service';
import { describeError } from '../../core/errors';
import { Item, VotingType } from '../../core/models';
import { VOTING_TYPES } from '../../core/voting-types';
import { ToastService } from '../../core/toast.service';
import { ICONS } from '../../shared/icons';
import { LoadingComponent } from '../../shared/loading.component';
import { PageHeaderComponent } from '../../shared/page-header.component';

@Component({
  selector: 'app-voting-form-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    LucideAngularModule,
    PageHeaderComponent,
    LoadingComponent,
  ],
  template: `
    <app-page-header [title]="isEdit() ? 'Editar votación' : 'Nueva votación'">
      <a routerLink="/votaciones" class="btn btn-secondary"
        ><lucide-icon [img]="icons.back" [size]="16" /> Volver</a
      >
    </app-page-header>

    @if (loading()) {
      <app-loading />
    } @else {
      <form class="card layout" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <div class="card-body">
          @if (error()) {
            <div class="alert alert-danger" style="margin-bottom: 1rem">
              <lucide-icon [img]="icons.alert" [size]="18" /> {{ error() }}
            </div>
          }
          @if (locked()) {
            <div class="alert alert-info" style="margin-bottom: 1rem">
              <lucide-icon [img]="icons.info" [size]="18" />
              Esta votación está activa ahora mismo: puedes cambiar el nombre y la descripción, pero
              no su tipo ni sus items.
            </div>
          }
          <div class="field">
            <label for="name">Nombre</label>
            <input
              id="name"
              class="input"
              formControlName="name"
              maxlength="120"
              [class.invalid]="fieldError('name')"
            />
            @if (fieldError('name'); as msg) {
              <span class="field-error">{{ msg }}</span>
            }
          </div>
          <div class="field">
            <label for="description">Descripción breve</label>
            <textarea
              id="description"
              class="textarea"
              formControlName="description"
              maxlength="500"
            ></textarea>
            <span class="field-hint">{{ form.controls.description.value.length }}/500</span>
          </div>

          <div class="field">
            <label>Tipo de votación</label>
            <div class="types" role="radiogroup" aria-label="Tipo de votación">
              @for (t of votingTypes; track t.type) {
                <button
                  type="button"
                  class="type"
                  role="radio"
                  [attr.aria-checked]="type() === t.type"
                  [class.selected]="type() === t.type"
                  [disabled]="locked()"
                  (click)="type.set(t.type)"
                >
                  <lucide-icon [img]="t.icon" [size]="20" />
                  <span class="type-text">
                    <strong>{{ t.label }}</strong>
                    <span class="muted small">{{ t.description }}</span>
                  </span>
                </button>
              }
            </div>
          </div>
          @if (type() === 'LIMITED') {
            <div class="field" style="max-width: 320px">
              <label for="maxSelections">Número máximo de votos por persona</label>
              <input
                id="maxSelections"
                class="input"
                type="number"
                min="2"
                [max]="selected().length || 100"
                formControlName="maxSelections"
                [class.invalid]="fieldError('maxSelections')"
              />
              @if (fieldError('maxSelections'); as msg) {
                <span class="field-error">{{ msg }}</span>
              } @else {
                <span class="field-hint">
                  Entre 2 y el número de items de la votación{{
                    selected().length ? ' (' + selected().length + ')' : ''
                  }}.
                </span>
              }
            </div>
          }
        </div>

        <div class="card-body side">
          <div class="row" style="justify-content: space-between">
            <span class="label">Items de la votación</span>
            <span class="badge badge-primary">{{ selected().length }} seleccionados</span>
          </div>
          @if (allItems().length === 0) {
            <p class="muted small">
              No tienes items todavía. <a routerLink="/items/nuevo">Crear un item</a>
            </p>
          } @else {
            <input
              class="input"
              type="search"
              placeholder="Buscar items…"
              [value]="filter()"
              (input)="filter.set($any($event.target).value)"
            />
            <ul class="picker">
              @for (item of filtered(); track item.id) {
                <li>
                  <label [class.disabled]="locked()">
                    <input
                      type="checkbox"
                      [checked]="isSelected(item.id)"
                      (change)="toggle(item.id)"
                      [disabled]="locked()"
                    />
                    @if (item.imageUrl) {
                      <img [src]="item.imageUrl" [alt]="item.name" class="thumb" />
                    } @else {
                      <span class="thumb thumb-placeholder"
                        ><lucide-icon [img]="icons.imageOff" [size]="16"
                      /></span>
                    }
                    <span class="text">
                      <span class="truncate">{{ item.name }}</span>
                      <span class="muted small truncate">{{ item.description }}</span>
                    </span>
                  </label>
                </li>
              } @empty {
                <li class="muted small" style="padding: 0.5rem">
                  Ningún item coincide con la búsqueda
                </li>
              }
            </ul>
            @if (selected().length > 0) {
              <div>
                <span class="label">Orden en la papeleta</span>
                <ol class="order">
                  @for (id of selected(); track id; let i = $index, first = $first, last = $last) {
                    <li>
                      <span class="truncate">{{ itemName(id) }}</span>
                      <span class="row" style="gap: 0">
                        <button
                          type="button"
                          class="btn btn-ghost btn-icon btn-sm"
                          (click)="move(i, -1)"
                          [disabled]="first || locked()"
                          aria-label="Subir"
                        >
                          <lucide-icon [img]="icons.up" [size]="16" />
                        </button>
                        <button
                          type="button"
                          class="btn btn-ghost btn-icon btn-sm"
                          (click)="move(i, 1)"
                          [disabled]="last || locked()"
                          aria-label="Bajar"
                        >
                          <lucide-icon [img]="icons.down" [size]="16" />
                        </button>
                      </span>
                    </li>
                  }
                </ol>
              </div>
            }
          }
        </div>

        <div class="form-actions full">
          <a routerLink="/votaciones" class="btn btn-secondary">Cancelar</a>
          <button type="submit" class="btn btn-primary" [disabled]="busy()">
            @if (busy()) {
              <lucide-icon [img]="icons.loader" [size]="16" class="spin" />
            }
            {{ isEdit() ? 'Guardar cambios' : 'Crear votación' }}
          </button>
        </div>
      </form>
    }
  `,
  styles: `
    .layout {
      display: grid;
      grid-template-columns: 1fr 380px;
    }
    .side {
      border-left: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .label {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-2);
    }
    .types {
      display: grid;
      gap: 0.6rem;
    }
    .type {
      display: flex;
      align-items: center;
      gap: 0.8rem;
      text-align: left;
      padding: 0.75rem 0.9rem;
      border-radius: var(--radius-sm);
      border: 2px solid var(--border);
      background: var(--surface);
      font: inherit;
      color: inherit;
      cursor: pointer;
    }
    .type:hover:not(:disabled) {
      background: var(--surface-2);
    }
    .type.selected {
      border-color: var(--primary);
      background: var(--primary-soft);
      color: var(--primary-text);
    }
    .type:disabled {
      cursor: not-allowed;
      opacity: 0.7;
    }
    .type-text {
      display: flex;
      flex-direction: column;
      gap: 0.1rem;
    }
    .picker {
      list-style: none;
      margin: 0;
      padding: 0;
      max-height: 320px;
      overflow: auto;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
    }
    .picker li + li {
      border-top: 1px solid var(--border);
    }
    .picker label {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.5rem 0.6rem;
      cursor: pointer;
    }
    .picker label:hover {
      background: var(--surface-2);
    }
    .picker label.disabled {
      cursor: not-allowed;
      opacity: 0.7;
    }
    .text {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .thumb {
      width: 36px;
      height: 36px;
      flex-shrink: 0;
    }
    .order {
      margin: 0.35rem 0 0;
      padding-left: 1.4rem;
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      font-size: 0.9rem;
    }
    .order li {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
    }
    .full {
      grid-column: 1 / -1;
      padding: 0 1.25rem 1.25rem;
      margin-top: 0;
    }
    @media (max-width: 960px) {
      .layout {
        grid-template-columns: 1fr;
      }
      .side {
        border-left: 0;
        border-top: 1px solid var(--border);
      }
    }
  `,
})
export class VotingFormPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  readonly icons = ICONS;

  readonly id = input<string>();
  readonly isEdit = computed(() => !!this.id());

  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly locked = signal(false);
  readonly error = signal<string | null>(null);
  readonly serverErrors = signal<Record<string, string>>({});
  readonly allItems = signal<Item[]>([]);
  readonly selected = signal<number[]>([]);
  readonly filter = signal('');
  readonly type = signal<VotingType>('SINGLE');
  readonly votingTypes = VOTING_TYPES;

  readonly filtered = computed(() => {
    const q = this.filter().trim().toLowerCase();
    return q ? this.allItems().filter((i) => i.name.toLowerCase().includes(q)) : this.allItems();
  });

  readonly form = this.fb.group({
    name: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(120)]),
    description: this.fb.nonNullable.control('', Validators.maxLength(500)),
    maxSelections: this.fb.control<number | null>(null, [Validators.min(2), Validators.max(100)]),
  });

  ngOnInit(): void {
    void this.load();
  }

  private async load(): Promise<void> {
    try {
      const items = await this.api.listItems();
      this.allItems.set(items);
      const id = this.id();
      if (id) {
        const voting = await this.api.getVoting(Number(id));
        this.form.patchValue({
          name: voting.name,
          description: voting.description,
          maxSelections: voting.maxSelections,
        });
        this.type.set(voting.type);
        this.selected.set(voting.items.map((i) => i.id));
        this.locked.set(voting.hasActiveInstance);
      }
    } catch (err) {
      this.toast.error(describeError(err).message);
      await this.router.navigateByUrl('/votaciones');
    } finally {
      this.loading.set(false);
    }
  }

  fieldError(name: 'name' | 'maxSelections'): string | null {
    const server = this.serverErrors()[name];
    if (server) return server;
    const c = this.form.controls[name];
    if (!c.invalid || !(c.touched || this.form.dirty)) return null;
    if (c.hasError('required')) return 'El nombre es obligatorio';
    if (c.hasError('maxlength')) return 'Máximo 120 caracteres';
    if (c.hasError('min')) return 'Debe ser al menos 2';
    if (c.hasError('max')) return 'Demasiado alto';
    return 'Valor no válido';
  }

  isSelected(id: number): boolean {
    return this.selected().includes(id);
  }

  toggle(id: number): void {
    this.selected.update((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  move(index: number, delta: number): void {
    this.selected.update((ids) => {
      const next = [...ids];
      const target = index + delta;
      if (target < 0 || target >= next.length) return ids;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  itemName(id: number): string {
    return this.allItems().find((i) => i.id === id)?.name ?? `Item ${id}`;
  }

  async submit(): Promise<void> {
    this.form.markAllAsTouched();
    this.serverErrors.set({});
    if (this.form.invalid) return;
    this.busy.set(true);
    this.error.set(null);
    const v = this.form.getRawValue();
    const type = this.type();
    if (type === 'LIMITED' && (v.maxSelections === null || v.maxSelections < 2)) {
      this.error.set('Indica el número máximo de votos por persona (mínimo 2)');
      this.busy.set(false);
      return;
    }
    const req = {
      name: v.name,
      description: v.description,
      type,
      maxSelections: type === 'LIMITED' ? v.maxSelections : null,
      itemIds: this.selected(),
    };
    try {
      if (this.isEdit()) {
        await this.api.updateVoting(Number(this.id()), req);
        this.toast.success('Votación actualizada');
      } else {
        await this.api.createVoting(req);
        this.toast.success('Votación creada');
      }
      await this.router.navigateByUrl('/votaciones');
    } catch (err) {
      const { message, fields } = describeError(err);
      this.serverErrors.set(fields);
      this.error.set(Object.keys(fields).length ? 'Revisa los campos marcados' : message);
    } finally {
      this.busy.set(false);
    }
  }
}

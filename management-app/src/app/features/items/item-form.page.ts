import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ApiService } from '../../core/api.service';
import { describeError } from '../../core/errors';
import { ToastService } from '../../core/toast.service';
import { ICONS } from '../../shared/icons';
import { LoadingComponent } from '../../shared/loading.component';
import { PageHeaderComponent } from '../../shared/page-header.component';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

@Component({
  selector: 'app-item-form-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    LucideAngularModule,
    PageHeaderComponent,
    LoadingComponent,
  ],
  template: `
    <app-page-header [title]="isEdit() ? 'Editar item' : 'Nuevo item'">
      <a routerLink="/items" class="btn btn-secondary"
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
        </div>
        <div class="card-body side">
          <label class="label">Imagen (opcional)</label>
          <div class="preview" [class.empty]="!previewUrl()">
            @if (previewUrl(); as url) {
              <img [src]="url" alt="Vista previa" />
            } @else {
              <lucide-icon [img]="icons.image" [size]="32" />
              <span class="muted small">JPG, PNG o WebP · máx. 5 MB</span>
            }
          </div>
          <div class="row" style="flex-wrap: wrap">
            <label class="btn btn-secondary btn-sm">
              <lucide-icon [img]="icons.upload" [size]="15" />
              {{ previewUrl() ? 'Cambiar imagen' : 'Subir imagen' }}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hidden
                (change)="onFile($event)"
              />
            </label>
            @if (previewUrl()) {
              <button type="button" class="btn btn-ghost btn-sm danger" (click)="clearImage()">
                <lucide-icon [img]="icons.trash" [size]="15" /> Quitar
              </button>
            }
          </div>
          @if (imageError(); as msg) {
            <span class="field-error">{{ msg }}</span>
          }
        </div>
        <div class="form-actions full">
          <a routerLink="/items" class="btn btn-secondary">Cancelar</a>
          <button type="submit" class="btn btn-primary" [disabled]="busy()">
            @if (busy()) {
              <lucide-icon [img]="icons.loader" [size]="16" class="spin" />
            }
            {{ isEdit() ? 'Guardar cambios' : 'Crear item' }}
          </button>
        </div>
      </form>
    }
  `,
  styles: `
    .layout {
      display: grid;
      grid-template-columns: 1fr 300px;
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
    .preview {
      aspect-ratio: 4 / 3;
      border-radius: var(--radius-sm);
      overflow: hidden;
      background: var(--surface-2);
      border: 1px dashed var(--border);
      display: grid;
      place-items: center;
      align-content: center;
      gap: 0.4rem;
      color: var(--text-3);
    }
    .preview img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .full {
      grid-column: 1 / -1;
      padding: 0 1.25rem 1.25rem;
      margin-top: 0;
    }
    @media (max-width: 860px) {
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
export class ItemFormPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  readonly icons = ICONS;

  /** Id del item (route param), vacío al crear. */
  readonly id = input<string>();
  readonly isEdit = computed(() => !!this.id());

  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly serverErrors = signal<Record<string, string>>({});
  readonly imageError = signal<string | null>(null);

  private existingImageUrl = signal<string | null>(null);
  private file = signal<File | null>(null);
  private fileUrl = signal<string | null>(null);
  private removeImage = signal(false);
  readonly previewUrl = computed(
    () => this.fileUrl() ?? (this.removeImage() ? null : this.existingImageUrl()),
  );

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    description: ['', Validators.maxLength(500)],
  });

  ngOnInit(): void {
    void this.loadExisting();
  }

  private async loadExisting(): Promise<void> {
    const id = this.id();
    if (!id) return;
    this.loading.set(true);
    try {
      const item = await this.api.getItem(Number(id));
      this.form.patchValue({ name: item.name, description: item.description });
      this.existingImageUrl.set(item.imageUrl);
    } catch (err) {
      this.toast.error(describeError(err).message);
      await this.router.navigateByUrl('/items');
    } finally {
      this.loading.set(false);
    }
  }

  fieldError(name: 'name'): string | null {
    const server = this.serverErrors()[name];
    if (server) return server;
    const c = this.form.controls[name];
    if (!c.invalid || !(c.touched || this.form.dirty)) return null;
    if (c.hasError('required')) return 'El nombre es obligatorio';
    if (c.hasError('maxlength')) return 'Máximo 120 caracteres';
    return 'Valor no válido';
  }

  onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';
    this.imageError.set(null);
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      this.imageError.set('Formato no permitido. Usa JPG, PNG o WebP');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      this.imageError.set('La imagen supera los 5 MB');
      return;
    }
    this.revokePreview();
    this.file.set(file);
    this.fileUrl.set(URL.createObjectURL(file));
    this.removeImage.set(false);
  }

  clearImage(): void {
    this.revokePreview();
    this.file.set(null);
    this.fileUrl.set(null);
    this.removeImage.set(this.existingImageUrl() !== null);
    this.imageError.set(null);
  }

  async submit(): Promise<void> {
    this.form.markAllAsTouched();
    this.serverErrors.set({});
    if (this.form.invalid) return;
    this.busy.set(true);
    this.error.set(null);
    const data = {
      ...this.form.getRawValue(),
      image: this.file(),
      removeImage: this.removeImage(),
    };
    try {
      if (this.isEdit()) {
        await this.api.updateItem(Number(this.id()), data);
        this.toast.success('Item actualizado');
      } else {
        await this.api.createItem(data);
        this.toast.success('Item creado');
      }
      this.revokePreview();
      await this.router.navigateByUrl('/items');
    } catch (err) {
      const { message, fields } = describeError(err);
      this.serverErrors.set(fields);
      this.error.set(Object.keys(fields).length ? 'Revisa los campos marcados' : message);
    } finally {
      this.busy.set(false);
    }
  }

  private revokePreview(): void {
    const url = this.fileUrl();
    if (url) URL.revokeObjectURL(url);
  }
}

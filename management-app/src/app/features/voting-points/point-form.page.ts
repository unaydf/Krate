import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ApiService } from '../../core/api.service';
import { describeError } from '../../core/errors';
import { Voting, VotingPoint } from '../../core/models';
import { votingTypeLabel } from '../../core/voting-types';
import { ToastService } from '../../core/toast.service';
import { CopyButtonComponent } from '../../shared/copy-button.component';
import { ICONS } from '../../shared/icons';
import { LoadingComponent } from '../../shared/loading.component';
import { PageHeaderComponent } from '../../shared/page-header.component';

@Component({
  selector: 'app-point-form-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    LucideAngularModule,
    PageHeaderComponent,
    LoadingComponent,
    CopyButtonComponent,
  ],
  template: `
    <app-page-header [title]="isEdit() ? 'Editar punto de votación' : 'Nuevo punto de votación'">
      <a routerLink="/puntos" class="btn btn-secondary"
        ><lucide-icon [img]="icons.back" [size]="16" /> Volver</a
      >
    </app-page-header>

    @if (loading()) {
      <app-loading />
    } @else {
      <form
        class="card"
        [formGroup]="form"
        (ngSubmit)="submit()"
        novalidate
        style="max-width: 720px"
      >
        <div class="card-body">
          @if (error()) {
            <div class="alert alert-danger" style="margin-bottom: 1rem">
              <lucide-icon [img]="icons.alert" [size]="18" /> {{ error() }}
            </div>
          }
          @if (existing()?.activeInstance) {
            <div class="alert alert-info" style="margin-bottom: 1rem">
              <lucide-icon [img]="icons.info" [size]="18" />
              Este punto tiene una votación activa: no se puede cambiar la votación asignada hasta
              detenerla.
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
          </div>
          <div class="field">
            <label for="voting">Votación asignada</label>
            <select
              id="voting"
              class="select"
              formControlName="votingId"
              [attr.disabled]="existing()?.activeInstance ? '' : null"
            >
              <option [ngValue]="null">Sin votación asignada</option>
              @for (v of votings(); track v.id) {
                <option [ngValue]="v.id">
                  {{ v.name }} · {{ typeLabel(v.type, v.maxSelections) }} ·
                  {{ v.items.length }} items
                </option>
              }
            </select>
            <span class="field-hint"
              >Es la votación que se lanzará en este punto desde Inicio.</span
            >
          </div>
          @if (existing(); as p) {
            <div class="field">
              <label>Enlace público</label>
              <div class="row" style="flex-wrap: wrap">
                <a [href]="p.publicUrl" target="_blank" rel="noopener" class="mono">{{
                  p.publicUrl
                }}</a>
                <app-copy-button [value]="p.publicUrl" />
              </div>
              <span class="field-hint"
                >El enlace es fijo: no cambia aunque cambies la votación asignada.</span
              >
            </div>
          }
        </div>
        <div class="form-actions" style="padding: 0 1.25rem 1.25rem; margin-top: 0">
          <a routerLink="/puntos" class="btn btn-secondary">Cancelar</a>
          <button type="submit" class="btn btn-primary" [disabled]="busy()">
            @if (busy()) {
              <lucide-icon [img]="icons.loader" [size]="16" class="spin" />
            }
            {{ isEdit() ? 'Guardar cambios' : 'Crear punto' }}
          </button>
        </div>
      </form>
    }
  `,
})
export class PointFormPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  readonly icons = ICONS;

  readonly id = input<string>();
  readonly isEdit = computed(() => !!this.id());

  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly serverErrors = signal<Record<string, string>>({});
  readonly votings = signal<Voting[]>([]);
  readonly existing = signal<VotingPoint | null>(null);
  readonly typeLabel = votingTypeLabel;

  readonly form = this.fb.group({
    name: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(120)]),
    description: this.fb.nonNullable.control('', Validators.maxLength(500)),
    votingId: this.fb.control<number | null>(null),
  });

  ngOnInit(): void {
    void this.load();
  }

  private async load(): Promise<void> {
    try {
      this.votings.set(await this.api.listVotings());
      const id = this.id();
      if (id) {
        const point = await this.api.getPoint(Number(id));
        this.existing.set(point);
        this.form.patchValue({
          name: point.name,
          description: point.description,
          votingId: point.voting?.id ?? null,
        });
      }
    } catch (err) {
      this.toast.error(describeError(err).message);
      await this.router.navigateByUrl('/puntos');
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

  async submit(): Promise<void> {
    this.form.markAllAsTouched();
    this.serverErrors.set({});
    if (this.form.invalid) return;
    this.busy.set(true);
    this.error.set(null);
    const v = this.form.getRawValue();
    const req = { name: v.name, description: v.description, votingId: v.votingId };
    try {
      if (this.isEdit()) {
        await this.api.updatePoint(Number(this.id()), req);
        this.toast.success('Punto actualizado');
      } else {
        const created = await this.api.createPoint(req);
        this.toast.success(`Punto creado con código ${created.code}`);
      }
      await this.router.navigateByUrl('/puntos');
    } catch (err) {
      const { message, fields } = describeError(err);
      this.serverErrors.set(fields);
      this.error.set(Object.keys(fields).length ? 'Revisa los campos marcados' : message);
    } finally {
      this.busy.set(false);
    }
  }
}

import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../core/auth.service';
import { describeError } from '../../core/errors';
import { ICONS } from '../../shared/icons';
import { AuthLayoutComponent } from './auth-layout.component';

type Field = 'email' | 'name' | 'password';

@Component({
  selector: 'app-register-page',
  imports: [ReactiveFormsModule, RouterLink, LucideAngularModule, AuthLayoutComponent],
  template: `
    <app-auth-layout title="Crear cuenta" subtitle="Registra una cuenta de gestor para empezar">
      <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
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
            type="text"
            formControlName="name"
            autocomplete="name"
            [class.invalid]="invalid('name')"
          />
          @if (fieldError('name'); as msg) {
            <span class="field-error">{{ msg }}</span>
          }
        </div>
        <div class="field">
          <label for="email">Correo electrónico</label>
          <input
            id="email"
            class="input"
            type="email"
            formControlName="email"
            autocomplete="email"
            [class.invalid]="invalid('email')"
          />
          @if (fieldError('email'); as msg) {
            <span class="field-error">{{ msg }}</span>
          }
        </div>
        <div class="field">
          <label for="password">Contraseña</label>
          <input
            id="password"
            class="input"
            type="password"
            formControlName="password"
            autocomplete="new-password"
            [class.invalid]="invalid('password')"
          />
          @if (fieldError('password'); as msg) {
            <span class="field-error">{{ msg }}</span>
          } @else {
            <span class="field-hint">Mínimo 8 caracteres</span>
          }
        </div>
        <button
          type="submit"
          class="btn btn-primary"
          style="width: 100%; justify-content: center"
          [disabled]="busy()"
        >
          @if (busy()) {
            <lucide-icon [img]="icons.loader" [size]="16" class="spin" />
          }
          Crear cuenta
        </button>
      </form>
      <p class="muted small" style="margin-top: 1.25rem; text-align: center">
        ¿Ya tienes cuenta? <a routerLink="/login">Iniciar sesión</a>
      </p>
    </app-auth-layout>
  `,
})
export class RegisterPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly icons = ICONS;
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly serverErrors = signal<Record<string, string>>({});

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]],
  });

  invalid(name: Field): boolean {
    const c = this.form.controls[name];
    return (c.invalid && (c.touched || this.form.dirty)) || !!this.serverErrors()[name];
  }

  fieldError(name: Field): string | null {
    const server = this.serverErrors()[name];
    if (server) return server;
    const c = this.form.controls[name];
    if (!c.invalid || !(c.touched || this.form.dirty)) return null;
    if (c.hasError('required')) return 'Este campo es obligatorio';
    if (c.hasError('email')) return 'Introduce un correo válido';
    if (c.hasError('minlength')) return 'Debe tener al menos 8 caracteres';
    if (c.hasError('maxlength')) return 'Demasiado largo';
    return 'Valor no válido';
  }

  async submit(): Promise<void> {
    this.form.markAllAsTouched();
    this.serverErrors.set({});
    if (this.form.invalid) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      const { email, name, password } = this.form.getRawValue();
      await this.auth.register(email, name, password);
      await this.router.navigateByUrl('/');
    } catch (err) {
      const { message, fields } = describeError(err);
      this.serverErrors.set(fields);
      this.error.set(Object.keys(fields).length ? 'Revisa los campos marcados' : message);
    } finally {
      this.busy.set(false);
    }
  }
}

import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../core/auth.service';
import { describeError } from '../../core/errors';
import { ICONS } from '../../shared/icons';
import { AuthLayoutComponent } from './auth-layout.component';

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, RouterLink, LucideAngularModule, AuthLayoutComponent],
  template: `
    <app-auth-layout title="Iniciar sesión" subtitle="Accede al panel de gestión de votaciones">
      <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
        @if (error()) {
          <div class="alert alert-danger" style="margin-bottom: 1rem">
            <lucide-icon [img]="icons.alert" [size]="18" /> {{ error() }}
          </div>
        }
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
          @if (invalid('email')) {
            <span class="field-error">Introduce un correo válido</span>
          }
        </div>
        <div class="field">
          <label for="password">Contraseña</label>
          <input
            id="password"
            class="input"
            type="password"
            formControlName="password"
            autocomplete="current-password"
            [class.invalid]="invalid('password')"
          />
          @if (invalid('password')) {
            <span class="field-error">La contraseña es obligatoria</span>
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
          Entrar
        </button>
      </form>
      <p class="muted small" style="margin-top: 1.25rem; text-align: center">
        ¿No tienes cuenta? <a routerLink="/register">Crear una cuenta</a>
      </p>
    </app-auth-layout>
  `,
})
export class LoginPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly icons = ICONS;
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  invalid(name: 'email' | 'password'): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || this.form.dirty);
  }

  async submit(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      const { email, password } = this.form.getRawValue();
      await this.auth.login(email, password);
      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/';
      await this.router.navigateByUrl(returnUrl);
    } catch (err) {
      this.error.set(describeError(err).message);
    } finally {
      this.busy.set(false);
    }
  }
}

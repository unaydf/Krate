import { Component, input } from '@angular/core';

@Component({
  selector: 'app-auth-layout',
  template: `
    <div class="auth">
      <div class="panel card">
        <div class="brand">
          <img class="logo" src="favicon.svg" alt="" />
          <span>Krate</span>
        </div>
        <h1>{{ title() }}</h1>
        <p class="muted">{{ subtitle() }}</p>
        <ng-content />
      </div>
    </div>
  `,
  styles: `
    .auth {
      min-height: 100dvh;
      display: grid;
      place-items: center;
      padding: 1.5rem;
    }
    .panel {
      width: min(420px, 100%);
      padding: 2rem;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      font-weight: 700;
      font-size: 1.1rem;
      margin-bottom: 1.5rem;
    }
    .logo {
      width: 36px;
      height: 36px;
    }
    h1 {
      margin-bottom: 0.25rem;
    }
    p.muted {
      margin-bottom: 1.5rem;
    }
  `,
})
export class AuthLayoutComponent {
  readonly title = input.required<string>();
  readonly subtitle = input('');
}

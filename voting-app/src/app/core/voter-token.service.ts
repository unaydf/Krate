import { Injectable } from '@angular/core';

const KEY = 'krate.voter-token';

/** Identificador anónimo del dispositivo, compartido entre todos los puntos de votación. */
@Injectable({ providedIn: 'root' })
export class VoterTokenService {
  private memory: string | null = null;

  get(): string {
    if (this.memory) return this.memory;
    let token: string | null = null;
    try {
      token = localStorage.getItem(KEY);
    } catch {
      token = null;
    }
    if (!token) {
      token = generateToken();
      try {
        localStorage.setItem(KEY, token);
      } catch {
        // sin almacenamiento: el token vive solo en memoria
      }
    }
    this.memory = token;
    return token;
  }
}

function generateToken(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

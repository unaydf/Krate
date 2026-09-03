import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { PublicPoint } from './models';
import { VoterTokenService } from './voter-token.service';

@Injectable({ providedIn: 'root' })
export class PublicApiService {
  private readonly http = inject(HttpClient);
  private readonly voter = inject(VoterTokenService);

  getPoint(code: string): Promise<PublicPoint> {
    const headers = new HttpHeaders({ 'X-Voter-Token': this.voter.get() });
    return firstValueFrom(
      this.http.get<PublicPoint>(`/api/public/points/${encodeURIComponent(code)}`, { headers }),
    );
  }

  /** Envía la papeleta: ids elegidos en orden de preferencia (el orden solo importa en RANKING). */
  vote(code: string, itemIds: number[]): Promise<void> {
    return firstValueFrom(
      this.http.post<void>(`/api/public/points/${encodeURIComponent(code)}/votes`, {
        itemIds,
        voterToken: this.voter.get(),
      }),
    );
  }
}

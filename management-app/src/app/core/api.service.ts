import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  Instance,
  InstanceStatsDetail,
  InstanceStatsSummary,
  InstanceStatus,
  Item,
  Voting,
  VotingPoint,
  VotingPointRequest,
  VotingRequest,
} from './models';

export interface ItemFormData {
  name: string;
  description: string;
  image: File | null;
  removeImage: boolean;
}

/** Cliente tipado de la API REST de gestión. */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  // Items
  listItems(): Promise<Item[]> {
    return firstValueFrom(this.http.get<Item[]>('/api/items'));
  }
  getItem(id: number): Promise<Item> {
    return firstValueFrom(this.http.get<Item>(`/api/items/${id}`));
  }
  createItem(data: ItemFormData): Promise<Item> {
    return firstValueFrom(this.http.post<Item>('/api/items', toMultipart(data)));
  }
  updateItem(id: number, data: ItemFormData): Promise<Item> {
    return firstValueFrom(this.http.put<Item>(`/api/items/${id}`, toMultipart(data)));
  }
  deleteItem(id: number): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`/api/items/${id}`));
  }

  // Votaciones
  listVotings(): Promise<Voting[]> {
    return firstValueFrom(this.http.get<Voting[]>('/api/votings'));
  }
  getVoting(id: number): Promise<Voting> {
    return firstValueFrom(this.http.get<Voting>(`/api/votings/${id}`));
  }
  createVoting(req: VotingRequest): Promise<Voting> {
    return firstValueFrom(this.http.post<Voting>('/api/votings', req));
  }
  updateVoting(id: number, req: VotingRequest): Promise<Voting> {
    return firstValueFrom(this.http.put<Voting>(`/api/votings/${id}`, req));
  }
  deleteVoting(id: number): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`/api/votings/${id}`));
  }

  // Puntos de votación
  listPoints(): Promise<VotingPoint[]> {
    return firstValueFrom(this.http.get<VotingPoint[]>('/api/voting-points'));
  }
  getPoint(id: number): Promise<VotingPoint> {
    return firstValueFrom(this.http.get<VotingPoint>(`/api/voting-points/${id}`));
  }
  createPoint(req: VotingPointRequest): Promise<VotingPoint> {
    return firstValueFrom(this.http.post<VotingPoint>('/api/voting-points', req));
  }
  updatePoint(id: number, req: VotingPointRequest): Promise<VotingPoint> {
    return firstValueFrom(this.http.put<VotingPoint>(`/api/voting-points/${id}`, req));
  }
  deletePoint(id: number): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`/api/voting-points/${id}`));
  }

  // Instancias
  listInstances(status?: InstanceStatus): Promise<Instance[]> {
    const params = status ? new HttpParams().set('status', status) : undefined;
    return firstValueFrom(this.http.get<Instance[]>('/api/instances', { params }));
  }
  launch(votingPointId: number): Promise<Instance> {
    return firstValueFrom(this.http.post<Instance>('/api/instances', { votingPointId }));
  }
  stop(instanceId: number): Promise<Instance> {
    return firstValueFrom(this.http.post<Instance>(`/api/instances/${instanceId}/stop`, {}));
  }

  // Estadísticas
  listStats(): Promise<InstanceStatsSummary[]> {
    return firstValueFrom(this.http.get<InstanceStatsSummary[]>('/api/stats/instances'));
  }
  statsDetail(id: number): Promise<InstanceStatsDetail> {
    return firstValueFrom(this.http.get<InstanceStatsDetail>(`/api/stats/instances/${id}`));
  }
}

function toMultipart(data: ItemFormData): FormData {
  const form = new FormData();
  form.append('name', data.name);
  form.append('description', data.description);
  if (data.image) form.append('image', data.image, data.image.name);
  if (data.removeImage) form.append('removeImage', 'true');
  return form;
}

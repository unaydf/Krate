export interface User {
  id: number;
  email: string;
  name: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Item {
  id: number;
  name: string;
  description: string;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export type VotingType = 'SINGLE' | 'LIMITED' | 'RANKING';

export interface Voting {
  id: number;
  name: string;
  description: string;
  type: VotingType;
  maxSelections: number | null;
  items: Item[];
  hasActiveInstance: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VotingRequest {
  name: string;
  description: string;
  type: VotingType;
  maxSelections: number | null;
  itemIds: number[];
}

export interface VotingSummary {
  id: number;
  name: string;
  type: VotingType;
  maxSelections: number | null;
}

export type InstanceStatus = 'ACTIVE' | 'CLOSED';

export interface Instance {
  id: number;
  votingPointId: number;
  votingPointName: string;
  code: string;
  publicUrl: string;
  votingId: number;
  votingName: string;
  status: InstanceStatus;
  startedAt: string;
  endedAt: string | null;
}

export interface VotingPoint {
  id: number;
  name: string;
  description: string;
  code: string;
  publicUrl: string;
  voting: VotingSummary | null;
  activeInstance: Instance | null;
  createdAt: string;
}

export interface VotingPointRequest {
  name: string;
  description: string;
  votingId: number | null;
}

export interface InstanceStatsSummary {
  id: number;
  votingPointName: string;
  votingName: string;
  status: InstanceStatus;
  startedAt: string;
  endedAt: string | null;
  totalVotes: number;
}

export interface ItemResult {
  itemId: number;
  itemName: string;
  imageUrl: string | null;
  /** Papeletas que incluyen el item. */
  votes: number;
  /** Métrica principal: igual a votes salvo en RANKING (puntos Borda). */
  points: number;
  /** Posición media, solo en RANKING. */
  averageRank: number | null;
  /** Veces elegido en primer lugar, solo en RANKING. */
  firstPlaces: number;
  percentage: number;
  deleted: boolean;
}

export interface InstanceStatsDetail {
  instance: InstanceStatsSummary;
  type: VotingType;
  maxSelections: number | null;
  scoringLabel: string;
  results: ItemResult[];
}

/** Cuerpo de error RFC 9457 que devuelve el backend. */
export interface ProblemDetail {
  title?: string;
  status?: number;
  detail?: string;
  errors?: Record<string, string>;
}

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
  votingPointId: number;
  votingPointName: string;
  votingId: number;
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

export interface PointRef {
  id: number;
  name: string;
}

/** Resultados agregados de una votación: todos sus lanzamientos o solo los del punto filtrado. */
export interface VotingStatsDetail {
  votingId: number;
  votingName: string;
  votingDeleted: boolean;
  type: VotingType;
  maxSelections: number | null;
  scoringLabel: string;
  /** Punto por el que se ha filtrado, o null si se suman todos. */
  votingPointId: number | null;
  instanceCount: number;
  totalVotes: number;
  /** Puntos con algún lanzamiento de la votación (sin aplicar el filtro). */
  points: PointRef[];
  results: ItemResult[];
  instances: InstanceStatsSummary[];
}

/** Resultado de un item en un lanzamiento concreto. */
export interface ItemParticipation {
  instanceId: number;
  votingName: string;
  votingPointName: string;
  type: VotingType;
  scoringLabel: string;
  status: InstanceStatus;
  startedAt: string;
  endedAt: string | null;
  totalBallots: number;
  /** Puesto en la clasificación del lanzamiento (1 = primero). */
  position: number;
  /** Items clasificados en ese lanzamiento. */
  candidates: number;
  votes: number;
  points: number;
  averageRank: number | null;
  firstPlaces: number;
  percentage: number;
}

/** Histórico de un item a lo largo de los lanzamientos en los que fue candidato. */
export interface ItemHistory {
  itemId: number;
  itemName: string;
  imageUrl: string | null;
  deleted: boolean;
  participations: number;
  totalVotes: number;
  wins: number;
  averagePercentage: number | null;
  history: ItemParticipation[];
}

/** Cuerpo de error RFC 9457 que devuelve el backend. */
export interface ProblemDetail {
  title?: string;
  status?: number;
  detail?: string;
  errors?: Record<string, string>;
}

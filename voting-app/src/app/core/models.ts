export type PublicStatus = 'ACTIVE' | 'INACTIVE';

export interface PublicItem {
  id: number;
  name: string;
  description: string;
  imageUrl: string | null;
}

export type VotingType = 'SINGLE' | 'LIMITED' | 'RANKING';

export interface PublicVoting {
  name: string;
  description: string;
  type: VotingType;
  maxSelections: number | null;
  instructions: string;
  items: PublicItem[];
}

export interface PublicPoint {
  pointName: string;
  status: PublicStatus;
  instanceId: number | null;
  alreadyVoted: boolean;
  voting: PublicVoting | null;
}

export interface ProblemDetail {
  detail?: string;
  status?: number;
}

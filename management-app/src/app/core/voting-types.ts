import { ICONS } from '../shared/icons';
import { VotingType } from './models';

export interface VotingTypeInfo {
  type: VotingType;
  label: string;
  description: string;
  icon: (typeof ICONS)[keyof typeof ICONS];
}

/** Catálogo de tipos de votación tal y como se presentan al gestor. */
export const VOTING_TYPES: readonly VotingTypeInfo[] = [
  {
    type: 'SINGLE',
    label: 'Voto único',
    description: 'Cada persona elige una sola opción.',
    icon: ICONS.typeSingle,
  },
  {
    type: 'LIMITED',
    label: 'Votos limitados',
    description: 'Cada persona puede marcar hasta un número máximo de opciones.',
    icon: ICONS.typeLimited,
  },
  {
    type: 'RANKING',
    label: 'Ranking',
    description: 'Cada persona ordena las opciones de mejor a peor. Se puntúa con el método Borda.',
    icon: ICONS.typeRanking,
  },
];

/** Etiqueta corta para listas y badges, p. ej. "Hasta 3 votos". */
export function votingTypeLabel(type: VotingType, maxSelections: number | null): string {
  switch (type) {
    case 'LIMITED':
      return maxSelections ? `Hasta ${maxSelections} votos` : 'Votos limitados';
    case 'RANKING':
      return 'Ranking';
    default:
      return 'Voto único';
  }
}

export function votingTypeIcon(type: VotingType) {
  return VOTING_TYPES.find((t) => t.type === type)?.icon ?? ICONS.typeSingle;
}

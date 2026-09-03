package com.estinf.Krate.voting.strategy;

/** Tipos de votacion disponibles. Cada uno tiene una {@link VotingStrategy}. */
public enum VotingType {
	/** Un unico item por papeleta. */
	SINGLE,
	/** Hasta N items por papeleta. */
	LIMITED,
	/** Items ordenados de mejor a peor; puntuacion Borda. */
	RANKING
}

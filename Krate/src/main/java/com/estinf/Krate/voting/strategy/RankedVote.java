package com.estinf.Krate.voting.strategy;

/** Una seleccion registrada: item elegido y, en RANKING, su posicion (1 = mejor). */
public record RankedVote(Long itemId, Integer rank) {
}

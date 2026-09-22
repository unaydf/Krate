package com.estinf.Krate.vote;

import com.estinf.Krate.voting.strategy.RankedVote;

/** Seleccion de una papeleta junto con la instancia a la que pertenece, para agrupar por lanzamiento. */
public record InstanceRankedVote(Long instanceId, Long itemId, Integer rank) {

	public RankedVote toRankedVote() {
		return new RankedVote(itemId, rank);
	}
}

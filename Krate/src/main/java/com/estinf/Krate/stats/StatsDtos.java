package com.estinf.Krate.stats;

import java.time.Instant;
import java.util.List;

import com.estinf.Krate.instance.InstanceStatus;
import com.estinf.Krate.voting.strategy.VotingType;

public final class StatsDtos {

	private StatsDtos() {
	}

	public record InstanceStatsSummary(Long id, String votingPointName, String votingName, InstanceStatus status,
			Instant startedAt, Instant endedAt, long totalVotes) {
	}

	/**
	 * Resultado de un item.
	 * votes: papeletas que lo incluyen · points: metrica principal (igual a votes salvo en RANKING, donde son puntos Borda)
	 * averageRank: posicion media (solo RANKING) · firstPlaces: veces elegido primero (solo RANKING)
	 * percentage: sobre el total de papeletas (SINGLE/LIMITED) o sobre el maximo de puntos posible (RANKING)
	 */
	public record ItemResult(Long itemId, String itemName, String imageUrl, long votes, long points, Double averageRank,
			long firstPlaces, double percentage, boolean deleted) {
	}

	public record InstanceStatsDetail(InstanceStatsSummary instance, VotingType type, Integer maxSelections,
			String scoringLabel, List<ItemResult> results) {
	}
}

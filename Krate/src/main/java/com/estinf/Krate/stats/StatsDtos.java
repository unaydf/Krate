package com.estinf.Krate.stats;

import java.time.Instant;
import java.util.List;

import com.estinf.Krate.instance.InstanceStatus;
import com.estinf.Krate.voting.strategy.VotingType;

public final class StatsDtos {

	private StatsDtos() {
	}

	public record InstanceStatsSummary(Long id, Long votingPointId, String votingPointName, Long votingId,
			String votingName, InstanceStatus status, Instant startedAt, Instant endedAt, long totalVotes) {
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

	/** Punto de votacion referenciado desde las estadisticas (para selectores). */
	public record PointRef(Long id, String name) {
	}

	/**
	 * Resultados agregados de una votacion: suma de todos sus lanzamientos, o solo de los del punto indicado.
	 * points: puntos con algun lanzamiento de la votacion (sin aplicar el filtro) · results e instances: con el filtro aplicado
	 */
	public record VotingStatsDetail(Long votingId, String votingName, boolean votingDeleted, VotingType type,
			Integer maxSelections, String scoringLabel, Long votingPointId, int instanceCount, long totalVotes,
			List<PointRef> points, List<ItemResult> results, List<InstanceStatsSummary> instances) {
	}

	/**
	 * Resultado de un item en un lanzamiento concreto.
	 * position: puesto en la clasificacion del lanzamiento (1 = primero) · candidates: items clasificados
	 */
	public record ItemParticipation(Long instanceId, String votingName, String votingPointName, VotingType type,
			String scoringLabel, InstanceStatus status, Instant startedAt, Instant endedAt, long totalBallots,
			int position, int candidates, long votes, long points, Double averageRank, long firstPlaces,
			double percentage) {
	}

	/**
	 * Historico de un item a lo largo de todos los lanzamientos en los que fue candidato.
	 * wins: veces que quedo primero con algun voto · averagePercentage: media del porcentaje por lanzamiento (null si no hay)
	 */
	public record ItemHistory(Long itemId, String itemName, String imageUrl, boolean deleted, int participations,
			long totalVotes, long wins, Double averagePercentage, List<ItemParticipation> history) {
	}
}

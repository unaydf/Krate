package com.estinf.Krate.voting.strategy;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import com.estinf.Krate.common.BadRequestException;
import com.estinf.Krate.common.PublicUrls;
import com.estinf.Krate.item.Item;
import com.estinf.Krate.stats.StatsDtos.ItemResult;

/** Utilidades compartidas por las estrategias. */
final class StrategySupport {

	private StrategySupport() {
	}

	/** Comprueba que los ids son distintos y pertenecen a la votacion. */
	static void requireDistinctAndAllowed(List<Long> allowedItemIds, List<Long> chosenItemIds) {
		if (chosenItemIds == null || chosenItemIds.isEmpty()) {
			throw new BadRequestException("Debes elegir al menos una opción");
		}
		Set<Long> seen = new HashSet<>();
		Set<Long> allowed = new HashSet<>(allowedItemIds);
		for (Long id : chosenItemIds) {
			if (id == null || !allowed.contains(id)) {
				throw new BadRequestException("Alguna de las opciones elegidas no pertenece a esta votación");
			}
			if (!seen.add(id)) {
				throw new BadRequestException("No puedes elegir la misma opción dos veces");
			}
		}
	}

	/** Recuento simple: papeletas que incluyen cada item, porcentaje sobre el total de papeletas. */
	static List<ItemResult> countBallots(List<Item> candidates, List<RankedVote> votes, long totalBallots, PublicUrls urls) {
		Map<Long, Long> counts = votes.stream()
			.collect(Collectors.groupingBy(RankedVote::itemId, Collectors.counting()));
		return candidates.stream()
			.map(item -> {
				long n = counts.getOrDefault(item.getId(), 0L);
				return new ItemResult(item.getId(), item.getName(), urls.image(item.getImagePath()),
					n, n, null, n, percentage(n, totalBallots), item.isDeleted());
			})
			.sorted((a, b) -> Long.compare(b.votes(), a.votes()))
			.toList();
	}

	static double percentage(double value, double max) {
		return max <= 0 ? 0.0 : Math.round(value * 1000.0 / max) / 10.0;
	}

	static <T> Map<Long, T> byId(List<T> list, Function<T, Long> idOf) {
		return list.stream().collect(Collectors.toMap(idOf, Function.identity(), (a, b) -> a));
	}
}

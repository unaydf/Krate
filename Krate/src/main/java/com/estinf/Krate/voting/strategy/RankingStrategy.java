package com.estinf.Krate.voting.strategy;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Component;

import com.estinf.Krate.common.BadRequestException;
import com.estinf.Krate.common.PublicUrls;
import com.estinf.Krate.item.Item;
import com.estinf.Krate.stats.StatsDtos.ItemResult;

/**
 * Ranking: el votante ordena los items que quiera de mejor a peor.
 * Puntuacion Borda: con M items en la votacion, la posicion p recibe M - p + 1 puntos.
 */
@Component
public class RankingStrategy implements VotingStrategy {

	private final PublicUrls urls;

	public RankingStrategy(PublicUrls urls) {
		this.urls = urls;
	}

	@Override
	public VotingType type() {
		return VotingType.RANKING;
	}

	@Override
	public void validateConfig(Integer maxSelections, int itemCount) {
		if (maxSelections != null) {
			throw new BadRequestException("El número máximo de votos solo se aplica a las votaciones de votos limitados");
		}
	}

	@Override
	public void validateBallot(List<Long> allowedItemIds, Integer maxSelections, List<Long> chosenItemIds) {
		StrategySupport.requireDistinctAndAllowed(allowedItemIds, chosenItemIds);
	}

	@Override
	public List<ItemResult> score(List<Item> candidates, List<RankedVote> votes, long totalBallots) {
		int m = candidates.size();
		Map<Long, long[]> acc = new HashMap<>(); // itemId -> {puntos, apariciones, sumaPosiciones, primerosPuestos}
		for (RankedVote v : votes) {
			int rank = v.rank() == null ? 1 : v.rank();
			long[] a = acc.computeIfAbsent(v.itemId(), k -> new long[4]);
			a[0] += Math.max(0, m - rank + 1);
			a[1]++;
			a[2] += rank;
			if (rank == 1) {
				a[3]++;
			}
		}
		double maxPoints = (double) totalBallots * m;
		List<ItemResult> results = new ArrayList<>();
		for (Item item : candidates) {
			long[] a = acc.getOrDefault(item.getId(), new long[4]);
			Double avg = a[1] == 0 ? null : Math.round(a[2] * 100.0 / a[1]) / 100.0;
			results.add(new ItemResult(item.getId(), item.getName(), urls.image(item.getImagePath()),
				a[1], a[0], avg, a[3], StrategySupport.percentage(a[0], maxPoints), item.isDeleted()));
		}
		results.sort(Comparator.comparingLong(ItemResult::points).reversed()
			.thenComparing(r -> r.averageRank() == null ? Double.MAX_VALUE : r.averageRank()));
		return results;
	}

	@Override
	public String instructions(Integer maxSelections) {
		return "Toca las opciones en orden de preferencia, de mejor a peor. Puedes ordenar solo las que quieras.";
	}

	@Override
	public String scoringLabel() {
		return "puntos";
	}
}

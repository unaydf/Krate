package com.estinf.Krate.voting.strategy;

import java.util.List;

import org.springframework.stereotype.Component;

import com.estinf.Krate.common.BadRequestException;
import com.estinf.Krate.common.PublicUrls;
import com.estinf.Krate.item.Item;
import com.estinf.Krate.stats.StatsDtos.ItemResult;

/** Votos limitados: entre 1 y N items distintos por papeleta. */
@Component
public class LimitedChoiceStrategy implements VotingStrategy {

	private final PublicUrls urls;

	public LimitedChoiceStrategy(PublicUrls urls) {
		this.urls = urls;
	}

	@Override
	public VotingType type() {
		return VotingType.LIMITED;
	}

	@Override
	public void validateConfig(Integer maxSelections, int itemCount) {
		if (maxSelections == null) {
			throw new BadRequestException("Indica el número máximo de votos por persona");
		}
		if (maxSelections < 2) {
			throw new BadRequestException("El número máximo de votos debe ser al menos 2; para un solo voto usa el tipo de voto único");
		}
		if (itemCount > 0 && maxSelections > itemCount) {
			throw new BadRequestException("El número máximo de votos no puede superar el número de items de la votación");
		}
	}

	@Override
	public void validateBallot(List<Long> allowedItemIds, Integer maxSelections, List<Long> chosenItemIds) {
		StrategySupport.requireDistinctAndAllowed(allowedItemIds, chosenItemIds);
		int max = maxSelections == null ? allowedItemIds.size() : maxSelections;
		if (chosenItemIds.size() > max) {
			throw new BadRequestException("En esta votación puedes elegir como máximo " + max + " opciones");
		}
	}

	@Override
	public List<ItemResult> score(List<Item> candidates, List<RankedVote> votes, long totalBallots) {
		return StrategySupport.countBallots(candidates, votes, totalBallots, urls);
	}

	@Override
	public String instructions(Integer maxSelections) {
		return "Elige hasta " + maxSelections + " opciones y confirma tu voto.";
	}

	@Override
	public String scoringLabel() {
		return "votos";
	}
}

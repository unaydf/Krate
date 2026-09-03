package com.estinf.Krate.voting.strategy;

import java.util.List;

import org.springframework.stereotype.Component;

import com.estinf.Krate.common.BadRequestException;
import com.estinf.Krate.common.PublicUrls;
import com.estinf.Krate.item.Item;
import com.estinf.Krate.stats.StatsDtos.ItemResult;

/** Voto unico: exactamente un item por papeleta. */
@Component
public class SingleChoiceStrategy implements VotingStrategy {

	private final PublicUrls urls;

	public SingleChoiceStrategy(PublicUrls urls) {
		this.urls = urls;
	}

	@Override
	public VotingType type() {
		return VotingType.SINGLE;
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
		if (chosenItemIds.size() != 1) {
			throw new BadRequestException("En esta votación solo puedes elegir una opción");
		}
	}

	@Override
	public List<ItemResult> score(List<Item> candidates, List<RankedVote> votes, long totalBallots) {
		return StrategySupport.countBallots(candidates, votes, totalBallots, urls);
	}

	@Override
	public String instructions(Integer maxSelections) {
		return "Elige una opción y confirma tu voto.";
	}

	@Override
	public String scoringLabel() {
		return "votos";
	}
}

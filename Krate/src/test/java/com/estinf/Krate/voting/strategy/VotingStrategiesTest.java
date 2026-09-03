package com.estinf.Krate.voting.strategy;

import static com.estinf.Krate.voting.strategy.StrategyTestSupport.urls;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;

import org.junit.jupiter.api.Test;

class VotingStrategiesTest {

	@Test
	void resolvesEveryTypeAndDefaultsToSingle() {
		var registry = new VotingStrategies(List.of(
			new SingleChoiceStrategy(urls()), new LimitedChoiceStrategy(urls()), new RankingStrategy(urls())));
		for (VotingType type : VotingType.values()) {
			assertThat(registry.forType(type).type()).isEqualTo(type);
		}
		assertThat(registry.forType(null).type()).isEqualTo(VotingType.SINGLE);
	}

	@Test
	void failsFastIfAStrategyIsMissing() {
		assertThatThrownBy(() -> new VotingStrategies(List.of(new SingleChoiceStrategy(urls()))))
			.isInstanceOf(IllegalStateException.class)
			.hasMessageContaining("LIMITED");
	}
}

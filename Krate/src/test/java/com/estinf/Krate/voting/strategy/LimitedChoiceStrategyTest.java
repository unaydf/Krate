package com.estinf.Krate.voting.strategy;

import static com.estinf.Krate.voting.strategy.StrategyTestSupport.item;
import static com.estinf.Krate.voting.strategy.StrategyTestSupport.urls;
import static com.estinf.Krate.voting.strategy.StrategyTestSupport.vote;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;

import org.junit.jupiter.api.Test;

import com.estinf.Krate.common.BadRequestException;
import com.estinf.Krate.stats.StatsDtos.ItemResult;

class LimitedChoiceStrategyTest {

	private final LimitedChoiceStrategy strategy = new LimitedChoiceStrategy(urls());

	@Test
	void configRequiresMaxBetweenTwoAndItemCount() {
		assertThatThrownBy(() -> strategy.validateConfig(null, 3)).isInstanceOf(BadRequestException.class);
		assertThatThrownBy(() -> strategy.validateConfig(1, 3)).isInstanceOf(BadRequestException.class);
		assertThatThrownBy(() -> strategy.validateConfig(4, 3)).isInstanceOf(BadRequestException.class);
		assertThatCode(() -> strategy.validateConfig(3, 3)).doesNotThrowAnyException();
		// Sin items todavia (al crear) solo se exige el minimo
		assertThatCode(() -> strategy.validateConfig(5, 0)).doesNotThrowAnyException();
	}

	@Test
	void ballotAllowsBetweenOneAndMaxDistinctItems() {
		List<Long> allowed = List.of(1L, 2L, 3L);
		assertThatCode(() -> strategy.validateBallot(allowed, 2, List.of(1L))).doesNotThrowAnyException();
		assertThatCode(() -> strategy.validateBallot(allowed, 2, List.of(1L, 3L))).doesNotThrowAnyException();
		assertThatThrownBy(() -> strategy.validateBallot(allowed, 2, List.of(1L, 2L, 3L))).isInstanceOf(BadRequestException.class);
		assertThatThrownBy(() -> strategy.validateBallot(allowed, 2, List.of(1L, 1L))).isInstanceOf(BadRequestException.class);
		assertThatThrownBy(() -> strategy.validateBallot(allowed, 2, List.of())).isInstanceOf(BadRequestException.class);
	}

	@Test
	void scoreCountsBallotsThatIncludeEachItem() {
		var candidates = List.of(item(1, "A"), item(2, "B"), item(3, "C"));
		// 2 papeletas: [A,B] y [B]
		var votes = List.of(vote(1, null), vote(2, null), vote(2, null));
		List<ItemResult> results = strategy.score(candidates, votes, 2);

		assertThat(results.get(0).itemName()).isEqualTo("B");
		assertThat(results.get(0).votes()).isEqualTo(2);
		assertThat(results.get(0).percentage()).isEqualTo(100.0);
		assertThat(results.get(1).itemName()).isEqualTo("A");
		assertThat(results.get(1).percentage()).isEqualTo(50.0);
	}

	@Test
	void metadata() {
		assertThat(strategy.type()).isEqualTo(VotingType.LIMITED);
		assertThat(strategy.instructions(3)).contains("hasta 3");
	}
}

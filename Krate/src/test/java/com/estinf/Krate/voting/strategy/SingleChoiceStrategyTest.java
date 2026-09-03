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

class SingleChoiceStrategyTest {

	private final SingleChoiceStrategy strategy = new SingleChoiceStrategy(urls());

	@Test
	void configRejectsMaxSelections() {
		assertThatCode(() -> strategy.validateConfig(null, 0)).doesNotThrowAnyException();
		assertThatThrownBy(() -> strategy.validateConfig(2, 3)).isInstanceOf(BadRequestException.class);
	}

	@Test
	void ballotMustHaveExactlyOneAllowedItem() {
		List<Long> allowed = List.of(1L, 2L, 3L);
		assertThatCode(() -> strategy.validateBallot(allowed, null, List.of(2L))).doesNotThrowAnyException();
		assertThatThrownBy(() -> strategy.validateBallot(allowed, null, List.of())).isInstanceOf(BadRequestException.class);
		assertThatThrownBy(() -> strategy.validateBallot(allowed, null, List.of(1L, 2L))).isInstanceOf(BadRequestException.class);
		assertThatThrownBy(() -> strategy.validateBallot(allowed, null, List.of(9L))).isInstanceOf(BadRequestException.class);
	}

	@Test
	void scoreCountsBallotsPerItem() {
		var candidates = List.of(item(1, "A"), item(2, "B"), item(3, "C"));
		var votes = List.of(vote(1, null), vote(1, null), vote(2, null));
		List<ItemResult> results = strategy.score(candidates, votes, 3);

		assertThat(results).extracting(ItemResult::itemName).containsExactly("A", "B", "C");
		assertThat(results.get(0).votes()).isEqualTo(2);
		assertThat(results.get(0).points()).isEqualTo(2);
		assertThat(results.get(0).percentage()).isEqualTo(66.7);
		assertThat(results.get(0).averageRank()).isNull();
		assertThat(results.get(2).votes()).isZero();
		assertThat(results.get(2).percentage()).isZero();
	}

	@Test
	void metadata() {
		assertThat(strategy.type()).isEqualTo(VotingType.SINGLE);
		assertThat(strategy.scoringLabel()).isEqualTo("votos");
		assertThat(strategy.instructions(null)).contains("una opción");
	}
}

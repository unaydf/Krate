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

class RankingStrategyTest {

	private final RankingStrategy strategy = new RankingStrategy(urls());

	@Test
	void configRejectsMaxSelections() {
		assertThatCode(() -> strategy.validateConfig(null, 5)).doesNotThrowAnyException();
		assertThatThrownBy(() -> strategy.validateConfig(2, 5)).isInstanceOf(BadRequestException.class);
	}

	@Test
	void ballotAllowsPartialOrderWithDistinctAllowedItems() {
		List<Long> allowed = List.of(1L, 2L, 3L);
		assertThatCode(() -> strategy.validateBallot(allowed, null, List.of(3L))).doesNotThrowAnyException();
		assertThatCode(() -> strategy.validateBallot(allowed, null, List.of(3L, 1L, 2L))).doesNotThrowAnyException();
		assertThatThrownBy(() -> strategy.validateBallot(allowed, null, List.of())).isInstanceOf(BadRequestException.class);
		assertThatThrownBy(() -> strategy.validateBallot(allowed, null, List.of(1L, 1L))).isInstanceOf(BadRequestException.class);
		assertThatThrownBy(() -> strategy.validateBallot(allowed, null, List.of(1L, 42L))).isInstanceOf(BadRequestException.class);
	}

	@Test
	void bordaScoringWithPartialBallots() {
		// 3 items (M = 3): posicion 1 -> 3 puntos, 2 -> 2, 3 -> 1
		var candidates = List.of(item(1, "A"), item(2, "B"), item(3, "C"));
		// Papeletas: [A,B,C], [B,A], [A]
		var votes = List.of(
			vote(1, 1), vote(2, 2), vote(3, 3),
			vote(2, 1), vote(1, 2),
			vote(1, 1));
		List<ItemResult> results = strategy.score(candidates, votes, 3);

		ItemResult a = results.get(0);
		ItemResult b = results.get(1);
		ItemResult c = results.get(2);
		assertThat(a.itemName()).isEqualTo("A");
		assertThat(a.points()).isEqualTo(3 + 2 + 3);
		assertThat(a.votes()).isEqualTo(3);
		assertThat(a.firstPlaces()).isEqualTo(2);
		assertThat(a.averageRank()).isEqualTo(1.33);
		assertThat(a.percentage()).isEqualTo(88.9); // 8 de 9 puntos posibles

		assertThat(b.itemName()).isEqualTo("B");
		assertThat(b.points()).isEqualTo(2 + 3);
		assertThat(b.averageRank()).isEqualTo(1.5);

		assertThat(c.itemName()).isEqualTo("C");
		assertThat(c.points()).isEqualTo(1);
		assertThat(c.averageRank()).isEqualTo(3.0);
		assertThat(c.percentage()).isEqualTo(11.1);
	}

	@Test
	void tieBreaksByBetterAveragePosition() {
		var candidates = List.of(item(1, "A"), item(2, "B"));
		// [A,B] -> A 2 pts, B 1 pt ; [B] -> B 2 pts. Total A=2 (media 1), B=3 (media 1.5) -> B gana por puntos
		var votes = List.of(vote(1, 1), vote(2, 2), vote(2, 1));
		List<ItemResult> results = strategy.score(candidates, votes, 2);
		assertThat(results.get(0).itemName()).isEqualTo("B");
		assertThat(results.get(0).points()).isEqualTo(3);
		// Sin votos: puntos 0 y posicion media nula al final
		var none = strategy.score(candidates, List.of(), 0);
		assertThat(none).allSatisfy(r -> {
			assertThat(r.points()).isZero();
			assertThat(r.averageRank()).isNull();
			assertThat(r.percentage()).isZero();
		});
	}

	@Test
	void metadata() {
		assertThat(strategy.type()).isEqualTo(VotingType.RANKING);
		assertThat(strategy.scoringLabel()).isEqualTo("puntos");
	}
}

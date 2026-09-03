package com.estinf.Krate.vote;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.estinf.Krate.item.Item;
import com.estinf.Krate.voting.strategy.RankedVote;

public interface VoteRepository extends JpaRepository<Vote, Long> {

	/** Selecciones de una instancia (item y posicion), para que la estrategia las puntue. */
	@Query("select new com.estinf.Krate.voting.strategy.RankedVote(v.item.id, v.rank) from Vote v where v.instance.id = :instanceId")
	List<RankedVote> findRankedVotes(@Param("instanceId") long instanceId);

	/** Items que han recibido votos en la instancia, incluidos los borrados o retirados de la votacion. */
	@Query("select distinct v.item from Vote v where v.instance.id = :instanceId")
	List<Item> findVotedItems(@Param("instanceId") long instanceId);
}

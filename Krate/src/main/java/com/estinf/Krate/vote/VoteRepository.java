package com.estinf.Krate.vote;

import java.util.Collection;
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

	/** Item votado en una instancia concreta (proyeccion para consultas por lotes). */
	interface InstanceItem {
		Long getInstanceId();
		Item getItem();
	}

	/** Selecciones de varias instancias a la vez, con la instancia a la que pertenecen. */
	@Query("select new com.estinf.Krate.vote.InstanceRankedVote(v.instance.id, v.item.id, v.rank) from Vote v where v.instance.id in :instanceIds")
	List<InstanceRankedVote> findRankedVotesByInstances(@Param("instanceIds") Collection<Long> instanceIds);

	/** Items votados en varias instancias a la vez, con la instancia en la que recibieron el voto. */
	@Query("select distinct v.instance.id as instanceId, v.item as item from Vote v where v.instance.id in :instanceIds")
	List<InstanceItem> findVotedItemsByInstances(@Param("instanceIds") Collection<Long> instanceIds);
}

package com.estinf.Krate.instance;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface VotingInstanceRepository extends JpaRepository<VotingInstance, Long> {

	Optional<VotingInstance> findByVotingPointIdAndStatus(long votingPointId, InstanceStatus status);

	boolean existsByVotingPointIdAndStatus(long votingPointId, InstanceStatus status);

	boolean existsByVotingIdAndStatus(long votingId, InstanceStatus status);

	@Query("select count(i) > 0 from VotingInstance i join i.voting v join v.items it where it.id = :itemId and i.status = :status")
	boolean existsActiveInstanceWithItem(@Param("itemId") long itemId, @Param("status") InstanceStatus status);

	@Query("select i from VotingInstance i join fetch i.votingPoint p join fetch i.voting v where p.ownerId = :ownerId order by i.startedAt desc")
	List<VotingInstance> findAllByOwner(@Param("ownerId") long ownerId);

	@Query("select i from VotingInstance i join fetch i.votingPoint p join fetch i.voting v where p.ownerId = :ownerId and i.status = :status order by i.startedAt desc")
	List<VotingInstance> findAllByOwnerAndStatus(@Param("ownerId") long ownerId, @Param("status") InstanceStatus status);

	@Query("select i from VotingInstance i join fetch i.votingPoint p join fetch i.voting v where i.id = :id and p.ownerId = :ownerId")
	Optional<VotingInstance> findByIdAndOwner(@Param("id") long id, @Param("ownerId") long ownerId);

	/** Lanzamientos del gestor, opcionalmente filtrados por votacion y/o punto (null = sin filtro). */
	@Query("select i from VotingInstance i join fetch i.votingPoint p join fetch i.voting v where p.ownerId = :ownerId"
			+ " and (:votingId is null or v.id = :votingId) and (:votingPointId is null or p.id = :votingPointId)"
			+ " order by i.startedAt desc")
	List<VotingInstance> findAllByOwnerFiltered(@Param("ownerId") long ownerId, @Param("votingId") Long votingId,
			@Param("votingPointId") Long votingPointId);

	/** Lanzamientos del gestor en los que el item fue candidato: esta en la votacion o recibio algun voto. */
	@Query("select distinct i from VotingInstance i join fetch i.votingPoint p join fetch i.voting v where p.ownerId = :ownerId"
			+ " and (exists (select 1 from Vote vo where vo.instance = i and vo.item.id = :itemId)"
			+ " or exists (select 1 from Voting v2 join v2.items it where v2 = v and it.id = :itemId))"
			+ " order by i.startedAt desc")
	List<VotingInstance> findAllByOwnerWithItem(@Param("ownerId") long ownerId, @Param("itemId") long itemId);
}

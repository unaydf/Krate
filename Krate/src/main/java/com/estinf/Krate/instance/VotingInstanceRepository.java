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
}

package com.estinf.Krate.voting;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface VotingRepository extends JpaRepository<Voting, Long> {

	@Query("select distinct v from Voting v left join fetch v.items where v.ownerId = :ownerId and v.deletedAt is null order by v.name asc")
	List<Voting> findAllActiveByOwner(@Param("ownerId") long ownerId);

	@Query("select v from Voting v left join fetch v.items where v.id = :id and v.ownerId = :ownerId and v.deletedAt is null")
	Optional<Voting> findActiveByIdAndOwner(@Param("id") long id, @Param("ownerId") long ownerId);
}

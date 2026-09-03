package com.estinf.Krate.votingpoint;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface VotingPointRepository extends JpaRepository<VotingPoint, Long> {

	List<VotingPoint> findAllByOwnerIdAndDeletedAtIsNullOrderByNameAsc(long ownerId);

	Optional<VotingPoint> findByIdAndOwnerIdAndDeletedAtIsNull(long id, long ownerId);

	Optional<VotingPoint> findByCodeAndDeletedAtIsNull(String code);

	boolean existsByCode(String code);
}

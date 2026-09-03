package com.estinf.Krate.vote;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BallotRepository extends JpaRepository<Ballot, Long> {

	interface InstanceCount {
		Long getInstanceId();
		long getBallots();
	}

	boolean existsByInstanceIdAndVoterToken(long instanceId, String voterToken);

	long countByInstanceId(long instanceId);

	@Query("select b.instance.id as instanceId, count(b) as ballots from Ballot b where b.instance.id in :instanceIds group by b.instance.id")
	List<InstanceCount> countByInstances(@Param("instanceIds") Collection<Long> instanceIds);
}

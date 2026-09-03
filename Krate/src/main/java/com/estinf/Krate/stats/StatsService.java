package com.estinf.Krate.stats;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.estinf.Krate.common.NotFoundException;
import com.estinf.Krate.instance.VotingInstance;
import com.estinf.Krate.instance.VotingInstanceRepository;
import com.estinf.Krate.item.Item;
import com.estinf.Krate.stats.StatsDtos.InstanceStatsDetail;
import com.estinf.Krate.stats.StatsDtos.InstanceStatsSummary;
import com.estinf.Krate.stats.StatsDtos.ItemResult;
import com.estinf.Krate.vote.BallotRepository;
import com.estinf.Krate.vote.BallotRepository.InstanceCount;
import com.estinf.Krate.vote.VoteRepository;
import com.estinf.Krate.voting.Voting;
import com.estinf.Krate.voting.strategy.RankedVote;
import com.estinf.Krate.voting.strategy.VotingStrategies;
import com.estinf.Krate.voting.strategy.VotingStrategy;

@Service
public class StatsService {

	private final VotingInstanceRepository instances;
	private final BallotRepository ballots;
	private final VoteRepository votes;
	private final VotingStrategies strategies;

	public StatsService(VotingInstanceRepository instances, BallotRepository ballots, VoteRepository votes,
			VotingStrategies strategies) {
		this.instances = instances;
		this.ballots = ballots;
		this.votes = votes;
		this.strategies = strategies;
	}

	@Transactional(readOnly = true)
	public List<InstanceStatsSummary> listInstances(long ownerId) {
		List<VotingInstance> all = instances.findAllByOwner(ownerId);
		if (all.isEmpty()) {
			return List.of();
		}
		Map<Long, Long> totals = ballots.countByInstances(all.stream().map(VotingInstance::getId).toList()).stream()
			.collect(Collectors.toMap(InstanceCount::getInstanceId, InstanceCount::getBallots));
		return all.stream().map(i -> toSummary(i, totals.getOrDefault(i.getId(), 0L))).toList();
	}

	@Transactional(readOnly = true)
	public InstanceStatsDetail instanceDetail(long ownerId, long instanceId) {
		VotingInstance instance = instances.findByIdAndOwner(instanceId, ownerId)
			.orElseThrow(() -> new NotFoundException("Instancia no encontrada"));
		Voting voting = instance.getVoting();
		VotingStrategy strategy = strategies.forVoting(voting);

		long totalBallots = ballots.countByInstanceId(instanceId);
		List<RankedVote> rankedVotes = votes.findRankedVotes(instanceId);

		// Items actuales de la votacion (incluidos borrados) mas cualquier item votado que ya no este en ella
		Map<Long, Item> candidates = new LinkedHashMap<>();
		voting.getItems().forEach(i -> candidates.put(i.getId(), i));
		votes.findVotedItems(instanceId).forEach(i -> candidates.putIfAbsent(i.getId(), i));

		List<ItemResult> results = strategy.score(List.copyOf(candidates.values()), rankedVotes, totalBallots);
		return new InstanceStatsDetail(toSummary(instance, totalBallots), voting.getType(), voting.getMaxSelections(),
			strategy.scoringLabel(), results);
	}

	private static InstanceStatsSummary toSummary(VotingInstance i, long totalBallots) {
		return new InstanceStatsSummary(i.getId(), i.getVotingPoint().getName(), i.getVoting().getName(),
			i.getStatus(), i.getStartedAt(), i.getEndedAt(), totalBallots);
	}
}

package com.estinf.Krate.stats;

import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.estinf.Krate.common.NotFoundException;
import com.estinf.Krate.common.PublicUrls;
import com.estinf.Krate.instance.VotingInstance;
import com.estinf.Krate.instance.VotingInstanceRepository;
import com.estinf.Krate.item.Item;
import com.estinf.Krate.item.ItemRepository;
import com.estinf.Krate.stats.StatsDtos.InstanceStatsDetail;
import com.estinf.Krate.stats.StatsDtos.InstanceStatsSummary;
import com.estinf.Krate.stats.StatsDtos.ItemHistory;
import com.estinf.Krate.stats.StatsDtos.ItemParticipation;
import com.estinf.Krate.stats.StatsDtos.ItemResult;
import com.estinf.Krate.stats.StatsDtos.PointRef;
import com.estinf.Krate.stats.StatsDtos.VotingStatsDetail;
import com.estinf.Krate.vote.BallotRepository;
import com.estinf.Krate.vote.BallotRepository.InstanceCount;
import com.estinf.Krate.vote.InstanceRankedVote;
import com.estinf.Krate.vote.VoteRepository;
import com.estinf.Krate.vote.VoteRepository.InstanceItem;
import com.estinf.Krate.voting.Voting;
import com.estinf.Krate.voting.VotingRepository;
import com.estinf.Krate.voting.strategy.RankedVote;
import com.estinf.Krate.voting.strategy.VotingStrategies;
import com.estinf.Krate.voting.strategy.VotingStrategy;

@Service
public class StatsService {

	private final VotingInstanceRepository instances;
	private final VotingRepository votings;
	private final ItemRepository items;
	private final BallotRepository ballots;
	private final VoteRepository votes;
	private final VotingStrategies strategies;
	private final PublicUrls urls;

	public StatsService(VotingInstanceRepository instances, VotingRepository votings, ItemRepository items,
			BallotRepository ballots, VoteRepository votes, VotingStrategies strategies, PublicUrls urls) {
		this.instances = instances;
		this.votings = votings;
		this.items = items;
		this.ballots = ballots;
		this.votes = votes;
		this.strategies = strategies;
		this.urls = urls;
	}

	/** Lanzamientos del gestor; votingId y votingPointId son filtros opcionales (RF-31). */
	@Transactional(readOnly = true)
	public List<InstanceStatsSummary> listInstances(long ownerId, Long votingId, Long votingPointId) {
		List<VotingInstance> all = instances.findAllByOwnerFiltered(ownerId, votingId, votingPointId);
		if (all.isEmpty()) {
			return List.of();
		}
		Map<Long, Long> totals = ballotsByInstance(ids(all));
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
		List<Item> candidates = candidatesOf(voting, votes.findVotedItems(instanceId));

		List<ItemResult> results = strategy.score(candidates, rankedVotes, totalBallots);
		return new InstanceStatsDetail(toSummary(instance, totalBallots), voting.getType(), voting.getMaxSelections(),
			strategy.scoringLabel(), results);
	}

	/** Resultados agregados de una votacion (RF-30), opcionalmente solo de los lanzamientos de un punto (RF-31). */
	@Transactional(readOnly = true)
	public VotingStatsDetail votingDetail(long ownerId, long votingId, Long votingPointId) {
		Voting voting = votings.findByIdAndOwner(votingId, ownerId)
			.orElseThrow(() -> new NotFoundException("Votación no encontrada"));
		VotingStrategy strategy = strategies.forVoting(voting);

		List<VotingInstance> all = instances.findAllByOwnerFiltered(ownerId, votingId, null);
		List<PointRef> points = all.stream()
			.map(i -> new PointRef(i.getVotingPoint().getId(), i.getVotingPoint().getName()))
			.distinct()
			.toList();
		List<VotingInstance> selected = votingPointId == null ? all
			: all.stream().filter(i -> i.getVotingPoint().getId().equals(votingPointId)).toList();

		List<Long> ids = ids(selected);
		Map<Long, Long> totals = ballotsByInstance(ids);
		long totalBallots = totals.values().stream().mapToLong(Long::longValue).sum();
		List<RankedVote> rankedVotes = ids.isEmpty() ? List.of()
			: votes.findRankedVotesByInstances(ids).stream().map(InstanceRankedVote::toRankedVote).toList();
		List<Item> votedItems = ids.isEmpty() ? List.of()
			: votes.findVotedItemsByInstances(ids).stream().map(InstanceItem::getItem).toList();

		List<ItemResult> results = strategy.score(candidatesOf(voting, votedItems), rankedVotes, totalBallots);
		List<InstanceStatsSummary> summaries = selected.stream()
			.map(i -> toSummary(i, totals.getOrDefault(i.getId(), 0L)))
			.toList();
		return new VotingStatsDetail(voting.getId(), voting.getName(), voting.isDeleted(), voting.getType(),
			voting.getMaxSelections(), strategy.scoringLabel(), votingPointId, selected.size(), totalBallots, points,
			results, summaries);
	}

	/** Rendimiento de un item en cada lanzamiento en el que fue candidato (RF-32). */
	@Transactional(readOnly = true)
	public ItemHistory itemHistory(long ownerId, long itemId) {
		Item item = items.findByIdAndOwnerId(itemId, ownerId)
			.orElseThrow(() -> new NotFoundException("Item no encontrado"));
		List<VotingInstance> participated = instances.findAllByOwnerWithItem(ownerId, itemId);
		if (participated.isEmpty()) {
			return new ItemHistory(item.getId(), item.getName(), urls.image(item.getImagePath()), item.isDeleted(),
				0, 0, 0, null, List.of());
		}

		List<Long> ids = ids(participated);
		Map<Long, Long> totals = ballotsByInstance(ids);
		Map<Long, List<RankedVote>> votesByInstance = votes.findRankedVotesByInstances(ids).stream()
			.collect(Collectors.groupingBy(InstanceRankedVote::instanceId,
				Collectors.mapping(InstanceRankedVote::toRankedVote, Collectors.toList())));
		Map<Long, List<Item>> votedItemsByInstance = votes.findVotedItemsByInstances(ids).stream()
			.collect(Collectors.groupingBy(InstanceItem::getInstanceId,
				Collectors.mapping(InstanceItem::getItem, Collectors.toList())));

		List<ItemParticipation> history = new ArrayList<>();
		for (VotingInstance instance : participated) {
			Voting voting = instance.getVoting();
			VotingStrategy strategy = strategies.forVoting(voting);
			long totalBallots = totals.getOrDefault(instance.getId(), 0L);
			List<Item> candidates = candidatesOf(voting, votedItemsByInstance.getOrDefault(instance.getId(), List.of()));
			List<ItemResult> results = strategy.score(candidates,
				votesByInstance.getOrDefault(instance.getId(), List.of()), totalBallots);
			for (int position = 0; position < results.size(); position++) {
				ItemResult r = results.get(position);
				if (r.itemId().equals(itemId)) {
					history.add(new ItemParticipation(instance.getId(), voting.getName(),
						instance.getVotingPoint().getName(), voting.getType(), strategy.scoringLabel(),
						instance.getStatus(), instance.getStartedAt(), instance.getEndedAt(), totalBallots,
						position + 1, results.size(), r.votes(), r.points(), r.averageRank(), r.firstPlaces(),
						r.percentage()));
					break;
				}
			}
		}

		long totalVotes = history.stream().mapToLong(ItemParticipation::votes).sum();
		long wins = history.stream().filter(p -> p.position() == 1 && p.points() > 0).count();
		Double averagePercentage = history.isEmpty() ? null
			: Math.round(history.stream().mapToDouble(ItemParticipation::percentage).average().orElse(0) * 10.0) / 10.0;
		return new ItemHistory(item.getId(), item.getName(), urls.image(item.getImagePath()), item.isDeleted(),
			history.size(), totalVotes, wins, averagePercentage, history);
	}

	/** Items actuales de la votacion (incluidos los borrados) mas cualquier item votado que ya no este en ella. */
	private static List<Item> candidatesOf(Voting voting, Collection<Item> votedItems) {
		Map<Long, Item> candidates = new LinkedHashMap<>();
		voting.getItems().forEach(i -> candidates.put(i.getId(), i));
		votedItems.forEach(i -> candidates.putIfAbsent(i.getId(), i));
		return List.copyOf(candidates.values());
	}

	private Map<Long, Long> ballotsByInstance(List<Long> instanceIds) {
		if (instanceIds.isEmpty()) {
			return Map.of();
		}
		return ballots.countByInstances(instanceIds).stream()
			.collect(Collectors.toMap(InstanceCount::getInstanceId, InstanceCount::getBallots));
	}

	private static List<Long> ids(List<VotingInstance> list) {
		return list.stream().map(VotingInstance::getId).filter(Objects::nonNull).toList();
	}

	private static InstanceStatsSummary toSummary(VotingInstance i, long totalBallots) {
		return new InstanceStatsSummary(i.getId(), i.getVotingPoint().getId(), i.getVotingPoint().getName(),
			i.getVoting().getId(), i.getVoting().getName(), i.getStatus(), i.getStartedAt(), i.getEndedAt(),
			totalBallots);
	}
}

package com.estinf.Krate.publicapi;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.estinf.Krate.common.ConflictException;
import com.estinf.Krate.common.NotFoundException;
import com.estinf.Krate.common.PublicUrls;
import com.estinf.Krate.instance.InstanceStatus;
import com.estinf.Krate.instance.VotingInstance;
import com.estinf.Krate.instance.VotingInstanceRepository;
import com.estinf.Krate.item.Item;
import com.estinf.Krate.publicapi.PublicDtos.PublicItem;
import com.estinf.Krate.publicapi.PublicDtos.PublicPointResponse;
import com.estinf.Krate.publicapi.PublicDtos.PublicStatus;
import com.estinf.Krate.publicapi.PublicDtos.PublicVoting;
import com.estinf.Krate.publicapi.PublicDtos.VoteRequest;
import com.estinf.Krate.publicapi.PublicDtos.VoteResponse;
import com.estinf.Krate.vote.Ballot;
import com.estinf.Krate.vote.BallotRepository;
import com.estinf.Krate.voting.Voting;
import com.estinf.Krate.voting.strategy.VotingStrategies;
import com.estinf.Krate.voting.strategy.VotingStrategy;
import com.estinf.Krate.voting.strategy.VotingType;
import com.estinf.Krate.votingpoint.VotingPoint;
import com.estinf.Krate.votingpoint.VotingPointRepository;

@Service
public class PublicVotingService {

	private final VotingPointRepository points;
	private final VotingInstanceRepository instances;
	private final BallotRepository ballots;
	private final VotingStrategies strategies;
	private final PublicUrls urls;

	public PublicVotingService(VotingPointRepository points, VotingInstanceRepository instances,
			BallotRepository ballots, VotingStrategies strategies, PublicUrls urls) {
		this.points = points;
		this.instances = instances;
		this.ballots = ballots;
		this.strategies = strategies;
		this.urls = urls;
	}

	@Transactional(readOnly = true)
	public PublicPointResponse getPoint(String code, String voterToken) {
		VotingPoint point = findPoint(code);
		return instances.findByVotingPointIdAndStatus(point.getId(), InstanceStatus.ACTIVE)
			.map(instance -> {
				Voting voting = instance.getVoting();
				VotingStrategy strategy = strategies.forVoting(voting);
				boolean already = voterToken != null && !voterToken.isBlank()
					&& ballots.existsByInstanceIdAndVoterToken(instance.getId(), voterToken);
				PublicVoting pv = new PublicVoting(voting.getName(), voting.getDescription(), voting.getType(),
					voting.getMaxSelections(), strategy.instructions(voting.getMaxSelections()),
					voting.activeItems().stream().map(this::toPublicItem).toList());
				return new PublicPointResponse(point.getName(), PublicStatus.ACTIVE, instance.getId(), already, pv);
			})
			.orElseGet(() -> new PublicPointResponse(point.getName(), PublicStatus.INACTIVE, null, false, null));
	}

	@Transactional
	public VoteResponse vote(String code, VoteRequest req) {
		VotingPoint point = findPoint(code);
		VotingInstance instance = instances.findByVotingPointIdAndStatus(point.getId(), InstanceStatus.ACTIVE)
			.orElseThrow(() -> new ConflictException("La votación no está activa"));
		Voting voting = instance.getVoting();
		VotingStrategy strategy = strategies.forVoting(voting);

		List<Item> allowed = voting.activeItems();
		Map<Long, Item> byId = allowed.stream().collect(Collectors.toMap(Item::getId, Function.identity()));
		strategy.validateBallot(allowed.stream().map(Item::getId).toList(), voting.getMaxSelections(), req.itemIds());

		if (ballots.existsByInstanceIdAndVoterToken(instance.getId(), req.voterToken())) {
			throw new ConflictException("Ya has votado en esta votación");
		}
		Ballot ballot = new Ballot(instance, req.voterToken());
		boolean ranked = voting.getType() == VotingType.RANKING;
		for (int i = 0; i < req.itemIds().size(); i++) {
			ballot.addVote(byId.get(req.itemIds().get(i)), ranked ? i + 1 : null);
		}
		try {
			ballots.saveAndFlush(ballot);
		}
		catch (DataIntegrityViolationException ex) {
			throw new ConflictException("Ya has votado en esta votación");
		}
		return new VoteResponse(instance.getId(), req.itemIds());
	}

	private VotingPoint findPoint(String code) {
		return points.findByCodeAndDeletedAtIsNull(code)
			.orElseThrow(() -> new NotFoundException("Punto de votación no encontrado"));
	}

	private PublicItem toPublicItem(Item item) {
		return new PublicItem(item.getId(), item.getName(), item.getDescription(), urls.image(item.getImagePath()));
	}
}

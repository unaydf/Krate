package com.estinf.Krate.instance;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.estinf.Krate.common.BadRequestException;
import com.estinf.Krate.common.ConflictException;
import com.estinf.Krate.common.NotFoundException;
import com.estinf.Krate.instance.InstanceDtos.InstanceResponse;
import com.estinf.Krate.voting.Voting;
import com.estinf.Krate.voting.strategy.VotingStrategies;
import com.estinf.Krate.votingpoint.VotingPoint;
import com.estinf.Krate.votingpoint.VotingPointService;

@Service
public class InstanceService {

	private final VotingInstanceRepository instances;
	private final VotingPointService pointService;
	private final InstanceMapper mapper;
	private final VotingStrategies strategies;

	public InstanceService(VotingInstanceRepository instances, VotingPointService pointService, InstanceMapper mapper,
			VotingStrategies strategies) {
		this.instances = instances;
		this.pointService = pointService;
		this.mapper = mapper;
		this.strategies = strategies;
	}

	@Transactional(readOnly = true)
	public List<InstanceResponse> list(long ownerId, InstanceStatus status) {
		List<VotingInstance> found = status == null
			? instances.findAllByOwner(ownerId)
			: instances.findAllByOwnerAndStatus(ownerId, status);
		return found.stream().map(mapper::toResponse).toList();
	}

	@Transactional
	public InstanceResponse launch(long ownerId, long votingPointId) {
		VotingPoint point = pointService.find(ownerId, votingPointId);
		Voting voting = point.assignedVoting();
		if (voting == null) {
			throw new ConflictException("El punto de votación no tiene una votación asignada");
		}
		if (voting.activeItems().isEmpty()) {
			throw new ConflictException("La votación asignada no tiene items para votar");
		}
		try {
			strategies.forVoting(voting).validateConfig(voting.getMaxSelections(), voting.activeItems().size());
		}
		catch (BadRequestException ex) {
			throw new ConflictException("La configuración de la votación no es válida con sus items actuales: " + ex.getMessage());
		}
		if (instances.existsByVotingPointIdAndStatus(point.getId(), InstanceStatus.ACTIVE)) {
			throw new ConflictException("El punto de votación ya tiene una votación activa");
		}
		VotingInstance instance = instances.save(new VotingInstance(point, voting));
		return mapper.toResponse(instance);
	}

	@Transactional
	public InstanceResponse stop(long ownerId, long instanceId) {
		VotingInstance instance = instances.findByIdAndOwner(instanceId, ownerId)
			.orElseThrow(() -> new NotFoundException("Instancia no encontrada"));
		if (!instance.isActive()) {
			throw new ConflictException("La instancia ya está detenida");
		}
		instance.close();
		return mapper.toResponse(instances.save(instance));
	}
}

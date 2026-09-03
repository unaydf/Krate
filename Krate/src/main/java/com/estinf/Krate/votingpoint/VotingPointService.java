package com.estinf.Krate.votingpoint;

import java.util.List;
import java.util.Objects;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.estinf.Krate.common.ConflictException;
import com.estinf.Krate.common.NotFoundException;
import com.estinf.Krate.common.PublicUrls;
import com.estinf.Krate.instance.InstanceMapper;
import com.estinf.Krate.instance.InstanceStatus;
import com.estinf.Krate.instance.VotingInstanceRepository;
import com.estinf.Krate.voting.Voting;
import com.estinf.Krate.voting.VotingDtos.VotingSummary;
import com.estinf.Krate.voting.VotingService;
import com.estinf.Krate.votingpoint.VotingPointDtos.VotingPointRequest;
import com.estinf.Krate.votingpoint.VotingPointDtos.VotingPointResponse;

@Service
public class VotingPointService {

	private final VotingPointRepository points;
	private final VotingService votingService;
	private final VotingInstanceRepository instances;
	private final InstanceMapper instanceMapper;
	private final CodeGenerator codes;
	private final PublicUrls urls;

	public VotingPointService(VotingPointRepository points, VotingService votingService,
			VotingInstanceRepository instances, InstanceMapper instanceMapper, CodeGenerator codes, PublicUrls urls) {
		this.points = points;
		this.votingService = votingService;
		this.instances = instances;
		this.instanceMapper = instanceMapper;
		this.codes = codes;
		this.urls = urls;
	}

	@Transactional(readOnly = true)
	public List<VotingPointResponse> list(long ownerId) {
		return points.findAllByOwnerIdAndDeletedAtIsNullOrderByNameAsc(ownerId).stream().map(this::toResponse).toList();
	}

	@Transactional(readOnly = true)
	public VotingPointResponse get(long ownerId, long id) {
		return toResponse(find(ownerId, id));
	}

	@Transactional
	public VotingPointResponse create(long ownerId, VotingPointRequest req) {
		VotingPoint point = new VotingPoint(ownerId, req.name().trim(), req.descriptionOrEmpty(), codes.nextUnique());
		point.setVoting(resolveVoting(ownerId, req.votingId()));
		return toResponse(points.save(point));
	}

	@Transactional
	public VotingPointResponse update(long ownerId, long id, VotingPointRequest req) {
		VotingPoint point = find(ownerId, id);
		Voting current = point.assignedVoting();
		Long currentId = current == null ? null : current.getId();
		if (!Objects.equals(currentId, req.votingId()) && hasActiveInstance(id)) {
			throw new ConflictException("No se puede cambiar la votación de un punto con una instancia activa");
		}
		point.setName(req.name().trim());
		point.setDescription(req.descriptionOrEmpty());
		point.setVoting(resolveVoting(ownerId, req.votingId()));
		return toResponse(points.save(point));
	}

	@Transactional
	public void delete(long ownerId, long id) {
		VotingPoint point = find(ownerId, id);
		if (hasActiveInstance(id)) {
			throw new ConflictException("El punto tiene una votación activa. Detenla antes de eliminarlo");
		}
		point.markDeleted();
		points.save(point);
	}

	public VotingPoint find(long ownerId, long id) {
		return points.findByIdAndOwnerIdAndDeletedAtIsNull(id, ownerId)
			.orElseThrow(() -> new NotFoundException("Punto de votación no encontrado"));
	}

	private boolean hasActiveInstance(long pointId) {
		return instances.existsByVotingPointIdAndStatus(pointId, InstanceStatus.ACTIVE);
	}

	private Voting resolveVoting(long ownerId, Long votingId) {
		return votingId == null ? null : votingService.find(ownerId, votingId);
	}

	public VotingPointResponse toResponse(VotingPoint point) {
		Voting voting = point.assignedVoting();
		VotingSummary summary = voting == null ? null
			: new VotingSummary(voting.getId(), voting.getName(), voting.getType(), voting.getMaxSelections());
		var active = instances.findByVotingPointIdAndStatus(point.getId(), InstanceStatus.ACTIVE)
			.map(instanceMapper::toResponse).orElse(null);
		return new VotingPointResponse(point.getId(), point.getName(), point.getDescription(), point.getCode(),
			urls.votingPoint(point.getCode()), summary, active, point.getCreatedAt());
	}
}

package com.estinf.Krate.voting;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.estinf.Krate.common.BadRequestException;
import com.estinf.Krate.common.ConflictException;
import com.estinf.Krate.common.NotFoundException;
import com.estinf.Krate.instance.InstanceStatus;
import com.estinf.Krate.instance.VotingInstanceRepository;
import com.estinf.Krate.item.Item;
import com.estinf.Krate.item.ItemRepository;
import com.estinf.Krate.item.ItemService;
import com.estinf.Krate.voting.VotingDtos.VotingRequest;
import com.estinf.Krate.voting.VotingDtos.VotingResponse;
import com.estinf.Krate.voting.strategy.VotingStrategies;
import com.estinf.Krate.voting.strategy.VotingType;
import java.util.Objects;

@Service
public class VotingService {

	private final VotingRepository votings;
	private final ItemRepository items;
	private final ItemService itemService;
	private final VotingInstanceRepository instances;
	private final VotingStrategies strategies;

	public VotingService(VotingRepository votings, ItemRepository items, ItemService itemService,
			VotingInstanceRepository instances, VotingStrategies strategies) {
		this.votings = votings;
		this.items = items;
		this.itemService = itemService;
		this.instances = instances;
		this.strategies = strategies;
	}

	@Transactional(readOnly = true)
	public List<VotingResponse> list(long ownerId) {
		return votings.findAllActiveByOwner(ownerId).stream().map(this::toResponse).toList();
	}

	@Transactional(readOnly = true)
	public VotingResponse get(long ownerId, long id) {
		return toResponse(find(ownerId, id));
	}

	@Transactional
	public VotingResponse create(long ownerId, VotingRequest req) {
		List<Item> resolved = resolveItems(ownerId, req.itemIds());
		VotingType type = req.typeOrDefault();
		strategies.forType(type).validateConfig(req.maxSelections(), resolved.size());
		Voting voting = new Voting(ownerId, req.name().trim(), req.descriptionOrEmpty());
		voting.setType(type);
		voting.setMaxSelections(req.maxSelections());
		voting.setItems(resolved);
		return toResponse(votings.save(voting));
	}

	@Transactional
	public VotingResponse update(long ownerId, long id, VotingRequest req) {
		Voting voting = find(ownerId, id);
		List<Long> requested = new ArrayList<>(new LinkedHashSet<>(req.itemIds()));
		VotingType type = req.typeOrDefault();
		boolean itemsChanged = !requested.equals(voting.activeItems().stream().map(Item::getId).toList());
		boolean rulesChanged = type != voting.getType() || !Objects.equals(req.maxSelections(), voting.getMaxSelections());
		if ((itemsChanged || rulesChanged) && hasActiveInstance(id)) {
			throw new ConflictException("No se pueden cambiar los items ni el tipo de una votación con una instancia activa");
		}
		List<Item> resolved = resolveItems(ownerId, requested);
		strategies.forType(type).validateConfig(req.maxSelections(), resolved.size());
		voting.setName(req.name().trim());
		voting.setDescription(req.descriptionOrEmpty());
		voting.setType(type);
		voting.setMaxSelections(req.maxSelections());
		voting.setItems(resolved);
		return toResponse(votings.save(voting));
	}

	@Transactional
	public void delete(long ownerId, long id) {
		Voting voting = find(ownerId, id);
		if (hasActiveInstance(id)) {
			throw new ConflictException("La votación tiene una instancia activa. Detenla antes de eliminarla");
		}
		voting.markDeleted();
		votings.save(voting);
	}

	public Voting find(long ownerId, long id) {
		return votings.findActiveByIdAndOwner(id, ownerId)
			.orElseThrow(() -> new NotFoundException("Votación no encontrada"));
	}

	private boolean hasActiveInstance(long votingId) {
		return instances.existsByVotingIdAndStatus(votingId, InstanceStatus.ACTIVE);
	}

	private List<Item> resolveItems(long ownerId, List<Long> ids) {
		List<Long> unique = new ArrayList<>(new LinkedHashSet<>(ids));
		if (unique.isEmpty()) {
			return List.of();
		}
		Map<Long, Item> found = items.findAllByIdInAndOwnerIdAndDeletedAtIsNull(unique, ownerId).stream()
			.collect(Collectors.toMap(Item::getId, Function.identity()));
		if (found.size() != unique.size()) {
			throw new BadRequestException("Alguno de los items indicados no existe");
		}
		return unique.stream().map(found::get).toList();
	}

	public VotingResponse toResponse(Voting voting) {
		return new VotingResponse(voting.getId(), voting.getName(), voting.getDescription(),
			voting.getType(), voting.getMaxSelections(),
			voting.activeItems().stream().map(itemService::toResponse).toList(),
			hasActiveInstance(voting.getId()), voting.getCreatedAt(), voting.getUpdatedAt());
	}
}

package com.estinf.Krate.item;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.estinf.Krate.common.ConflictException;
import com.estinf.Krate.common.NotFoundException;
import com.estinf.Krate.common.PublicUrls;
import com.estinf.Krate.instance.InstanceStatus;
import com.estinf.Krate.instance.VotingInstanceRepository;
import com.estinf.Krate.item.ItemDtos.ItemForm;
import com.estinf.Krate.item.ItemDtos.ItemResponse;

@Service
public class ItemService {

	private final ItemRepository items;
	private final VotingInstanceRepository instances;
	private final ImageStorageService storage;
	private final PublicUrls urls;

	public ItemService(ItemRepository items, VotingInstanceRepository instances, ImageStorageService storage, PublicUrls urls) {
		this.items = items;
		this.instances = instances;
		this.storage = storage;
		this.urls = urls;
	}

	@Transactional(readOnly = true)
	public List<ItemResponse> list(long ownerId) {
		return items.findAllByOwnerIdAndDeletedAtIsNullOrderByNameAsc(ownerId).stream().map(this::toResponse).toList();
	}

	@Transactional(readOnly = true)
	public ItemResponse get(long ownerId, long id) {
		return toResponse(find(ownerId, id));
	}

	@Transactional
	public ItemResponse create(long ownerId, ItemForm form) {
		Item item = new Item(ownerId, form.name().trim(), form.descriptionOrEmpty());
		if (form.hasImage()) {
			item.setImagePath(storage.store(form.image()));
		}
		return toResponse(items.save(item));
	}

	@Transactional
	public ItemResponse update(long ownerId, long id, ItemForm form) {
		Item item = find(ownerId, id);
		item.setName(form.name().trim());
		item.setDescription(form.descriptionOrEmpty());
		if (form.hasImage()) {
			String old = item.getImagePath();
			item.setImagePath(storage.store(form.image()));
			storage.delete(old);
		}
		else if (form.wantsRemoveImage()) {
			storage.delete(item.getImagePath());
			item.setImagePath(null);
		}
		return toResponse(items.save(item));
	}

	@Transactional
	public ItemResponse removeImage(long ownerId, long id) {
		Item item = find(ownerId, id);
		storage.delete(item.getImagePath());
		item.setImagePath(null);
		return toResponse(items.save(item));
	}

	@Transactional
	public void delete(long ownerId, long id) {
		Item item = find(ownerId, id);
		if (instances.existsActiveInstanceWithItem(id, InstanceStatus.ACTIVE)) {
			throw new ConflictException("El item forma parte de una votación activa. Detenla antes de eliminarlo");
		}
		item.markDeleted();
		items.save(item);
	}

	Item find(long ownerId, long id) {
		return items.findByIdAndOwnerIdAndDeletedAtIsNull(id, ownerId)
			.orElseThrow(() -> new NotFoundException("Item no encontrado"));
	}

	public ItemResponse toResponse(Item item) {
		return new ItemResponse(item.getId(), item.getName(), item.getDescription(),
			urls.image(item.getImagePath()), item.getCreatedAt(), item.getUpdatedAt());
	}
}

package com.estinf.Krate.item;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.estinf.Krate.common.CurrentUser;
import com.estinf.Krate.item.ItemDtos.ItemForm;
import com.estinf.Krate.item.ItemDtos.ItemResponse;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/items")
public class ItemController {

	private final ItemService service;
	private final CurrentUser currentUser;

	public ItemController(ItemService service, CurrentUser currentUser) {
		this.service = service;
		this.currentUser = currentUser;
	}

	@GetMapping
	public List<ItemResponse> list() {
		return service.list(currentUser.id());
	}

	@GetMapping("/{id}")
	public ItemResponse get(@PathVariable long id) {
		return service.get(currentUser.id(), id);
	}

	@PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	@ResponseStatus(HttpStatus.CREATED)
	public ItemResponse create(@Valid @ModelAttribute ItemForm form) {
		return service.create(currentUser.id(), form);
	}

	@PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	public ItemResponse update(@PathVariable long id, @Valid @ModelAttribute ItemForm form) {
		return service.update(currentUser.id(), id, form);
	}

	@DeleteMapping("/{id}/image")
	public ItemResponse removeImage(@PathVariable long id) {
		return service.removeImage(currentUser.id(), id);
	}

	@DeleteMapping("/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void delete(@PathVariable long id) {
		service.delete(currentUser.id(), id);
	}
}

package com.estinf.Krate.item;

import java.time.Instant;

import org.springframework.web.multipart.MultipartFile;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public final class ItemDtos {

	private ItemDtos() {
	}

	/** Formulario multipart para crear/editar un item. */
	public record ItemForm(
			@NotBlank(message = "El nombre es obligatorio") @Size(max = 120, message = "El nombre no puede superar 120 caracteres") String name,
			@Size(max = 500, message = "La descripción no puede superar 500 caracteres") String description,
			MultipartFile image,
			Boolean removeImage) {

		public String descriptionOrEmpty() {
			return description == null ? "" : description.trim();
		}

		public boolean hasImage() {
			return image != null && !image.isEmpty();
		}

		public boolean wantsRemoveImage() {
			return Boolean.TRUE.equals(removeImage);
		}
	}

	public record ItemResponse(Long id, String name, String description, String imageUrl, Instant createdAt, Instant updatedAt) {
	}
}

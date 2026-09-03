package com.estinf.Krate.voting;

import java.time.Instant;
import java.util.List;

import com.estinf.Krate.item.ItemDtos.ItemResponse;
import com.estinf.Krate.voting.strategy.VotingType;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public final class VotingDtos {

	private VotingDtos() {
	}

	public record VotingRequest(
			@NotBlank(message = "El nombre es obligatorio") @Size(max = 120, message = "El nombre no puede superar 120 caracteres") String name,
			@Size(max = 500, message = "La descripción no puede superar 500 caracteres") String description,
			@NotNull(message = "La lista de items es obligatoria") @Size(max = 100, message = "Una votación no puede tener más de 100 items") List<Long> itemIds,
			VotingType type,
			@Min(value = 2, message = "El número máximo de votos debe ser al menos 2") @Max(value = 100, message = "El número máximo de votos no puede superar 100") Integer maxSelections) {

		public String descriptionOrEmpty() {
			return description == null ? "" : description.trim();
		}

		public VotingType typeOrDefault() {
			return type == null ? VotingType.SINGLE : type;
		}
	}

	public record VotingResponse(Long id, String name, String description, VotingType type, Integer maxSelections,
			List<ItemResponse> items, boolean hasActiveInstance, Instant createdAt, Instant updatedAt) {
	}

	public record VotingSummary(Long id, String name, VotingType type, Integer maxSelections) {
	}
}

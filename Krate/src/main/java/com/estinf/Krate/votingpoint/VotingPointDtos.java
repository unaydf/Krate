package com.estinf.Krate.votingpoint;

import java.time.Instant;

import com.estinf.Krate.instance.InstanceDtos.InstanceResponse;
import com.estinf.Krate.voting.VotingDtos.VotingSummary;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public final class VotingPointDtos {

	private VotingPointDtos() {
	}

	public record VotingPointRequest(
			@NotBlank(message = "El nombre es obligatorio") @Size(max = 120, message = "El nombre no puede superar 120 caracteres") String name,
			@Size(max = 500, message = "La descripción no puede superar 500 caracteres") String description,
			Long votingId) {

		public String descriptionOrEmpty() {
			return description == null ? "" : description.trim();
		}
	}

	public record VotingPointResponse(Long id, String name, String description, String code, String publicUrl,
			VotingSummary voting, InstanceResponse activeInstance, Instant createdAt) {
	}
}

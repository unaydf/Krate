package com.estinf.Krate.publicapi;

import java.util.List;

import com.estinf.Krate.voting.strategy.VotingType;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

public final class PublicDtos {

	private PublicDtos() {
	}

	public enum PublicStatus {
		ACTIVE, INACTIVE
	}

	public record PublicItem(Long id, String name, String description, String imageUrl) {
	}

	public record PublicVoting(String name, String description, VotingType type, Integer maxSelections,
			String instructions, List<PublicItem> items) {
	}

	public record PublicPointResponse(String pointName, PublicStatus status, Long instanceId, boolean alreadyVoted,
			PublicVoting voting) {
	}

	/** Papeleta: items elegidos en orden de preferencia (el orden solo importa en RANKING). */
	public record VoteRequest(
			@NotEmpty(message = "Debes elegir al menos una opción") @Size(max = 100) List<Long> itemIds,
			@NotBlank(message = "Falta el identificador del votante") @Size(max = 64) String voterToken) {
	}

	public record VoteResponse(Long instanceId, List<Long> itemIds) {
	}
}

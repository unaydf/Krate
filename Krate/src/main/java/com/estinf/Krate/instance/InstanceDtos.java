package com.estinf.Krate.instance;

import java.time.Instant;

import jakarta.validation.constraints.NotNull;

public final class InstanceDtos {

	private InstanceDtos() {
	}

	public record LaunchRequest(@NotNull(message = "Debes indicar el punto de votación") Long votingPointId) {
	}

	public record InstanceResponse(Long id, Long votingPointId, String votingPointName, String code, String publicUrl,
			Long votingId, String votingName, InstanceStatus status, Instant startedAt, Instant endedAt) {
	}
}

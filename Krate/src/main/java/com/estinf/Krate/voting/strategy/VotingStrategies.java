package com.estinf.Krate.voting.strategy;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Component;

import com.estinf.Krate.voting.Voting;

/**
 * Registro de estrategias. Spring inyecta todas las implementaciones de
 * {@link VotingStrategy} y aqui se indexan por tipo (Factory/Registry).
 */
@Component
public class VotingStrategies {

	private final Map<VotingType, VotingStrategy> byType = new EnumMap<>(VotingType.class);

	public VotingStrategies(List<VotingStrategy> strategies) {
		for (VotingStrategy s : strategies) {
			if (byType.putIfAbsent(s.type(), s) != null) {
				throw new IllegalStateException("Estrategia duplicada para " + s.type());
			}
		}
		for (VotingType t : VotingType.values()) {
			if (!byType.containsKey(t)) {
				throw new IllegalStateException("Falta la estrategia para " + t);
			}
		}
	}

	public VotingStrategy forType(VotingType type) {
		return byType.get(type == null ? VotingType.SINGLE : type);
	}

	public VotingStrategy forVoting(Voting voting) {
		return forType(voting.getType());
	}
}

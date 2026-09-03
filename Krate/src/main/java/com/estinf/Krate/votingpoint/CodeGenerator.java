package com.estinf.Krate.votingpoint;

import java.security.SecureRandom;

import org.springframework.stereotype.Component;

/** Genera codigos publicos cortos, sin caracteres ambiguos (0/o, 1/l/i). */
@Component
public class CodeGenerator {

	private static final String ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
	private static final int LENGTH = 8;

	private final SecureRandom random = new SecureRandom();
	private final VotingPointRepository points;

	public CodeGenerator(VotingPointRepository points) {
		this.points = points;
	}

	public String nextUnique() {
		for (int attempt = 0; attempt < 10; attempt++) {
			String code = generate();
			if (!points.existsByCode(code)) {
				return code;
			}
		}
		throw new IllegalStateException("No se pudo generar un código único");
	}

	String generate() {
		StringBuilder sb = new StringBuilder(LENGTH);
		for (int i = 0; i < LENGTH; i++) {
			sb.append(ALPHABET.charAt(random.nextInt(ALPHABET.length())));
		}
		return sb.toString();
	}
}

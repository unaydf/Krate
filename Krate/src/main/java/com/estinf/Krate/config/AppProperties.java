package com.estinf.Krate.config;

import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public record AppProperties(Jwt jwt, List<String> corsOrigins, String publicVotingUrl, String uploadDir) {

	public record Jwt(String secret, int ttlHours) {
	}
}

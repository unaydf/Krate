package com.estinf.Krate.auth;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

import com.estinf.Krate.config.AppProperties;
import com.estinf.Krate.user.User;

@Service
public class JwtService {

	private final JwtEncoder encoder;
	private final AppProperties props;

	public JwtService(JwtEncoder encoder, AppProperties props) {
		this.encoder = encoder;
		this.props = props;
	}

	public String issue(User user) {
		Instant now = Instant.now();
		JwtClaimsSet claims = JwtClaimsSet.builder()
			.issuer("krate")
			.issuedAt(now)
			.expiresAt(now.plus(props.jwt().ttlHours(), ChronoUnit.HOURS))
			.subject(String.valueOf(user.getId()))
			.claim("email", user.getEmail())
			.claim("name", user.getName())
			.build();
		JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
		return encoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
	}
}

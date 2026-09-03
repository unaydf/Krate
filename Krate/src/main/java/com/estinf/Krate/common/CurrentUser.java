package com.estinf.Krate.common;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

/** Resuelve el id del usuario autenticado a partir del JWT de la peticion actual. */
@Component
public class CurrentUser {

	public long id() {
		Authentication auth = SecurityContextHolder.getContext().getAuthentication();
		if (auth != null && auth.getPrincipal() instanceof Jwt jwt) {
			return Long.parseLong(jwt.getSubject());
		}
		throw new IllegalStateException("No hay usuario autenticado");
	}
}

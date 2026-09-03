package com.estinf.Krate.auth;

import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.estinf.Krate.auth.AuthDtos.AuthResponse;
import com.estinf.Krate.auth.AuthDtos.LoginRequest;
import com.estinf.Krate.auth.AuthDtos.RegisterRequest;
import com.estinf.Krate.auth.AuthDtos.UserResponse;
import com.estinf.Krate.common.ConflictException;
import com.estinf.Krate.common.NotFoundException;
import com.estinf.Krate.user.User;
import com.estinf.Krate.user.UserRepository;

@Service
public class AuthService {

	private final UserRepository users;
	private final PasswordEncoder passwordEncoder;
	private final JwtService jwtService;

	public AuthService(UserRepository users, PasswordEncoder passwordEncoder, JwtService jwtService) {
		this.users = users;
		this.passwordEncoder = passwordEncoder;
		this.jwtService = jwtService;
	}

	@Transactional
	public AuthResponse register(RegisterRequest req) {
		String email = req.email().trim().toLowerCase();
		if (users.existsByEmailIgnoreCase(email)) {
			throw new ConflictException("Ya existe una cuenta con ese correo");
		}
		User user = users.save(new User(email, req.name().trim(), passwordEncoder.encode(req.password())));
		return new AuthResponse(jwtService.issue(user), toResponse(user));
	}

	@Transactional(readOnly = true)
	public AuthResponse login(LoginRequest req) {
		User user = users.findByEmailIgnoreCase(req.email().trim())
			.filter(u -> passwordEncoder.matches(req.password(), u.getPasswordHash()))
			.orElseThrow(() -> new BadCredentialsException("Credenciales incorrectas"));
		return new AuthResponse(jwtService.issue(user), toResponse(user));
	}

	@Transactional(readOnly = true)
	public UserResponse me(long userId) {
		return users.findById(userId).map(AuthService::toResponse)
			.orElseThrow(() -> new NotFoundException("Usuario no encontrado"));
	}

	static UserResponse toResponse(User user) {
		return new UserResponse(user.getId(), user.getEmail(), user.getName());
	}
}

package com.estinf.Krate.auth;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.estinf.Krate.auth.AuthDtos.AuthResponse;
import com.estinf.Krate.auth.AuthDtos.LoginRequest;
import com.estinf.Krate.auth.AuthDtos.RegisterRequest;
import com.estinf.Krate.auth.AuthDtos.UserResponse;
import com.estinf.Krate.common.CurrentUser;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

	private final AuthService authService;
	private final CurrentUser currentUser;

	public AuthController(AuthService authService, CurrentUser currentUser) {
		this.authService = authService;
		this.currentUser = currentUser;
	}

	@PostMapping("/register")
	@ResponseStatus(HttpStatus.CREATED)
	public AuthResponse register(@Valid @RequestBody RegisterRequest req) {
		return authService.register(req);
	}

	@PostMapping("/login")
	public AuthResponse login(@Valid @RequestBody LoginRequest req) {
		return authService.login(req);
	}

	@GetMapping("/me")
	public UserResponse me() {
		return authService.me(currentUser.id());
	}
}

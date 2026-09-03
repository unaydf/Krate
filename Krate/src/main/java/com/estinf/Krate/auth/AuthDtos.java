package com.estinf.Krate.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public final class AuthDtos {

	private AuthDtos() {
	}

	public record RegisterRequest(
			@NotBlank(message = "El correo es obligatorio") @Email(message = "El correo no es válido") @Size(max = 255) String email,
			@NotBlank(message = "El nombre es obligatorio") @Size(max = 120, message = "El nombre no puede superar 120 caracteres") String name,
			@NotBlank(message = "La contraseña es obligatoria") @Size(min = 8, max = 72, message = "La contraseña debe tener entre 8 y 72 caracteres") String password) {
	}

	public record LoginRequest(
			@NotBlank(message = "El correo es obligatorio") @Email(message = "El correo no es válido") String email,
			@NotBlank(message = "La contraseña es obligatoria") String password) {
	}

	public record UserResponse(Long id, String email, String name) {
	}

	public record AuthResponse(String token, UserResponse user) {
	}
}

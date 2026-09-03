package com.estinf.Krate;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

class AuthFlowTest extends ApiTestSupport {

	@Test
	void registerLoginAndMe() throws Exception {
		String email = uniqueEmail("auth");
		String token = registerAndGetToken(email);

		mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + token))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.email").value(email))
			.andExpect(jsonPath("$.name").value("Usuario " + email));

		mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
				.content("{\"email\":\"%s\",\"password\":\"secreto123\"}".formatted(email)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.token").isNotEmpty())
			.andExpect(jsonPath("$.user.email").value(email));
	}

	@Test
	void duplicateEmailIsRejected() throws Exception {
		String email = uniqueEmail("dup");
		registerAndGetToken(email);
		mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
				.content("{\"email\":\"%s\",\"name\":\"Otro\",\"password\":\"secreto123\"}".formatted(email)))
			.andExpect(status().isConflict());
	}

	@Test
	void wrongPasswordIsUnauthorized() throws Exception {
		String email = uniqueEmail("wrong");
		registerAndGetToken(email);
		mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
				.content("{\"email\":\"%s\",\"password\":\"incorrecta\"}".formatted(email)))
			.andExpect(status().isUnauthorized());
	}

	@Test
	void protectedEndpointsRequireToken() throws Exception {
		mvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized());
		mvc.perform(get("/api/items")).andExpect(status().isUnauthorized());
	}

	@Test
	void validationErrorsAreReported() throws Exception {
		mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
				.content("{\"email\":\"no-es-correo\",\"name\":\"\",\"password\":\"123\"}"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors.email").exists())
			.andExpect(jsonPath("$.errors.name").exists())
			.andExpect(jsonPath("$.errors.password").exists());
	}
}

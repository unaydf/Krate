package com.estinf.Krate;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;

class ItemsTest extends ApiTestSupport {

	private static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0};

	@Test
	void crudWithImageAndOwnerIsolation() throws Exception {
		String alice = registerAndGetToken(uniqueEmail("alice"));
		String bob = registerAndGetToken(uniqueEmail("bob"));

		String created = mvc.perform(multipart("/api/items")
				.file(new MockMultipartFile("image", "foto.png", "image/png", PNG))
				.param("name", "Tortilla")
				.param("description", "Con cebolla")
				.header("Authorization", "Bearer " + alice))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.name").value("Tortilla"))
			.andExpect(jsonPath("$.imageUrl").isNotEmpty())
			.andReturn().getResponse().getContentAsString();
		int id = read(created, "$.id");
		String imageUrl = read(created, "$.imageUrl");

		// La imagen se sirve publicamente
		mvc.perform(get(imageUrl)).andExpect(status().isOk()).andExpect(content().contentType(MediaType.IMAGE_PNG));

		// Bob no ve ni accede al item de Alice
		mvc.perform(get("/api/items").header("Authorization", "Bearer " + bob))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.length()").value(0));
		mvc.perform(get("/api/items/" + id).header("Authorization", "Bearer " + bob))
			.andExpect(status().isNotFound());

		// Editar quitando la imagen
		mvc.perform(multipart(HttpMethod.PUT, "/api/items/" + id)
				.param("name", "Tortilla de patatas")
				.param("description", "")
				.param("removeImage", "true")
				.header("Authorization", "Bearer " + alice))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.name").value("Tortilla de patatas"))
			.andExpect(jsonPath("$.imageUrl").doesNotExist());

		// Formato de imagen no permitido
		mvc.perform(multipart("/api/items")
				.file(new MockMultipartFile("image", "doc.txt", "text/plain", "hola".getBytes()))
				.param("name", "Malo")
				.header("Authorization", "Bearer " + alice))
			.andExpect(status().isBadRequest());

		// Borrado logico
		mvc.perform(delete("/api/items/" + id).header("Authorization", "Bearer " + alice))
			.andExpect(status().isNoContent());
		mvc.perform(get("/api/items").header("Authorization", "Bearer " + alice))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.length()").value(0));
		mvc.perform(get("/api/items/" + id).header("Authorization", "Bearer " + alice))
			.andExpect(status().isNotFound());
	}

	@Test
	void nameIsRequired() throws Exception {
		String token = registerAndGetToken(uniqueEmail("val"));
		mvc.perform(multipart("/api/items").param("name", "  ").header("Authorization", "Bearer " + token))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors.name").exists());
	}
}

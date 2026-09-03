package com.estinf.Krate.item;

import java.util.concurrent.TimeUnit;

import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.estinf.Krate.common.NotFoundException;

@RestController
@RequestMapping("/api/files")
public class FileController {

	private final ImageStorageService storage;

	public FileController(ImageStorageService storage) {
		this.storage = storage;
	}

	@GetMapping("/{filename:.+}")
	public ResponseEntity<Resource> serve(@PathVariable String filename) {
		Resource resource = storage.load(filename).orElseThrow(() -> new NotFoundException("Fichero no encontrado"));
		return ResponseEntity.ok()
			.cacheControl(CacheControl.maxAge(30, TimeUnit.DAYS).cachePublic())
			.contentType(mediaTypeFor(filename))
			.body(resource);
	}

	private static MediaType mediaTypeFor(String filename) {
		String lower = filename.toLowerCase();
		if (lower.endsWith(".png")) {
			return MediaType.IMAGE_PNG;
		}
		if (lower.endsWith(".webp")) {
			return MediaType.parseMediaType("image/webp");
		}
		return MediaType.IMAGE_JPEG;
	}
}

package com.estinf.Krate.item;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.springframework.core.io.PathResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.estinf.Krate.common.BadRequestException;
import com.estinf.Krate.config.AppProperties;

import jakarta.annotation.PostConstruct;

/** Guarda las imagenes de los items en disco con un nombre aleatorio. */
@Service
public class ImageStorageService {

	private static final Map<String, String> ALLOWED = Map.of(
		"image/jpeg", "jpg",
		"image/png", "png",
		"image/webp", "webp");

	private final Path root;

	public ImageStorageService(AppProperties props) {
		this.root = Path.of(props.uploadDir()).toAbsolutePath().normalize();
	}

	@PostConstruct
	void init() {
		try {
			Files.createDirectories(root);
		}
		catch (IOException ex) {
			throw new UncheckedIOException("No se pudo crear el directorio de subidas " + root, ex);
		}
	}

	public String store(MultipartFile file) {
		String ext = ALLOWED.get(file.getContentType() == null ? "" : file.getContentType().toLowerCase());
		if (ext == null) {
			throw new BadRequestException("Formato de imagen no permitido. Usa JPG, PNG o WebP");
		}
		String filename = UUID.randomUUID() + "." + ext;
		try {
			Files.copy(file.getInputStream(), root.resolve(filename), StandardCopyOption.REPLACE_EXISTING);
		}
		catch (IOException ex) {
			throw new UncheckedIOException("No se pudo guardar la imagen", ex);
		}
		return filename;
	}

	public void delete(String filename) {
		if (filename == null) {
			return;
		}
		try {
			Files.deleteIfExists(resolveSafe(filename));
		}
		catch (IOException ignored) {
			// Un fichero huerfano no debe impedir la operacion
		}
	}

	public Optional<Resource> load(String filename) {
		Path path = resolveSafe(filename);
		if (!Files.isRegularFile(path)) {
			return Optional.empty();
		}
		return Optional.of(new PathResource(path));
	}

	private Path resolveSafe(String filename) {
		Path path = root.resolve(filename).normalize();
		if (!path.startsWith(root)) {
			throw new BadRequestException("Nombre de fichero no válido");
		}
		return path;
	}
}

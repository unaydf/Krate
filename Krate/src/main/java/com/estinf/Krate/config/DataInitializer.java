package com.estinf.Krate.config;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.stream.Stream;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.estinf.Krate.common.PublicUrls;
import com.estinf.Krate.item.Item;
import com.estinf.Krate.item.ItemRepository;
import com.estinf.Krate.user.User;
import com.estinf.Krate.user.UserRepository;
import com.estinf.Krate.voting.Voting;
import com.estinf.Krate.voting.VotingRepository;
import com.estinf.Krate.voting.strategy.VotingType;
import com.estinf.Krate.votingpoint.CodeGenerator;
import com.estinf.Krate.votingpoint.VotingPoint;
import com.estinf.Krate.votingpoint.VotingPointRepository;

/**
 * Datos de prueba. Solo se ejecuta si {@code app.seed.enabled=true} (variable APP_SEED_ENABLED).
 * <p>
 * En cada arranque <b>vacía toda la base de datos</b> y las imágenes subidas, y crea:
 * un gestor de prueba, diez items que simulan productos de una máquina expendedora,
 * una votación de cada tipo (voto único, votos limitados y ranking) y dos puntos de votación
 * que simulan dos máquinas expendedoras distintas.
 */
@Component
@ConditionalOnProperty(name = "app.seed.enabled", havingValue = "true")
public class DataInitializer implements ApplicationRunner {

	private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

	public static final String EMAIL = "gestor-test@gmail.com";
	public static final String PASSWORD = "gestor-test123";
	public static final String NAME = "Gestor-Test";

	private final JdbcTemplate jdbc;
	private final PasswordEncoder passwordEncoder;
	private final UserRepository users;
	private final ItemRepository items;
	private final VotingRepository votings;
	private final VotingPointRepository points;
	private final CodeGenerator codes;
	private final PublicUrls urls;
	private final AppProperties props;

	public DataInitializer(JdbcTemplate jdbc, PasswordEncoder passwordEncoder, UserRepository users,
			ItemRepository items, VotingRepository votings, VotingPointRepository points, CodeGenerator codes,
			PublicUrls urls, AppProperties props) {
		this.jdbc = jdbc;
		this.passwordEncoder = passwordEncoder;
		this.users = users;
		this.items = items;
		this.votings = votings;
		this.points = points;
		this.codes = codes;
		this.urls = urls;
		this.props = props;
	}

	@Override
	@Transactional
	public void run(ApplicationArguments args) {
		log.warn("app.seed.enabled=true: se vacía la base de datos y se cargan datos de prueba");
		wipe();

		User gestor = users.save(new User(EMAIL, NAME, passwordEncoder.encode(PASSWORD)));
		long owner = gestor.getId();

		List<Item> products = items.saveAll(List.of(
			new Item(owner, "Agua mineral 50 cl", "Botella de agua sin gas"),
			new Item(owner, "Refresco de cola zero", "Lata de 33 cl sin azúcar"),
			new Item(owner, "Zumo de naranja", "Brik de 20 cl, 100 % exprimido"),
			new Item(owner, "Café con leche", "Vaso caliente de 15 cl"),
			new Item(owner, "Patatas fritas", "Bolsa de 45 g, sabor original"),
			new Item(owner, "Barrita de cereales", "Avena y miel, 30 g"),
			new Item(owner, "Chocolatina", "Chocolate con leche y caramelo"),
			new Item(owner, "Sándwich mixto", "Jamón y queso, envasado al vacío"),
			new Item(owner, "Chicles de menta", "Paquete de 10 unidades sin azúcar"),
			new Item(owner, "Fruta fresca", "Pieza de fruta de temporada")));

		Voting single = voting(owner, "Producto favorito", "¿Qué producto de la máquina te gusta más? Elige uno.",
			VotingType.SINGLE, null, products);
		Voting limited = voting(owner, "Tus tres imprescindibles",
			"Marca hasta tres productos que no pueden faltar en la máquina.", VotingType.LIMITED, 3, products);
		Voting ranking = voting(owner, "Ranking de snacks", "Ordena los snacks de mejor a peor.",
			VotingType.RANKING, null, products.subList(4, 10));

		VotingPoint hall = point(owner, "Máquina expendedora · Hall principal",
			"Máquina junto a la entrada del edificio", single);
		VotingPoint cafeteria = point(owner, "Máquina expendedora · Cafetería",
			"Máquina de la zona de descanso de la primera planta", limited);

		log.info("Datos de prueba cargados. Gestor: {} / {}", EMAIL, PASSWORD);
		log.info("  {} items, 3 votaciones ({} SINGLE, {} LIMITED, {} RANKING sin asignar)", products.size(),
			single.getName(), limited.getName(), ranking.getName());
		log.info("  Punto '{}' -> {}", hall.getName(), urls.votingPoint(hall.getCode()));
		log.info("  Punto '{}' -> {}", cafeteria.getName(), urls.votingPoint(cafeteria.getCode()));
	}

	private void wipe() {
		jdbc.execute("TRUNCATE TABLE votes, ballots, voting_instances, voting_items, voting_points, votings, items, users "
			+ "RESTART IDENTITY CASCADE");
		Path uploads = Path.of(props.uploadDir()).toAbsolutePath().normalize();
		if (Files.isDirectory(uploads)) {
			try (Stream<Path> files = Files.list(uploads)) {
				files.filter(Files::isRegularFile).forEach(f -> {
					try {
						Files.deleteIfExists(f);
					}
					catch (IOException ex) {
						log.warn("No se pudo borrar la imagen {}", f, ex);
					}
				});
			}
			catch (IOException ex) {
				log.warn("No se pudo listar el directorio de subidas {}", uploads, ex);
			}
		}
	}

	private Voting voting(long owner, String name, String description, VotingType type, Integer maxSelections,
			List<Item> votingItems) {
		Voting v = new Voting(owner, name, description);
		v.setType(type);
		v.setMaxSelections(maxSelections);
		v.setItems(votingItems);
		return votings.save(v);
	}

	private VotingPoint point(long owner, String name, String description, Voting voting) {
		VotingPoint p = new VotingPoint(owner, name, description, codes.nextUnique());
		p.setVoting(voting);
		return points.save(p);
	}
}

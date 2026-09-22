package com.estinf.Krate.item;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ItemRepository extends JpaRepository<Item, Long> {

	List<Item> findAllByOwnerIdAndDeletedAtIsNullOrderByNameAsc(long ownerId);

	Optional<Item> findByIdAndOwnerIdAndDeletedAtIsNull(long id, long ownerId);

	List<Item> findAllByIdInAndOwnerIdAndDeletedAtIsNull(Collection<Long> ids, long ownerId);

	/** Incluye items borrados: las estadisticas conservan su historico. */
	Optional<Item> findByIdAndOwnerId(long id, long ownerId);
}

package com.estinf.Krate.voting.strategy;

import java.lang.reflect.Field;
import java.util.List;

import com.estinf.Krate.common.PublicUrls;
import com.estinf.Krate.config.AppProperties;
import com.estinf.Krate.item.Item;

/** Utilidades para probar las estrategias sin Spring ni base de datos. */
final class StrategyTestSupport {

	private StrategyTestSupport() {
	}

	static PublicUrls urls() {
		return new PublicUrls(new AppProperties(new AppProperties.Jwt("x".repeat(32), 24), List.of(),
			"http://voting.test", "./uploads"));
	}

	/** Crea un item con id fijado por reflexion (la entidad no expone setId). */
	static Item item(long id, String name) {
		Item item = new Item(1L, name, "");
		try {
			Field f = Item.class.getDeclaredField("id");
			f.setAccessible(true);
			f.set(item, id);
		}
		catch (ReflectiveOperationException ex) {
			throw new IllegalStateException(ex);
		}
		return item;
	}

	static RankedVote vote(long itemId, Integer rank) {
		return new RankedVote(itemId, rank);
	}
}

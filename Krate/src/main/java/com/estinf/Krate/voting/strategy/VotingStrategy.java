package com.estinf.Krate.voting.strategy;

import java.util.List;

import com.estinf.Krate.item.Item;
import com.estinf.Krate.stats.StatsDtos.ItemResult;

/**
 * Patron Strategy: cada tipo de votacion define como se configura, como se valida
 * una papeleta, como se puntua y que instrucciones ve el votante.
 */
public interface VotingStrategy {

	VotingType type();

	/**
	 * Valida la configuracion de la votacion.
	 * @param maxSelections numero maximo de selecciones (solo tiene sentido en LIMITED)
	 * @param itemCount numero de items de la votacion; puede ser 0 al crearla
	 * @throws com.estinf.Krate.common.BadRequestException si la configuracion no es valida
	 */
	void validateConfig(Integer maxSelections, int itemCount);

	/**
	 * Valida una papeleta.
	 * @param allowedItemIds ids de los items votables de la votacion
	 * @param maxSelections configuracion de la votacion
	 * @param chosenItemIds ids elegidos por el votante, en orden de preferencia
	 * @throws com.estinf.Krate.common.BadRequestException si la papeleta no es valida
	 */
	void validateBallot(List<Long> allowedItemIds, Integer maxSelections, List<Long> chosenItemIds);

	/**
	 * Calcula los resultados de una instancia.
	 * @param candidates items a puntuar (incluye borrados o retirados que hayan recibido votos)
	 * @param votes selecciones registradas
	 * @param totalBallots numero de papeletas emitidas
	 * @return resultados ordenados de mejor a peor
	 */
	List<ItemResult> score(List<Item> candidates, List<RankedVote> votes, long totalBallots);

	/** Instrucciones para el votante, p. ej. "Elige hasta 3 opciones". */
	String instructions(Integer maxSelections);

	/** Nombre de la metrica principal en estadisticas: "votos" o "puntos". */
	String scoringLabel();
}

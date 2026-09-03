package com.estinf.Krate.vote;

import java.time.Instant;

import com.estinf.Krate.instance.VotingInstance;
import com.estinf.Krate.item.Item;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/** Una seleccion dentro de una papeleta. */
@Entity
@Table(name = "votes")
public class Vote {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "ballot_id", nullable = false)
	private Ballot ballot;

	/** Desnormalizado desde la papeleta para agrupar recuentos sin join. */
	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "instance_id", nullable = false)
	private VotingInstance instance;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "item_id", nullable = false)
	private Item item;

	/** Posicion en la papeleta (1 = mejor). Solo en votaciones RANKING. */
	@Column(name = "rank_position")
	private Integer rank;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt;

	protected Vote() {
	}

	Vote(Ballot ballot, Item item, Integer rank) {
		this.ballot = ballot;
		this.instance = ballot.getInstance();
		this.item = item;
		this.rank = rank;
		this.createdAt = Instant.now();
	}

	public Long getId() { return id; }
	public Ballot getBallot() { return ballot; }
	public VotingInstance getInstance() { return instance; }
	public Item getItem() { return item; }
	public Integer getRank() { return rank; }
	public Instant getCreatedAt() { return createdAt; }
}

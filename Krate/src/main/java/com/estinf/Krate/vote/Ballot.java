package com.estinf.Krate.vote;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import com.estinf.Krate.instance.VotingInstance;
import com.estinf.Krate.item.Item;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;

/** Papeleta: la participacion de un dispositivo en una instancia, con una o varias selecciones. */
@Entity
@Table(name = "ballots")
public class Ballot {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "instance_id", nullable = false)
	private VotingInstance instance;

	@Column(name = "voter_token", nullable = false, length = 64)
	private String voterToken;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt;

	@OneToMany(mappedBy = "ballot", cascade = CascadeType.ALL, orphanRemoval = true)
	private List<Vote> votes = new ArrayList<>();

	protected Ballot() {
	}

	public Ballot(VotingInstance instance, String voterToken) {
		this.instance = instance;
		this.voterToken = voterToken;
		this.createdAt = Instant.now();
	}

	/** Anade una seleccion. rank es la posicion (1 = mejor) o null si no aplica. */
	public void addVote(Item item, Integer rank) {
		votes.add(new Vote(this, item, rank));
	}

	public Long getId() { return id; }
	public VotingInstance getInstance() { return instance; }
	public String getVoterToken() { return voterToken; }
	public Instant getCreatedAt() { return createdAt; }
	public List<Vote> getVotes() { return votes; }
}

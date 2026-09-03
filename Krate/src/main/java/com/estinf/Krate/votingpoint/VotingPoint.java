package com.estinf.Krate.votingpoint;

import java.time.Instant;

import com.estinf.Krate.voting.Voting;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(name = "voting_points")
public class VotingPoint {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "owner_id", nullable = false)
	private long ownerId;

	@Column(nullable = false)
	private String name;

	@Column(nullable = false)
	private String description = "";

	@Column(nullable = false, unique = true, length = 8)
	private String code;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "voting_id")
	private Voting voting;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt;

	@Column(name = "deleted_at")
	private Instant deletedAt;

	protected VotingPoint() {
	}

	public VotingPoint(long ownerId, String name, String description, String code) {
		this.ownerId = ownerId;
		this.name = name;
		this.description = description;
		this.code = code;
	}

	@PrePersist
	void onCreate() {
		createdAt = Instant.now();
	}

	/** Votacion asignada si existe y no ha sido borrada. */
	public Voting assignedVoting() {
		return (voting == null || voting.isDeleted()) ? null : voting;
	}

	public Long getId() { return id; }
	public long getOwnerId() { return ownerId; }
	public String getName() { return name; }
	public void setName(String name) { this.name = name; }
	public String getDescription() { return description; }
	public void setDescription(String description) { this.description = description; }
	public String getCode() { return code; }
	public Voting getVoting() { return voting; }
	public void setVoting(Voting voting) { this.voting = voting; }
	public Instant getCreatedAt() { return createdAt; }
	public Instant getDeletedAt() { return deletedAt; }
	public boolean isDeleted() { return deletedAt != null; }
	public void markDeleted() { this.deletedAt = Instant.now(); }
}

package com.estinf.Krate.voting;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import com.estinf.Krate.item.Item;
import com.estinf.Krate.voting.strategy.VotingType;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

@Entity
@Table(name = "votings")
public class Voting {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "owner_id", nullable = false)
	private long ownerId;

	@Column(nullable = false)
	private String name;

	@Column(nullable = false)
	private String description = "";

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private VotingType type = VotingType.SINGLE;

	@Column(name = "max_selections")
	private Integer maxSelections;

	@ManyToMany
	@JoinTable(name = "voting_items",
		joinColumns = @JoinColumn(name = "voting_id"),
		inverseJoinColumns = @JoinColumn(name = "item_id"))
	@OrderColumn(name = "position")
	private List<Item> items = new ArrayList<>();

	@Column(name = "created_at", nullable = false)
	private Instant createdAt;

	@Column(name = "updated_at", nullable = false)
	private Instant updatedAt;

	@Column(name = "deleted_at")
	private Instant deletedAt;

	protected Voting() {
	}

	public Voting(long ownerId, String name, String description) {
		this.ownerId = ownerId;
		this.name = name;
		this.description = description;
	}

	@PrePersist
	void onCreate() {
		createdAt = Instant.now();
		updatedAt = createdAt;
	}

	@PreUpdate
	void onUpdate() {
		updatedAt = Instant.now();
	}

	/** Items visibles (no borrados) en su orden. */
	public List<Item> activeItems() {
		return items.stream().filter(i -> !i.isDeleted()).toList();
	}

	public List<Long> itemIds() {
		return items.stream().map(Item::getId).toList();
	}

	public Long getId() { return id; }
	public long getOwnerId() { return ownerId; }
	public String getName() { return name; }
	public void setName(String name) { this.name = name; }
	public String getDescription() { return description; }
	public void setDescription(String description) { this.description = description; }
	public VotingType getType() { return type; }
	public void setType(VotingType type) { this.type = type == null ? VotingType.SINGLE : type; }
	public Integer getMaxSelections() { return maxSelections; }
	public void setMaxSelections(Integer maxSelections) { this.maxSelections = maxSelections; }
	public List<Item> getItems() { return items; }
	public void setItems(List<Item> items) { this.items = new ArrayList<>(items); }
	public Instant getCreatedAt() { return createdAt; }
	public Instant getUpdatedAt() { return updatedAt; }
	public Instant getDeletedAt() { return deletedAt; }
	public boolean isDeleted() { return deletedAt != null; }
	public void markDeleted() { this.deletedAt = Instant.now(); }
}

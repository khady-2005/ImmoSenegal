package sn.immosenegal.agence;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.*;

@Entity
@Table(name = "agence_contact_activites")
public class ActiviteContactAgence {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "contact_id", nullable = false)
    private ContactAgence contact;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "auteur_id", nullable = false)
    private sn.immosenegal.user.User auteur;

    @Column(nullable = false, length = 20)
    private String type;

    @Column(nullable = false, length = 2000)
    private String contenu;

    @Column(name = "cree_le", nullable = false, updatable = false)
    private Instant creeLe = Instant.now();

    protected ActiviteContactAgence() {}

    public ActiviteContactAgence(ContactAgence contact, sn.immosenegal.user.User auteur, String type, String contenu) {
        this.contact = contact;
        this.auteur = auteur;
        this.type = type;
        this.contenu = contenu;
    }

    public UUID getId() { return id; }
    public ContactAgence getContact() { return contact; }
    public sn.immosenegal.user.User getAuteur() { return auteur; }
    public String getType() { return type; }
    public String getContenu() { return contenu; }
    public Instant getCreeLe() { return creeLe; }
}

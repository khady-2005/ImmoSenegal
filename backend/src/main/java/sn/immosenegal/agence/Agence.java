package sn.immosenegal.agence;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "agences")
public class Agence {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 150)
    private String nom;

    @Column(nullable = false, unique = true, length = 160)
    private String slug;

    @Column(length = 2000)
    private String description;

    @Column(name = "email_contact", length = 254)
    private String emailContact;

    @Column(name = "telephone_contact", length = 30)
    private String telephoneContact;

    @Column(length = 255)
    private String adresse;

    @Column(name = "logo_url", length = 500)
    private String logoUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AgenceType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StatutAgence statut = StatutAgence.EN_ATTENTE;

    @Column(name = "cree_le", nullable = false, updatable = false)
    private Instant creeLe = Instant.now();

    @Column(name = "modifie_le", nullable = false)
    private Instant modifieLe = Instant.now();

    protected Agence() {
        // requis par JPA
    }

    public Agence(String nom, String slug, AgenceType type) {
        this.nom = nom;
        this.slug = slug;
        this.type = type;
    }

    public UUID getId() { return id; }
    public String getNom() { return nom; }
    public String getSlug() { return slug; }
    public String getDescription() { return description; }
    public String getEmailContact() { return emailContact; }
    public String getTelephoneContact() { return telephoneContact; }
    public String getAdresse() { return adresse; }
    public String getLogoUrl() { return logoUrl; }
    public AgenceType getType() { return type; }
    public StatutAgence getStatut() { return statut; }
    public Instant getCreeLe() { return creeLe; }
    public Instant getModifieLe() { return modifieLe; }

    public void setNom(String nom) { this.nom = nom; }
    public void setDescription(String description) { this.description = description; }
    public void setEmailContact(String emailContact) { this.emailContact = emailContact; }
    public void setTelephoneContact(String telephoneContact) { this.telephoneContact = telephoneContact; }
    public void setAdresse(String adresse) { this.adresse = adresse; }
    public void setLogoUrl(String logoUrl) { this.logoUrl = logoUrl; }
    public void setStatut(StatutAgence statut) { this.statut = statut; }
    public void setModifieLe(Instant modifieLe) { this.modifieLe = modifieLe; }
}

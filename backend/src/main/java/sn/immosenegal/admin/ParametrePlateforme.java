package sn.immosenegal.admin;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "parametres_plateforme")
public class ParametrePlateforme {

    @Id
    @Column(length = 80)
    private String cle;

    @Column(nullable = false, length = 255)
    private String valeur;

    @Column(nullable = false, length = 200)
    private String libelle;

    @Column(name = "modifie_le", nullable = false)
    private Instant modifieLe = Instant.now();

    protected ParametrePlateforme() {}

    public String getCle() { return cle; }
    public String getValeur() { return valeur; }
    public String getLibelle() { return libelle; }
    public Instant getModifieLe() { return modifieLe; }

    public void setValeur(String valeur) {
        this.valeur = valeur;
        this.modifieLe = Instant.now();
    }
}

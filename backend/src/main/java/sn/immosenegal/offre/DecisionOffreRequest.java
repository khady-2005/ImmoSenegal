package sn.immosenegal.offre;
import jakarta.validation.constraints.Size;
public record DecisionOffreRequest(boolean accepter, @Size(max=1000) String reponse) {}
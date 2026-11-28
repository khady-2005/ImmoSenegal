import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

interface RecuVerificationDto {
  valide: boolean;
  codeVerification: string;
  modePaiement: string | null;
  montant: number;
  periode: string;
  datePaiement: string;
  simulation: boolean;
}

export function VerifierRecu() {
  const { code } = useParams<{ code: string }>();
  const [recu, setRecu] = useState<RecuVerificationDto | null>(null);
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    if (!code) {
      setErreur("Aucun code de vérification fourni.");
      setChargement(false);
      return;
    }
    setChargement(true);
    fetch(`/api/locations/recus/verifier/${encodeURIComponent(code)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Reçu introuvable ou invalide.");
        return res.json();
      })
      .then((data) => {
        setRecu(data);
        setErreur("");
      })
      .catch((e) => setErreur(e instanceof Error ? e.message : "Erreur de vérification."))
      .finally(() => setChargement(false));
  }, [code]);

  return (
    <div className="conteneur" style={{ maxWidth: 640, margin: "2rem auto" }}>
      <h1 className="titre-page">Vérification d&apos;un reçu de loyer</h1>
      {chargement && <p>Vérification en cours…</p>}
      {erreur && <div className="alerte alerte-erreur">{erreur}</div>}
      {recu && (
        <div className="carte" style={{ padding: "1.5rem" }}>
          <p className="badge" style={{ marginBottom: "1rem" }}>
            {recu.simulation ? "SIMULATION — Paiement simulé" : "Paiement vérifié"}
          </p>
          <p><strong>Statut :</strong> {recu.valide ? "Reçu valide" : "Invalide"}</p>
          <p><strong>Code :</strong> <code>{recu.codeVerification}</code></p>
          <p><strong>Montant :</strong> {Number(recu.montant).toLocaleString("fr-FR")} FCFA</p>
          <p><strong>Période :</strong> {recu.periode}</p>
          <p><strong>Date de paiement :</strong> {recu.datePaiement}</p>
          {recu.modePaiement && <p><strong>Mode :</strong> {recu.modePaiement}</p>}
        </div>
      )}
    </div>
  );
}

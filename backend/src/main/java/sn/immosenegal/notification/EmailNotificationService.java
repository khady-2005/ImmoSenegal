package sn.immosenegal.notification;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import sn.immosenegal.user.User;

@Service
public class EmailNotificationService {
    private static final Logger log = LoggerFactory.getLogger(EmailNotificationService.class);

    private final ObjectProvider<JavaMailSender> mailSenders;
    private final String expediteur;

    public EmailNotificationService(
            ObjectProvider<JavaMailSender> mailSenders,
            @Value("${app.mail.from:}") String expediteur) {
        this.mailSenders = mailSenders;
        this.expediteur = expediteur;
    }

    public void envoyer(User destinataire, String titre, String message) {
        if (destinataire == null || destinataire.getEmail() == null || destinataire.getEmail().isBlank()) {
            return;
        }

        JavaMailSender sender = mailSenders.getIfAvailable();
        if (sender == null || expediteur == null || expediteur.isBlank()) {
            return; // Configuration SMTP absente : les notifications dans l'application restent actives.
        }

        SimpleMailMessage email = new SimpleMailMessage();
        email.setFrom(expediteur);
        email.setTo(destinataire.getEmail());
        email.setSubject("[ImmoSénégal] " + titre);
        email.setText("Bonjour " + destinataire.getNomComplet() + ",\n\n"
                + message + "\n\n"
                + "Connectez-vous à ImmoSénégal pour consulter votre notification.\n"
                + "Cet e-mail est automatique, merci de ne pas y répondre.");

        try {
            sender.send(email);
        } catch (MailException ex) {
            // Une panne d'e-mail ne doit jamais empêcher l'enregistrement de la notification interne.
            log.warn("Envoi d'une notification e-mail impossible.");
        }
    }
}

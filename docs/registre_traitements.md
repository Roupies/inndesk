# Registre simplifié des traitements proposés

Ce registre est un support pédagogique à adapter par l’établissement. Les
bases et conservations indiquées sont des propositions, pas une qualification
juridique définitive.

| Traitement | Finalité | Données | Personnes | Base proposée | Destinataires | Conservation proposée | Sécurité |
|---|---|---|---|---|---|---|---|
| Gestion des clients | Identifier et contacter le client pendant la relation | Prénom, nom, email, téléphone, nationalité, document facultatif | Clients et voyageurs | Exécution du contrat | Réceptionnistes et administrateurs | Base active pendant la relation, puis suppression ou anonymisation selon l’historique | JWT, rôles, validation serveur, minimisation des listes |
| Réservations et séjours | Organiser les arrivées, chambres et départs | Identité liée, dates, chambre, occupants, notes | Clients et voyageurs | Exécution du contrat | Réceptionnistes et administrateurs | Durée opérationnelle puis historique restreint selon les besoins établis | Authentification, contrôles métier, verrouillage transactionnel |
| Facturation | Produire et suivre les factures | Identité liée, séjour, montants, TVA, paiement | Clients facturés | Exécution du contrat et obligation légale proposée | Réceptionnistes, administrateurs, prestataires autorisés | Durée définie par l’établissement selon ses obligations comptables | Contrôle d’accès, PDF authentifié, secrets externalisés |
| Gestion des utilisateurs | Administrer les accès internes | Nom, email professionnel, rôle, état du compte, mot de passe hashé | Personnel autorisé | Intérêt légitime ou contrat de travail à confirmer | Administrateurs | Durée d’activité du compte puis suppression selon la politique interne | Hashage, JWT, rôles, désactivation de compte |
| Communications commerciales facultatives | Envoyer des informations commerciales si un canal est ultérieurement mis en place | Coordonnées, choix et date du consentement | Clients ayant choisi cette option | Consentement | Personnel autorisé et prestataire contractualisé éventuel | Jusqu’au retrait ou à l’expiration définie | Case non précochée, horodatage, retrait, exclusion des clients anonymisés |

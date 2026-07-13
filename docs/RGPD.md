# Mesures techniques de protection des données dans InnDesk

Ce document décrit une démonstration technique limitée, inspirée de principes
du RGPD, réalisée dans le cadre du titre professionnel RNCP 37674 DWWM. Il ne
constitue ni une analyse juridique, ni une attestation de conformité. Chaque
établissement doit adapter ces propositions à ses traitements, contrats et
obligations réels avec un conseil compétent.

## Responsable de traitement

Dans une exploitation réelle, l’établissement hôtelier utilisant InnDesk est
le responsable du traitement.

## Finalités

- gestion des clients ;
- gestion des réservations et séjours ;
- facturation ;
- communications commerciales facultatives.

## Catégories de données

- identité : prénom, nom et, uniquement si le séjour le nécessite, document
  d’identité facultatif ;
- coordonnées : email, téléphone et nationalité facultatifs ;
- informations de séjour : dates, chambre, composition du séjour et notes ;
- facturation : montants, TVA, statut et moyen de paiement ;
- consentement marketing : choix facultatif et date de recueil.

Le document d’identité n’apparaît pas dans les listes ou exports CSV généraux.
Il reste accessible dans la fiche détaillée aux seuls utilisateurs
authentifiés. Son usage doit être justifié par l’établissement et il ne doit pas
être collecté systématiquement.

## Bases légales proposées

- exécution du contrat pour la réservation, le séjour et la facturation ;
- obligation légale pour les données comptables concernées ;
- consentement pour la prospection facultative.

Ces bases sont des propositions à vérifier et adapter par chaque
établissement. La création d’un client ou d’une réservation ne dépend jamais
du consentement marketing.

## Destinataires

- réceptionnistes autorisés ;
- administrateurs ;
- éventuels prestataires techniques contractualisés.

## Conservation

Politique technique proposée, à formaliser par l’établissement :

- données opérationnelles en base active : pendant la relation client et tant
  qu’elles sont nécessaires aux séjours en cours ;
- historique nécessaire aux obligations comptables : archivage pendant la
  durée déterminée par l’établissement selon ses obligations réelles ;
- consentement marketing : jusqu’à son retrait ou à l’expiration définie dans
  la politique de l’établissement ;
- comptes utilisateurs : pendant la durée d’activité du compte ;
- logs éventuels : durée courte, accès limité et durée documentée.

La base active, un éventuel archivage restreint et l’anonymisation sont des
étapes distinctes. InnDesk ne déclenche actuellement aucune purge automatique.
L’établissement doit documenter les revues périodiques et la protection des
sauvegardes contenant encore des données antérieures à une anonymisation.

## Droits

Les mécanismes techniques permettent aux utilisateurs autorisés de traiter une
demande reçue par l’établissement :

- accès et export JSON structuré ;
- rectification depuis la fiche client ;
- effacement physique lorsqu’aucune réservation n’existe ;
- anonymisation administrative lorsque l’intégrité de l’historique doit être
  conservée ;
- limitation et opposition à organiser par l’établissement ;
- portabilité lorsque celle-ci est applicable ;
- retrait du consentement marketing à tout moment.

## Sécurité

- authentification JWT des endpoints clients ;
- contrôle de rôles, avec anonymisation réservée aux administrateurs ;
- mots de passe hashés ;
- longueurs et formats validés côté serveur ;
- accès aux données par ORM paramétré ;
- rendu front-end des données avec `textContent` et création de nœuds DOM ;
- secrets externalisés dans l’environnement ;
- sauvegardes à chiffrer, protéger et tester dans une exploitation réelle.

## Limites

- pas de portail autonome pour les clients ;
- demandes exercées par l’intermédiaire de l’établissement ;
- absence d’automatisation complète de la purge ou de l’archivage ;
- absence de gestion automatisée de la limitation du traitement ;
- consentement marketing enregistré, mais aucun moteur de campagne marketing
  n’est fourni ;
- politique, mentions et durées à adapter au contexte juridique réel ;
- anonymisation de la base active sans réécriture automatique des sauvegardes
  historiques déjà constituées.

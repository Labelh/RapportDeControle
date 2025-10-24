# Application de Rapport de Contrôle Qualité

Application web pour la gestion des rapports de contrôle qualité avec authentification Supabase, gestion des utilisateurs et espace d'administration.

## 🚀 Fonctionnalités

### Authentification
- Connexion par email et mot de passe via Supabase Auth
- Gestion des rôles (Utilisateur / Administrateur)
- Session persistante

### Pour les Utilisateurs
- **Créer des rapports de contrôle** avec :
  - Informations générales (OF, Phase, Référence, Désignation, Client)
  - Ajout de défauts avec photos
  - Compression automatique des images
- **Génération de PDF** avec code-barres
- **Historique** de tous les rapports

### Pour les Administrateurs
- **Espace Admin** : Gestion des non-conformités avec filtrage par statut
- **Gestion des utilisateurs** : Ajout/suppression d'utilisateurs
- **Paramètres** :
  - Gestion des clients
  - Gestion des types de défauts
- Modification du statut des rapports (En attente / Traité / Résolu)

### Autres
- Interface responsive avec sidebar adaptative
- Mode sombre/clair
- Notifications en temps réel

## 📋 Prérequis

1. Un compte [Supabase](https://supabase.com) (gratuit)
2. Un serveur web (Apache, Nginx, ou serveur de développement)

## ⚙️ Installation

### Étape 1 : Créer un projet Supabase

1. Allez sur [https://supabase.com](https://supabase.com)
2. Créez un nouveau projet
3. Notez votre **URL** et votre **anon key** (visible dans Settings > API)

### Étape 2 : Configurer la base de données

1. Dans votre projet Supabase, allez dans **SQL Editor**
2. Copiez tout le contenu du fichier `supabase-setup.sql`
3. Exécutez le script SQL
4. Cela créera :
   - Les tables nécessaires (profiles, rapports, defauts, clients, types_defauts)
   - Les politiques de sécurité (Row Level Security)
   - Les déclencheurs automatiques
   - Les données de base (clients et types de défauts par défaut)

### Étape 3 : Configurer l'application

1. Ouvrez le fichier `config.js`
2. Remplacez les valeurs par celles de votre projet :

```javascript
const SUPABASE_CONFIG = {
    url: 'https://votre-projet.supabase.co',
    anonKey: 'votre-anon-key-ici'
};
```

### Étape 4 : Créer le premier utilisateur administrateur

1. Dans Supabase, allez dans **Authentication** > **Users**
2. Cliquez sur **Add user** > **Create new user**
3. Entrez :
   - Email : `admin@rapportcontrole.local` (ou autre email fictif)
   - Password : votre mot de passe admin
   - **Important** : Cochez "Auto Confirm User"
   - Dans **User Metadata**, ajoutez :
     ```json
     {
       "username": "admin",
       "full_name": "Administrateur",
       "role": "admin"
     }
     ```
4. Cliquez sur **Create user**

**Note** : L'authentification se fait par **identifiant** et **mot de passe**, pas par email. L'email est généré automatiquement en interne.

### Étape 5 : Lancer l'application

1. Placez tous les fichiers sur votre serveur web
2. Ouvrez l'application dans votre navigateur
3. Connectez-vous avec le compte administrateur créé

## 📁 Structure des fichiers

```
RapportDeControle/
├── index.html              # Page principale
├── styles.css              # Styles CSS
├── script.js               # Logique JavaScript
├── config.js               # Configuration Supabase (à personnaliser)
├── supabase-setup.sql      # Script SQL de setup
├── Logo-Ajust.png          # Logo (optionnel)
└── README.md               # Ce fichier
```

## 🔑 Gestion des utilisateurs

### Créer un nouvel utilisateur (via l'interface admin)

1. Connectez-vous en tant qu'admin
2. Allez dans **Utilisateurs**
3. Remplissez le formulaire :
   - **Identifiant** : L'identifiant unique de l'utilisateur (ex: "jdupont")
   - **Nom complet** : Prénom et nom de l'utilisateur
   - **Mot de passe** : Minimum 6 caractères
   - **Rôle** : Utilisateur ou Administrateur
4. Cliquez sur **Ajouter l'utilisateur**

**Note** :
- Les utilisateurs créés via l'interface seront automatiquement confirmés
- L'authentification se fait uniquement par **identifiant** et **mot de passe**
- Un email fictif est généré automatiquement en interne

### Supprimer un utilisateur

1. Dans la page **Utilisateurs**
2. Cliquez sur le bouton **×** à côté de l'utilisateur à supprimer
3. Confirmez la suppression

## 📊 Structure de la base de données

### Table `profiles`
- Stocke les informations des utilisateurs
- Lien avec `auth.users` de Supabase
- Champs : id, **username** (identifiant unique), email, full_name, role, created_at, updated_at

### Table `rapports`
- Stocke les rapports de contrôle
- Champs : numero, ordre_fabrication, phase, reference, designation, client, controleur_id, status, etc.

### Table `defauts`
- Stocke les défauts liés aux rapports
- Champs : rapport_id, type, quantite, commentaire, photos (JSONB)

### Table `clients`
- Liste des clients

### Table `types_defauts`
- Types de défauts disponibles

## 🔒 Sécurité

L'application utilise Row Level Security (RLS) de Supabase :

- **Utilisateurs** : Peuvent créer des rapports et voir tous les rapports
- **Administrateurs** : Peuvent modifier/supprimer tous les rapports, gérer les utilisateurs et les paramètres
- Les photos sont stockées en base64 (pour simplifier, mais vous pouvez utiliser Supabase Storage pour de meilleures performances)

## 🎨 Personnalisation

### Logo

Remplacez le fichier `Logo-Ajust.png` par votre propre logo (recommandé : format PNG, fond transparent)

### Couleurs

Modifiez les variables CSS dans `styles.css` :

```css
:root {
    --accent-orange: #a13a20;  /* Couleur principale */
    --accent-green: #28a745;   /* Couleur de succès */
    /* ... */
}
```

### Données par défaut

Modifiez le script SQL `supabase-setup.sql` pour changer les clients et types de défauts par défaut.

## 🐛 Dépannage

### Erreur "Invalid API key"
- Vérifiez que vous avez bien copié la clé API `anon/public` dans `config.js`
- Vérifiez que l'URL Supabase est correcte

### Impossible de se connecter
- Vérifiez que l'utilisateur existe dans Supabase Auth
- Vérifiez que l'utilisateur est confirmé (auto-confirm lors de la création)
- Vérifiez la console du navigateur pour les erreurs

### Les éléments admin n'apparaissent pas
- Vérifiez que l'utilisateur a bien le rôle 'admin' dans la table profiles
- Si besoin, exécutez dans Supabase SQL Editor :
  ```sql
  UPDATE public.profiles SET role = 'admin' WHERE username = 'admin';
  ```

### Erreur lors de la création d'utilisateurs
- Vérifiez que vous êtes connecté en tant qu'admin
- Vérifiez que l'identifiant n'existe pas déjà
- Le mot de passe doit faire au moins 6 caractères
- N'utilisez que des caractères alphanumériques pour l'identifiant

## 📱 Support responsive

L'application est entièrement responsive :
- **Desktop** : Sidebar fixe à gauche
- **Tablette** : Sidebar escamotable
- **Mobile** : Menu hamburger

## 🔄 Mises à jour futures

Fonctionnalités prévues :
- Export des rapports en Excel
- Statistiques et tableaux de bord
- Notifications par email
- Stockage des photos dans Supabase Storage
- Signature électronique

## 📝 Licence

Ce projet est fourni tel quel pour un usage interne.

## 💬 Support

Pour toute question ou problème, consultez la documentation Supabase :
- [Documentation Supabase](https://supabase.com/docs)
- [Guide d'authentification](https://supabase.com/docs/guides/auth)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

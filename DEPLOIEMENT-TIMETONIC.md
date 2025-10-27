# 🚀 Déploiement de l'intégration Timetonic

Ce guide explique comment déployer la Supabase Edge Function qui permet de contourner le problème CORS de l'API Timetonic.

## 📋 Prérequis

1. **Compte Supabase** (vous en avez déjà un)
2. **Supabase CLI** installé sur votre ordinateur

## 🛠️ Installation de Supabase CLI

### Windows (via npm)

```bash
npm install -g supabase
```

Ou via PowerShell avec Chocolatey :

```bash
choco install supabase
```

### Vérifier l'installation

```bash
supabase --version
```

## 🔐 Connexion à Supabase

1. **Obtenir votre Access Token** :
   - Allez sur https://supabase.com/dashboard/account/tokens
   - Cliquez sur "Generate New Token"
   - Copiez le token

2. **Se connecter** :
   ```bash
   supabase login
   ```
   - Collez votre access token quand demandé

3. **Lier votre projet** :
   ```bash
   supabase link --project-ref VOTRE_PROJECT_REF
   ```

   Pour trouver votre `project-ref` :
   - Allez dans votre projet Supabase
   - L'URL est : `https://supabase.com/dashboard/project/VOTRE_PROJECT_REF`
   - Ou allez dans Settings > General > Reference ID

## 📤 Déploiement de l'Edge Function

Une fois connecté et lié à votre projet :

```bash
supabase functions deploy timetonic-proxy
```

Cette commande va :
- ✅ Créer la fonction sur les serveurs Supabase
- ✅ La rendre accessible via une URL
- ✅ La configurer pour accepter les requêtes

## ✅ Vérification

Après le déploiement, vous devriez voir :

```
Deployed Function timetonic-proxy on project VOTRE_PROJECT
https://VOTRE_PROJECT.supabase.co/functions/v1/timetonic-proxy
```

## 🧪 Test de la fonction

1. **Via la console Supabase** :
   - Allez dans Edge Functions
   - Cliquez sur `timetonic-proxy`
   - Vous verrez les logs et pourrez tester

2. **Via l'application** :
   - Ouvrez votre application
   - Allez dans Paramètres
   - Configurez vos identifiants Timetonic
   - Cliquez sur "Tester la connexion"
   - ✅ Devrait fonctionner sans erreur CORS !

## 🔍 Dépannage

### Erreur "Function not found"

Vérifiez que vous êtes bien lié au bon projet :

```bash
supabase projects list
```

### Erreur d'authentification

Régénérez un access token et reconnectez-vous :

```bash
supabase logout
supabase login
```

### Voir les logs de la fonction

```bash
supabase functions logs timetonic-proxy
```

Ou dans le dashboard Supabase > Edge Functions > timetonic-proxy > Logs

## 📝 Notes importantes

- ✅ La fonction est **gratuite** (incluse dans le tier gratuit Supabase)
- ✅ Elle se met à jour automatiquement quand vous déployez
- ✅ Les logs sont disponibles dans le dashboard Supabase
- ⚠️ Si vous modifiez le code de la fonction, relancez `supabase functions deploy`

## 🎯 Structure des fichiers

```
RapportDeControle/
├── supabase/
│   ├── config.toml              # Configuration Supabase
│   └── functions/
│       └── timetonic-proxy/
│           └── index.ts         # Code de l'Edge Function
├── script.js                    # Frontend (modifié pour utiliser l'Edge Function)
└── DEPLOIEMENT-TIMETONIC.md     # Ce fichier
```

## 🚀 Après le déploiement

Une fois déployé, l'application utilisera automatiquement l'Edge Function au lieu d'appeler directement Timetonic. Le problème CORS sera résolu ! 🎉

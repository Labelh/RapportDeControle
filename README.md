# 📋 Rapport de Contrôle Qualité

Application web de gestion des rapports de contrôle qualité avec génération PDF et authentification Supabase.

🔗 **Application :** https://labelh.github.io/RapportDeControle/

---

## 🚀 Installation rapide (Nouveau départ)

### **Étape 1 : Créer un nouveau projet Supabase**

1. Allez sur https://supabase.com/dashboard
2. Cliquez sur **"New Project"**
3. Remplissez :
   - **Name** : `RapportDeControle`
   - **Database Password** : choisissez un mot de passe fort (⚠️ notez-le !)
   - **Region** : choisissez la plus proche
4. Cliquez sur **"Create new project"**
5. ⏳ Attendez 2-3 minutes

### **Étape 2 : Configurer l'authentification**

#### A. Désactiver la confirmation d'email
1. **Authentication** → **Providers** → **Email**
2. ❌ **Décochez** "Enable email confirmations"
3. Cliquez sur **Save**

#### B. Configurer les URLs autorisées
1. **Authentication** → **URL Configuration**
2. Remplissez :
   - **Site URL** : `https://labelh.github.io/RapportDeControle`
   - **Redirect URLs** : Ajoutez ces lignes :
     ```
     https://labelh.github.io/**
     http://localhost:*
     ```
3. Cliquez sur **Save**

### **Étape 3 : Créer la base de données**

1. Allez dans **SQL Editor**
2. Copiez **TOUT** le contenu du fichier `supabase-setup.sql`
3. Collez-le et cliquez sur **Run**
4. ✅ Vérifiez que le message "Success" s'affiche

### **Étape 4 : Récupérer vos clés API**

1. **Settings** → **API**
2. Copiez :
   - **Project URL** (ex: `https://abcdefgh.supabase.co`)
   - **anon public key** (longue clé commençant par `eyJ...`)

### **Étape 5 : Mettre à jour config.js**

Ouvrez `config.js` et remplacez :

```javascript
const SUPABASE_CONFIG = {
    url: 'https://VOTRE-PROJECT-ID.supabase.co',  // ← Votre Project URL
    anonKey: 'VOTRE_ANON_KEY_ICI'                 // ← Votre anon public key
};
```

### **Étape 6 : Déployer**

```bash
git add config.js
git commit -m "Configuration nouveau projet Supabase"
git push
```

⏳ Attendez 1-2 minutes que GitHub Pages se mette à jour.

### **Étape 7 : Créer le premier admin**

1. Dans Supabase : **Authentication** → **Users** → **Add user** → **Create new user**
2. Remplissez :
   - **Email** : `admin@rapportcontrole.app`
   - **Password** : votre mot de passe
   - ✅ **Cochez** "Auto Confirm User"
3. **Copiez l'UUID** de l'utilisateur créé

4. Dans **SQL Editor**, exécutez :

```sql
INSERT INTO public.profiles (id, username, full_name, role)
VALUES (
    'VOTRE-UUID-ICI',  -- ⚠️ Remplacez par l'UUID
    'admin',
    'Administrateur',
    'admin'
);
```

### **Étape 8 : Se connecter**

1. https://labelh.github.io/RapportDeControle/
2. Username : `admin`
3. Password : celui défini à l'étape 7
4. 🎉 **Connecté !**

---

## 📚 Fonctionnalités

### Tous les utilisateurs
- ✅ Créer des rapports de contrôle
- ✅ Ajouter des défauts avec photos
- ✅ Générer des PDF avec code-barres
- ✅ Consulter l'historique

### Administrateurs
- ✅ Gérer tous les rapports
- ✅ Modifier les statuts
- ✅ Gérer les utilisateurs
- ✅ Gérer clients et types de défauts

---

## 🛠️ Technologies

- **Frontend** : HTML, CSS, JavaScript
- **Backend** : Supabase (PostgreSQL + Auth)
- **Hébergement** : GitHub Pages
- **PDF** : jsPDF + JsBarcode

---

## 🔐 Sécurité

- Authentification username/password
- Row Level Security (RLS)
- Politiques par rôle
- Emails auto-générés (`username@rapportcontrole.app`)

---

## 📁 Structure

```
RapportDeControle/
├── index.html           # Page principale
├── styles.css           # Styles
├── script.js            # Logique
├── config.js            # Config Supabase
├── supabase-setup.sql   # Setup BDD
└── README.md            # Ce fichier
```

---

## 🆘 Problèmes courants

### Impossible de se connecter
- Vérifiez que le profil existe dans `profiles`
- Vérifiez que l'email est bien `username@rapportcontrole.app` dans Auth

### Impossible de créer un utilisateur
- Vérifiez que la confirmation email est désactivée
- Vérifiez "Auto Confirm User" lors de la création

### "Failed to fetch"
- Vérifiez les URLs dans Authentication → URL Configuration
- Vérifiez que le projet est "Active"

---

## 📄 Licence

MIT

# 🔴 SOLUTION : Erreur "Failed to fetch" - Problème CORS

## ❌ Problème identifié

L'erreur **"TypeError: Failed to fetch"** signifie que Supabase **BLOQUE** les requêtes venant de `https://labelh.github.io` car ce domaine n'est **pas autorisé**.

## ✅ Solution : Configurer les URLs autorisées dans Supabase

### **Étape 1 : Aller dans les paramètres d'authentification**

1. Connectez-vous à votre projet Supabase : https://supabase.com/dashboard
2. Sélectionnez votre projet : **RapportDeControle**
3. Dans le menu latéral, cliquez sur **Authentication** (icône de clé 🔑)

### **Étape 2 : Configurer les URL autorisées**

1. Cliquez sur **URL Configuration** (dans le sous-menu Authentication)

2. Vous verrez plusieurs champs. Remplissez-les ainsi :

#### **Site URL**
```
https://labelh.github.io/RapportDeControle
```

#### **Redirect URLs**
Ajoutez ces URLs (une par ligne) :
```
https://labelh.github.io/**
https://labelh.github.io/RapportDeControle/**
http://localhost:*
http://127.0.0.1:*
```

3. Cliquez sur **Save** en bas de la page

### **Étape 3 : Désactiver la confirmation d'email (si pas déjà fait)**

1. Toujours dans **Authentication**, cliquez sur **Providers**
2. Cliquez sur **Email**
3. **DÉCOCHEZ** "Enable email confirmations"
4. Cliquez sur **Save**

### **Étape 4 : Vérifier les paramètres API**

1. Allez dans **Settings** → **API**
2. Vérifiez que votre **URL** et **anon public key** correspondent à celles dans `config.js`

**Votre config.js actuel :**
```javascript
url: 'https://tqvxdufxuwjphcabcnqu.supabase.co'
anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

Si elles sont différentes, mettez à jour `config.js`.

---

## 🧪 Test après configuration

Une fois ces paramètres configurés :

1. **Attendez 1-2 minutes** (le temps que Supabase applique les changements)
2. Rechargez la page : https://labelh.github.io/RapportDeControle/test-create-user.html
3. Cliquez sur **"Vérifier la table"**
4. Si ça fonctionne → ✅ Le problème CORS est résolu !
5. Essayez de **"Créer l'utilisateur"**

---

## 📸 Capture d'écran de la configuration

Votre page **Authentication → URL Configuration** devrait ressembler à ça :

```
┌─────────────────────────────────────────────────────┐
│ Site URL                                            │
│ https://labelh.github.io/RapportDeControle          │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ Redirect URLs                                       │
│ https://labelh.github.io/**                         │
│ https://labelh.github.io/RapportDeControle/**       │
│ http://localhost:*                                  │
│ http://127.0.0.1:*                                  │
└─────────────────────────────────────────────────────┘
```

---

## ❓ Pourquoi cette erreur ?

Par défaut, Supabase n'autorise que certaines URLs à faire des requêtes (pour la sécurité).

Si votre site GitHub Pages (`https://labelh.github.io`) n'est pas dans la liste, toutes les requêtes sont **bloquées** par le navigateur, d'où l'erreur "Failed to fetch".

---

## 🎯 Vérification finale

Une fois la configuration faite, testez :

### Test 1 : Connexion de base
```javascript
// Ouvrez la console du navigateur (F12) sur votre site
const { data, error } = await supabaseClient.from('profiles').select('*').limit(1);
console.log('Données:', data, 'Erreur:', error);
```

✅ Si `error` est `null` → CORS configuré correctement
❌ Si `error` contient "Failed to fetch" → Vérifiez à nouveau les URLs

### Test 2 : Création d'utilisateur
Utilisez : https://labelh.github.io/RapportDeControle/test-create-user.html

Les étapes 1 et 2 devraient maintenant fonctionner !

---

## 💡 Note importante

Le problème n'était **PAS** dans la base de données, mais dans la **politique CORS** de Supabase qui bloquait les requêtes depuis GitHub Pages.

Une fois les URLs configurées, tout devrait fonctionner parfaitement ! 🚀

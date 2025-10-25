# ⚠️ VÉRIFICATION COMPLÈTE SUPABASE - "Failed to fetch"

## 🔍 Le problème persiste après toutes les tentatives

L'erreur "Failed to fetch" signifie que les requêtes **n'arrivent même pas à Supabase**.

Vérifiez **CHAQUE POINT** ci-dessous dans l'ordre :

---

## ✅ 1. Vérifier que c'est le BON projet Supabase

### Dans Supabase Dashboard

1. Allez sur https://supabase.com/dashboard
2. Vérifiez le **nom du projet** en haut à gauche
3. L'URL du projet doit être : `https://tqvxdufxuwjphcabcnqu.supabase.co`

**Si ce n'est PAS le bon projet** :
- Changez de projet dans le menu déroulant en haut à gauche
- OU créez un nouveau projet et mettez à jour `config.js`

---

## ✅ 2. Vérifier les clés API

### Settings → API

Copiez les valeurs suivantes :

**Project URL :**
```
Doit être : https://tqvxdufxuwjphcabcnqu.supabase.co
```

**Project API keys → anon public :**
```
Doit commencer par : eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Comparez avec votre config.js :

```javascript
url: 'https://tqvxdufxuwjphcabcnqu.supabase.co'
anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

**Si différent** : Mettez à jour `config.js` avec les bonnes valeurs.

---

## ✅ 3. Vérifier l'état du projet Supabase

### Settings → General

**Project Status :** Doit être `Active` (vert)

Si le statut est :
- ⏸️ **Paused** → Cliquez sur "Resume"
- ⚠️ **Unhealthy** → Il y a un problème avec votre projet
- 💤 **Inactive** → Réactivez le projet

---

## ✅ 4. Vérifier la configuration CORS (le plus important)

### Authentication → URL Configuration

Vérifiez **EXACTEMENT** ces valeurs :

**Site URL :**
```
https://labelh.github.io/RapportDeControle
```

**Additional Redirect URLs :** (une par ligne, ajoutez-les TOUTES)
```
https://labelh.github.io/**
https://labelh.github.io/RapportDeControle/**
http://localhost:*
http://127.0.0.1:*
```

**IMPORTANT :**
- Pas d'espaces avant ou après
- Utilisez bien `**` et pas `*` pour les wildcards
- Cliquez sur **Save** en bas

---

## ✅ 5. Désactiver la confirmation d'email

### Authentication → Providers → Email

**Enable email confirmations :** ❌ DOIT être DÉCOCHÉ

Cliquez sur **Save**.

---

## ✅ 6. Vérifier que l'API est accessible

### Test avec curl (dans un terminal)

```bash
curl https://tqvxdufxuwjphcabcnqu.supabase.co/rest/v1/profiles \
  -H "apikey: VOTRE_ANON_KEY" \
  -H "Authorization: Bearer VOTRE_ANON_KEY"
```

Remplacez `VOTRE_ANON_KEY` par votre vraie clé.

**Résultat attendu :**
- Si ça retourne `[]` ou des données → ✅ L'API fonctionne
- Si ça retourne une erreur 4xx → Problème de clé ou permissions
- Si ça retourne "Could not resolve host" → Problème réseau

---

## ✅ 7. Tester avec Postman ou une autre origine

Pour isoler si le problème vient de GitHub Pages :

### Option A : Test avec un fichier local

1. Téléchargez `test-simple.html` sur votre ordinateur
2. Ouvrez-le **directement** dans le navigateur (file://)
3. Testez

**Si ça fonctionne en local mais pas sur GitHub Pages** → C'est bien un problème CORS

### Option B : Utiliser Postman

1. Installez Postman ou utilisez https://hoppscotch.io
2. Faites une requête GET vers :
   ```
   https://tqvxdufxuwjphcabcnqu.supabase.co/rest/v1/profiles
   ```
3. Headers :
   ```
   apikey: VOTRE_ANON_KEY
   Authorization: Bearer VOTRE_ANON_KEY
   ```

**Si ça fonctionne dans Postman** → C'est un problème CORS/Browser

---

## ✅ 8. Vérifier dans la console du navigateur (F12)

### Onglet Console

Regardez s'il y a des erreurs rouges, notamment :
```
Access to fetch at 'https://...' from origin 'https://labelh.github.io'
has been blocked by CORS policy
```

**Si vous voyez ce message** → Les URLs ne sont pas correctement configurées dans Supabase

### Onglet Network

1. Filtrez par "profiles"
2. Cliquez sur la requête en rouge
3. Regardez :
   - **Status** : Devrait être 200, si c'est 0 → CORS
   - **Response Headers** : Devrait contenir `access-control-allow-origin`

---

## ✅ 9. Vérifier que RLS est bien désactivé

### Database → Tables → profiles

1. Cliquez sur la table `profiles`
2. En haut, vérifiez que **"RLS disabled"** s'affiche
3. Si ce n'est pas le cas :

```sql
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
```

---

## ✅ 10. Vérifier que la table existe

### SQL Editor

```sql
SELECT * FROM public.profiles LIMIT 1;
```

**Si erreur "relation does not exist"** → La table n'existe pas, créez-la avec `supabase-setup-simple.sql`

---

## 🔄 Solution alternative : Créer un NOUVEAU projet Supabase

Si rien ne fonctionne, il est possible que votre projet ait un problème.

### Créer un nouveau projet :

1. Dashboard → **New Project**
2. Nom : `RapportDeControle2`
3. Database password : notez-le quelque part
4. Region : choisissez la plus proche
5. Cliquez sur **Create new project**

6. Une fois créé, allez dans **SQL Editor** et exécutez `supabase-setup-simple.sql`

7. Copiez les nouvelles clés (Settings → API)

8. Mettez à jour `config.js` :
```javascript
const SUPABASE_CONFIG = {
    url: 'NOUVELLE_URL',
    anonKey: 'NOUVELLE_KEY'
};
```

9. Committez et poussez :
```bash
git add config.js
git commit -m "Mise à jour config Supabase"
git push
```

---

## 📸 Ce que vous devriez voir

### Dans Authentication → URL Configuration

```
┌──────────────────────────────────────────────────┐
│ Site URL                                         │
│ https://labelh.github.io/RapportDeControle       │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│ Additional Redirect URLs                         │
│ https://labelh.github.io/**                      │
│ https://labelh.github.io/RapportDeControle/**    │
│ http://localhost:*                               │
│ http://127.0.0.1:*                               │
└──────────────────────────────────────────────────┘
```

### Dans Authentication → Providers → Email

```
☐ Enable email confirmations  (DÉCOCHÉ)
☐ Enable email OTP           (peu importe)
☑ Enable email signups       (COCHÉ ou DÉCOCHÉ)
```

---

## 🆘 Si rien ne fonctionne

Envoyez-moi une capture d'écran de :

1. **Settings → API** (masquez la clé service_role, montrez juste l'URL et anon key)
2. **Authentication → URL Configuration** (les champs Site URL et Redirect URLs)
3. **Settings → General** (le statut du projet)
4. **Console du navigateur (F12)** pendant le test (onglet Console ET Network)

Cela me permettra de voir exactement où est le problème.

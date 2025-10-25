# Guide de Configuration Supabase

## Erreur "Failed to fetch" lors de la création d'admin

Cette erreur survient généralement pour 2 raisons :

### 1. **Confirmation d'email activée** (Cause la plus fréquente)

Par défaut, Supabase demande une confirmation d'email. Il faut la désactiver car nous utilisons des emails fictifs.

**Solution :**

1. Allez dans votre projet Supabase
2. **Authentication** → **Providers** → **Email**
3. Trouvez la section **"Confirm email"**
4. **Désactivez** l'option "Enable email confirmations"
5. Cliquez sur **Save**

### 2. **URL du site non autorisée**

Supabase bloque les requêtes depuis des domaines non autorisés.

**Solution :**

1. Allez dans **Authentication** → **URL Configuration**
2. Dans **Site URL**, ajoutez : `https://labelh.github.io`
3. Dans **Redirect URLs**, ajoutez :
   - `https://labelh.github.io/RapportDeControle/*`
   - `http://localhost:*` (pour les tests en local)
4. Cliquez sur **Save**

### 3. **Vérifier que les clés sont correctes**

Les clés actuelles dans `config.js` :
- URL: `https://tqvxdufxuwjphcabcnqu.supabase.co`
- Anon Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

Vérifiez dans **Settings** → **API** que ces valeurs correspondent.

---

## Alternative : Créer l'admin directement dans Supabase

Si les étapes ci-dessus ne fonctionnent pas, vous pouvez créer l'admin directement :

### Méthode 1 : Via l'interface Supabase Auth

1. Allez dans **Authentication** → **Users**
2. Cliquez sur **Add user** → **Create new user**
3. Email : `admin@rapportcontrole.app`
4. Password : votre mot de passe
5. **Décochez** "Auto Confirm User" si l'option existe
6. Cliquez sur **Create user**
7. Notez l'UUID de l'utilisateur créé

8. Allez dans **Table Editor** → **profiles**
9. Cliquez sur **Insert** → **Insert row**
10. Remplissez :
    - `id` : l'UUID de l'utilisateur créé à l'étape 7
    - `username` : `admin`
    - `full_name` : `Administrateur`
    - `role` : `admin`
11. Cliquez sur **Save**

### Méthode 2 : Via SQL

Exécutez ce script dans **SQL Editor** :

```sql
-- Étape 1 : Vérifier l'UUID de votre utilisateur
SELECT id, email FROM auth.users WHERE email = 'admin@rapportcontrole.app';

-- Étape 2 : Créer le profil (remplacez l'UUID ci-dessous)
INSERT INTO public.profiles (id, username, full_name, role)
VALUES (
    'VOTRE-UUID-ICI',  -- Remplacez par l'UUID obtenu à l'étape 1
    'admin',
    'Administrateur',
    'admin'
);
```

---

## Test de connexion

Une fois l'admin créé, testez la connexion :

1. Allez sur https://labelh.github.io/RapportDeControle/
2. Username : `admin`
3. Password : le mot de passe que vous avez défini
4. Cliquez sur **Se connecter**

Ça devrait fonctionner ! ✅

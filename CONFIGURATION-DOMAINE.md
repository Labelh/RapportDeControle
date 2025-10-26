# Configuration du Domaine Personnalisé

## 🌐 Objectif
Configurer l'URL : **https://RapportDeControle.Ajust82.io/**

---

## 📋 Prérequis

1. ✅ Posséder le nom de domaine **Ajust82.io**
2. ✅ Accès au panneau de gestion DNS de votre registrar
3. ✅ Fichier CNAME créé dans le repository (déjà fait !)

---

## 🔧 Étapes de Configuration

### 1. Configuration DNS chez votre Registrar

Connectez-vous à votre panneau de gestion DNS (Namecheap, OVH, Gandi, Cloudflare, etc.)

#### Ajouter un enregistrement CNAME

```
Type:  CNAME
Nom:   RapportDeControle
Cible: labelh.github.io
TTL:   3600 (ou Auto)
```

**Exemples selon les registrars :**

**Namecheap :**
- Type: CNAME Record
- Host: RapportDeControle
- Value: labelh.github.io.
- TTL: Automatic

**OVH :**
- Type: CNAME
- Sous-domaine: RapportDeControle
- Cible: labelh.github.io.

**Cloudflare :**
- Type: CNAME
- Name: RapportDeControle
- Target: labelh.github.io
- Proxy status: DNS only (nuage gris)

---

### 2. Configuration GitHub Pages

1. Allez sur **GitHub** : https://github.com/Labelh/RapportDeControle
2. Cliquez sur **Settings** (Paramètres)
3. Dans le menu de gauche, cliquez sur **Pages**
4. Dans la section **Custom domain** :
   - Entrez : `RapportDeControle.Ajust82.io`
   - Cliquez sur **Save**
5. Attendez quelques minutes
6. ✅ Cochez **Enforce HTTPS** (une fois le DNS propagé)

---

## ⏱️ Temps de Propagation

- **DNS** : 15 minutes à 48 heures (généralement 1-2h)
- **HTTPS** : 5 à 30 minutes après propagation DNS

---

## ✅ Vérification

### Vérifier la propagation DNS

Utilisez ces outils :
- https://dnschecker.org
- https://www.whatsmydns.net

Recherchez : `RapportDeControle.Ajust82.io`

Type: `CNAME`

Résultat attendu : `labelh.github.io`

### Tester l'accès

Une fois propagé :
1. Ouvrez : https://RapportDeControle.Ajust82.io
2. Vérifiez le certificat SSL (cadenas vert)

---

## 🔒 HTTPS Automatique

GitHub Pages fournit automatiquement un certificat SSL gratuit via **Let's Encrypt**.

Si HTTPS ne fonctionne pas :
1. Décochez "Enforce HTTPS"
2. Attendez 10-15 minutes
3. Recochez "Enforce HTTPS"

---

## 🚨 Résolution de Problèmes

### Erreur "Domain is improperly configured"
➡️ Vérifiez que le CNAME DNS pointe vers `labelh.github.io` (pas `labelh.github.io/RapportDeControle`)

### Erreur "Domain's DNS record could not be retrieved"
➡️ La propagation DNS n'est pas terminée. Attendez encore.

### HTTPS ne s'active pas
➡️ Retirez et re-ajoutez le domaine dans GitHub Pages Settings

### Erreur 404
➡️ Vérifiez que le fichier `CNAME` contient bien `RapportDeControle.Ajust82.io`

---

## 📧 Support

Si vous rencontrez des problèmes :
- **GitHub Support** : https://support.github.com
- **Documentation** : https://docs.github.com/pages/configuring-a-custom-domain-for-your-github-pages-site

---

## ✨ Une fois configuré

Votre application sera accessible à :
- ✅ https://RapportDeControle.Ajust82.io (URL principale)
- ⚠️ https://labelh.github.io/RapportDeControle (redirigera automatiquement)

🎉 **Bonne configuration !**

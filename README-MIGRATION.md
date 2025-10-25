# 🔄 Migration vers Gestion des Non-Conformités

## ✅ Modifications apportées

### 1. **Bug navigation corrigé**
- Fix de `switchPage()` manquant → utilisation directe des classes CSS
- L'application fonctionne maintenant correctement

### 2. **Transformation en gestion NC**
- **Titre** : "Gestion des Non-Conformités"
- **4 statuts** :
  - `en_attente` : NC créée, en attente de traitement
  - `en_cours` : NC en cours de traitement
  - `attente_client` : En attente de réponse client
  - `cloture` : NC clôturée

### 3. **Nouvelle fonctionnalité : Réponse client**
- Champ "Réponse client" dans modal admin
- Champ "Action corrective" pour plan d'action
- Date de réponse client enregistrée automatiquement
- Date de clôture + utilisateur qui a clôturé

---

## 🚀 Comment migrer votre base de données

### Option 1 : Migration rapide (recommandée)
Si vous avez déjà des données dans l'application :

1. Allez dans **Supabase SQL Editor**
2. Copiez le contenu de `MIGRATION-RAPIDE.sql`
3. Exécutez le script
4. ✅ Vos données sont migrées !

**Ce script fait quoi ?**
- Ajoute les colonnes : `reponse_client`, `date_reponse_client`, `action_corrective`, `delai_correction`, `date_cloture`, `valide_par`
- Convertit les anciens statuts :
  - `traite` → `en_cours`
  - `resolu` → `cloture`
  - `en_attente` reste `en_attente`
- Ajoute le statut `attente_client`

### Option 2 : Fresh install
Si vous partez de zéro :

1. Supprimez votre projet Supabase actuel (ou créez-en un nouveau)
2. Allez dans **Supabase SQL Editor**
3. Copiez le contenu de `supabase-nonconformites-setup.sql`
4. Exécutez le script
5. ✅ Base complète créée !

---

## 📋 Workflow des Non-Conformités

### Pour les utilisateurs :
1. **Créer une NC** → Statut: `en_attente`
2. **Modifier sa NC** → Possible uniquement si statut = `en_attente`
3. **Consulter ses NC** → Voir toutes ses NC avec statuts

### Pour les admins :
1. **Voir toutes les NC**
2. **Cliquer sur ✎** → Ouvre modal avec :
   - Changement de statut
   - Ajout réponse client
   - Ajout action corrective
3. **Générer PDF** (si statut `en_attente`)
4. **Clôturer** → Date + utilisateur enregistrés automatiquement

---

## 🎯 Statuts expliqués

| Statut | Description | Qui peut modifier ? |
|--------|-------------|---------------------|
| `en_attente` | NC créée, pas encore traitée | Créateur + Admin |
| `en_cours` | NC en cours d'analyse/traitement | Admin |
| `attente_client` | En attente de retour du client | Admin |
| `cloture` | NC terminée et clôturée | Admin uniquement |

---

## 📱 Utilisation

### Espace utilisateur
- **Nouvelle NC** : Créer une non-conformité
- **Mes NC** : Voir ses propres NC avec statuts

### Espace admin
- **Espace Admin** : Gérer toutes les NC
  - Modifier statut
  - Ajouter réponse client
  - Ajouter actions correctives
  - Clôturer les NC
- **Utilisateurs** : Créer/gérer les comptes
- **Paramètres** : Gérer clients et types de défauts

---

## 🆘 Besoin d'aide ?

### Erreur après migration ?
1. Vérifiez que le script SQL s'est bien exécuté
2. Vérifiez que les colonnes existent :
   ```sql
   SELECT column_name
   FROM information_schema.columns
   WHERE table_name = 'rapports';
   ```
3. Vérifiez les statuts :
   ```sql
   SELECT DISTINCT status FROM rapports;
   ```

### L'application ne charge pas ?
1. Vérifiez la console navigateur (F12)
2. Vérifiez que `config.js` contient les bonnes clés Supabase
3. Rafraîchissez le cache (Ctrl+F5)

---

## 📦 Prochaines améliorations possibles

- [ ] Notifications par email
- [ ] Historique des modifications
- [ ] Statistiques et tableaux de bord
- [ ] Export Excel des NC
- [ ] Délais de traitement automatiques
- [ ] Rappels automatiques

---

**Application déployée** : https://labelh.github.io/RapportDeControle/

**Support** : Ouvrir une issue sur GitHub

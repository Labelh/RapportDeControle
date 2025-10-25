# 🚀 Démarrage Rapide - Gestion des Non-Conformités

## ⚡ Actions à faire MAINTENANT

### 1. Migrer la base de données (2 minutes)

1. Ouvrez Supabase : https://supabase.com/dashboard
2. Sélectionnez votre projet
3. Cliquez sur **SQL Editor** (dans le menu gauche)
4. Copiez **TOUT** le contenu du fichier `MIGRATION-RAPIDE.sql`
5. Collez dans l'éditeur SQL
6. Cliquez sur **Run** (ou Ctrl+Enter)
7. ✅ Attendez le message "Success"

### 2. Vérifier que ça marche

```sql
-- Exécutez ceci dans SQL Editor pour vérifier :
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'rapports'
AND column_name IN ('reponse_client', 'action_corrective');
```

**Résultat attendu** : 2 lignes (reponse_client et action_corrective)

### 3. Tester l'application

1. Allez sur https://labelh.github.io/RapportDeControle/
2. Connectez-vous
3. Les pages devraient fonctionner !

---

## 📝 Utilisation

### Créer une NC (utilisateur)
1. **Nouvelle NC** → Remplir le formulaire
2. Ajouter défauts + photos
3. **Valider** → NC créée avec statut "En attente"

### Modifier une NC (admin)
1. **Espace Admin** → Voir toutes les NC
2. Cliquer sur **✎** à côté d'une NC
3. Modal s'ouvre :
   - Changer le statut
   - Ajouter réponse client
   - Ajouter action corrective
4. **Enregistrer**

### Workflow type
```
Utilisateur crée NC
    ↓
[En attente]
    ↓
Admin traite → [En cours]
    ↓
Contacte client → [Attente client]
    ↓
Client répond (admin saisit)
    ↓
Admin clôture → [Clôturé]
```

---

## 🎨 Nouveautés

### Statuts disponibles
- 🟡 **En attente** : NC créée
- 🔵 **En cours** : En traitement
- 🟠 **Attente client** : En attente de réponse
- 🟢 **Clôturé** : Terminé

### Nouvelles données enregistrées
- Réponse du client
- Action corrective prévue
- Date de réponse client
- Date de clôture
- Qui a clôturé la NC

---

## ⚙️ Si ça ne marche pas

### Les pages ne s'affichent pas ?
1. Videz le cache : **Ctrl + F5**
2. Attendez 1-2 minutes (déploiement GitHub Pages)
3. Vérifiez la console : **F12** → onglet Console

### Erreur SQL ?
```sql
-- Vérifiez les contraintes :
SELECT conname, contype
FROM pg_constraint
WHERE conrelid = 'public.rapports'::regclass;
```

Si `rapports_status_check` a encore les anciens statuts, relancez la partie du script MIGRATION-RAPIDE.sql qui fait :
```sql
ALTER TABLE public.rapports DROP CONSTRAINT IF EXISTS rapports_status_check;
ALTER TABLE public.rapports ADD CONSTRAINT rapports_status_check
CHECK (status IN ('en_attente', 'en_cours', 'attente_client', 'cloture'));
```

---

## 🎯 Prochaines étapes (optionnel)

### Personnalisation
- Modifier les couleurs dans `styles.css`
- Ajouter votre logo (remplacer `Logo-Ajust.png`)
- Personnaliser les types de défauts dans Paramètres

### Données de test
```sql
-- Créer quelques NC de test
INSERT INTO public.rapports (
    numero, ordre_fabrication, phase, reference,
    controleur_id, controleur_name,
    status
) VALUES
('NC-TEST-001', 'OF-123', 'Assemblage', 'REF-001', 'VOTRE-USER-ID', 'Test User', 'en_attente'),
('NC-TEST-002', 'OF-124', 'Contrôle', 'REF-002', 'VOTRE-USER-ID', 'Test User', 'en_cours');
```

---

## 📞 Support

**Problème ?** Envoyez-moi :
1. Capture d'écran de l'erreur
2. Console navigateur (F12)
3. Message d'erreur SQL (si applicable)

**Tout fonctionne ?** 🎉 Profitez de votre nouvelle application !

-- ============================================
-- AJOUT TABLE CONTACTS CLIENTS
-- ============================================
-- Cette table permet de gérer plusieurs contacts email par client
-- Ces contacts seront utilisés automatiquement lors de la génération d'emails

-- Créer la table des contacts
CREATE TABLE IF NOT EXISTS public.contacts_clients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    email TEXT NOT NULL,
    nom TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activer RLS
ALTER TABLE public.contacts_clients ENABLE ROW LEVEL SECURITY;

-- Politiques RLS : Lecture pour tous authentifiés, gestion par admins
DROP POLICY IF EXISTS "contacts_select" ON public.contacts_clients;
DROP POLICY IF EXISTS "contacts_insert" ON public.contacts_clients;
DROP POLICY IF EXISTS "contacts_update" ON public.contacts_clients;
DROP POLICY IF EXISTS "contacts_delete" ON public.contacts_clients;

CREATE POLICY "contacts_select" ON public.contacts_clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "contacts_insert" ON public.contacts_clients FOR INSERT TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "contacts_update" ON public.contacts_clients FOR UPDATE TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "contacts_delete" ON public.contacts_clients FOR DELETE TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_contacts_client_id ON public.contacts_clients(client_id);

-- ============================================
-- ✅ TABLE CONTACTS CRÉÉE
-- ============================================
-- Les admins peuvent maintenant :
-- 1. Ajouter des contacts email pour chaque client
-- 2. Gérer plusieurs destinataires par client
-- 3. Ces emails seront utilisés lors de la génération d'email

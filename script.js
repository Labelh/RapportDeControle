// ============================================
// APPLICATION DE GESTION DES NON-CONFORMITÉS
// Avec authentification Supabase et réponses clients
// ============================================

// ========== INITIALISATION SUPABASE ==========
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

// ========== CONFIGURATION TIMETONIC ==========
// Utilisation d'une Supabase Edge Function pour contourner le problème CORS
// L'Edge Function fait l'intermédiaire entre le frontend et l'API Timetonic
const USE_EDGE_FUNCTION = true; // true = via Supabase Edge Function, false = appel direct
const TIMETONIC_EDGE_FUNCTION_URL = `${SUPABASE_CONFIG.url}/functions/v1/timetonic-proxy`;
const TIMETONIC_API_URL = 'https://timetonic.com/live/api.php';

// ========== CLASSE PRINCIPALE ==========
class RapportDeControleApp {
    constructor() {
        this.currentUser = null;
        this.userProfile = null;
        this.clients = [];
        this.typesDefauts = [];
        this.defauts = [];
        this.selectedPhotos = [];
        this.editingDefautIndex = -1;
        this.rapports = [];
        this.adminRapports = [];
        this.editingRapportId = null;
        this.productReferences = new Map(); // Map<reference, designation>

        // Image editor
        this.imageEditorCanvas = null;
        this.imageEditorCtx = null;
        this.currentEditingPhotoIndex = null;
        this.selectedTool = 'ellipse';
        this.annotations = [];
        this.isDrawing = false;
        this.startX = 0;
        this.startY = 0;
        this.originalImage = null;

        this.init();
    }

    async init() {
        // Vérifier la session
        await this.checkAuth();

        // Initialiser le thème
        this.initTheme();
    }

    // ========== AUTHENTIFICATION ==========
    async checkAuth() {
        const { data: { session }, error } = await supabaseClient.auth.getSession();

        if (error) {
            console.error('Erreur lors de la vérification de session:', error);
            this.showLoginPage();
            return;
        }

        if (!session) {
            this.showLoginPage();
            return;
        }

        // Récupérer le profil utilisateur
        const { data: profile, error: profileError } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

        if (profileError) {
            console.error('Erreur lors de la récupération du profil:', profileError);
            this.showLoginPage();
            return;
        }

        this.currentUser = session.user;
        this.userProfile = profile;

        // Afficher l'application
        this.showApp();
    }

    showLoginPage() {
        document.getElementById('login-page').style.display = 'flex';
        document.getElementById('app-container').style.display = 'none';
        this.setupLoginForm();
    }

    showApp() {
        document.getElementById('login-page').style.display = 'none';
        document.getElementById('app-container').style.display = 'flex';

        // Afficher les informations utilisateur
        document.getElementById('userName').textContent = this.userProfile.full_name;
        document.getElementById('userRole').textContent = this.userProfile.role;

        // Afficher les initiales dans l'avatar
        const initials = this.getInitials(this.userProfile.full_name);
        document.getElementById('userAvatar').textContent = initials;

        // Afficher les menus admin si nécessaire
        if (this.userProfile.role === 'admin') {
            document.querySelectorAll('.admin-only').forEach(el => {
                el.style.display = '';
            });
            // Charger le compteur de rapports en attente
            this.updateNotifBadge();
        }

        // Initialiser l'application
        this.setupEventListeners();
        this.setupNavigation();
        this.setupSidebar();
        this.loadClients();
        this.loadTypesDefauts();
        this.loadRapports();
        this.loadReferencesFromLocalStorage();
    }

    getInitials(fullName) {
        if (!fullName) return 'U';
        const names = fullName.trim().split(' ');
        if (names.length === 1) {
            return names[0].substring(0, 2).toUpperCase();
        }
        return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    }

    async updateNotifBadge() {
        const { data, error } = await supabaseClient
            .from('rapports')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'en_attente');

        if (!error && data !== null) {
            const count = data.length || 0;
            const badge = document.getElementById('notifBadge');
            if (badge) {
                badge.textContent = count;
                badge.style.display = count > 0 ? 'inline-block' : 'none';
            }
        }
    }

    setupLoginForm() {
        const loginForm = document.getElementById('loginForm');
        const loginError = document.getElementById('loginError');

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const username = document.getElementById('loginUsername').value;
            const password = document.getElementById('loginPassword').value;

            console.log('🔐 Tentative de connexion avec:', username);
            loginError.style.display = 'none';

            // Vérifier si le profil existe
            const { data: profileData, error: profileError } = await supabaseClient
                .from('profiles')
                .select('*')
                .eq('username', username)
                .single();

            console.log('📧 Recherche profil:', profileData, 'Erreur:', profileError);

            if (profileError || !profileData) {
                console.error('❌ Erreur profil:', profileError);
                loginError.textContent = 'Identifiant incorrect. Vérifiez que l\'utilisateur existe.';
                loginError.style.display = 'block';
                return;
            }

            // Se connecter avec l'email généré automatiquement
            const email = `${username}@rapportcontrole.app`;
            console.log('🔑 Tentative de connexion avec email:', email);
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email,
                password
            });

            console.log('✅ Résultat connexion:', data, 'Erreur:', error);

            if (error) {
                console.error('❌ Erreur connexion:', error);
                loginError.textContent = 'Mot de passe incorrect.';
                loginError.style.display = 'block';
                return;
            }

            console.log('🎉 Connexion réussie, rechargement...');
            // Recharger l'application
            await this.checkAuth();
        });
    }

    async logout() {
        const { error } = await supabaseClient.auth.signOut();

        if (error) {
            console.error('Erreur lors de la déconnexion:', error);
            this.showNotification('Erreur lors de la déconnexion', 'error');
            return;
        }

        this.currentUser = null;
        this.userProfile = null;
        this.showLoginPage();
    }

    // ========== NAVIGATION ET SIDEBAR ==========
    setupNavigation() {
        const navLinks = document.querySelectorAll('.sidebar-link');
        const pages = document.querySelectorAll('.page');

        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetPage = link.getAttribute('data-page');

                // Enlever la classe active
                navLinks.forEach(l => l.classList.remove('active'));
                pages.forEach(p => p.classList.remove('active'));

                // Ajouter la classe active
                link.classList.add('active');
                document.getElementById(`page-${targetPage}`).classList.add('active');

                // Charger les données spécifiques à la page
                if (targetPage === 'mes-nc') {
                    this.loadRapports();
                } else if (targetPage === 'admin') {
                    this.loadAdminRapports();
                } else if (targetPage === 'utilisateurs') {
                    this.loadUsers();
                } else if (targetPage === 'parametres') {
                    this.loadClients();
                    this.loadTypesDefauts();
                    this.loadSettings();
                } else if (targetPage === 'rapport') {
                    // Recharger l'UI des clients quand on retourne sur la page rapport
                    this.updateClientsUI();
                }

                // Fermer la sidebar sur mobile
                if (window.innerWidth <= 1024) {
                    document.getElementById('sidebar').classList.remove('show');
                }
            });
        });
    }

    setupSidebar() {
        const sidebar = document.getElementById('sidebar');
        const sidebarToggle = document.getElementById('sidebarToggle');

        if (sidebarToggle && sidebar) {
            sidebarToggle.addEventListener('click', () => {
                sidebar.classList.toggle('show');
            });
        }

        // Fermer la sidebar en cliquant en dehors sur mobile
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 1024) {
                if (!sidebar.contains(e.target) && !sidebarToggle.contains(e.target)) {
                    sidebar.classList.remove('show');
                }
            }
        });
    }

    setupEventListeners() {
        // Déconnexion
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());

        // Thème
        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());

        // Formulaire défaut
        document.getElementById('addDefaut').addEventListener('click', () => this.openDefautForm());
        document.getElementById('closeDefautForm').addEventListener('click', () => this.closeDefautForm());
        document.getElementById('annulerDefaut').addEventListener('click', () => this.closeDefautForm());
        document.getElementById('defautForm').addEventListener('submit', (e) => this.addDefaut(e));

        // Photos drag & drop
        this.setupDragAndDrop();
        document.getElementById('photos').addEventListener('change', (e) => this.handlePhotoSelection(e));

        // Génération PDF
        document.getElementById('validerRapport').addEventListener('click', () => this.validerRapport());
        document.getElementById('closePdfModal').addEventListener('click', () => this.closePdfModal());

        // Paramètres (admin)
        document.getElementById('ajouterClient').addEventListener('click', () => this.ajouterClient());
        document.getElementById('ajouterTypeDefaut').addEventListener('click', () => this.ajouterTypeDefaut());

        document.getElementById('nouveauClient').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.ajouterClient();
        });
        document.getElementById('nouveauDefaut').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.ajouterTypeDefaut();
        });

        // Import Excel
        const importExcelBtn = document.getElementById('importExcelBtn');
        if (importExcelBtn) {
            importExcelBtn.addEventListener('click', () => this.selectExcelFile());
        }

        const excelFileInput = document.getElementById('excelFileInput');
        if (excelFileInput) {
            excelFileInput.addEventListener('change', (e) => this.handleExcelImport(e));
        }

        const clearReferencesBtn = document.getElementById('clearReferencesBtn');
        if (clearReferencesBtn) {
            clearReferencesBtn.addEventListener('click', () => this.clearReferences());
        }

        // Auto-complétion référence
        const referenceInput = document.getElementById('reference');
        if (referenceInput) {
            referenceInput.addEventListener('input', (e) => this.handleReferenceChange(e));
        }

        // Préférence de thème
        const themePreference = document.getElementById('themePreference');
        if (themePreference) {
            themePreference.addEventListener('change', (e) => this.saveThemePreference(e.target.value));
        }

        // Modal Ajouter Type de Défaut
        const addTypeDefautBtn = document.getElementById('addTypeDefautBtn');
        if (addTypeDefautBtn) {
            addTypeDefautBtn.addEventListener('click', () => this.openAddTypeDefautModal());
        }

        const closeAddTypeDefautModal = document.getElementById('closeAddTypeDefautModal');
        if (closeAddTypeDefautModal) {
            closeAddTypeDefautModal.addEventListener('click', () => this.closeAddTypeDefautModal());
        }

        const cancelAddTypeDefaut = document.getElementById('cancelAddTypeDefaut');
        if (cancelAddTypeDefaut) {
            cancelAddTypeDefaut.addEventListener('click', () => this.closeAddTypeDefautModal());
        }

        const saveNewTypeDefaut = document.getElementById('saveNewTypeDefaut');
        if (saveNewTypeDefaut) {
            saveNewTypeDefaut.addEventListener('click', () => this.saveNewTypeDefaut());
        }

        // Modal Éditeur d'Image
        const closeImageEditorModal = document.getElementById('closeImageEditorModal');
        if (closeImageEditorModal) {
            closeImageEditorModal.addEventListener('click', () => this.closeImageEditor());
        }

        const cancelImageEdit = document.getElementById('cancelImageEdit');
        if (cancelImageEdit) {
            cancelImageEdit.addEventListener('click', () => this.closeImageEditor());
        }

        const saveImageEdit = document.getElementById('saveImageEdit');
        if (saveImageEdit) {
            saveImageEdit.addEventListener('click', () => this.saveImageEdits());
        }

        const clearAnnotations = document.getElementById('clearAnnotations');
        if (clearAnnotations) {
            clearAnnotations.addEventListener('click', () => this.clearAnnotations());
        }

        // Tool buttons
        const toolButtons = document.querySelectorAll('.btn-tool');
        toolButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                toolButtons.forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                this.selectedTool = e.currentTarget.dataset.tool;
            });
        });

        // Gestion utilisateurs (admin)
        const addUserForm = document.getElementById('addUserForm');
        if (addUserForm) {
            addUserForm.addEventListener('submit', (e) => this.addUser(e));
        }

        // Filtres admin
        const filterStatus = document.getElementById('filterStatus');
        if (filterStatus) {
            filterStatus.addEventListener('change', () => this.loadAdminRapports());
        }

        // Modal rapport admin
        const closeRapportModal = document.getElementById('closeRapportModal');
        if (closeRapportModal) {
            closeRapportModal.addEventListener('click', () => {
                document.getElementById('rapportModal').style.display = 'none';
            });
        }

        // Modal génération mail
        const closeMailModal = document.getElementById('closeMailModal');
        if (closeMailModal) {
            closeMailModal.addEventListener('click', () => this.closeMailModal());
        }

        const copyObjetBtn = document.getElementById('copyObjetBtn');
        if (copyObjetBtn) {
            copyObjetBtn.addEventListener('click', () => this.copyToClipboard('mailObjet'));
        }

        const copyCorpsBtn = document.getElementById('copyCorpsBtn');
        if (copyCorpsBtn) {
            copyCorpsBtn.addEventListener('click', () => this.copyToClipboard('mailCorps'));
        }

        // Modal détails rapport
        const closeDetailsModal = document.getElementById('closeDetailsModal');
        if (closeDetailsModal) {
            closeDetailsModal.addEventListener('click', () => {
                document.getElementById('detailsRapportModal').style.display = 'none';
            });
        }

        // Retirer les erreurs quand l'utilisateur tape dans les champs
        const formFields = ['ordeFabrication', 'ofClient', 'numeroCommande', 'reference'];
        formFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.addEventListener('input', () => {
                    field.classList.remove('field-error');
                });
            }
        });
    }

    // ========== GESTION DES DÉFAUTS ==========
    openDefautForm(editIndex = -1) {
        // Vérifier que les champs du rapport sont renseignés avant d'ajouter un défaut
        if (editIndex < 0) { // Seulement pour l'ajout, pas l'édition
            const ordeFabricationEl = document.getElementById('ordeFabrication');
            const ofClientEl = document.getElementById('ofClient');
            const numeroCommandeEl = document.getElementById('numeroCommande');
            const referenceEl = document.getElementById('reference');

            const ordeFabrication = ordeFabricationEl.value.trim();
            const ofClient = ofClientEl.value.trim();
            const numeroCommande = numeroCommandeEl.value.trim();
            const reference = referenceEl.value.trim();

            // Retirer les erreurs précédentes
            [ordeFabricationEl, ofClientEl, numeroCommandeEl, referenceEl].forEach(el => {
                el.classList.remove('field-error');
            });

            let hasError = false;
            if (!ordeFabrication) { ordeFabricationEl.classList.add('field-error'); hasError = true; }
            if (!ofClient) { ofClientEl.classList.add('field-error'); hasError = true; }
            if (!numeroCommande) { numeroCommandeEl.classList.add('field-error'); hasError = true; }
            if (!reference) { referenceEl.classList.add('field-error'); hasError = true; }

            if (hasError) {
                return;
            }
        }

        this.editingDefautIndex = editIndex;
        const formContainer = document.getElementById('defautFormContainer');
        const formTitle = document.getElementById('defautFormTitle');

        if (editIndex >= 0) {
            formTitle.textContent = 'Modifier le Défaut';
            const defaut = this.defauts[editIndex];
            document.getElementById('typeDefaut').value = defaut.type;
            document.getElementById('quantite').value = defaut.quantite;
            document.getElementById('topo').value = defaut.topo || '';
            document.getElementById('commentaire').value = defaut.commentaire;
            this.selectedPhotos = [...defaut.photos];
            document.querySelector('.form-actions button[type="submit"]').textContent = 'Modifier';
        } else {
            formTitle.textContent = 'Ajouter un Défaut';
            document.getElementById('defautForm').reset();
            this.selectedPhotos = [];
            document.querySelector('.form-actions button[type="submit"]').textContent = 'Ajouter';
        }

        formContainer.style.display = 'block';
        this.updatePhotosPreview();
        formContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    closeDefautForm() {
        document.getElementById('defautFormContainer').style.display = 'none';
        document.getElementById('defautForm').reset();
        this.selectedPhotos = [];
        this.editingDefautIndex = -1;
        this.updatePhotosPreview();
    }

    addDefaut(e) {
        e.preventDefault();

        const typeDefautEl = document.getElementById('typeDefaut');
        const quantiteEl = document.getElementById('quantite');

        const type = typeDefautEl.value;
        const quantite = quantiteEl.value;
        const topo = document.getElementById('topo').value;
        const commentaire = document.getElementById('commentaire').value;

        // Réinitialiser les erreurs
        typeDefautEl.classList.remove('field-error');
        quantiteEl.classList.remove('field-error');

        // Validation avec bordure orange
        let hasError = false;
        if (!type) {
            typeDefautEl.classList.add('field-error');
            hasError = true;
        }
        if (!quantite) {
            quantiteEl.classList.add('field-error');
            hasError = true;
        }

        if (hasError) {
            return;
        }

        const defaut = {
            id: this.editingDefautIndex >= 0 ? this.defauts[this.editingDefautIndex].id : Date.now(),
            type: type,
            quantite: parseInt(quantite),
            topo: topo,
            commentaire: commentaire,
            photos: [...this.selectedPhotos]
        };

        if (this.editingDefautIndex >= 0) {
            this.defauts[this.editingDefautIndex] = defaut;
        } else {
            this.defauts.push(defaut);
        }

        this.updateDefautsList();
        this.closeDefautForm();
    }

    updateDefautsList() {
        const liste = document.getElementById('defautsList');
        const defautsListCard = document.getElementById('defautsListCard');
        const validerBtn = document.getElementById('validerRapport');

        liste.innerHTML = '';

        // Afficher/masquer la carte et le bouton selon s'il y a des défauts
        if (this.defauts.length === 0) {
            defautsListCard.style.display = 'none';
            validerBtn.style.display = 'none';
            return;
        }

        defautsListCard.style.display = 'block';
        validerBtn.style.display = 'block';

        this.defauts.forEach((defaut, index) => {
            const div = document.createElement('div');
            div.className = 'defaut-item';

            let photosHtml = '';
            if (defaut.photos.length > 0) {
                photosHtml = `
                    <div class="defaut-photos">
                        ${defaut.photos.map(photo =>
                            `<img src="${photo.data}" alt="${photo.name}" class="defaut-photo">`
                        ).join('')}
                    </div>
                `;
            }

            div.innerHTML = `
                <div class="defaut-header">
                    <div class="defaut-type">${defaut.type}</div>
                    <div class="defaut-actions">
                        <button class="btn btn-edit" onclick="app.openDefautForm(${index})">Modifier</button>
                        <button class="btn btn-danger" onclick="app.supprimerDefaut(${index})">Supprimer</button>
                    </div>
                </div>
                <div class="defaut-details">
                    Quantité: ${defaut.quantite} pièces
                    ${defaut.topo ? `<br>Topo: ${defaut.topo}` : ''}
                    ${defaut.commentaire ? `<br>N° de série: ${defaut.commentaire}` : ''}
                </div>
                ${photosHtml}
            `;

            liste.appendChild(div);
        });
    }

    supprimerDefaut(index) {
        if (confirm('Êtes-vous sûr de vouloir supprimer ce défaut ?')) {
            this.defauts.splice(index, 1);
            this.updateDefautsList();
        }
    }

    // ========== GESTION DES PHOTOS ==========
    setupDragAndDrop() {
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('photos');

        dropZone.addEventListener('click', () => {
            fileInput.click();
        });

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });

        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');

            const files = Array.from(e.dataTransfer.files);
            this.processFiles(files);
        });
    }

    handlePhotoSelection(e) {
        const files = Array.from(e.target.files);
        this.processFiles(files);
    }

    processFiles(files) {
        files.forEach(file => {
            if (file.type.startsWith('image/')) {
                this.compressImage(file, (compressedDataUrl, width, height) => {
                    this.selectedPhotos.push({
                        name: file.name,
                        data: compressedDataUrl,
                        width: width,
                        height: height
                    });
                    this.updatePhotosPreview();
                });
            }
        });
    }

    compressImage(file, callback) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = () => {
            const maxSize = 800;
            let { width, height } = img;

            if (width > height) {
                if (width > maxSize) {
                    height = (height * maxSize) / width;
                    width = maxSize;
                }
            } else {
                if (height > maxSize) {
                    width = (width * maxSize) / height;
                    height = maxSize;
                }
            }

            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);

            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
            callback(compressedDataUrl, width, height);
        };

        img.src = URL.createObjectURL(file);
    }

    updatePhotosPreview() {
        const preview = document.getElementById('photosPreview');
        preview.innerHTML = '';

        if (this.selectedPhotos.length > 0) {
            preview.style.display = 'grid';
            this.selectedPhotos.forEach((photo, index) => {
                const div = document.createElement('div');
                div.className = 'photo-item';
                div.innerHTML = `
                    <img src="${photo.data}" alt="${photo.name}" onclick="app.openImageEditor(${index})" title="Cliquer pour annoter">
                    <button class="remove-photo" onclick="app.removePhoto(${index})">&times;</button>
                `;
                preview.appendChild(div);
            });
        } else {
            preview.style.display = 'none';
        }
    }

    removePhoto(index) {
        this.selectedPhotos.splice(index, 1);
        this.updatePhotosPreview();
    }

    // ========== GESTION DES CLIENTS ==========
    async loadClients() {
        const { data, error } = await supabaseClient
            .from('clients')
            .select('*')
            .order('nom', { ascending: true });

        if (error) {
            console.error('Erreur lors du chargement des clients:', error);
            return;
        }

        this.clients = data;
        this.updateClientsUI();
    }

    updateClientsUI() {
        // Mettre à jour le select dans le formulaire
        const clientSelect = document.getElementById('client');
        if (clientSelect) {
            clientSelect.innerHTML = '<option value="">Sélectionner un client</option>';
            this.clients.forEach(client => {
                const option = document.createElement('option');
                option.value = client.nom;
                option.textContent = client.nom;
                clientSelect.appendChild(option);
            });
        }

        // Mettre à jour la liste dans les paramètres
        const listeClients = document.getElementById('listeClients');
        if (listeClients) {
            listeClients.innerHTML = '';
            this.clients.forEach(client => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <span>${client.nom}</span>
                    <button class="btn-delete" onclick="app.supprimerClient('${client.id}')" title="Supprimer">🗑</button>
                `;
                listeClients.appendChild(li);
            });
        }
    }

    async ajouterClient() {
        const input = document.getElementById('nouveauClient');
        const nom = input.value.trim();

        if (!nom) return;

        // Vérifier si le client existe déjà
        if (this.clients.find(c => c.nom === nom)) {
            this.showNotification('Ce client existe déjà', 'error');
            return;
        }

        const { data, error } = await supabaseClient
            .from('clients')
            .insert([{ nom }])
            .select();

        if (error) {
            console.error('Erreur lors de l\'ajout du client:', error);
            this.showNotification('Erreur lors de l\'ajout du client', 'error');
            return;
        }

        input.value = '';
        this.showNotification('Client ajouté avec succès', 'success');
        await this.loadClients();
    }

    async supprimerClient(id) {
        if (!confirm('Êtes-vous sûr de vouloir supprimer ce client ?')) return;

        const { error } = await supabaseClient
            .from('clients')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Erreur lors de la suppression du client:', error);
            this.showNotification('Erreur lors de la suppression du client', 'error');
            return;
        }

        this.showNotification('Client supprimé avec succès', 'success');
        await this.loadClients();
    }

    // ========== GESTION DES TYPES DE DÉFAUTS ==========
    async loadTypesDefauts() {
        const { data, error } = await supabaseClient
            .from('types_defauts')
            .select('*')
            .order('nom', { ascending: true });

        if (error) {
            console.error('Erreur lors du chargement des types de défauts:', error);
            return;
        }

        this.typesDefauts = data;
        this.updateTypesDefautsUI();
    }

    updateTypesDefautsUI() {
        // Mettre à jour le select dans le formulaire
        const typeDefautSelect = document.getElementById('typeDefaut');
        if (typeDefautSelect) {
            typeDefautSelect.innerHTML = '<option value="">Sélectionner un type</option>';
            this.typesDefauts.forEach(type => {
                const option = document.createElement('option');
                option.value = type.nom;
                option.textContent = type.nom;
                typeDefautSelect.appendChild(option);
            });
        }

        // Mettre à jour la liste dans les paramètres
        const listeTypesDefauts = document.getElementById('listeTypesDefauts');
        if (listeTypesDefauts) {
            listeTypesDefauts.innerHTML = '';
            this.typesDefauts.forEach(type => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <span>${type.nom}</span>
                    <button class="btn-delete" onclick="app.supprimerTypeDefaut('${type.id}')" title="Supprimer">🗑</button>
                `;
                listeTypesDefauts.appendChild(li);
            });
        }
    }

    async ajouterTypeDefaut() {
        const input = document.getElementById('nouveauDefaut');
        const nom = input.value.trim();

        if (!nom) return;

        // Vérifier si le type existe déjà
        if (this.typesDefauts.find(t => t.nom === nom)) {
            this.showNotification('Ce type de défaut existe déjà', 'error');
            return;
        }

        const { data, error } = await supabaseClient
            .from('types_defauts')
            .insert([{ nom }])
            .select();

        if (error) {
            console.error('Erreur lors de l\'ajout du type de défaut:', error);
            this.showNotification('Erreur lors de l\'ajout du type de défaut', 'error');
            return;
        }

        input.value = '';
        this.showNotification('Type de défaut ajouté avec succès', 'success');
        await this.loadTypesDefauts();
    }

    async supprimerTypeDefaut(id) {
        if (!confirm('Êtes-vous sûr de vouloir supprimer ce type de défaut ?')) return;

        const { error } = await supabaseClient
            .from('types_defauts')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Erreur lors de la suppression du type de défaut:', error);
            this.showNotification('Erreur lors de la suppression du type de défaut', 'error');
            return;
        }

        this.showNotification('Type de défaut supprimé avec succès', 'success');
        await this.loadTypesDefauts();
    }

    // ========== GESTION DES RAPPORTS ==========
    async loadRapports() {
        const { data, error } = await supabaseClient
            .from('rapports')
            .select(`
                *,
                defauts (*)
            `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Erreur lors du chargement des rapports:', error);
            return;
        }

        this.rapports = data;
        this.updateRapportsUI();
    }

    updateRapportsUI() {
        const container = document.getElementById('listeRapports');
        if (!container) return;

        container.innerHTML = '';

        if (this.rapports.length === 0) {
            const emptyCard = document.createElement('div');
            emptyCard.className = 'card';
            emptyCard.style.textAlign = 'center';
            emptyCard.style.padding = '2rem';
            emptyCard.style.color = 'var(--text-light)';
            emptyCard.innerHTML = '<p>Aucun rapport enregistré</p>';
            container.appendChild(emptyCard);
            return;
        }

        // Créer le tableau
        const table = document.createElement('table');
        table.className = 'rapports-table';

        table.innerHTML = `
            <thead>
                <tr>
                    <th>N°</th>
                    <th>OF</th>
                    <th>Référence</th>
                    <th>Client</th>
                    <th>Statut</th>
                    <th>Date</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;

        const tbody = table.querySelector('tbody');

        this.rapports.forEach((rapport) => {
            const dateObj = new Date(rapport.date_controle);
            const dateFormatted = dateObj.toLocaleDateString('fr-FR');

            let statusLabel = 'En attente';
            let statusClass = 'en_attente';

            // Si réponse client existe, afficher "Traité"
            if (rapport.reponse_client && rapport.reponse_client.trim() !== '') {
                statusLabel = 'Traité';
                statusClass = 'traite';
            } else if (rapport.status === 'en_cours') {
                statusLabel = 'En cours';
                statusClass = 'en_cours';
            } else if (rapport.status === 'attente_client') {
                statusLabel = 'Attente client';
                statusClass = 'attente_client';
            } else if (rapport.status === 'cloture') {
                statusLabel = 'Clôturé';
                statusClass = 'cloture';
            } else if (rapport.status === 'traite') {
                statusLabel = 'Traité';
                statusClass = 'traite';
            } else if (rapport.status === 'resolu') {
                statusLabel = 'Résolu';
                statusClass = 'resolu';
            }

            // Icônes SVG
            const editIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
            const deleteIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;

            // Boutons selon statut
            let actionButtons = '';
            if (rapport.status === 'en_attente') {
                actionButtons = `
                    <button class="btn-icon-only btn-edit-icon" onclick="event.stopPropagation(); app.editerRapport('${rapport.id}')" title="Modifier">${editIcon}</button>
                    <button class="btn-icon-only btn-delete-icon" onclick="event.stopPropagation(); app.supprimerRapportUser('${rapport.id}')" title="Supprimer">${deleteIcon}</button>
                `;
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><div class="rapport-numero">${rapport.numero}</div></td>
                <td>${rapport.ordre_fabrication}</td>
                <td>${rapport.reference || 'N/A'}</td>
                <td>${rapport.client || 'N/A'}</td>
                <td><span class="rapport-status status-${statusClass}">${statusLabel}</span></td>
                <td>${dateFormatted}</td>
                <td><div class="rapport-actions">${actionButtons}</div></td>
            `;

            // Ajouter le clic sur la ligne pour ouvrir le modal
            tr.style.cursor = 'pointer';
            tr.onclick = () => this.showRapportDetails(rapport.id);

            tbody.appendChild(tr);
        });

        container.appendChild(table);
    }

    async generateReportNumber() {
        // Récupérer le dernier rapport
        const { data, error } = await supabaseClient
            .from('rapports')
            .select('numero')
            .order('created_at', { ascending: false })
            .limit(1);

        if (error) {
            console.error('Erreur lors de la génération du numéro:', error);
            return 'RC0001';
        }

        if (!data || data.length === 0) {
            return 'RC0001';
        }

        const lastNumber = parseInt(data[0].numero.replace('RC', ''));
        const newNumber = String(lastNumber + 1).padStart(4, '0');
        return `RC${newNumber}`;
    }

    async saveRapport(reportNumber, pdfData) {
        const ordeFabrication = document.getElementById('ordeFabrication').value;
        const ofClient = document.getElementById('ofClient').value;
        const reference = document.getElementById('reference').value;
        const client = document.getElementById('client').value;

        // Insérer le rapport
        const { data: rapport, error: rapportError } = await supabaseClient
            .from('rapports')
            .insert([{
                numero: reportNumber,
                ordre_fabrication: ordeFabrication,
                of_client: ofClient,
                reference: reference,
                designation: null,
                client: client,
                controleur_id: this.currentUser.id,
                controleur_name: this.userProfile.full_name,
                status: 'en_attente'
            }])
            .select()
            .single();

        if (rapportError) {
            console.error('Erreur lors de la sauvegarde du rapport:', rapportError);
            throw rapportError;
        }

        // Insérer les défauts
        if (this.defauts.length > 0) {
            const defautsToInsert = this.defauts.map(defaut => ({
                rapport_id: rapport.id,
                type: defaut.type,
                quantite: defaut.quantite,
                commentaire: defaut.commentaire,
                photos: defaut.photos
            }));

            const { error: defautsError } = await supabaseClient
                .from('defauts')
                .insert(defautsToInsert);

            if (defautsError) {
                console.error('Erreur lors de la sauvegarde des défauts:', defautsError);
                throw defautsError;
            }
        }

        return rapport;
    }

    // ========== GÉNÉRATION PDF ==========
    async validerRapport() {
        const numeroNCEl = document.getElementById('numeroNC');
        const ordeFabricationEl = document.getElementById('ordeFabrication');
        const ofClientEl = document.getElementById('ofClient');
        const numeroCommandeEl = document.getElementById('numeroCommande');
        const referenceEl = document.getElementById('reference');
        const quantiteLotEl = document.getElementById('quantiteLot');
        const clientEl = document.getElementById('client');

        const numeroNC = numeroNCEl.value;
        const ordeFabrication = ordeFabricationEl.value;
        const ofClient = ofClientEl.value;
        const numeroCommande = numeroCommandeEl.value;
        const reference = referenceEl.value;
        const quantiteLot = quantiteLotEl.value;
        const client = clientEl.value;

        // Retirer les erreurs précédentes
        [numeroNCEl, ordeFabricationEl, ofClientEl, numeroCommandeEl, referenceEl, quantiteLotEl, clientEl].forEach(el => {
            el.classList.remove('field-error');
        });

        let hasError = false;
        if (!numeroNC) { numeroNCEl.classList.add('field-error'); hasError = true; }
        if (!ordeFabrication) { ordeFabricationEl.classList.add('field-error'); hasError = true; }
        if (!ofClient) { ofClientEl.classList.add('field-error'); hasError = true; }
        if (!numeroCommande) { numeroCommandeEl.classList.add('field-error'); hasError = true; }
        if (!reference) { referenceEl.classList.add('field-error'); hasError = true; }
        if (!quantiteLot) { quantiteLotEl.classList.add('field-error'); hasError = true; }
        if (!client) { clientEl.classList.add('field-error'); hasError = true; }

        if (hasError) {
            this.showNotification('Veuillez remplir tous les champs obligatoires', 'error');
            return;
        }

        if (this.defauts.length === 0) {
            this.showNotification('Veuillez ajouter au moins un défaut', 'error');
            return;
        }

        try {
            // Mode édition
            if (this.editingRapportId) {
                // Mettre à jour le rapport existant
                const { error: updateError } = await supabaseClient
                    .from('rapports')
                    .update({
                        numero_nc: numeroNC,
                        ordre_fabrication: ordeFabrication,
                        of_client: ofClient,
                        numero_commande: numeroCommande,
                        reference,
                        designation: document.getElementById('designation').value || null,
                        quantite_lot: quantiteLot ? parseInt(quantiteLot) : null,
                        client: document.getElementById('client').value
                    })
                    .eq('id', this.editingRapportId);

                if (updateError) {
                    throw updateError;
                }

                // Supprimer les anciens défauts
                await supabaseClient
                    .from('defauts')
                    .delete()
                    .eq('rapport_id', this.editingRapportId);

                // Réinsérer les défauts
                const defautsToInsert = this.defauts.map(defaut => ({
                    rapport_id: this.editingRapportId,
                    type: defaut.type,
                    quantite: defaut.quantite,
                    commentaire: defaut.commentaire,
                    photos: defaut.photos
                }));

                const { error: defautsError } = await supabaseClient
                    .from('defauts')
                    .insert(defautsToInsert);

                if (defautsError) {
                    throw defautsError;
                }

                this.showNotification('✅ Rapport mis à jour', 'success');
                this.editingRapportId = null;

                // Réinitialiser le texte du bouton
                document.getElementById('validerRapport').textContent = 'Valider le Rapport';

            } else {
                // Mode création
                const reportNumber = await this.generateReportNumber();
                const currentDate = new Date();

                // Enregistrer le rapport avec statut "en_attente"
                const { data, error } = await supabaseClient
                    .from('rapports')
                    .insert([{
                        numero: reportNumber,
                        numero_nc: numeroNC,
                        ordre_fabrication: ordeFabrication,
                        of_client: ofClient,
                        numero_commande: numeroCommande,
                        reference,
                        designation: document.getElementById('designation').value || null,
                        quantite_lot: quantiteLot ? parseInt(quantiteLot) : null,
                        client: document.getElementById('client').value,
                        controleur_id: this.currentUser.id,
                        controleur_name: this.userProfile.full_name,
                        date_controle: currentDate.toISOString(),
                        status: 'en_attente'
                    }])
                    .select()
                    .single();

                if (error) {
                    throw error;
                }

                // Enregistrer les défauts
                const defautsToInsert = this.defauts.map(defaut => ({
                    rapport_id: data.id,
                    type: defaut.type,
                    quantite: defaut.quantite,
                    commentaire: defaut.commentaire,
                    photos: defaut.photos
                }));

                const { error: defautsError } = await supabaseClient
                    .from('defauts')
                    .insert(defautsToInsert);

                if (defautsError) {
                    throw defautsError;
                }

                this.showNotification('✅ Rapport validé et envoyé à l\'admin', 'success');
            }

            // Réinitialiser le formulaire
            this.resetForm();

            // Recharger les rapports
            await this.loadRapports();

            // Mettre à jour le badge si admin
            if (this.userProfile.role === 'admin') {
                await this.updateNotifBadge();
            }

        } catch (error) {
            console.error('Erreur lors de la validation:', error);
            this.showNotification('Erreur lors de la validation du rapport', 'error');
        }
    }

    async editerRapport(rapportId) {
        try {
            // Charger le rapport et ses défauts
            const { data: rapport, error: rapportError } = await supabaseClient
                .from('rapports')
                .select('*, defauts (*)')
                .eq('id', rapportId)
                .single();

            if (rapportError) {
                throw rapportError;
            }

            // Vérifier que le rapport peut être modifié
            if (rapport.status !== 'en_attente') {
                this.showNotification('Ce rapport ne peut plus être modifié', 'error');
                return;
            }

            // Vérifier que c'est bien le rapport de l'utilisateur
            if (rapport.controleur_id !== this.currentUser.id) {
                this.showNotification('Vous ne pouvez modifier que vos propres rapports', 'error');
                return;
            }

            // Remplir le formulaire
            document.getElementById('numeroNC').value = rapport.numero_nc || '';
            document.getElementById('ordeFabrication').value = rapport.ordre_fabrication;
            document.getElementById('ofClient').value = rapport.of_client || '';
            document.getElementById('numeroCommande').value = rapport.numero_commande || '';
            document.getElementById('reference').value = rapport.reference;
            document.getElementById('designation').value = rapport.designation || '';
            document.getElementById('quantiteLot').value = rapport.quantite_lot || '';
            document.getElementById('client').value = rapport.client || '';

            // Charger les défauts
            this.defauts = rapport.defauts.map(defaut => ({
                type: defaut.type,
                quantite: defaut.quantite,
                commentaire: defaut.commentaire,
                photos: defaut.photos || []
            }));
            this.updateDefautsList();

            // Stocker l'ID pour la mise à jour
            this.editingRapportId = rapportId;

            // Changer le texte du bouton
            const validerBtn = document.getElementById('validerRapport');
            validerBtn.textContent = 'Mettre à jour le Rapport';

            // Passer à la page de nouvelle NC
            document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
            document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
            document.querySelector('[data-page="nouvelle-nc"]').classList.add('active');
            document.getElementById('page-nouvelle-nc').classList.add('active');

            this.showNotification('Rapport chargé pour modification', 'info');

        } catch (error) {
            console.error('Erreur lors du chargement du rapport:', error);
            this.showNotification('Erreur lors du chargement du rapport', 'error');
        }
    }

    async supprimerRapportUser(rapportId) {
        // Demander confirmation
        if (!confirm('Êtes-vous sûr de vouloir supprimer ce rapport ?')) {
            return;
        }

        try {
            // Charger le rapport pour vérification
            const { data: rapport, error: rapportError } = await supabaseClient
                .from('rapports')
                .select('*')
                .eq('id', rapportId)
                .single();

            if (rapportError) {
                throw rapportError;
            }

            // Vérifier que le rapport peut être supprimé
            if (rapport.status !== 'en_attente') {
                this.showNotification('Seuls les rapports en attente peuvent être supprimés', 'error');
                return;
            }

            // Vérifier que c'est bien le rapport de l'utilisateur
            if (rapport.controleur_id !== this.currentUser.id) {
                this.showNotification('Vous ne pouvez supprimer que vos propres rapports', 'error');
                return;
            }

            // Supprimer les défauts associés d'abord
            const { error: defautsError } = await supabaseClient
                .from('defauts')
                .delete()
                .eq('rapport_id', rapportId);

            if (defautsError) {
                throw defautsError;
            }

            // Supprimer le rapport
            const { error: deleteError } = await supabaseClient
                .from('rapports')
                .delete()
                .eq('id', rapportId);

            if (deleteError) {
                throw deleteError;
            }

            this.showNotification('Rapport supprimé avec succès', 'success');

            // Recharger la liste des rapports
            await this.loadRapports();

            // Mettre à jour le badge de notification si admin
            if (this.userProfile.role === 'admin') {
                await this.updateNotifBadge();
            }

        } catch (error) {
            console.error('Erreur lors de la suppression du rapport:', error);
            this.showNotification('Erreur lors de la suppression du rapport', 'error');
        }
    }

    async genererPDF(rapportId = null) {
        let numeroNC, ordeFabrication, ofClient, numeroCommande, reference, designation, quantiteLot, client, controleurName, dateControle, reportNumber, defauts;

        if (rapportId) {
            // Générer PDF depuis l'admin pour un rapport existant
            const { data: rapport, error: rapportError } = await supabaseClient
                .from('rapports')
                .select('*')
                .eq('id', rapportId)
                .single();

            if (rapportError) {
                this.showNotification('Erreur lors du chargement du rapport', 'error');
                return;
            }

            const { data: defautsData, error: defautsError } = await supabaseClient
                .from('defauts')
                .select('*')
                .eq('rapport_id', rapportId);

            if (defautsError) {
                this.showNotification('Erreur lors du chargement des défauts', 'error');
                return;
            }

            numeroNC = rapport.numero_nc;
            ordeFabrication = rapport.ordre_fabrication;
            ofClient = rapport.of_client;
            numeroCommande = rapport.numero_commande;
            reference = rapport.reference;
            designation = rapport.designation;
            quantiteLot = rapport.quantite_lot;
            client = rapport.client;
            controleurName = rapport.controleur_name;
            dateControle = new Date(rapport.date_controle);
            reportNumber = rapport.numero;
            defauts = defautsData;

        } else {
            // Ancienne logique (devrait être rarement utilisée maintenant)
            numeroNC = document.getElementById('numeroNC').value;
            ordeFabrication = document.getElementById('ordeFabrication').value;
            ofClient = document.getElementById('ofClient').value;
            numeroCommande = document.getElementById('numeroCommande').value;
            reference = document.getElementById('reference').value;
            quantiteLot = document.getElementById('quantiteLot').value;

            if (!ordeFabrication || !reference) {
                this.showNotification('Veuillez remplir tous les champs obligatoires (OF, Référence)', 'error');
                return;
            }

            designation = null;
            client = document.getElementById('client').value;
            controleurName = this.userProfile.full_name;
            dateControle = new Date();
            reportNumber = await this.generateReportNumber();
            defauts = this.defauts;
        }

        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();

            const primaryColor = [52, 58, 64];
            const lightGray = [108, 117, 125];
            const veryLightGray = [248, 249, 250];
            const terracottaOrange = [161, 58, 32];
            const white = [255, 255, 255];

            // Ajouter le logo Ajust'82 (à gauche) - ratio 3:1 environ
            try {
                // Le logo original est plus large que haut (ratio approximatif 3:1)
                // Utilisons une largeur de 30mm et hauteur de 10mm pour respecter le ratio
                doc.addImage('images/Logo-Ajust.png', 'PNG', 15, 10, 30, 10);
            } catch (error) {
                console.warn('Logo non trouvé:', error);
            }

            doc.setTextColor(...primaryColor);
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text('RAPPORT DE CONTRÔLE', 40, 16);
            doc.text('QUALITÉ À RÉCEPTION', 40, 23);

            doc.setFontSize(12);
            doc.setTextColor(...terracottaOrange);
            doc.text(`N°${numeroNC || reportNumber}`, 195, 18, { align: 'right' });

            // Espace entre le logo et les informations générales
            let yPosition = 35;
            doc.setFillColor(...terracottaOrange);
            doc.rect(15, yPosition, 180, 8, 'F');
            doc.setTextColor(...white);
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text('INFORMATIONS GÉNÉRALES', 20, yPosition + 5.5);

            yPosition += 10;

            const dateObj = new Date(dateControle);

            // Formater le nom du contrôleur (Prénom + 1ère lettre du nom)
            let controleurDisplay = 'N/A';
            if (controleurName) {
                const nameParts = controleurName.trim().split(' ');
                if (nameParts.length >= 2) {
                    controleurDisplay = `${nameParts[0]} ${nameParts[1].charAt(0)}.`;
                } else {
                    controleurDisplay = controleurName;
                }
            }

            // Tableau en 4 colonnes (2 paires label/valeur par ligne)
            const tableData = [
                [
                    ['OF Interne', ordeFabrication || 'N/A'],
                    ['OF Client', ofClient || 'N/A']
                ],
                [
                    ['N° Commande', numeroCommande || 'N/A'],
                    ['Référence', reference]
                ],
                [
                    ['Désignation', designation || 'N/A'],
                    ['Qté Lot', quantiteLot ? `${quantiteLot} pcs` : 'N/A']
                ],
                [
                    ['Client', client || 'N/A'],
                    ['Contrôleur', controleurDisplay]
                ],
                [
                    ['Date', dateObj.toLocaleDateString('fr-FR')],
                    ['', '']
                ]
            ];

            doc.setTextColor(...primaryColor);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);

            const cellHeight = 6;
            const labelWidth = 28;
            const valueWidth = 62;
            const totalWidth = 180;

            tableData.forEach((row, rowIndex) => {
                const rowY = yPosition + (rowIndex * cellHeight);

                // Background alterné
                if (rowIndex % 2 === 0) {
                    doc.setFillColor(250, 250, 250);
                    doc.rect(15, rowY, totalWidth, cellHeight, 'F');
                }

                doc.setDrawColor(...veryLightGray);
                doc.setLineWidth(0.1);

                // Première paire (colonne gauche)
                const [label1, value1] = row[0];
                doc.rect(15, rowY, labelWidth, cellHeight, 'S');
                doc.rect(15 + labelWidth, rowY, valueWidth, cellHeight, 'S');

                doc.setFont('helvetica', 'bold');
                doc.setTextColor(...lightGray);
                doc.setFontSize(7);
                doc.text(label1, 17, rowY + 4);

                doc.setFont('helvetica', 'normal');
                doc.setTextColor(...primaryColor);
                doc.setFontSize(8);
                doc.text(value1, 17 + labelWidth, rowY + 4);

                // Deuxième paire (colonne droite)
                const [label2, value2] = row[1];
                const offsetX = labelWidth + valueWidth;
                doc.rect(15 + offsetX, rowY, labelWidth, cellHeight, 'S');
                doc.rect(15 + offsetX + labelWidth, rowY, valueWidth, cellHeight, 'S');

                doc.setFont('helvetica', 'bold');
                doc.setTextColor(...lightGray);
                doc.setFontSize(7);
                doc.text(label2, 17 + offsetX, rowY + 4);

                doc.setFont('helvetica', 'normal');
                doc.setTextColor(...primaryColor);
                doc.setFontSize(8);
                doc.text(value2, 17 + offsetX + labelWidth, rowY + 4);
            });

            yPosition += (tableData.length * cellHeight) + 15;
            doc.setFillColor(...terracottaOrange);
            doc.rect(15, yPosition, 180, 8, 'F');
            doc.setTextColor(...white);
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text('DÉFAUTS IDENTIFIÉS', 20, yPosition + 5.5);

            yPosition += 15;

            if (defauts.length === 0) {
                doc.setFontSize(10);
                doc.setFont('helvetica', 'italic');
                doc.setTextColor(...lightGray);
                doc.text('Aucun défaut détecté.', 20, yPosition);
            } else {
                // Affichage en 2 colonnes
                const colWidth = 90;
                const margin = 15;
                const gap = 5;

                for (let index = 0; index < defauts.length; index += 2) {
                    if (yPosition > 240) {
                        doc.addPage();
                        yPosition = 20;
                    }

                    const startY = yPosition;
                    let maxHeight = 0;

                    // Traiter jusqu'à 2 défauts par ligne
                    for (let col = 0; col < 2 && (index + col) < defauts.length; col++) {
                        const defaut = defauts[index + col];
                        const xPosition = margin + (col * (colWidth + gap));
                        let colY = startY;

                        // Titre du défaut
                        doc.setFontSize(10);
                        doc.setFont('helvetica', 'bold');
                        doc.setTextColor(...primaryColor);
                        const defautTitle = doc.splitTextToSize(`${index + col + 1}. ${defaut.type}`, colWidth - 5);
                        doc.text(defautTitle, xPosition, colY);
                        colY += defautTitle.length * 5;

                        // Quantité
                        doc.setFontSize(8);
                        doc.setFont('helvetica', 'normal');
                        doc.setTextColor(...lightGray);
                        doc.text(`Qté : ${defaut.quantite} pièces`, xPosition, colY);
                        colY += 5;

                        // Topo
                        if (defaut.topo) {
                            doc.text(`Topo : ${defaut.topo}`, xPosition, colY);
                            colY += 5;
                        }

                        // N° de série
                        if (defaut.commentaire) {
                            const commentaireLines = doc.splitTextToSize(`N° série : ${defaut.commentaire}`, colWidth - 5);
                            doc.text(commentaireLines, xPosition, colY);
                            colY += commentaireLines.length * 4 + 2;
                        }

                        // Photos - 2 par ligne, plus grosses, aspect ratio conservé
                        if (defaut.photos && defaut.photos.length > 0) {
                            colY += 3;
                            const maxPhotoSize = 70; // Taille max par photo agrandie
                            const photoGap = 3;
                            let maxRowHeight = 0;

                            for (let photoIndex = 0; photoIndex < defaut.photos.length; photoIndex++) {
                                const photo = defaut.photos[photoIndex];
                                try {
                                    // Calculer position : 2 photos par ligne
                                    const photoCol = photoIndex % 2;
                                    const photoRow = Math.floor(photoIndex / 2);

                                    // Calculer les dimensions en gardant l'aspect ratio
                                    let photoWidth = maxPhotoSize;
                                    let photoHeight = maxPhotoSize;

                                    if (photo.width && photo.height) {
                                        const aspectRatio = photo.width / photo.height;
                                        if (aspectRatio > 1) {
                                            // Photo horizontale
                                            photoHeight = maxPhotoSize / aspectRatio;
                                        } else {
                                            // Photo verticale
                                            photoWidth = maxPhotoSize * aspectRatio;
                                        }
                                    }

                                    const photoX = xPosition + (photoCol * (maxPhotoSize + photoGap));
                                    const photoY = colY + (photoRow * (maxPhotoSize + photoGap));

                                    // Afficher la photo
                                    doc.addImage(photo.data, 'JPEG', photoX, photoY, photoWidth, photoHeight);

                                    // Suivre la hauteur max de la rangée actuelle
                                    if (photoCol === 0 || photoHeight > maxRowHeight) {
                                        maxRowHeight = Math.max(maxRowHeight, photoHeight);
                                    }
                                } catch (error) {
                                    console.error('Erreur image:', error);
                                }
                            }

                            // Calculer la hauteur totale occupée par les photos
                            const totalRows = Math.ceil(defaut.photos.length / 2);
                            colY += totalRows * (maxPhotoSize + photoGap);
                        }

                        colY += 3;
                        maxHeight = Math.max(maxHeight, colY - startY);
                    }

                    yPosition += maxHeight;

                    // Ligne de séparation
                    if (index + 2 < defauts.length) {
                        doc.setDrawColor(...veryLightGray);
                        doc.setLineWidth(0.3);
                        doc.line(margin, yPosition, 195, yPosition);
                        yPosition += 5;
                    }
                }
            }

            // Ajouter numérotation des pages et référence en bas de page
            const totalPages = doc.internal.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                doc.setPage(i);

                // Référence FOR-AJ-003 à gauche
                doc.setFontSize(8);
                doc.setTextColor(...lightGray);
                doc.text('FOR-AJ-003', 15, 287);

                // Numéro de page à droite
                doc.text(`Page ${i}/${totalPages}`, 195, 287, { align: 'right' });
            }

            // Ne sauvegarder que si c'est un nouveau rapport (pas rapportId)
            if (!rapportId) {
                await this.saveRapport(reportNumber, null);
            }

            const fileName = `${reportNumber}_${ofClient || ordeFabrication}_${reference}_${new Date().toISOString().split('T')[0]}.pdf`;
            doc.save(fileName);

            // Ne réinitialiser le formulaire que si ce n'est pas un rapport admin
            if (!rapportId) {
                this.resetForm();
            }

            this.showNotification('PDF généré avec succès', 'success');
            await this.loadRapports();

            // Si c'est un rapport admin, recharger aussi la liste admin et le badge
            if (rapportId) {
                await this.loadAdminRapports();
                await this.updateNotifBadge();
            }

        } catch (error) {
            console.error('Erreur PDF:', error);
            this.showNotification('Erreur lors de la génération du PDF', 'error');
        }
    }

    async regeneratePDF(rapportId) {
        this.showNotification('Fonctionnalité à venir', 'info');
    }

    resetForm() {
        document.getElementById('ordeFabrication').value = '';
        document.getElementById('ofClient').value = '';
        document.getElementById('numeroCommande').value = '';
        document.getElementById('reference').value = '';
        document.getElementById('client').value = '';
        this.defauts = [];
        this.editingRapportId = null;
        this.updateDefautsList();

        // Réinitialiser le texte du bouton
        document.getElementById('validerRapport').textContent = 'Valider le Rapport';
    }

    showPdfModal(fileName) {
        document.getElementById('pdfFileName').textContent = fileName;
        document.getElementById('pdfModal').style.display = 'block';
    }

    closePdfModal() {
        document.getElementById('pdfModal').style.display = 'none';
    }

    // ========== ESPACE ADMIN ==========
    async loadAdminRapports() {
        const filterStatus = document.getElementById('filterStatus')?.value || '';

        let query = supabaseClient
            .from('rapports')
            .select('*, defauts (*)')
            .order('created_at', { ascending: false });

        if (filterStatus) {
            query = query.eq('status', filterStatus);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Erreur rapports admin:', error);
            return;
        }

        // Stocker les rapports admin pour la génération de mail
        this.adminRapports = data;

        this.updateAdminRapportsUI(data);
    }

    updateAdminRapportsUI(rapports) {
        const container = document.getElementById('adminRapportsList');
        if (!container) return;

        container.innerHTML = '';

        if (rapports.length === 0) {
            container.innerHTML = '<div class="card" style="text-align: center; padding: 2rem; color: var(--text-light);"><p>Aucun rapport trouvé</p></div>';
            return;
        }

        // Créer le tableau
        const table = document.createElement('table');
        table.className = 'rapports-table';

        table.innerHTML = `
            <thead>
                <tr>
                    <th>N°</th>
                    <th>OF</th>
                    <th>Référence</th>
                    <th>Client</th>
                    <th>Contrôleur</th>
                    <th>Statut</th>
                    <th>Date</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;

        const tbody = table.querySelector('tbody');

        rapports.forEach(rapport => {
            const dateFormatted = new Date(rapport.date_controle).toLocaleDateString('fr-FR');

            let statusLabel = 'En attente';
            let statusClass = 'en_attente';

            // Si réponse client existe, afficher "Traité"
            if (rapport.reponse_client && rapport.reponse_client.trim() !== '') {
                statusLabel = 'Traité';
                statusClass = 'traite';
            } else if (rapport.status === 'en_cours') {
                statusLabel = 'En cours';
                statusClass = 'en_cours';
            } else if (rapport.status === 'attente_client') {
                statusLabel = 'Attente client';
                statusClass = 'attente_client';
            } else if (rapport.status === 'cloture') {
                statusLabel = 'Clôturé';
                statusClass = 'cloture';
            } else if (rapport.status === 'traite') {
                statusLabel = 'Traité';
                statusClass = 'traite';
            } else if (rapport.status === 'resolu') {
                statusLabel = 'Résolu';
                statusClass = 'resolu';
            }

            // Icônes SVG
            const pdfIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`;
            const mailIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`;
            const editIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
            const deleteIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;

            const pdfTitle = rapport.status === 'en_attente' ? 'Générer PDF' : 'Regénérer PDF';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><div class="rapport-numero">${rapport.numero}</div></td>
                <td>${rapport.ordre_fabrication}</td>
                <td>${rapport.reference || 'N/A'}</td>
                <td>${rapport.client || 'N/A'}</td>
                <td>${rapport.controleur_name}</td>
                <td><span class="rapport-status status-${statusClass}">${statusLabel}</span></td>
                <td>${dateFormatted}</td>
                <td>
                    <div class="rapport-actions">
                        <button class="btn-icon-only" onclick="event.stopPropagation(); app.genererPDF('${rapport.id}')" title="${pdfTitle}">${pdfIcon}</button>
                        <button class="btn-icon-only" onclick="event.stopPropagation(); app.openMailModal('${rapport.id}')" title="Générer un mail">${mailIcon}</button>
                        <button class="btn-icon-only btn-edit-icon" onclick="event.stopPropagation(); app.addReponseClient('${rapport.id}')" title="Réponse client">${editIcon}</button>
                        <button class="btn-icon-only btn-delete-icon" onclick="event.stopPropagation(); app.supprimerRapport('${rapport.id}')" title="Supprimer">${deleteIcon}</button>
                    </div>
                </td>
            `;

            // Ajouter le clic sur la ligne pour ouvrir le modal
            tr.style.cursor = 'pointer';
            tr.onclick = () => this.showRapportDetails(rapport.id);

            tbody.appendChild(tr);
        });

        container.appendChild(table);
    }

    async addReponseClient(rapportId) {
        // Récupérer le rapport actuel
        const { data: rapport } = await supabaseClient
            .from('rapports')
            .select('*')
            .eq('id', rapportId)
            .single();

        if (!rapport) return;

        // Capturer le contexte pour les callbacks
        const self = this;

        // Créer un formulaire modal simple pour la réponse client
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-box">
                <h3 style="margin-top:0;color:var(--text-dark);">Réponse client - NC ${rapport.numero}</h3>
                <div style="margin-bottom:1.5rem;">
                    <label style="display:block;margin-bottom:0.5rem;font-weight:bold;color:var(--text-dark);">Réponse client</label>
                    <textarea id="modalReponse" rows="8" class="modal-input" placeholder="Saisir la réponse du client...">${rapport.reponse_client || ''}</textarea>
                </div>
                <div style="display:flex;gap:1rem;justify-content:flex-end;">
                    <button id="modalCancel" class="btn btn-secondary">Annuler</button>
                    <button id="modalSave" class="btn btn-primary">Enregistrer</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        document.getElementById('modalCancel').onclick = () => {
            document.body.removeChild(modal);
        };

        document.getElementById('modalSave').onclick = async () => {
            const reponseClient = document.getElementById('modalReponse').value.trim();

            const updateData = {
                reponse_client: reponseClient || null,
                // Passer automatiquement en "traité" si une réponse est renseignée
                status: reponseClient ? 'traite' : rapport.status
            };

            const { error } = await supabaseClient
                .from('rapports')
                .update(updateData)
                .eq('id', rapportId);

            if (error) {
                console.error('Erreur mise à jour:', error);
                self.showNotification('Erreur mise à jour: ' + error.message, 'error');
                return;
            }

            const message = reponseClient
                ? 'Réponse client enregistrée - Statut passé à "Traité"'
                : 'Réponse client supprimée';

            self.showNotification(message, 'success');
            document.body.removeChild(modal);
            await self.loadAdminRapports();
            await self.updateNotifBadge();
        };
    }

    async supprimerRapport(rapportId) {
        if (!confirm('Supprimer ce rapport ?')) return;

        const { error } = await supabaseClient.from('rapports').delete().eq('id', rapportId);

        if (error) {
            this.showNotification('Erreur suppression', 'error');
            return;
        }

        this.showNotification('Rapport supprimé', 'success');
        await this.loadAdminRapports();
        await this.updateNotifBadge();
    }

    async viewRapportPhotos(rapportId) {
        // Charger le rapport avec ses défauts
        const { data: rapport, error } = await supabaseClient
            .from('rapports')
            .select('*, defauts (*)')
            .eq('id', rapportId)
            .single();

        if (error || !rapport) {
            this.showNotification('Erreur lors du chargement des photos', 'error');
            return;
        }

        // Collecter toutes les photos
        const allPhotos = [];
        if (rapport.defauts && Array.isArray(rapport.defauts)) {
            rapport.defauts.forEach(defaut => {
                if (defaut.photos && Array.isArray(defaut.photos)) {
                    defaut.photos.forEach(photo => {
                        allPhotos.push({
                            data: photo.data,
                            name: photo.name,
                            defautType: defaut.type
                        });
                    });
                }
            });
        }

        if (allPhotos.length === 0) {
            this.showNotification('Aucune photo disponible', 'info');
            return;
        }

        // Créer le carrousel
        this.showPhotoCarousel(allPhotos, rapport.numero);
    }

    showPhotoCarousel(photos, rapportNumero) {
        let currentIndex = 0;

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'photoCarouselModal';

        const updateCarousel = () => {
            const photo = photos[currentIndex];
            const carouselContent = modal.querySelector('.carousel-content');
            carouselContent.innerHTML = `
                <img src="${photo.data}" alt="${photo.name}" class="carousel-image">
                <div class="carousel-info">
                    <p><strong>Défaut:</strong> ${photo.defautType}</p>
                    <p><strong>Photo:</strong> ${currentIndex + 1} / ${photos.length}</p>
                </div>
            `;
        };

        modal.innerHTML = `
            <div class="carousel-modal">
                <div class="carousel-header">
                    <h3>Photos - Rapport ${rapportNumero}</h3>
                    <button class="close-carousel" id="closeCarousel">×</button>
                </div>
                <div class="carousel-content"></div>
                <div class="carousel-controls">
                    <button class="carousel-btn" id="prevPhoto">‹</button>
                    <button class="carousel-btn" id="nextPhoto">›</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        updateCarousel();

        document.getElementById('closeCarousel').onclick = () => {
            document.body.removeChild(modal);
        };

        document.getElementById('prevPhoto').onclick = () => {
            currentIndex = (currentIndex - 1 + photos.length) % photos.length;
            updateCarousel();
        };

        document.getElementById('nextPhoto').onclick = () => {
            currentIndex = (currentIndex + 1) % photos.length;
            updateCarousel();
        };

        // Fermer en cliquant en dehors
        modal.onclick = (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        };
    }

    // ========== GESTION UTILISATEURS ==========
    async loadUsers() {
        const { data, error } = await supabaseClient
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Erreur utilisateurs:', error);
            return;
        }

        this.updateUsersUI(data);
    }

    updateUsersUI(users) {
        const container = document.getElementById('usersList');
        if (!container) return;

        container.innerHTML = '';

        users.forEach(user => {
            const div = document.createElement('div');
            div.className = 'user-item';

            div.innerHTML = `
                <div class="user-item-info">
                    <h4>${user.full_name}</h4>
                    <p>Identifiant: ${user.username} - Rôle: ${user.role === 'admin' ? 'Administrateur' : 'Utilisateur'}</p>
                </div>
                <div class="user-item-actions">
                    ${user.id !== this.currentUser.id ? `<button class="btn btn-danger" onclick="app.deleteUser('${user.id}')">Supprimer</button>` : ''}
                </div>
            `;
            container.appendChild(div);
        });
    }

    async addUser(e) {
        e.preventDefault();

        const username = document.getElementById('newUserUsername').value;
        const fullName = document.getElementById('newUserName').value;
        const password = document.getElementById('newUserPassword').value;
        const role = document.getElementById('newUserRole').value;

        try {
            // Vérifier si le username existe déjà
            const { data: existingUser, error: checkError } = await supabaseClient
                .from('profiles')
                .select('username')
                .eq('username', username)
                .maybeSingle();

            if (existingUser) {
                this.showNotification('Cet identifiant existe déjà', 'error');
                return;
            }

            // Créer un email basé sur le username (comme GestionDesStocks)
            const email = `${username}@rapportcontrole.app`;

            // Créer le compte Auth
            const { data: authData, error: authError } = await supabaseClient.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: undefined,
                    data: {
                        username,
                        full_name: fullName,
                    }
                }
            });

            if (authError || !authData.user) {
                this.showNotification('Erreur: ' + (authError?.message || 'Création impossible'), 'error');
                return;
            }

            // Attendre un peu que le trigger se déclenche
            await new Promise(resolve => setTimeout(resolve, 500));

            // Créer le profil manuellement
            const { error: profileError } = await supabaseClient
                .from('profiles')
                .insert([{
                    id: authData.user.id,
                    username,
                    full_name: fullName,
                    role
                }]);

            if (profileError) {
                console.error('Erreur profil:', profileError);
                this.showNotification('Utilisateur créé mais erreur de profil', 'warning');
            } else {
                this.showNotification('Utilisateur créé avec succès', 'success');
            }

            document.getElementById('addUserForm').reset();
            await this.loadUsers();
        } catch (error) {
            console.error('Erreur création utilisateur:', error);
            this.showNotification('Erreur: ' + error.message, 'error');
        }
    }

    async deleteUser(userId) {
        if (!confirm('Supprimer cet utilisateur ?')) return;

        const { error } = await supabaseClient.auth.admin.deleteUser(userId);

        if (error) {
            this.showNotification('Erreur: ' + error.message, 'error');
            return;
        }

        this.showNotification('Utilisateur supprimé', 'success');
        await this.loadUsers();
    }

    // ========== MODAL DÉTAILS RAPPORT ==========
    async showRapportDetails(rapportId) {
        // Charger le rapport avec ses défauts
        const { data: rapport, error } = await supabaseClient
            .from('rapports')
            .select('*, defauts (*)')
            .eq('id', rapportId)
            .single();

        if (error || !rapport) {
            this.showNotification('Erreur lors du chargement du rapport', 'error');
            return;
        }

        // Remplir le contenu du modal
        document.getElementById('detailsRapportNumero').textContent = rapport.numero;

        const statusLabels = {
            'en_attente': 'En attente',
            'traite': 'Traité',
            'resolu': 'Résolu'
        };

        const dateControle = new Date(rapport.date_controle).toLocaleDateString('fr-FR');

        let defautsHTML = '';
        if (rapport.defauts && rapport.defauts.length > 0) {
            rapport.defauts.forEach((defaut, index) => {
                let photosHTML = '';
                if (defaut.photos && defaut.photos.length > 0) {
                    photosHTML = `
                        <div class="photos-carousel" id="carousel-${index}">
                            ${defaut.photos.map((photo, photoIndex) => `
                                <img src="${photo.data}" alt="Photo ${photoIndex + 1}" class="carousel-photo ${photoIndex === 0 ? 'active' : ''}" />
                            `).join('')}
                            ${defaut.photos.length > 1 ? `
                                <button class="carousel-btn carousel-prev" onclick="app.prevPhoto(${index})">❮</button>
                                <button class="carousel-btn carousel-next" onclick="app.nextPhoto(${index})">❯</button>
                                <div class="carousel-indicators">
                                    ${defaut.photos.map((_, i) => `
                                        <span class="indicator ${i === 0 ? 'active' : ''}" onclick="app.goToPhoto(${index}, ${i})"></span>
                                    `).join('')}
                                </div>
                            ` : ''}
                        </div>
                    `;
                }

                defautsHTML += `
                    <div class="defaut-details-item">
                        <h5>${index + 1}. ${defaut.type}</h5>
                        <p><strong>Quantité :</strong> ${defaut.quantite} pièce(s)</p>
                        ${defaut.commentaire ? `<p><strong>Observation :</strong> ${defaut.commentaire}</p>` : ''}
                        ${photosHTML}
                    </div>
                `;
            });
        } else {
            defautsHTML = '<p>Aucun défaut enregistré</p>';
        }

        const contentHTML = `
            <div class="details-section">
                <h4>Informations Générales</h4>
                <div class="details-grid">
                    <div class="details-item">
                        <label>N° Rapport</label>
                        <span>${rapport.numero}</span>
                    </div>
                    <div class="details-item">
                        <label>Statut</label>
                        <span>${statusLabels[rapport.status] || rapport.status}</span>
                    </div>
                    <div class="details-item">
                        <label>Ordre de Fabrication</label>
                        <span>${rapport.ordre_fabrication}</span>
                    </div>
                    <div class="details-item">
                        <label>OF Client</label>
                        <span>${rapport.of_client || 'N/A'}</span>
                    </div>
                    <div class="details-item">
                        <label>N° Commande</label>
                        <span>${rapport.numero_commande || 'N/A'}</span>
                    </div>
                    <div class="details-item">
                        <label>Référence</label>
                        <span>${rapport.reference || 'N/A'}</span>
                    </div>
                    <div class="details-item">
                        <label>Client</label>
                        <span>${rapport.client || 'N/A'}</span>
                    </div>
                    <div class="details-item">
                        <label>Date de Contrôle</label>
                        <span>${dateControle}</span>
                    </div>
                    <div class="details-item">
                        <label>Contrôleur</label>
                        <span>${rapport.controleur_name}</span>
                    </div>
                </div>
            </div>

            <div class="details-section">
                <h4>Non-conformités Détectées</h4>
                ${defautsHTML}
            </div>

            ${rapport.reponse_client ? `
                <div class="details-section">
                    <h4>Réponse Client</h4>
                    <p>${rapport.reponse_client}</p>
                </div>
            ` : ''}
        `;

        document.getElementById('detailsRapportContent').innerHTML = contentHTML;

        // Afficher le modal
        document.getElementById('detailsRapportModal').style.display = 'block';
    }

    prevPhoto(carouselIndex) {
        const carousel = document.getElementById(`carousel-${carouselIndex}`);
        const photos = carousel.querySelectorAll('.carousel-photo');
        const indicators = carousel.querySelectorAll('.indicator');

        let currentIndex = Array.from(photos).findIndex(photo => photo.classList.contains('active'));
        photos[currentIndex].classList.remove('active');
        indicators[currentIndex].classList.remove('active');

        currentIndex = (currentIndex - 1 + photos.length) % photos.length;
        photos[currentIndex].classList.add('active');
        indicators[currentIndex].classList.add('active');
    }

    nextPhoto(carouselIndex) {
        const carousel = document.getElementById(`carousel-${carouselIndex}`);
        const photos = carousel.querySelectorAll('.carousel-photo');
        const indicators = carousel.querySelectorAll('.indicator');

        let currentIndex = Array.from(photos).findIndex(photo => photo.classList.contains('active'));
        photos[currentIndex].classList.remove('active');
        indicators[currentIndex].classList.remove('active');

        currentIndex = (currentIndex + 1) % photos.length;
        photos[currentIndex].classList.add('active');
        indicators[currentIndex].classList.add('active');
    }

    goToPhoto(carouselIndex, photoIndex) {
        const carousel = document.getElementById(`carousel-${carouselIndex}`);
        const photos = carousel.querySelectorAll('.carousel-photo');
        const indicators = carousel.querySelectorAll('.indicator');

        photos.forEach(photo => photo.classList.remove('active'));
        indicators.forEach(indicator => indicator.classList.remove('active'));

        photos[photoIndex].classList.add('active');
        indicators[photoIndex].classList.add('active');
    }

    // ========== GÉNÉRATION DE MAIL ==========
    async openMailModal(rapportId) {
        // Charger le rapport avec ses défauts
        const { data: rapport, error } = await supabaseClient
            .from('rapports')
            .select('*, defauts (*)')
            .eq('id', rapportId)
            .single();

        if (error || !rapport) {
            this.showNotification('Erreur lors du chargement du rapport', 'error');
            return;
        }

        // Générer l'objet du mail
        const ofClient = rapport.of_client || 'N/A';
        const numeroCommande = rapport.numero_commande || rapport.ordre_fabrication;
        const objet = `OF ${ofClient} - Commande N° ${numeroCommande}`;

        // Générer le corps du mail
        const dateControle = new Date(rapport.date_controle).toLocaleDateString('fr-FR');

        // Récupérer les défauts
        let defautsText = '';
        if (rapport.defauts && rapport.defauts.length > 0) {
            defautsText = rapport.defauts.map((defaut, index) => {
                let text = `${index + 1}. ${defaut.type} - Quantité : ${defaut.quantite} pièce(s)`;
                if (defaut.commentaire) {
                    text += `\n   Observation : ${defaut.commentaire}`;
                }
                return text;
            }).join('\n');
        }

        const corps = `Bonjour,

Suite au contrôle qualité effectué le ${dateControle}, nous avons identifié des non-conformités sur la commande n°${numeroCommande}.

Détails du rapport de contrôle :
- OF Client : ${ofClient}
- Référence : ${rapport.reference || 'N/A'}

Non-conformités détectées :
${defautsText}

Nous restons à votre disposition pour toute information complémentaire.

Cordialement,
${this.userProfile.full_name}`;

        // Remplir les champs
        document.getElementById('mailRapportNumero').textContent = rapport.numero;
        document.getElementById('mailObjet').value = objet;
        document.getElementById('mailCorps').value = corps;

        // Afficher le modal
        document.getElementById('mailModal').style.display = 'block';
    }

    closeMailModal() {
        document.getElementById('mailModal').style.display = 'none';
    }

    copyToClipboard(elementId) {
        const element = document.getElementById(elementId);
        const text = element.value;

        if (!text) {
            this.showNotification('Aucun texte à copier', 'error');
            return;
        }

        // Utiliser l'API clipboard
        navigator.clipboard.writeText(text).then(() => {
            this.showNotification('Texte copié dans le presse-papiers', 'success');
        }).catch(err => {
            console.error('Erreur lors de la copie:', err);
            this.showNotification('Erreur lors de la copie', 'error');
        });
    }

    // ========== UTILITAIRES ==========
    initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);

        const themeBtn = document.getElementById('themeToggle');
        if (themeBtn) {
            if (savedTheme === 'light') {
                // Icône lune pour le mode sombre
                themeBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>`;
            } else {
                // Icône soleil pour le mode clair
                themeBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="5"/>
                    <line x1="12" y1="1" x2="12" y2="3"/>
                    <line x1="12" y1="21" x2="12" y2="23"/>
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                    <line x1="1" y1="12" x2="3" y2="12"/>
                    <line x1="21" y1="12" x2="23" y2="12"/>
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>`;
            }
        }
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

        document.documentElement.setAttribute('data-theme', newTheme);

        // Mettre à jour l'icône SVG
        const themeBtn = document.getElementById('themeToggle');
        if (newTheme === 'light') {
            // Icône lune pour le mode sombre
            themeBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>`;
        } else {
            // Icône soleil pour le mode clair
            themeBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/>
                <line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>`;
        }

        localStorage.setItem('theme', newTheme);
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => notification.classList.add('show'), 100);

        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => document.body.removeChild(notification), 300);
        }, 3000);
    }

    // ========== GESTION DES PARAMÈTRES ==========
    loadSettings() {
        // Charger la préférence de thème
        const savedTheme = localStorage.getItem('theme') || 'dark';
        const themeSelect = document.getElementById('themePreference');
        if (themeSelect) {
            themeSelect.value = savedTheme;
        }

    }

    saveThemePreference(theme) {
        localStorage.setItem('theme', theme);
        document.documentElement.setAttribute('data-theme', theme);

        // Mettre à jour l'icône du bouton de thème
        const themeBtn = document.getElementById('themeToggle');
        if (themeBtn) {
            if (theme === 'light') {
                themeBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>`;
            } else {
                themeBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="5"/>
                    <line x1="12" y1="1" x2="12" y2="3"/>
                    <line x1="12" y1="21" x2="12" y2="23"/>
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                    <line x1="1" y1="12" x2="3" y2="12"/>
                    <line x1="21" y1="12" x2="23" y2="12"/>
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>`;
            }
        }

        this.showNotification('Thème enregistré', 'success');
    }

    // ========== MODAL AJOUTER TYPE DE DÉFAUT ==========
    openAddTypeDefautModal() {
        const modal = document.getElementById('addTypeDefautModal');
        modal.style.display = 'flex';
        document.getElementById('newTypeDefautName').value = '';
        document.getElementById('newTypeDefautName').focus();
    }

    closeAddTypeDefautModal() {
        const modal = document.getElementById('addTypeDefautModal');
        modal.style.display = 'none';
    }

    async saveNewTypeDefaut() {
        const name = document.getElementById('newTypeDefautName').value.trim();

        if (!name) {
            this.showNotification('Veuillez saisir un nom', 'error');
            return;
        }

        // Vérifier si le type existe déjà
        const exists = this.typesDefauts.some(t => t.nom.toLowerCase() === name.toLowerCase());
        if (exists) {
            this.showNotification('Ce type de défaut existe déjà', 'error');
            return;
        }

        const { data, error } = await supabaseClient
            .from('types_defauts')
            .insert([{ nom: name }])
            .select();

        if (error) {
            console.error('Erreur lors de l\'ajout du type de défaut:', error);
            this.showNotification('Erreur lors de l\'ajout', 'error');
            return;
        }

        this.showNotification('Type de défaut ajouté avec succès', 'success');
        await this.loadTypesDefauts();
        this.closeAddTypeDefautModal();

        // Sélectionner automatiquement le nouveau type
        const select = document.getElementById('typeDefaut');
        if (select && data && data[0]) {
            select.value = data[0].nom;
        }
    }

    // ========== ÉDITEUR D'IMAGE ==========
    openImageEditor(photoIndex) {
        this.currentEditingPhotoIndex = photoIndex;
        const photo = this.selectedPhotos[photoIndex];

        const modal = document.getElementById('imageEditorModal');
        modal.style.display = 'flex';

        // Initialiser le canvas
        this.imageEditorCanvas = document.getElementById('imageCanvas');
        this.imageEditorCtx = this.imageEditorCanvas.getContext('2d');

        // Charger l'image
        const img = new Image();
        img.onload = () => {
            this.originalImage = img;
            this.imageEditorCanvas.width = img.width;
            this.imageEditorCanvas.height = img.height;
            this.redrawCanvas();
            this.setupCanvasEvents();
        };
        img.src = photo.data;

        this.annotations = [];
    }

    closeImageEditor() {
        const modal = document.getElementById('imageEditorModal');
        modal.style.display = 'none';
        this.currentEditingPhotoIndex = null;
        this.annotations = [];
        this.removeCanvasEvents();
    }

    setupCanvasEvents() {
        this.imageEditorCanvas.addEventListener('mousedown', this.handleCanvasMouseDown.bind(this));
        this.imageEditorCanvas.addEventListener('mousemove', this.handleCanvasMouseMove.bind(this));
        this.imageEditorCanvas.addEventListener('mouseup', this.handleCanvasMouseUp.bind(this));
    }

    removeCanvasEvents() {
        if (this.imageEditorCanvas) {
            this.imageEditorCanvas.removeEventListener('mousedown', this.handleCanvasMouseDown.bind(this));
            this.imageEditorCanvas.removeEventListener('mousemove', this.handleCanvasMouseMove.bind(this));
            this.imageEditorCanvas.removeEventListener('mouseup', this.handleCanvasMouseUp.bind(this));
        }
    }

    handleCanvasMouseDown(e) {
        const rect = this.imageEditorCanvas.getBoundingClientRect();
        this.startX = (e.clientX - rect.left) * (this.imageEditorCanvas.width / rect.width);
        this.startY = (e.clientY - rect.top) * (this.imageEditorCanvas.height / rect.height);
        this.isDrawing = true;
    }

    handleCanvasMouseMove(e) {
        if (!this.isDrawing) return;

        const rect = this.imageEditorCanvas.getBoundingClientRect();
        const currentX = (e.clientX - rect.left) * (this.imageEditorCanvas.width / rect.width);
        const currentY = (e.clientY - rect.top) * (this.imageEditorCanvas.height / rect.height);

        // Redessiner le canvas avec l'aperçu de la forme en cours
        this.redrawCanvas();

        const color = document.getElementById('annotationColor').value;
        this.imageEditorCtx.strokeStyle = color;
        this.imageEditorCtx.lineWidth = 3;

        if (this.selectedTool === 'ellipse') {
            this.drawEllipse(this.startX, this.startY, currentX, currentY, false);
        } else if (this.selectedTool === 'arrow') {
            this.drawArrow(this.startX, this.startY, currentX, currentY, false);
        }
    }

    handleCanvasMouseUp(e) {
        if (!this.isDrawing) return;

        const rect = this.imageEditorCanvas.getBoundingClientRect();
        const endX = (e.clientX - rect.left) * (this.imageEditorCanvas.width / rect.width);
        const endY = (e.clientY - rect.top) * (this.imageEditorCanvas.height / rect.height);

        const color = document.getElementById('annotationColor').value;

        // Sauvegarder l'annotation
        this.annotations.push({
            tool: this.selectedTool,
            startX: this.startX,
            startY: this.startY,
            endX: endX,
            endY: endY,
            color: color
        });

        this.isDrawing = false;
        this.redrawCanvas();
    }

    redrawCanvas() {
        // Effacer le canvas
        this.imageEditorCtx.clearRect(0, 0, this.imageEditorCanvas.width, this.imageEditorCanvas.height);

        // Redessiner l'image originale
        if (this.originalImage) {
            this.imageEditorCtx.drawImage(this.originalImage, 0, 0);
        }

        // Redessiner toutes les annotations
        this.annotations.forEach(annotation => {
            this.imageEditorCtx.strokeStyle = annotation.color;
            this.imageEditorCtx.lineWidth = 3;

            if (annotation.tool === 'ellipse') {
                this.drawEllipse(annotation.startX, annotation.startY, annotation.endX, annotation.endY, true);
            } else if (annotation.tool === 'arrow') {
                this.drawArrow(annotation.startX, annotation.startY, annotation.endX, annotation.endY, true);
            }
        });
    }

    drawEllipse(x1, y1, x2, y2, save) {
        const centerX = (x1 + x2) / 2;
        const centerY = (y1 + y2) / 2;
        const radiusX = Math.abs(x2 - x1) / 2;
        const radiusY = Math.abs(y2 - y1) / 2;

        this.imageEditorCtx.beginPath();
        this.imageEditorCtx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
        this.imageEditorCtx.stroke();
    }

    drawArrow(x1, y1, x2, y2, save) {
        const headLength = 20;
        const angle = Math.atan2(y2 - y1, x2 - x1);

        // Ligne principale
        this.imageEditorCtx.beginPath();
        this.imageEditorCtx.moveTo(x1, y1);
        this.imageEditorCtx.lineTo(x2, y2);
        this.imageEditorCtx.stroke();

        // Pointe de la flèche
        this.imageEditorCtx.beginPath();
        this.imageEditorCtx.moveTo(x2, y2);
        this.imageEditorCtx.lineTo(
            x2 - headLength * Math.cos(angle - Math.PI / 6),
            y2 - headLength * Math.sin(angle - Math.PI / 6)
        );
        this.imageEditorCtx.moveTo(x2, y2);
        this.imageEditorCtx.lineTo(
            x2 - headLength * Math.cos(angle + Math.PI / 6),
            y2 - headLength * Math.sin(angle + Math.PI / 6)
        );
        this.imageEditorCtx.stroke();
    }

    clearAnnotations() {
        this.annotations = [];
        this.redrawCanvas();
    }

    saveImageEdits() {
        if (this.currentEditingPhotoIndex === null) return;

        // Convertir le canvas en base64
        const editedImageData = this.imageEditorCanvas.toDataURL('image/jpeg', 0.9);

        // Mettre à jour la photo
        this.selectedPhotos[this.currentEditingPhotoIndex].data = editedImageData;

        this.showNotification('Image enregistrée avec succès', 'success');
        this.updatePhotosPreview();
        this.closeImageEditor();
    }

    // ========== IMPORT EXCEL RÉFÉRENCES ==========
    selectExcelFile() {
        document.getElementById('excelFileInput').click();
    }

    async handleExcelImport(event) {
        const file = event.target.files[0];
        if (!file) return;

        document.getElementById('excelFileName').textContent = file.name;

        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

            // Ignorer la première ligne (en-têtes)
            let importCount = 0;
            for (let i = 1; i < jsonData.length; i++) {
                const row = jsonData[i];
                const reference = row[0]?.toString().trim();
                const designation = row[1]?.toString().trim();

                if (reference && designation) {
                    this.productReferences.set(reference, designation);
                    importCount++;
                }
            }

            // Sauvegarder dans localStorage
            this.saveReferencesToLocalStorage();

            // Mettre à jour l'UI
            this.updateReferencesUI();
            this.updateReferencesList();

            this.showNotification(`✅ ${importCount} références importées avec succès`, 'success');

        } catch (error) {
            console.error('Erreur lors de l\'import Excel:', error);
            this.showNotification('Erreur lors de l\'import du fichier Excel', 'error');
        }

        // Réinitialiser l'input
        event.target.value = '';
    }

    saveReferencesToLocalStorage() {
        const referencesObj = Object.fromEntries(this.productReferences);
        localStorage.setItem('productReferences', JSON.stringify(referencesObj));
    }

    loadReferencesFromLocalStorage() {
        const stored = localStorage.getItem('productReferences');
        if (stored) {
            try {
                const referencesObj = JSON.parse(stored);
                this.productReferences = new Map(Object.entries(referencesObj));
                this.updateReferencesUI();
                this.updateReferencesList();
            } catch (error) {
                console.error('Erreur lors du chargement des références:', error);
            }
        }
    }

    updateReferencesUI() {
        const statsDiv = document.getElementById('excelImportStats');
        const countSpan = document.getElementById('referencesCount');

        if (this.productReferences.size > 0) {
            statsDiv.style.display = 'block';
            countSpan.textContent = this.productReferences.size;
        } else {
            statsDiv.style.display = 'none';
        }
    }

    updateReferencesList() {
        const datalist = document.getElementById('referencesList');
        if (!datalist) return;

        datalist.innerHTML = '';
        this.productReferences.forEach((designation, reference) => {
            const option = document.createElement('option');
            option.value = reference;
            // Afficher seulement la référence dans la liste
            datalist.appendChild(option);
        });
    }

    handleReferenceChange(event) {
        const reference = event.target.value.trim();
        const designationInput = document.getElementById('designation');

        if (this.productReferences.has(reference)) {
            // Remplir et bloquer le champ désignation
            designationInput.value = this.productReferences.get(reference);
            designationInput.readOnly = true;
            designationInput.style.backgroundColor = 'var(--hover-bg)';
            designationInput.style.cursor = 'not-allowed';
        } else {
            // Débloquer le champ désignation si la référence n'est pas trouvée
            designationInput.readOnly = false;
            designationInput.style.backgroundColor = '';
            designationInput.style.cursor = '';
        }
    }

    clearReferences() {
        if (confirm('Êtes-vous sûr de vouloir effacer toutes les références importées ?')) {
            this.productReferences.clear();
            localStorage.removeItem('productReferences');
            this.updateReferencesUI();
            this.updateReferencesList();
            document.getElementById('excelFileName').textContent = '';
            this.showNotification('Références effacées', 'success');
        }
    }

}

// ========== INITIALISATION ==========
document.addEventListener('DOMContentLoaded', () => {
    app = new RapportDeControleApp();
});

window.onclick = function(event) {
    const pdfModal = document.getElementById('pdfModal');
    const rapportModal = document.getElementById('rapportModal');
    const mailModal = document.getElementById('mailModal');
    const detailsModal = document.getElementById('detailsRapportModal');

    if (event.target === pdfModal) {
        app.closePdfModal();
    }
    if (event.target === rapportModal) {
        rapportModal.style.display = 'none';
    }
    if (event.target === mailModal) {
        app.closeMailModal();
    }
    if (event.target === detailsModal) {
        detailsModal.style.display = 'none';
    }
};

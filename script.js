// ============================================
// APPLICATION DE RAPPORT DE CONTRÔLE QUALITÉ
// Avec authentification Supabase
// ============================================

// ========== INITIALISATION SUPABASE ==========
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

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

        // Afficher les menus admin si nécessaire
        if (this.userProfile.role === 'admin') {
            document.querySelectorAll('.admin-only').forEach(el => {
                el.style.display = 'flex';
            });
        }

        // Initialiser l'application
        this.setupEventListeners();
        this.setupNavigation();
        this.setupSidebar();
        this.loadClients();
        this.loadTypesDefauts();
        this.loadRapports();
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

            // Récupérer l'email correspondant au username
            const { data: profileData, error: profileError } = await supabaseClient
                .from('profiles')
                .select('email')
                .eq('username', username)
                .single();

            console.log('📧 Recherche email:', profileData, 'Erreur:', profileError);

            if (profileError || !profileData) {
                console.error('❌ Erreur profil:', profileError);
                loginError.textContent = 'Identifiant incorrect. Vérifiez que l\'utilisateur existe dans Supabase.';
                loginError.style.display = 'block';
                return;
            }

            // Se connecter avec l'email trouvé
            console.log('🔑 Tentative de connexion avec email:', profileData.email);
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email: profileData.email,
                password
            });

            console.log('✅ Résultat connexion:', data, 'Erreur:', error);

            if (error) {
                console.error('❌ Erreur connexion:', error);
                loginError.textContent = 'Mot de passe incorrect: ' + error.message;
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
        const navLinks = document.querySelectorAll('.nav-item');
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
                if (targetPage === 'historique') {
                    this.loadRapports();
                } else if (targetPage === 'admin') {
                    this.loadAdminRapports();
                } else if (targetPage === 'utilisateurs') {
                    this.loadUsers();
                } else if (targetPage === 'parametres') {
                    this.loadClients();
                    this.loadTypesDefauts();
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

        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('show');
        });

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
        document.getElementById('genererPDF').addEventListener('click', () => this.genererPDF());
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
    }

    // ========== GESTION DES DÉFAUTS ==========
    openDefautForm(editIndex = -1) {
        this.editingDefautIndex = editIndex;
        const formContainer = document.getElementById('defautFormContainer');
        const formTitle = document.getElementById('defautFormTitle');

        if (editIndex >= 0) {
            formTitle.textContent = 'Modifier le Défaut';
            const defaut = this.defauts[editIndex];
            document.getElementById('typeDefaut').value = defaut.type;
            document.getElementById('quantite').value = defaut.quantite;
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

        const type = document.getElementById('typeDefaut').value;
        const quantite = document.getElementById('quantite').value;
        const commentaire = document.getElementById('commentaire').value;

        if (type && quantite) {
            const defaut = {
                id: this.editingDefautIndex >= 0 ? this.defauts[this.editingDefautIndex].id : Date.now(),
                type: type,
                quantite: parseInt(quantite),
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
    }

    updateDefautsList() {
        const liste = document.getElementById('defautsList');
        liste.innerHTML = '';

        if (this.defauts.length === 0) {
            liste.innerHTML = '<p style="text-align: center; color: var(--text-light); padding: 2rem;">Aucun défaut ajouté</p>';
            return;
        }

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
                    ${defaut.commentaire ? `<br>Observation: ${defaut.commentaire}` : ''}
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
                this.compressImage(file, (compressedDataUrl) => {
                    this.selectedPhotos.push({
                        name: file.name,
                        data: compressedDataUrl
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
            callback(compressedDataUrl);
        };

        img.src = URL.createObjectURL(file);
    }

    updatePhotosPreview() {
        const preview = document.getElementById('photosPreview');
        preview.innerHTML = '';

        this.selectedPhotos.forEach((photo, index) => {
            const div = document.createElement('div');
            div.className = 'photo-preview';
            div.innerHTML = `
                <img src="${photo.data}" alt="${photo.name}">
                <button class="remove-photo" onclick="app.removePhoto(${index})">×</button>
            `;
            preview.appendChild(div);
        });
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
                    <button class="btn-delete" onclick="app.supprimerClient('${client.id}')" title="Supprimer">×</button>
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
                    <button class="btn-delete" onclick="app.supprimerTypeDefaut('${type.id}')" title="Supprimer">×</button>
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

        this.rapports.forEach((rapport) => {
            const card = document.createElement('div');
            card.className = 'card rapport-card';

            const dateObj = new Date(rapport.date_controle);
            const dateFormatted = dateObj.toLocaleDateString('fr-FR');

            card.innerHTML = `
                <div class="rapport-card-content">
                    <div class="rapport-info">
                        <div class="rapport-numero">${rapport.numero}</div>
                        <div class="rapport-details">
                            <span class="rapport-label">OF:</span> ${rapport.ordre_fabrication}
                        </div>
                        <div class="rapport-details">
                            <span class="rapport-label">Phase:</span> ${rapport.phase || 'N/A'}
                        </div>
                        <div class="rapport-details">
                            <span class="rapport-label">Référence:</span> ${rapport.reference || 'N/A'}
                        </div>
                        <div class="rapport-details">
                            <span class="rapport-label">Client:</span> ${rapport.client || 'N/A'}
                        </div>
                        <div class="rapport-date">${dateFormatted}</div>
                    </div>
                    <div class="rapport-actions">
                        <button class="btn-icon-only btn-download" onclick="app.regeneratePDF('${rapport.id}')" title="Télécharger le PDF">
                            ⬇
                        </button>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
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
        const phase = document.getElementById('phase').value;
        const reference = document.getElementById('reference').value;
        const designation = document.getElementById('designation').value;
        const client = document.getElementById('client').value;

        // Insérer le rapport
        const { data: rapport, error: rapportError } = await supabaseClient
            .from('rapports')
            .insert([{
                numero: reportNumber,
                ordre_fabrication: ordeFabrication,
                phase: phase,
                reference: reference,
                designation: designation,
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
    async genererPDF() {
        const ordeFabrication = document.getElementById('ordeFabrication').value;
        const phase = document.getElementById('phase').value;
        const reference = document.getElementById('reference').value;

        if (!ordeFabrication || !phase || !reference) {
            this.showNotification('Veuillez remplir tous les champs obligatoires (OF, Phase, Référence)', 'error');
            return;
        }

        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();

            const primaryColor = [52, 58, 64];
            const lightGray = [108, 117, 125];
            const veryLightGray = [248, 249, 250];
            const terracottaOrange = [161, 58, 32];
            const white = [255, 255, 255];

            const reportNumber = await this.generateReportNumber();

            doc.setTextColor(...primaryColor);
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text('RAPPORT DE CONTRÔLE', 15, 18);
            doc.text('QUALITÉ À RÉCEPTION', 15, 25);

            doc.setFontSize(12);
            doc.setTextColor(...terracottaOrange);
            doc.text(`RC N°${reportNumber}`, 195, 18, { align: 'right' });

            let yPosition = 33;
            doc.setFillColor(...terracottaOrange);
            doc.rect(15, yPosition, 180, 8, 'F');
            doc.setTextColor(...white);
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text('INFORMATIONS GÉNÉRALES', 20, yPosition + 5.5);

            yPosition += 10;

            const currentDate = new Date();
            const tableData = [
                ['OF Ajust\'82', ordeFabrication],
                ['Phase', phase],
                ['Référence', reference],
                ['Désignation', document.getElementById('designation').value || 'N/A'],
                ['Client', document.getElementById('client').value || 'N/A'],
                ['Contrôleur', this.userProfile.full_name],
                ['Date', currentDate.toLocaleDateString('fr-FR')],
                ['Heure', currentDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })]
            ];

            doc.setTextColor(...primaryColor);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);

            const cellHeight = 7;
            const col1Width = 60;
            const col2Width = 120;

            tableData.forEach((row, index) => {
                const rowY = yPosition + (index * cellHeight);

                if (index % 2 === 0) {
                    doc.setFillColor(250, 250, 250);
                    doc.rect(15, rowY, col1Width + col2Width, cellHeight, 'F');
                }

                doc.setDrawColor(...veryLightGray);
                doc.setLineWidth(0.1);
                doc.rect(15, rowY, col1Width, cellHeight, 'S');
                doc.rect(15 + col1Width, rowY, col2Width, cellHeight, 'S');

                doc.setFont('helvetica', 'bold');
                doc.setTextColor(...lightGray);
                doc.text(row[0], 18, rowY + 4.5);

                doc.setFont('helvetica', 'normal');
                doc.setTextColor(...primaryColor);
                doc.text(row[1], 18 + col1Width, rowY + 4.5);
            });

            yPosition += (tableData.length * cellHeight) + 15;
            doc.setFillColor(...terracottaOrange);
            doc.rect(15, yPosition, 180, 8, 'F');
            doc.setTextColor(...white);
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text('DÉFAUTS IDENTIFIÉS', 20, yPosition + 5.5);

            yPosition += 15;

            if (this.defauts.length === 0) {
                doc.setFontSize(10);
                doc.setFont('helvetica', 'italic');
                doc.setTextColor(...lightGray);
                doc.text('Aucun défaut détecté.', 20, yPosition);
            } else {
                for (let index = 0; index < this.defauts.length; index++) {
                    const defaut = this.defauts[index];

                    if (yPosition > 250) {
                        doc.addPage();
                        yPosition = 20;
                    }

                    doc.setFontSize(11);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(...primaryColor);
                    doc.text(`${index + 1}. ${defaut.type}`, 20, yPosition);
                    yPosition += 7;

                    doc.setFontSize(9);
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(...lightGray);
                    doc.text(`Qté : ${defaut.quantite} pièces`, 20, yPosition);
                    yPosition += 5;

                    if (defaut.commentaire) {
                        const commentaireLines = doc.splitTextToSize(`Observation : ${defaut.commentaire}`, 165);
                        doc.text(commentaireLines, 20, yPosition);
                        yPosition += commentaireLines.length * 4 + 3;
                    }

                    if (defaut.photos && defaut.photos.length > 0) {
                        yPosition += 3;

                        for (let photoIndex = 0; photoIndex < defaut.photos.length; photoIndex += 2) {
                            if (yPosition > 210) {
                                doc.addPage();
                                yPosition = 20;
                            }

                            const photosInThisRow = Math.min(2, defaut.photos.length - photoIndex);

                            for (let i = 0; i < photosInThisRow; i++) {
                                const photo = defaut.photos[photoIndex + i];
                                const xPosition = 20 + (i * 85);

                                try {
                                    doc.addImage(photo.data, 'JPEG', xPosition, yPosition, 70, 70);
                                } catch (error) {
                                    console.error('Erreur image:', error);
                                }
                            }

                            yPosition += 72;
                        }
                    }

                    yPosition += 6;

                    if (index < this.defauts.length - 1) {
                        doc.setDrawColor(...veryLightGray);
                        doc.setLineWidth(0.3);
                        doc.line(20, yPosition, 190, yPosition);
                        yPosition += 6;
                    }
                }
            }

            await this.saveRapport(reportNumber, null);

            const fileName = `${reportNumber}_${ordeFabrication}_${reference}_${new Date().toISOString().split('T')[0]}.pdf`;
            doc.save(fileName);

            this.resetForm();
            this.showPdfModal(fileName);
            await this.loadRapports();

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
        document.getElementById('phase').value = '';
        document.getElementById('reference').value = '';
        document.getElementById('designation').value = '';
        document.getElementById('client').value = '';
        this.defauts = [];
        this.updateDefautsList();
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

        rapports.forEach(rapport => {
            const card = document.createElement('div');
            card.className = 'card rapport-card';

            const dateFormatted = new Date(rapport.date_controle).toLocaleDateString('fr-FR');

            let statusLabel = 'En attente';
            if (rapport.status === 'traite') statusLabel = 'Traité';
            if (rapport.status === 'resolu') statusLabel = 'Résolu';

            card.innerHTML = `
                <div class="rapport-card-content">
                    <div class="rapport-info">
                        <div class="rapport-numero">${rapport.numero}</div>
                        <div class="rapport-details"><span class="rapport-label">OF:</span> ${rapport.ordre_fabrication}</div>
                        <div class="rapport-details"><span class="rapport-label">Contrôleur:</span> ${rapport.controleur_name}</div>
                        <div class="rapport-details"><span class="rapport-label">Défauts:</span> ${rapport.defauts ? rapport.defauts.length : 0}</div>
                        <span class="rapport-status status-${rapport.status}">${statusLabel}</span>
                        <div class="rapport-date">${dateFormatted}</div>
                    </div>
                    <div class="rapport-actions">
                        <button class="btn-icon-only btn-edit-icon" onclick="app.changeRapportStatus('${rapport.id}')" title="Modifier">✎</button>
                        <button class="btn-icon-only btn-delete-icon" onclick="app.supprimerRapport('${rapport.id}')" title="Supprimer">×</button>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    }

    async changeRapportStatus(rapportId) {
        const newStatus = prompt('Nouveau statut (en_attente, traite, resolu):');

        if (!newStatus || !['en_attente', 'traite', 'resolu'].includes(newStatus)) {
            this.showNotification('Statut invalide', 'error');
            return;
        }

        const { error } = await supabaseClient
            .from('rapports')
            .update({ status: newStatus })
            .eq('id', rapportId);

        if (error) {
            this.showNotification('Erreur mise à jour', 'error');
            return;
        }

        this.showNotification('Statut mis à jour', 'success');
        await this.loadAdminRapports();
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

        // Vérifier si le username existe déjà
        const { data: existingUser, error: checkError } = await supabaseClient
            .from('profiles')
            .select('username')
            .eq('username', username)
            .single();

        if (existingUser) {
            this.showNotification('Cet identifiant existe déjà', 'error');
            return;
        }

        // Créer un email fictif basé sur le username (pour Supabase Auth)
        const email = `${username}@rapportcontrole.local`;

        const { data, error } = await supabaseClient.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                username: username,
                full_name: fullName,
                role: role
            }
        });

        if (error) {
            this.showNotification('Erreur: ' + error.message, 'error');
            return;
        }

        this.showNotification('Utilisateur créé', 'success');
        document.getElementById('addUserForm').reset();
        await this.loadUsers();
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

    // ========== UTILITAIRES ==========
    initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        if (savedTheme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
            const toggle = document.getElementById('themeToggle');
            if (toggle) toggle.textContent = '◑';
        }
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

        document.documentElement.setAttribute('data-theme', newTheme);
        document.getElementById('themeToggle').textContent = newTheme === 'dark' ? '◑' : '◐';

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
}

// ========== INITIALISATION ==========
document.addEventListener('DOMContentLoaded', () => {
    app = new RapportDeControleApp();
});

window.onclick = function(event) {
    const pdfModal = document.getElementById('pdfModal');
    const rapportModal = document.getElementById('rapportModal');

    if (event.target === pdfModal) {
        app.closePdfModal();
    }
    if (event.target === rapportModal) {
        rapportModal.style.display = 'none';
    }
};

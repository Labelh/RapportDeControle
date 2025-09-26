class RapportDeControle {
    constructor() {
        this.clients = this.loadData('clients') || ['Client A', 'Client B', 'Client C'];
        this.typesDefauts = this.loadData('typesDefauts') || ['Rayure', 'Bosselure', 'Peinture défectueuse', 'Dimension incorrecte'];
        this.defauts = [];
        this.selectedPhotos = [];
        this.editingDefautIndex = -1;

        this.init();
    }

    init() {
        this.setupNavigation();
        this.setupEventListeners();
        this.loadClients();
        this.loadTypesDefauts();
        this.initTheme();
    }

    // Navigation
    setupNavigation() {
        const navLinks = document.querySelectorAll('.nav-link');
        const pages = document.querySelectorAll('.page');

        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetPage = e.target.getAttribute('data-page');

                // Remove active class from all links and pages
                navLinks.forEach(l => l.classList.remove('active'));
                pages.forEach(p => p.classList.remove('active'));

                // Add active class to current link and page
                e.target.classList.add('active');
                document.getElementById(`page-${targetPage}`).classList.add('active');
            });
        });
    }

    // Event Listeners
    setupEventListeners() {
        // Modal
        const modal = document.getElementById('defautModal');
        const addDefautBtn = document.getElementById('addDefaut');
        const closeModal = document.querySelector('.close');
        const annulerBtn = document.getElementById('annulerDefaut');

        addDefautBtn.addEventListener('click', () => this.openDefautModal());
        closeModal.addEventListener('click', () => this.closeDefautModal());
        annulerBtn.addEventListener('click', () => this.closeDefautModal());

        // Form submission
        document.getElementById('defautForm').addEventListener('submit', (e) => this.addDefaut(e));

        // Photos
        document.getElementById('photos').addEventListener('change', (e) => this.handlePhotoSelection(e));

        // Settings
        document.getElementById('ajouterClient').addEventListener('click', () => this.ajouterClient());
        document.getElementById('ajouterTypeDefaut').addEventListener('click', () => this.ajouterTypeDefaut());

        // PDF Generation
        document.getElementById('genererPDF').addEventListener('click', () => this.genererPDF());

        // Theme Toggle
        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());

        // Enter key handlers
        document.getElementById('nouveauClient').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.ajouterClient();
        });
        document.getElementById('nouveauDefaut').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.ajouterTypeDefaut();
        });
    }

    // Data Management
    saveData(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    }

    loadData(key) {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    }

    // Clients Management
    loadClients() {
        const clientSelect = document.getElementById('client');
        const listeClients = document.getElementById('listeClients');

        // Clear existing options (except first one)
        clientSelect.innerHTML = '<option value="">Sélectionner un client</option>';
        listeClients.innerHTML = '';

        this.clients.forEach((client, index) => {
            // Add to select
            const option = document.createElement('option');
            option.value = client;
            option.textContent = client;
            clientSelect.appendChild(option);

            // Add to list with delete button
            const li = document.createElement('li');
            li.innerHTML = `
                <span>${client}</span>
                <button class="btn btn-danger" onclick="app.supprimerClient(${index})">Supprimer</button>
            `;
            listeClients.appendChild(li);
        });
    }

    ajouterClient() {
        const input = document.getElementById('nouveauClient');
        const client = input.value.trim();

        if (client && !this.clients.includes(client)) {
            this.clients.push(client);
            this.saveData('clients', this.clients);
            this.loadClients();
            input.value = '';
        }
    }

    supprimerClient(index) {
        this.clients.splice(index, 1);
        this.saveData('clients', this.clients);
        this.loadClients();
    }

    // Types de défauts Management
    loadTypesDefauts() {
        const typeDefautSelect = document.getElementById('typeDefaut');
        const listeTypesDefauts = document.getElementById('listeTypesDefauts');

        // Clear existing options (except first one)
        typeDefautSelect.innerHTML = '<option value="">Sélectionner un type</option>';
        listeTypesDefauts.innerHTML = '';

        this.typesDefauts.forEach((type, index) => {
            // Add to select
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            typeDefautSelect.appendChild(option);

            // Add to list with delete button
            const li = document.createElement('li');
            li.innerHTML = `
                <span>${type}</span>
                <button class="btn btn-danger" onclick="app.supprimerTypeDefaut(${index})">Supprimer</button>
            `;
            listeTypesDefauts.appendChild(li);
        });
    }

    ajouterTypeDefaut() {
        const input = document.getElementById('nouveauDefaut');
        const type = input.value.trim();

        if (type && !this.typesDefauts.includes(type)) {
            this.typesDefauts.push(type);
            this.saveData('typesDefauts', this.typesDefauts);
            this.loadTypesDefauts();
            input.value = '';
        }
    }

    supprimerTypeDefaut(index) {
        this.typesDefauts.splice(index, 1);
        this.saveData('typesDefauts', this.typesDefauts);
        this.loadTypesDefauts();
    }

    // Theme Management
    initTheme() {
        const savedTheme = this.loadData('theme') || 'light';
        if (savedTheme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
            document.getElementById('themeToggle').textContent = '◑';
        } else {
            document.getElementById('themeToggle').textContent = '◐';
        }
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

        document.documentElement.setAttribute('data-theme', newTheme);
        document.getElementById('themeToggle').textContent = newTheme === 'dark' ? '◑' : '◐';

        this.saveData('theme', newTheme);
    }

    // Modal Management
    openDefautModal(editIndex = -1) {
        this.editingDefautIndex = editIndex;
        const modal = document.getElementById('defautModal');
        const modalTitle = modal.querySelector('h2');

        if (editIndex >= 0) {
            // Mode édition
            modalTitle.textContent = 'Modifier le Défaut';
            const defaut = this.defauts[editIndex];
            document.getElementById('typeDefaut').value = defaut.type;
            document.getElementById('quantite').value = defaut.quantite;
            document.getElementById('commentaire').value = defaut.commentaire;
            this.selectedPhotos = [...defaut.photos];
            document.querySelector('.form-actions button[type="submit"]').textContent = 'Modifier';
        } else {
            // Mode ajout
            modalTitle.textContent = 'Ajouter un Défaut';
            document.getElementById('defautForm').reset();
            this.selectedPhotos = [];
            document.querySelector('.form-actions button[type="submit"]').textContent = 'Ajouter';
        }

        modal.style.display = 'block';
        this.updatePhotosPreview();
    }

    closeDefautModal() {
        document.getElementById('defautModal').style.display = 'none';
        document.getElementById('defautForm').reset();
        this.selectedPhotos = [];
        this.editingDefautIndex = -1;
        this.updatePhotosPreview();
    }

    // Photos Management
    handlePhotoSelection(e) {
        const files = Array.from(e.target.files);
        files.forEach(file => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    this.selectedPhotos.push({
                        name: file.name,
                        data: event.target.result
                    });
                    this.updatePhotosPreview();
                };
                reader.readAsDataURL(file);
            }
        });
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

    // Défauts Management
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
                // Mode édition
                this.defauts[this.editingDefautIndex] = defaut;
            } else {
                // Mode ajout
                this.defauts.push(defaut);
            }

            this.updateDefautsList();
            this.closeDefautModal();
        }
    }

    updateDefautsList() {
        const liste = document.getElementById('defautsList');
        liste.innerHTML = '';

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
                        <button class="btn btn-edit" onclick="app.openDefautModal(${index})">Modifier</button>
                        <button class="btn btn-danger" onclick="app.supprimerDefaut(${index})">Supprimer</button>
                    </div>
                </div>
                <div class="defaut-details">
                    Quantité: ${defaut.quantite} pièces
                    ${defaut.commentaire ? `<br>Commentaire: ${defaut.commentaire}` : ''}
                </div>
                ${photosHtml}
            `;

            liste.appendChild(div);
        });
    }

    supprimerDefaut(index) {
        this.defauts.splice(index, 1);
        this.updateDefautsList();
    }

    // PDF Generation
    async genererPDF() {
        const ordeFabrication = document.getElementById('ordeFabrication').value;
        const reference = document.getElementById('reference').value;
        const client = document.getElementById('client').value;

        if (!ordeFabrication || !reference || !client) {
            alert('Veuillez remplir tous les champs obligatoires (Ordre de Fabrication, Référence, Client)');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Colors
        const primaryColor = [45, 52, 54]; // #2d3436
        const accentColor = [225, 112, 85]; // #e17055

        // En-tête avec style
        doc.setFillColor(...accentColor);
        doc.rect(0, 0, 210, 35, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text('RAPPORT DE CONTRÔLE', 105, 22, { align: 'center' });

        // Reset text color
        doc.setTextColor(...primaryColor);

        // Section informations générales avec encadré
        doc.setFillColor(248, 249, 250);
        doc.rect(15, 45, 180, 35, 'F');
        doc.setDrawColor(...primaryColor);
        doc.setLineWidth(0.5);
        doc.rect(15, 45, 180, 35, 'S');

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('INFORMATIONS GÉNÉRALES', 20, 55);

        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        const currentDate = new Date();
        doc.text(`Ordre de Fabrication: ${ordeFabrication}`, 20, 65);
        doc.text(`Référence: ${reference}`, 20, 70);
        doc.text(`Client: ${client}`, 20, 75);
        doc.text(`Date: ${currentDate.toLocaleDateString('fr-FR')} à ${currentDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`, 125, 65);

        // Section défauts
        let yPosition = 95;

        // Header défauts avec style
        doc.setFillColor(...accentColor);
        doc.rect(15, yPosition - 5, 180, 12, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('DÉFAUTS DÉTECTÉS', 20, yPosition + 3);

        doc.setTextColor(...primaryColor);
        yPosition += 20;

        if (this.defauts.length === 0) {
            doc.setFillColor(248, 249, 250);
            doc.rect(15, yPosition - 5, 180, 15, 'F');
            doc.setDrawColor(...primaryColor);
            doc.rect(15, yPosition - 5, 180, 15, 'S');
            doc.setFontSize(11);
            doc.setFont('helvetica', 'italic');
            doc.text('Aucun défaut détecté', 20, yPosition + 3);
        } else {
            for (let index = 0; index < this.defauts.length; index++) {
                const defaut = this.defauts[index];

                // Vérifier si on a besoin d'une nouvelle page
                if (yPosition > 240) {
                    doc.addPage();
                    yPosition = 20;
                }

                // Encadré pour chaque défaut
                const defautHeight = this.calculateDefautHeight(defaut);
                doc.setFillColor(252, 252, 252);
                doc.rect(15, yPosition - 5, 180, defautHeight, 'F');
                doc.setDrawColor(...primaryColor);
                doc.setLineWidth(0.3);
                doc.rect(15, yPosition - 5, 180, defautHeight, 'S');

                // Numéro et type du défaut
                doc.setFillColor(...accentColor);
                doc.rect(15, yPosition - 5, 25, 8, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.text(`${index + 1}`, 27.5, yPosition - 1, { align: 'center' });

                doc.setTextColor(...primaryColor);
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text(`${defaut.type}`, 45, yPosition);

                yPosition += 10;

                // Détails
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                doc.text(`Quantité: ${defaut.quantite} pièces`, 20, yPosition);
                yPosition += 8;

                if (defaut.commentaire) {
                    const commentaireLines = doc.splitTextToSize(`Commentaire: ${defaut.commentaire}`, 170);
                    doc.text(commentaireLines, 20, yPosition);
                    yPosition += commentaireLines.length * 6 + 5;
                }

                // Ajouter les photos
                if (defaut.photos.length > 0) {
                    doc.setFont('helvetica', 'bold');
                    doc.text(`Photos jointes (${defaut.photos.length}):`, 20, yPosition);
                    yPosition += 8;

                    for (let photoIndex = 0; photoIndex < defaut.photos.length; photoIndex++) {
                        const photo = defaut.photos[photoIndex];

                        // Vérifier si on a assez d'espace pour la photo
                        if (yPosition > 220) {
                            doc.addPage();
                            yPosition = 20;
                        }

                        try {
                            // Ajouter l'image avec bordure
                            const imgWidth = 50;
                            const imgHeight = 50;

                            doc.setDrawColor(...primaryColor);
                            doc.setLineWidth(0.5);
                            doc.rect(20, yPosition, imgWidth, imgHeight, 'S');

                            doc.addImage(photo.data, 'JPEG', 21, yPosition + 1, imgWidth - 2, imgHeight - 2);

                            yPosition += imgHeight + 8;
                        } catch (error) {
                            console.error('Erreur lors de l\'ajout de l\'image:', error);
                            doc.setFont('helvetica', 'italic');
                            doc.text(`[Erreur de chargement de l'image]`, 20, yPosition);
                            yPosition += 8;
                        }
                    }
                }

                yPosition += 15; // Espacement entre défauts
            }
        }

        // Sauvegarde
        const fileName = `Rapport_${ordeFabrication}_${reference}_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);

        alert(`Rapport PDF généré avec ${this.defauts.reduce((total, defaut) => total + defaut.photos.length, 0)} photos: ${fileName}`);
    }

    calculateDefautHeight(defaut) {
        let height = 25; // Base height
        if (defaut.commentaire) {
            const lines = Math.ceil(defaut.commentaire.length / 80);
            height += lines * 6 + 5;
        }
        if (defaut.photos.length > 0) {
            height += 8 + (defaut.photos.length * 58); // 50 + 8 spacing per photo
        }
        return height;
    }
}

// Initialize the application
const app = new RapportDeControle();

// Close modal when clicking outside of it
window.onclick = function(event) {
    const modal = document.getElementById('defautModal');
    if (event.target === modal) {
        app.closeDefautModal();
    }
}
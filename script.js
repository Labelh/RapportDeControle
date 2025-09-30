class RapportDeControle {
    constructor() {
        this.clients = this.loadData('clients') || ['Client A', 'Client B', 'Client C'];
        this.typesDefauts = this.loadData('typesDefauts') || ['Rayure', 'Bosselure', 'Peinture défectueuse', 'Dimension incorrecte'];
        this.defauts = [];
        this.selectedPhotos = [];
        this.editingDefautIndex = -1;
        this.rapports = this.loadData('rapports') || [];

        this.init();
    }

    init() {
        this.setupNavigation();
        this.setupEventListeners();
        this.loadClients();
        this.loadTypesDefauts();
        this.initTheme();
        this.updateDefautsList(); // Initialiser l'affichage des défauts et du bouton PDF
        this.updateRapportsList(); // Initialiser l'affichage de l'historique
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
        // Formulaire inline
        const formContainer = document.getElementById('defautFormContainer');
        const addDefautBtn = document.getElementById('addDefaut');
        const closeFormBtn = document.getElementById('closeDefautForm');
        const annulerBtn = document.getElementById('annulerDefaut');

        addDefautBtn.addEventListener('click', () => this.openDefautForm());
        closeFormBtn.addEventListener('click', () => this.closeDefautForm());
        annulerBtn.addEventListener('click', () => this.closeDefautForm());

        // Form submission
        document.getElementById('defautForm').addEventListener('submit', (e) => this.addDefaut(e));

        // Photos - Drag and Drop
        this.setupDragAndDrop();
        document.getElementById('photos').addEventListener('change', (e) => this.handlePhotoSelection(e));

        // Settings
        document.getElementById('ajouterClient').addEventListener('click', () => this.ajouterClient());
        document.getElementById('ajouterTypeDefaut').addEventListener('click', () => this.ajouterTypeDefaut());

        // PDF Generation
        document.getElementById('genererPDF').addEventListener('click', () => this.genererPDF());

        // PDF Modal
        document.getElementById('closePdfModal').addEventListener('click', () => this.closePdfModal());

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
                <button class="btn-delete" onclick="app.supprimerClient(${index})" title="Supprimer">×</button>
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
                <button class="btn-delete" onclick="app.supprimerTypeDefaut(${index})" title="Supprimer">×</button>
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

    // Formulaire inline Management
    openDefautForm(editIndex = -1) {
        this.editingDefautIndex = editIndex;
        const formContainer = document.getElementById('defautFormContainer');
        const formTitle = document.getElementById('defautFormTitle');

        if (editIndex >= 0) {
            // Mode édition
            formTitle.textContent = 'Modifier le Défaut';
            const defaut = this.defauts[editIndex];
            document.getElementById('typeDefaut').value = defaut.type;
            document.getElementById('quantite').value = defaut.quantite;
            document.getElementById('commentaire').value = defaut.commentaire;
            this.selectedPhotos = [...defaut.photos];
            document.querySelector('.form-actions button[type="submit"]').textContent = 'Modifier';
        } else {
            // Mode ajout
            formTitle.textContent = 'Ajouter un Défaut';
            document.getElementById('defautForm').reset();
            this.selectedPhotos = [];
            document.querySelector('.form-actions button[type="submit"]').textContent = 'Ajouter';
        }

        formContainer.style.display = 'block';
        this.updatePhotosPreview();

        // Scroll vers le formulaire
        formContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    closeDefautForm() {
        document.getElementById('defautFormContainer').style.display = 'none';
        document.getElementById('defautForm').reset();
        this.selectedPhotos = [];
        this.editingDefautIndex = -1;
        this.updatePhotosPreview();
    }

    // Drag and Drop Setup
    setupDragAndDrop() {
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('photos');

        // Click to select files
        dropZone.addEventListener('click', () => {
            fileInput.click();
        });

        // Drag events
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

    // Photos Management
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
            // Calculer les nouvelles dimensions (max 800px pour la plus grande dimension)
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

            // Dessiner l'image redimensionnée
            ctx.drawImage(img, 0, 0, width, height);

            // Convertir en base64 avec compression (qualité 0.7)
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
            this.closeDefautForm();
        }
    }

    updateDefautsList() {
        const liste = document.getElementById('defautsList');
        const defautsHeader = document.querySelector('.defauts-header');
        const defautsCard = defautsHeader.nextElementSibling.nextElementSibling; // Skip form container

        liste.innerHTML = '';

        // Masquer ou afficher la section des défauts selon s'il y en a
        // Le header (avec le bouton Ajouter) reste toujours visible
        defautsHeader.style.display = 'flex';

        const defautsTitle = document.getElementById('defautsTitle');

        if (this.defauts.length === 0) {
            defautsCard.style.display = 'none';
            defautsTitle.style.display = 'none';
        } else {
            defautsCard.style.display = 'block';
            defautsTitle.style.display = 'block';
        }

        // Vérifier s'il y a des photos et masquer/afficher le bouton générer PDF
        this.updateGeneratePdfButton();

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

    // Générer un numéro de rapport unique
    generateReportNumber() {
        const lastReport = this.rapports.length > 0 ? this.rapports[this.rapports.length - 1] : null;
        const lastNumber = lastReport ? parseInt(lastReport.numero.replace('RC', '')) : 0;
        const newNumber = String(lastNumber + 1).padStart(4, '0');
        return newNumber;
    }

    // Sauvegarder un rapport dans l'historique
    saveRapportToHistory(reportNumber, ordeFabrication, reference, client, defauts, pdfData) {
        const rapport = {
            numero: `RC${reportNumber}`,
            ordeFabrication: ordeFabrication,
            reference: reference,
            client: client,
            date: new Date().toISOString(),
            dateFormatted: new Date().toLocaleDateString('fr-FR'),
            defauts: defauts,
            pdfData: pdfData // Stocker les données du PDF pour re-téléchargement
        };

        this.rapports.push(rapport);
        this.saveData('rapports', this.rapports);
        this.updateRapportsList();
    }

    // Mettre à jour la liste des rapports
    updateRapportsList() {
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

        // Afficher les rapports du plus récent au plus ancien
        this.rapports.slice().reverse().forEach((rapport, reverseIndex) => {
            const index = this.rapports.length - 1 - reverseIndex;
            const card = document.createElement('div');
            card.className = 'card rapport-card';
            card.innerHTML = `
                <div class="rapport-card-content">
                    <div class="rapport-info">
                        <div class="rapport-numero">${rapport.numero}</div>
                        <div class="rapport-details">
                            <span class="rapport-label">Ordre de fabrication:</span> ${rapport.ordeFabrication}
                        </div>
                        <div class="rapport-details">
                            <span class="rapport-label">Client:</span> ${rapport.client}
                        </div>
                        <div class="rapport-date">${rapport.dateFormatted}</div>
                    </div>
                    <div class="rapport-actions">
                        <button class="btn-icon-only btn-download" onclick="app.telechargerRapport(${index})" title="Télécharger">
                            ⬇
                        </button>
                        <button class="btn-icon-only btn-delete-icon" onclick="app.supprimerRapport(${index})" title="Supprimer">
                            ×
                        </button>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    }

    // Télécharger un rapport existant
    telechargerRapport(index) {
        const rapport = this.rapports[index];
        if (!rapport || !rapport.pdfData) {
            alert('Erreur : rapport introuvable');
            return;
        }

        // Convertir le data URI en blob et télécharger
        const link = document.createElement('a');
        link.href = rapport.pdfData;
        link.download = `${rapport.numero}_${rapport.ordeFabrication}_${rapport.reference}.pdf`;
        link.click();
    }

    // Supprimer un rapport
    supprimerRapport(index) {
        if (confirm('Êtes-vous sûr de vouloir supprimer ce rapport ?')) {
            this.rapports.splice(index, 1);
            this.saveData('rapports', this.rapports);
            this.updateRapportsList();
        }
    }

    // Ajouter le pied de page à une page spécifique
    addFooterToPage(doc, pageNumber, totalPages, terracottaOrange, lightGray, primaryColor) {
        // Ligne de séparation
        doc.setDrawColor(...lightGray);
        doc.setLineWidth(0.3);
        doc.line(15, 282, 195, 282);

        // Référence du document à gauche
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...terracottaOrange);
        doc.text('FOR-AJ-001', 15, 287);

        // Copyright au centre
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...lightGray);
        doc.text('© 2025 Ajust\'82 - Tous droits réservés', 105, 287, { align: 'center' });

        // Numéro de page à droite
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...primaryColor);
        doc.text(`Page ${pageNumber} / ${totalPages}`, 195, 287, { align: 'right' });
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
        const primaryColor = [52, 58, 64];
        const lightGray = [108, 117, 125];
        const veryLightGray = [248, 249, 250];
        const terracottaOrange = [161, 58, 32]; // Couleur orange terracotta
        const white = [255, 255, 255];

        // Charger le logo
        try {
            const logoImg = new Image();
            logoImg.src = 'Logo-Ajust.png';

            await new Promise((resolve, reject) => {
                logoImg.onload = () => {
                    try {
                        // Logo en haut à gauche (30mm de largeur)
                        doc.addImage(logoImg, 'PNG', 15, 10, 40, 15);
                        resolve();
                    } catch (error) {
                        console.error('Erreur lors de l\'ajout du logo:', error);
                        resolve(); // Continue même si le logo échoue
                    }
                };
                logoImg.onerror = () => {
                    console.error('Erreur de chargement du logo');
                    resolve(); // Continue même si le logo échoue
                };
            });
        } catch (error) {
            console.error('Erreur avec le logo:', error);
        }

        // Générer le numéro de rapport
        const reportNumber = this.generateReportNumber();

        // Titre à gauche sous le logo
        doc.setTextColor(...primaryColor);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('RAPPORT DE CONTRÔLE', 15, 18);
        doc.text('QUALITÉ À RÉCEPTION', 15, 25);

        // Numéro de rapport à droite
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...terracottaOrange);
        doc.text(`RC N°${reportNumber}`, 195, 18, { align: 'right' });

        // Générer le code-barres
        try {
            const canvas = document.createElement('canvas');
            JsBarcode(canvas, reportNumber, {
                format: "CODE128",
                width: 1.5,
                height: 30,
                displayValue: false,
                margin: 0
            });
            const barcodeImg = canvas.toDataURL('image/png');
            doc.addImage(barcodeImg, 'PNG', 165, 21, 30, 8);
        } catch (error) {
            console.error('Erreur lors de la génération du code-barres:', error);
        }

        // Section informations générales avec bande orange
        let yPosition = 33;

        // Bande orange pour le titre
        doc.setFillColor(...terracottaOrange);
        doc.rect(15, yPosition, 180, 8, 'F');

        doc.setTextColor(...white);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('INFORMATIONS GÉNÉRALES', 20, yPosition + 5.5);

        yPosition += 10;

        // Tableau des informations générales
        const currentDate = new Date();
        const tableData = [
            ['Ordre de fabrication', ordeFabrication],
            ['Référence', reference],
            ['Client', client],
            ['Date du contrôle', currentDate.toLocaleDateString('fr-FR')],
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

            // Alternance de couleur de fond
            if (index % 2 === 0) {
                doc.setFillColor(250, 250, 250);
                doc.rect(15, rowY, col1Width + col2Width, cellHeight, 'F');
            }

            // Bordures
            doc.setDrawColor(...veryLightGray);
            doc.setLineWidth(0.1);
            doc.rect(15, rowY, col1Width, cellHeight, 'S');
            doc.rect(15 + col1Width, rowY, col2Width, cellHeight, 'S');

            // Texte colonne 1 (label) en gras
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...lightGray);
            doc.text(row[0], 18, rowY + 4.5);

            // Texte colonne 2 (valeur)
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...primaryColor);
            doc.text(row[1], 18 + col1Width, rowY + 4.5);
        });

        // Section défauts
        yPosition += (tableData.length * cellHeight) + 15;

        // Bande orange pour le titre des défauts
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
            doc.text('Aucun défaut détecté lors du contrôle.', 20, yPosition);
        } else {
            for (let index = 0; index < this.defauts.length; index++) {
                const defaut = this.defauts[index];

                // Calculer la hauteur nécessaire pour ce défaut
                const defautStartY = yPosition;
                let estimatedHeight = 8 + 6; // Titre + quantité

                if (defaut.commentaire) {
                    const commentaireLines = doc.splitTextToSize(`Observation : ${defaut.commentaire}`, 165);
                    estimatedHeight += commentaireLines.length * 5 + 5;
                }

                if (defaut.photos.length > 0) {
                    estimatedHeight += 5 + (Math.ceil(defaut.photos.length / 2) * 75);
                }

                estimatedHeight += 10; // Espacement après le défaut

                // Si pas assez de place, passer à la page suivante
                if (yPosition + estimatedHeight > 270 && yPosition > 100) {
                    doc.addPage();
                    yPosition = 20;
                }

                // Numéro du défaut
                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(...primaryColor);
                doc.text(`${index + 1}. ${defaut.type}`, 20, yPosition);

                yPosition += 7;

                // Détails
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

                // Ajouter les photos avec format d'origine (maximum 2 par ligne)
                if (defaut.photos.length > 0) {
                    yPosition += 3;

                    for (let photoIndex = 0; photoIndex < defaut.photos.length; photoIndex += 2) {
                        // Vérifier si on a assez d'espace pour les photos
                        if (yPosition > 210) {
                            doc.addPage();
                            yPosition = 20;
                        }

                        const photosInThisRow = Math.min(2, defaut.photos.length - photoIndex);

                        for (let i = 0; i < photosInThisRow; i++) {
                            const photo = defaut.photos[photoIndex + i];

                            // Créer une image temporaire pour obtenir les dimensions
                            const img = new Image();
                            img.src = photo.data;

                            await new Promise((resolve) => {
                                img.onload = () => {
                                    try {
                                        // Calculer les dimensions en préservant le ratio
                                        const maxWidth = 70;
                                        const maxHeight = 70;
                                        let imgWidth = img.width;
                                        let imgHeight = img.height;

                                        // Redimensionner si nécessaire tout en conservant le ratio
                                        const ratio = Math.min(maxWidth / imgWidth, maxHeight / imgHeight);
                                        if (ratio < 1) {
                                            imgWidth *= ratio;
                                            imgHeight *= ratio;
                                        }

                                        const xPosition = 20 + (i * 85);

                                        // Bordure simple
                                        doc.setDrawColor(...lightGray);
                                        doc.setLineWidth(0.2);
                                        doc.rect(xPosition, yPosition, imgWidth, imgHeight, 'S');

                                        doc.addImage(photo.data, 'JPEG', xPosition, yPosition, imgWidth, imgHeight);
                                        resolve();
                                    } catch (error) {
                                        console.error('Erreur lors de l\'ajout de l\'image:', error);
                                        doc.setFont('helvetica', 'italic');
                                        doc.setFontSize(8);
                                        doc.setTextColor(...lightGray);
                                        doc.text(`[Image non disponible]`, 20 + (i * 85), yPosition + 10);
                                        resolve();
                                    }
                                };
                                img.onerror = () => {
                                    console.error('Erreur de chargement de l\'image');
                                    resolve();
                                };
                            });
                        }

                        yPosition += 72;
                    }
                }

                yPosition += 6; // Espacement entre défauts

                // Ligne de séparation entre défauts
                if (index < this.defauts.length - 1) {
                    doc.setDrawColor(...veryLightGray);
                    doc.setLineWidth(0.3);
                    doc.line(20, yPosition, 190, yPosition);
                    yPosition += 6;
                }
            }
        }

        // Ajouter les pieds de page à toutes les pages
        const totalPages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            this.addFooterToPage(doc, i, totalPages, terracottaOrange, lightGray, primaryColor);
        }

        // Convertir le PDF en base64 pour le stocker
        const pdfData = doc.output('datauristring');

        // Sauvegarder dans l'historique
        this.saveRapportToHistory(reportNumber, ordeFabrication, reference, client, this.defauts, pdfData);

        // Sauvegarde
        const fileName = `RC${reportNumber}_${ordeFabrication}_${reference}_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);

        // Remettre à zéro le formulaire
        this.resetForm();

        // Afficher le popup de confirmation
        this.showPdfModal(fileName);
    }

    resetForm() {
        // Remettre à zéro tous les champs du formulaire principal
        document.getElementById('ordeFabrication').value = '';
        document.getElementById('reference').value = '';
        document.getElementById('client').value = '';

        // Vider la liste des défauts
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

    updateGeneratePdfButton() {
        const generateBtn = document.getElementById('genererPDF');
        const hasPhotos = this.defauts.some(defaut => defaut.photos && defaut.photos.length > 0);

        if (hasPhotos) {
            generateBtn.style.display = 'inline-block';
        } else {
            generateBtn.style.display = 'none';
        }
    }
}

// Initialize the application
const app = new RapportDeControle();

// Close modal when clicking outside of it
window.onclick = function(event) {
    const pdfModal = document.getElementById('pdfModal');

    if (event.target === pdfModal) {
        app.closePdfModal();
    }
}
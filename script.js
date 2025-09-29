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
        this.loadFromURL(); // Charger les paramètres depuis l'URL si présents
        this.loadClients();
        this.loadTypesDefauts();
        this.initTheme();
        this.updateDefautsList(); // Initialiser l'affichage des défauts et du bouton PDF
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

        // Photos - Drag and Drop
        this.setupDragAndDrop();
        document.getElementById('photos').addEventListener('change', (e) => this.handlePhotoSelection(e));

        // Settings
        document.getElementById('ajouterClient').addEventListener('click', () => this.ajouterClient());
        document.getElementById('ajouterTypeDefaut').addEventListener('click', () => this.ajouterTypeDefaut());
        document.getElementById('genererLien').addEventListener('click', () => this.generateShareableURL());

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

        // URL sharing handlers
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                this.generateShareableURL();
            }
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

    // URL sharing functionality
    generateShareableURL() {
        const settings = {
            clients: this.clients,
            typesDefauts: this.typesDefauts,
            theme: this.loadData('theme') || 'light'
        };

        try {
            const encodedSettings = btoa(JSON.stringify(settings));
            const shareableURL = `${window.location.origin}${window.location.pathname}?settings=${encodedSettings}`;

            // Copier dans le presse-papiers
            navigator.clipboard.writeText(shareableURL).then(() => {
                this.showNotification('Lien copié dans le presse-papiers ! Partagez-le pour sauvegarder vos paramètres.', 'success');
            }).catch(() => {
                // Fallback si clipboard API n'est pas disponible
                this.showURLModal(shareableURL);
            });
        } catch (error) {
            console.error('Erreur lors de la génération du lien:', error);
            this.showNotification('Erreur lors de la génération du lien de partage.', 'error');
        }
    }

    loadFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const settingsParam = urlParams.get('settings');

        if (settingsParam) {
            try {
                const settings = JSON.parse(atob(settingsParam));

                // Charger les clients
                if (settings.clients && Array.isArray(settings.clients)) {
                    this.clients = settings.clients;
                    this.saveData('clients', this.clients);
                }

                // Charger les types de défauts
                if (settings.typesDefauts && Array.isArray(settings.typesDefauts)) {
                    this.typesDefauts = settings.typesDefauts;
                    this.saveData('typesDefauts', this.typesDefauts);
                }

                // Charger le thème
                if (settings.theme) {
                    this.saveData('theme', settings.theme);
                }

                this.showNotification('Paramètres chargés depuis le lien !', 'success');
            } catch (error) {
                console.error('Erreur lors du chargement des paramètres depuis l\'URL:', error);
                this.showNotification('Erreur lors du chargement des paramètres depuis l\'URL.', 'error');
            }
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;

        document.body.appendChild(notification);

        // Afficher la notification
        setTimeout(() => notification.classList.add('show'), 100);

        // Masquer après 3 secondes
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => document.body.removeChild(notification), 300);
        }, 3000);
    }

    showURLModal(url) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close" onclick="this.parentElement.parentElement.remove()">&times;</span>
                <h2>Lien de partage généré</h2>
                <p>Copiez ce lien pour sauvegarder vos paramètres :</p>
                <textarea readonly style="width: 100%; height: 60px; margin: 10px 0;">${url}</textarea>
                <button class="btn btn-primary" onclick="navigator.clipboard.writeText('${url}').then(() => this.textContent = 'Copié !').catch(() => {}); setTimeout(() => this.parentElement.parentElement.remove(), 1000);">Copier</button>
            </div>
        `;
        document.body.appendChild(modal);
        modal.style.display = 'block';
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
            this.closeDefautModal();
        }
    }

    updateDefautsList() {
        const liste = document.getElementById('defautsList');
        const defautsHeader = document.querySelector('.defauts-header');
        const defautsCard = defautsHeader.nextElementSibling;

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

        // Colors - Style sobre et professionnel
        const primaryColor = [52, 58, 64]; // Gris foncé
        const lightGray = [108, 117, 125]; // Gris moyen
        const veryLightGray = [248, 249, 250]; // Gris très clair

        // En-tête simple et épuré
        doc.setTextColor(...primaryColor);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('RAPPORT DE CONTRÔLE QUALITÉ', 105, 25, { align: 'center' });


        // Section informations générales
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...primaryColor);
        doc.text('Informations générales', 20, 40);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...lightGray);
        const currentDate = new Date();

        doc.text(`Ordre de fabrication : ${ordeFabrication}`, 20, 50);
        doc.text(`Référence : ${reference}`, 20, 57);
        doc.text(`Client : ${client}`, 20, 64);
        doc.text(`Date du contrôle : ${currentDate.toLocaleDateString('fr-FR')}`, 20, 71);
        doc.text(`Heure : ${currentDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`, 20, 78);

        // Section défauts
        let yPosition = 90;

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...primaryColor);
        doc.text('Défauts identifiés', 20, yPosition);

        yPosition += 10;

        if (this.defauts.length === 0) {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'italic');
            doc.setTextColor(...lightGray);
            doc.text('Aucun défaut détecté lors du contrôle.', 20, yPosition);
        } else {
            for (let index = 0; index < this.defauts.length; index++) {
                const defaut = this.defauts[index];

                // Vérifier si on a besoin d'une nouvelle page
                if (yPosition > 230) {
                    doc.addPage();
                    yPosition = 20;
                }

                // Numéro du défaut
                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(...primaryColor);
                doc.text(`${index + 1}. ${defaut.type}`, 20, yPosition);

                yPosition += 8;

                // Détails
                doc.setFontSize(9);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(...lightGray);
                doc.text(`Qté : ${defaut.quantite} pièces`, 20, yPosition);
                yPosition += 6;

                if (defaut.commentaire) {
                    const commentaireLines = doc.splitTextToSize(`Observation : ${defaut.commentaire}`, 165);
                    doc.text(commentaireLines, 20, yPosition);
                    yPosition += commentaireLines.length * 5 + 5;
                }

                // Ajouter les photos avec format d'origine (maximum 2 par ligne)
                if (defaut.photos.length > 0) {
                    yPosition += 5;

                    for (let photoIndex = 0; photoIndex < defaut.photos.length; photoIndex += 2) {
                        // Vérifier si on a assez d'espace pour les photos
                        if (yPosition > 200) {
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

                        yPosition += 75;
                    }
                }

                yPosition += 10; // Espacement entre défauts

                // Ligne de séparation entre défauts
                if (index < this.defauts.length - 1) {
                    doc.setDrawColor(...veryLightGray);
                    doc.setLineWidth(0.3);
                    doc.line(20, yPosition, 190, yPosition);
                    yPosition += 8;
                }
            }
        }

        // Sauvegarde
        const fileName = `Rapport_${ordeFabrication}_${reference}_${new Date().toISOString().split('T')[0]}.pdf`;
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
    const defautModal = document.getElementById('defautModal');
    const pdfModal = document.getElementById('pdfModal');

    if (event.target === defautModal) {
        app.closeDefautModal();
    }
    if (event.target === pdfModal) {
        app.closePdfModal();
    }
}
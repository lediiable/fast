class RegionManager {
    constructor(scene, mapManager) {
        this.scene = scene;
        this.mapManager = mapManager;
        this.regionsLayer = this.mapManager.regionsLayer; // Ajoutez cette ligne

        // Utiliser les données de régions définies dans gameData
        this.regions = gameData.regions;
        this.gridPositions = gameData.gridPositions;

        // Stockage des sprites pour chaque région
        this.regionSprites = [];

        // Gestion des événements de clic sur les régions
        this.events = new Phaser.Events.EventEmitter();
    }

    init() {
        // Initialiser les régions sur la carte
        this.setupRegions();

        // Ajouter des écouteurs pour les événements
        this.setupEventListeners();

    }

    setupRegions() {
        // Ajouter les indicateurs visuels pour toutes les régions
        this.createRegionMarkers();
    }

    createRegionMarkers() {
        // Taille d'une cellule en pixels
        const cellSize = this.mapManager.config.cellSize;

        // Pour chaque région dans la grille
        for (let regionY = 0; regionY < gameData.map.height; regionY++) {
            for (let regionX = 0; regionX < gameData.map.width; regionX++) {
                const regionId = this.gridPositions[regionY][regionX];
                const region = this.regions.find(r => r.id === regionId);

                if (!region) continue;

                // Calculer le centre de la région
                const regionCellSize = gameData.map.cellSize;
                const regionCenterCellX = regionX * regionCellSize + regionCellSize / 2;
                const regionCenterCellY = regionY * regionCellSize + regionCellSize / 2;

                // Convertir en coordonnées isométriques
                let tileX, tileY;
                if (this.mapManager.config.isIsometric) {
                    tileX = (regionCenterCellX - regionCenterCellY) * cellSize / 2;
                    tileY = (regionCenterCellX + regionCenterCellY) * cellSize / 4;
                } else {
                    tileX = regionCenterCellX * cellSize;
                    tileY = regionCenterCellY * cellSize;
                }

                // Ignorer les régions déjà débloquées
                if (region.unlocked) {
                    continue;
                }

                // Pour TOUTES les régions non débloquées, ajouter un overlay sombre
                this.createNonPurchasableRegionMarker(region, regionX, regionY, tileX, tileY);

                // ENSUITE, pour les régions achetables uniquement, ajouter le panneau "à vendre"
                if (region.purchasable) {
                    this.createPurchasableRegionMarker(region, tileX, tileY);
                }
            }
        }
    }
    createPurchasableRegionMarker(region, x, y) {
        // Créer un conteneur pour le panneau et le texte
        const container = this.scene.add.container(x, y);

        // Ajouter l'image "forsale"
        const forSaleImg = this.scene.add.image(0, 0, 'forsale');
        forSaleImg.setDisplaySize(120, 120);
        container.add(forSaleImg);

        // Ajouter un texte pour indiquer le coût
        const costText = this.scene.add.text(0, 50, `${region.cost} ${region.currency}`, {
            fontSize: '16px',
            color: '#ffffff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4
        });
        costText.setOrigin(0.5, 0.5);
        container.add(costText);

        // Rendre le conteneur interactif
        container.setInteractive(new Phaser.Geom.Rectangle(-60, -60, 120, 120), Phaser.Geom.Rectangle.Contains);
        container.on('pointerdown', () => {
            this.onRegionClicked(region);
        });

        // Ajouter au layer des régions
        this.regionsLayer.add(container);

        // Stocker une référence pour pouvoir le supprimer plus tard
        this.regionSprites[region.id] = container;
    }

// Méthode pour créer un marqueur pour les régions non achetables
    createNonPurchasableRegionMarker(region, regionX, regionY, centerX, centerY) {
        const cellSize = this.mapManager.config.cellSize;
        const regionCellSize = gameData.map.cellSize;

        // Calculer la taille d'une région en pixels
        let regionWidthPixels, regionHeightPixels;

        if (this.mapManager.config.isIsometric) {
            // En mode isométrique, la largeur d'une région est 2x sa hauteur
            regionWidthPixels = regionCellSize * cellSize;
            regionHeightPixels = regionCellSize * cellSize / 2;
        } else {
            regionWidthPixels = regionCellSize * cellSize;
            regionHeightPixels = regionCellSize * cellSize;
        }

        // Créer un graphique pour la région verrouillée
        const lockedGraphics = this.scene.add.graphics();

        // Remplir avec un noir semi-transparent
        lockedGraphics.fillStyle(0x000000, 0.5);

        if (this.mapManager.config.isIsometric) {
            // En isométrique, dessiner un losange (diamant)
            lockedGraphics.beginPath();
            lockedGraphics.moveTo(0, -regionHeightPixels/2);
            lockedGraphics.lineTo(regionWidthPixels/2, 0);
            lockedGraphics.lineTo(0, regionHeightPixels/2);
            lockedGraphics.lineTo(-regionWidthPixels/2, 0);
            lockedGraphics.closePath();
            lockedGraphics.fillPath();
        } else {
            // En cartésien, dessiner un rectangle
            lockedGraphics.fillRect(
                -regionWidthPixels/2,
                -regionHeightPixels/2,
                regionWidthPixels,
                regionHeightPixels
            );
        }

        // Positionner le graphique au centre de la région
        lockedGraphics.x = centerX;
        lockedGraphics.y = centerY;

        // IMPORTANT: Stocker l'ID de la région dans les données du graphique
        lockedGraphics.setData('regionId', region.id);

        // Ajouter au layer des régions
        this.regionsLayer.add(lockedGraphics);

        // Stocker une référence au graphique pour cette région
        // Si régionSprites[region.id] n'existe pas, l'initialiser comme un tableau
        if (!this.regionSprites[region.id]) {
            this.regionSprites[region.id] = [];
        }

        // Ajouter ce graphique à la collection pour cette région
        this.regionSprites[region.id].push(lockedGraphics);
    }

    findRegionGridPosition(regionId) {
        // Parcourir la grille pour trouver les coordonnées de la région
        for (let y = 0; y < this.gridPositions.length; y++) {
            for (let x = 0; x < this.gridPositions[y].length; x++) {
                if (this.gridPositions[y][x] === regionId) {
                    return { x, y };
                }
            }
        }
        return null;
    }

    addRegionCostIndicator(region, container, x, y) {
        // Créer un fond pour l'indicateur de coût
        const bgSize = 120;
        const bg = this.scene.add.graphics();
        bg.fillStyle(0x000000, 0.8);
        bg.fillRoundedRect(x - bgSize/2, y - bgSize/2, bgSize, bgSize, 16);
        container.add(bg);

        // Afficher le coût de la région
        const costText = this.scene.add.text(x, y - 20,
            `Débloquer: ${region.cost}`, {
                fontFamily: 'Arial',
                fontSize: '16px',
                color: '#ffffff',
                align: 'center'
            });
        costText.setOrigin(0.5);
        container.add(costText);

        // Afficher l'icône de la monnaie requise
        const currencyIcon = this.scene.add.image(x, y + 20, `${region.currency}-icon`);
        currencyIcon.setDisplaySize(32, 32);
        currencyIcon.setOrigin(0.5);
        container.add(currencyIcon);
    }

    setupEventListeners() {
        // Ajouter des écouteurs pour les événements liés aux régions
        this.events.on('regionUnlocked', this.onRegionUnlocked, this);
    }

    onRegionClicked(region) {
        console.log(`Région ${region.id} cliquée. Coût: ${region.cost} ${region.currency}`);

        // Vérifier si le joueur a assez de ressources
        if (gameData.resources[region.currency] >= region.cost) {
            // Tenter de débloquer la région
            this.unlockRegion(region);
        } else {
            // Afficher un message indiquant que le joueur n'a pas assez de ressources
            console.log(`Pas assez de ${region.currency} pour débloquer cette région!`);

            // On pourrait ajouter une animation ou un son ici
        }
    }

    unlockRegion(region) {
        // Déduire le coût des ressources du joueur
        gameData.resources[region.currency] -= region.cost;

        // Marquer la région comme débloquée
        region.unlocked = true;
        gameData.map.unlockedRegions.push(region.id);

        // Émettre un événement pour indiquer que la région a été débloquée
        this.events.emit('regionUnlocked', region.id);

        // Solution améliorée: Supprimer tous les éléments visuels liés à cette région
        if (this.regionSprites[region.id]) {
            // Si c'est un tableau, parcourir et détruire chaque élément
            if (Array.isArray(this.regionSprites[region.id])) {
                this.regionSprites[region.id].forEach(sprite => {
                    if (sprite && sprite.destroy) {
                        sprite.destroy();
                    }
                });
            }
            // Si c'est un objet unique avec une méthode destroy
            else if (this.regionSprites[region.id].destroy) {
                this.regionSprites[region.id].destroy();
            }

            // Réinitialiser la référence
            this.regionSprites[region.id] = null;
        }

        // Recherche supplémentaire pour s'assurer que tous les graphiques liés à cette région sont supprimés
        this.regionsLayer.list.forEach(element => {
            // Vérifier si l'élément a une donnée regionId correspondant à notre région
            if (element.getData && element.getData('regionId') === region.id) {
                element.destroy();
            }
        });

        // Actualiser l'affichage des ressources du joueur
        if (this.scene.uiManager) {
            this.scene.uiManager.updateResourceDisplay();
        }

        return true;
    }
    onRegionUnlocked(regionId) {
        // Logique additionnelle à exécuter lorsqu'une région est débloquée
        // Par exemple, des effets spéciaux, des récompenses, etc.
    }

    isRegionUnlocked(regionId) {
        // Vérifier si une région est débloquée
        const region = this.regions.find(r => r.id === regionId);
        return region ? region.unlocked : false;
    }

    getRegionIdFromPosition(x, y) {
        // Convertir les coordonnées de grille en ID de région
        const regionSize = gameData.map.cellSize;

        // Déterminer dans quelle région se trouve cette cellule
        const regionX = Math.floor(x / regionSize);
        const regionY = Math.floor(y / regionSize);

        // Vérifier si cette position est valide dans la grille des régions
        if (regionX >= 0 && regionX < this.gridPositions[0].length &&
            regionY >= 0 && regionY < this.gridPositions.length) {
            return this.gridPositions[regionY][regionX];
        }

        return -1; // Région invalide
    }
}
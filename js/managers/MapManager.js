class MapManager {
    constructor(scene) {
        this.scene = scene;
        this.config = {
            mapSize: 100, // Taille totale de la map 100x100
            constructibleSize: 60, // Zone constructible 60x60
            startingSize: 20, // Zone débloquée au départ 20x20
            cellSize: 64, // Taille de chaque cellule en pixels
            isIsometric: true, // Vue en diamant (isométrique)
            zoomMin: 0.5,
            zoomMax: 2.0,
            zoomSpeed: 0.1
        };
        this.gridPositions = gameData.gridPositions;
        this.regions = gameData.regions;
        this.cameraControls = {
            isDragging: false,
            lastPointerPosition: { x: 0, y: 0 }
        };

        this.currentZoom = 1;
        this.map = null;
        this.buildingLayer = null;
        this.gridLayer = null;
        this.regionsLayer = null;

        // Garde en mémoire les bâtiments placés
        this.buildings = [];

        // Déterminer le centre de la map
        this.centerX = (this.config.mapSize / 2) * this.config.cellSize;
        this.centerY = (this.config.mapSize / 2) * this.config.cellSize;

        if (this.config.isIsometric) {
            // Ajuster le centre pour la vue isométrique
            this.centerY = this.centerY / 2;
        }
    }

    init() {
        // Créer les layers pour organiser les éléments
        this.createLayers();

        // Créer la map de base
        this.createMap();

        // Initialiser les contrôles de caméra
        this.setupCameraControls();

        // Centrer la caméra sur la région centrale débloquée (au lieu de centerCamera())
        this.centerOnUnlockedRegion();
    }

    createLayers() {
        // Créer les différentes couches de la map
        this.map = this.scene.add.container(0, 0);
        this.groundLayer = this.scene.add.container(0, 0);
        this.regionsLayer = this.scene.add.container(0, 0);
        this.gridLayer = this.scene.add.container(0, 0);
        this.buildingLayer = this.scene.add.container(0, 0);
        this.uiLayer = this.scene.add.container(0, 0);

        this.map.add(this.groundLayer);
        this.map.add(this.regionsLayer);
        this.map.add(this.gridLayer);
        this.map.add(this.buildingLayer);
        this.map.add(this.uiLayer);
    }

    createMap() {
        // Créer l'arrière-plan de la map
        const mapSize = this.config.mapSize;
        const cellSize = this.config.cellSize;

        // Pour la vue isométrique, créer une grille en diamant
        if (this.config.isIsometric) {
            this.createIsometricMap(mapSize, cellSize);
        } else {
            this.createCartesianMap(mapSize, cellSize);
        }

        // Marquer les régions constructibles et débloquées
        this.markRegions();
    }

    createCartesianMap(mapSize, cellSize) {
        // Créer une grille cartésienne
        for (let y = 0; y < mapSize; y++) {
            for (let x = 0; x < mapSize; x++) {
                // Créer une tuile d'herbe pour chaque cellule
                const tile = this.scene.add.image(
                    x * cellSize,
                    y * cellSize,
                    'grass'
                );
                tile.setOrigin(0, 0);
                tile.setDisplaySize(cellSize, cellSize);
                this.groundLayer.add(tile);
            }
        }
    }

// Dans MapManager.js, méthode createIsometricMap
    createIsometricMap(mapSize, cellSize) {
        for (let y = 0; y < mapSize; y++) {
            for (let x = 0; x < mapSize; x++) {
                const tileX = (x - y) * cellSize / 2;
                const tileY = (x + y) * cellSize / 4;

                // Créer une tuile carrée pour chaque cellule
                const tile = this.scene.add.image(tileX, tileY, 'grass');
                tile.setOrigin(0.5, 0.5);

                // La hauteur doit être la moitié de la largeur en projection isométrique
                tile.setDisplaySize(cellSize, cellSize/2);
                this.groundLayer.add(tile);
            }
        }
    }


    markRegions() {

    }


    centerOnUnlockedRegion() {
        // Identifier la région centrale débloquée (id 12 dans votre cas)
        const centralRegionId = 12; // Modifiez selon votre configuration

        // Calculer les coordonnées de cette région
        const regionWidth = gameData.map.cellSize;
        const regionHeight = gameData.map.cellSize;

        // Trouver les coordonnées de la région dans la grille
        let regionX = 0;
        let regionY = 0;

        for (let y = 0; y < gameData.gridPositions.length; y++) {
            for (let x = 0; x < gameData.gridPositions[y].length; x++) {
                if (gameData.gridPositions[y][x] === centralRegionId) {
                    regionX = x;
                    regionY = y;
                    break;
                }
            }
        }

        // Calculer le centre de la région en pixels
        let centerX, centerY;
        const cellSize = this.config.cellSize;

        // Coordonnées du centre de la région
        if (this.config.isIsometric) {
            // Pour une vue isométrique
            centerX = (regionX * regionWidth + regionWidth/2 - regionY * regionWidth - regionWidth/2) * cellSize / 2;
            centerY = (regionX * regionWidth + regionWidth/2 + regionY * regionWidth + regionWidth/2) * cellSize / 4;
        } else {
            // Pour une vue cartésienne
            centerX = (regionX * regionWidth + regionWidth/2) * cellSize;
            centerY = (regionY * regionHeight + regionHeight/2) * cellSize;
        }

        // Centrer la caméra sur ces coordonnées
        this.scene.cameras.main.centerOn(centerX, centerY);
    }

    setupCameraControls() {
        const scene = this.scene;
        const mainCamera = scene.cameras.main;

        // Configurer le zoom avec la molette de la souris
        scene.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
            // Mémoriser l'ancien zoom pour détecter le changement
            const oldZoom = this.currentZoom;

            // Ajuster le zoom actuel
            if (deltaY > 0) {
                this.currentZoom = Math.max(this.currentZoom - this.config.zoomSpeed, this.config.zoomMin);
            } else {
                this.currentZoom = Math.min(this.currentZoom + this.config.zoomSpeed, this.config.zoomMax);
            }

            // Appliquer le zoom à la caméra principale seulement
            mainCamera.setZoom(this.currentZoom);

            // Appliquer immédiatement les limites
            this.applyCameraBounds();
        });

        scene.input.on('pointerdown', (pointer) => {
            if (pointer.leftButtonDown()) {
                this.cameraControls.isDragging = true;
                this.cameraControls.lastPointerPosition.x = pointer.x;
                this.cameraControls.lastPointerPosition.y = pointer.y;
            }
        });

        scene.input.on('pointermove', (pointer) => {
            if (this.cameraControls.isDragging) {
                const deltaX = pointer.x - this.cameraControls.lastPointerPosition.x;
                const deltaY = pointer.y - this.cameraControls.lastPointerPosition.y;

                // Déplacer la caméra principale dans la direction opposée au mouvement de la souris
                mainCamera.scrollX -= deltaX / this.currentZoom;
                mainCamera.scrollY -= deltaY / this.currentZoom;

                // Appliquer les limites après le déplacement
                this.applyCameraBounds();

                this.cameraControls.lastPointerPosition.x = pointer.x;
                this.cameraControls.lastPointerPosition.y = pointer.y;
            }
        });

        scene.input.on('pointerup', () => {
            this.cameraControls.isDragging = false;
        });

        // Ajouter un événement de mise à jour pour constamment appliquer les limites
        this.scene.events.on('update', this.applyCameraBounds, this);
    }

// 4. Ajoutez la méthode pour limiter les déplacements de la caméra
    applyCameraBounds() {
        // Déterminer les limites de la carte
        const mapSize = this.config.mapSize;
        const cellSize = this.config.cellSize;
        const camera = this.scene.cameras.main;

        // Calculer la taille visible de la carte en fonction du zoom
        const visibleWidth = camera.width / this.currentZoom;
        const visibleHeight = camera.height / this.currentZoom;

        // Calculer les limites de la carte
        let mapWidth, mapHeight, mapLeft, mapTop;

        if (this.config.isIsometric) {
            // Pour une vue isométrique, la carte est en forme de losange
            mapWidth = mapSize * cellSize;
            mapHeight = mapSize * cellSize / 2;
            mapLeft = -mapWidth / 2;
            mapTop = 0;
        } else {
            // Pour une vue cartésienne
            mapWidth = mapSize * cellSize;
            mapHeight = mapSize * cellSize;
            mapLeft = 0;
            mapTop = 0;
        }

        // Calculer les limites de déplacement
        // Ajouter un petit buffer (20% de la taille visible) pour éviter de voir les bords
        const buffer = 0.2;
        const minX = mapLeft - visibleWidth * buffer;
        const maxX = mapLeft + mapWidth - visibleWidth * (1 - buffer);
        const minY = mapTop - visibleHeight * buffer;
        const maxY = mapTop + mapHeight - visibleHeight * (1 - buffer);

        // Appliquer les limites
        if (camera.scrollX < minX) camera.scrollX = minX;
        if (camera.scrollX > maxX) camera.scrollX = maxX;
        if (camera.scrollY < minY) camera.scrollY = minY;
        if (camera.scrollY > maxY) camera.scrollY = maxY;
    }

    // Méthode pour ajouter un bâtiment
    addBuilding(buildingType, gridX, gridY) {
        const building = gameData.buildingTypes[buildingType];
        if (!building) return null;

        // Vérifier si l'emplacement est valide (pas de superposition)
        if (!this.isValidBuildingLocation(gridX, gridY, building.size)) {
            console.log('Emplacement invalide pour le bâtiment');
            return null;
        }

        let x, y;
        if (this.config.isIsometric) {
            x = (gridX - gridY) * this.config.cellSize / 2;
            y = (gridX + gridY) * this.config.cellSize / 4;
        } else {
            x = gridX * this.config.cellSize;
            y = gridY * this.config.cellSize;
        }

        // Créer l'image du bâtiment
        const buildingImage = this.scene.add.image(x, y, buildingType);

        // Ajuster l'échelle du bâtiment selon sa taille
        const scaleFactor = building.size;
        buildingImage.setDisplaySize(
            this.config.cellSize * scaleFactor,
            this.config.isIsometric ? (this.config.cellSize/2) * scaleFactor : this.config.cellSize * scaleFactor
        );

        // Ajuster l'origine pour l'isométrique
        if (this.config.isIsometric) {
            buildingImage.setOrigin(0.5, 0.5);
        } else {
            buildingImage.setOrigin(0, 0);
        }

        // Ajouter le bâtiment à la couche des bâtiments
        this.buildingLayer.add(buildingImage);

        // Enregistrer le bâtiment dans la liste
        const newBuilding = {
            id: Date.now(), // ID unique
            type: buildingType,
            x: gridX,
            y: gridY,
            size: building.size,
            sprite: buildingImage
        };

        this.buildings.push(newBuilding);
        return newBuilding;
    }

    getRegionIdForPosition(gridX, gridY) {
        const regionSize = gameData.map.cellSize;
        const regionX = Math.floor(gridX / regionSize);
        const regionY = Math.floor(gridY / regionSize);

        // Vérifier si les coordonnées sont dans les limites
        if (regionX >= 0 && regionX < gameData.map.width &&
            regionY >= 0 && regionY < gameData.map.height) {
            return gameData.gridPositions[regionY][regionX];
        }

        return -1; // Hors limites
    }

    isRegionUnlocked(regionId) {
        const region = gameData.regions.find(r => r.id === regionId);
        return region && region.unlocked;
    }

    isValidBuildingLocation(gridX, gridY, size) {
        console.log(`Vérification de validité pour emplacement (${gridX}, ${gridY}) avec taille ${size}`);

        // Vérifier si l'emplacement est dans une région débloquée
        const regionId = this.getRegionIdForPosition(gridX, gridY);

        if (regionId === -1 || !this.isRegionUnlocked(regionId)) {
            console.log(`Position (${gridX}, ${gridY}) n'est pas dans une région débloquée`);
            return false;
        }

        // Pour les bâtiments de taille > 1, vérifier que tous les coins sont dans des régions débloquées
        if (size > 1) {
            const corner1 = this.getRegionIdForPosition(gridX + size - 1, gridY);
            const corner2 = this.getRegionIdForPosition(gridX, gridY + size - 1);
            const corner3 = this.getRegionIdForPosition(gridX + size - 1, gridY + size - 1);

            if (corner1 === -1 || !this.isRegionUnlocked(corner1) ||
                corner2 === -1 || !this.isRegionUnlocked(corner2) ||
                corner3 === -1 || !this.isRegionUnlocked(corner3)) {
                console.log("Le bâtiment dépasse dans une région non débloquée");
                return false;
            }
        }

        // Vérifier la superposition avec d'autres bâtiments
        for (const building of this.scene.buildingManager.buildings) {
            if (this.checkBuildingOverlap(gridX, gridY, size, building)) {
                console.log(`Superposition détectée avec bâtiment à (${building.x}, ${building.y})`);
                return false;
            }
        }

        console.log(`Emplacement (${gridX}, ${gridY}) est valide`);
        return true;
    }

    isInUnlockedRegion(gridX, gridY) {
        // À implémenter: vérifier si les coordonnées sont dans une région débloquée
        // Pour l'instant, on vérifie simplement si c'est dans la zone de départ
        const startingOffset = Math.floor((this.config.mapSize - this.config.startingSize) / 2);
        const startX = startingOffset;
        const startY = startingOffset;
        const endX = startX + this.config.startingSize;
        const endY = startY + this.config.startingSize;

        return gridX >= startX && gridX < endX && gridY >= startY && gridY < endY;
    }

    checkBuildingOverlap(x1, y1, size1, building) {
        const x2 = building.x;
        const y2 = building.y;
        const size2 = building.size;

        // Logique de détection de collision en forme de rectangle
        return (
            x1 < x2 + size2 &&
            x1 + size1 > x2 &&
            y1 < y2 + size2 &&
            y1 + size1 > y2
        );
    }



    // Conversion de coordonnées écran -> coordonnées grille
    screenToGrid(screenX, screenY) {
        if (this.config.isIsometric) {
            // Pour le mode isométrique
            const worldX = screenX / this.currentZoom + this.scene.cameras.main.scrollX;
            const worldY = screenY / this.currentZoom + this.scene.cameras.main.scrollY;

            // Formule améliorée pour la conversion isométrique
            const isoX = (worldX / (this.config.cellSize/2) + worldY / (this.config.cellSize/4)) / 2;
            const isoY = (worldY / (this.config.cellSize/4) - worldX / (this.config.cellSize/2)) / 2;

            return {
                x: Math.floor(isoX),
                y: Math.floor(isoY)
            };
        } else {
            // Pour le mode cartésien
            const worldX = screenX / this.currentZoom + this.scene.cameras.main.scrollX;
            const worldY = screenY / this.currentZoom + this.scene.cameras.main.scrollY;

            return {
                x: Math.floor(worldX / this.config.cellSize),
                y: Math.floor(worldY / this.config.cellSize)
            };
        }
    }

}
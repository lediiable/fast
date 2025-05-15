class SelectionManager {
    constructor(scene) {
        this.scene = scene;
        this.selectedObject = null;
        this.selectionType = null;
        this.selectionIndicator = null;
        this.events = new Phaser.Events.EventEmitter();
    }

    init() {
        this.setupGlobalListeners();
    }

    setupGlobalListeners() {
        this.scene.input.on('pointerdown', (pointer) => {
            // Ne pas traiter si c'est un clic sur un élément d'UI plutôt que sur le canvas
            if (pointer.downElement && pointer.downElement.tagName !== 'CANVAS') return;

            // Ne pas traiter si c'est un clic droit ou si le mode construction est actif
            if (pointer.rightButtonDown() || (this.scene.uiManager && this.scene.uiManager.buildMode.active)) return;

            // Convertir les coordonnées d'écran en coordonnées de la grille
            const gridCoords = this.scene.mapManager.screenToGrid(pointer.x, pointer.y);

            // Essayer de trouver un bâtiment à cette position
            const clickedBuilding = this.findBuildingAt(pointer.x, pointer.y);

            // Essayer de trouver une unité à cette position
            const clickedUnit = this.findUnitAt(gridCoords.x, gridCoords.y);

            // Priorité à la sélection des unités, puis des bâtiments
            if (clickedUnit) {
                this.handleUnitClick(clickedUnit);
                return;
            }

            if (clickedBuilding) {
                this.handleBuildingClick(clickedBuilding);
                return;
            }

            // Si une unité est sélectionnée, la déplacer vers l'emplacement cliqué
            if (this.selectionType === 'unit' && this.selectedObject) {
                this.scene.unitManager.moveUnitTo(this.selectedObject, gridCoords.x, gridCoords.y);
                return;
            }

            // Si rien n'est trouvé, effacer la sélection actuelle
            this.clearSelection();
        });
    }

    findBuildingAt(screenX, screenY) {
        // Cette méthode est plus sophistiquée pour la détection des bâtiments
        // Elle vérifie si le point cliqué est sur l'un des bâtiments, pas juste la case centrale

        // Récupérer tous les bâtiments
        const buildings = this.scene.buildingManager.buildings;

        for (const building of buildings) {
            // Vérifier si le sprite du bâtiment contient le point cliqué
            const sprite = building.sprite;
            if (!sprite) continue;

            // Calculer les limites du sprite avec sa position et sa taille
            const bounds = this.getBuildingBounds(building);

            // Transformer les coordonnées d'écran en coordonnées mondiales
            const worldX = screenX / this.scene.cameras.main.zoom + this.scene.cameras.main.scrollX;
            const worldY = screenY / this.scene.cameras.main.zoom + this.scene.cameras.main.scrollY;

            // Vérifier si le point est dans les limites du bâtiment
            if (this.isPointInBounds(worldX, worldY, bounds)) {
                return building;
            }
        }

        return null;
    }

    getBuildingBounds(building) {
        const isIsometric = this.scene.mapManager.config.isIsometric;
        const cellSize = this.scene.mapManager.config.cellSize;
        const buildingSize = building.size;

        // Position du bâtiment
        let worldX, worldY;

        if (isIsometric) {
            worldX = (building.x - building.y) * cellSize / 2;
            worldY = (building.x + building.y) * cellSize / 4;

            // Pour un bâtiment isométrique, les limites sont un losange
            return {
                isIsometric: true,
                centerX: worldX,
                centerY: worldY,
                width: cellSize * buildingSize,
                height: (cellSize * buildingSize) / 2
            };
        } else {
            worldX = building.x * cellSize;
            worldY = building.y * cellSize;

            // Pour un bâtiment en vue normale, les limites sont un rectangle
            return {
                isIsometric: false,
                x: worldX,
                y: worldY,
                width: cellSize * buildingSize,
                height: cellSize * buildingSize
            };
        }
    }

    isPointInBounds(x, y, bounds) {
        if (bounds.isIsometric) {
            // Pour un bâtiment isométrique (losange)
            const dx = Math.abs(x - bounds.centerX);
            const dy = Math.abs(y - bounds.centerY);

            // Équation d'un losange: |x/a| + |y/b| <= 1
            // où a est la moitié de la largeur et b est la moitié de la hauteur
            return (dx / (bounds.width / 2)) + (dy / (bounds.height / 2)) <= 1;
        } else {
            // Pour un bâtiment en vue normale (rectangle)
            return x >= bounds.x && x < bounds.x + bounds.width &&
                y >= bounds.y && y < bounds.y + bounds.height;
        }
    }

    findUnitAt(gridX, gridY) {
        // Cette méthode vérifie si une unité se trouve aux coordonnées de grille spécifiées
        if (!this.scene.unitManager || !this.scene.unitManager.units) {
            return null;
        }

        // Vérifier toutes les unités
        return this.scene.unitManager.units.find(unit =>
            unit.x === gridX && unit.y === gridY
        );
    }

    handleUnitClick(unit) {
        // Si la même unité est déjà sélectionnée, la désélectionner
        if (this.selectionType === 'unit' && this.selectedObject === unit) {
            this.clearSelection();
            return;
        }

        // Sinon, effacer la sélection actuelle et sélectionner cette unité
        this.clearSelection();
        this.selectUnit(unit);
    }

    handleBuildingClick(building) {
        // Si une unité est sélectionnée, vérifier si elle peut interagir avec ce bâtiment
        if (this.selectionType === 'unit' && this.selectedObject) {
            const action = this.getUnitActionForBuilding(this.selectedObject, building);
            if (action) {
                this.executeUnitAction(this.selectedObject, building, action);
                return;
            }

            // Si aucune action spécifique, simplement sélectionner le bâtiment à la place
            this.clearSelection();
            this.selectBuilding(building);
            return;
        }

        // Si le même bâtiment est déjà sélectionné, le désélectionner
        if (this.selectionType === 'building' && this.selectedObject === building) {
            this.clearSelection();
            return;
        }

        // Sinon, effacer la sélection actuelle et sélectionner ce bâtiment
        this.clearSelection();
        this.selectBuilding(building);
    }

    selectUnit(unit) {
        this.selectedObject = unit;
        this.selectionType = 'unit';
        this.createUnitSelectionIndicator(unit);

        // Afficher l'interface de l'unité si disponible
        if (this.scene.uiManager && this.scene.uiManager.showUnitInterface) {
            this.scene.uiManager.showUnitInterface(unit);
        }

        // Émettre un événement de sélection d'unité
        this.events.emit('unitSelected', unit);
    }

    selectBuilding(building) {
        this.selectedObject = building;
        this.selectionType = 'building';
        this.createBuildingSelectionIndicator(building);

        // Afficher l'interface du bâtiment si disponible
        if (this.scene.uiManager && this.scene.uiManager.showBuildingInterface) {
            this.scene.uiManager.showBuildingInterface(building);
        }

        // Émettre un événement de sélection de bâtiment
        this.events.emit('buildingSelected', building);
    }

    clearSelection() {
        // Nettoyer l'indicateur de sélection
        if (this.selectionIndicator) {
            this.selectionIndicator.destroy();
            this.selectionIndicator = null;
        }

        // Gérer les événements spécifiques selon le type de sélection
        if (this.selectionType === 'unit') {
            // Masquer l'interface de l'unité
            if (this.scene.uiManager && this.scene.uiManager.hideUnitInterface) {
                this.scene.uiManager.hideUnitInterface();
            }

            // Émettre un événement de désélection d'unité
            if (this.selectedObject) {
                this.events.emit('unitDeselected', this.selectedObject);
            }
        } else if (this.selectionType === 'building') {
            // Masquer l'interface du bâtiment
            if (this.scene.uiManager && this.scene.uiManager.hideBuildingInterface) {
                this.scene.uiManager.hideBuildingInterface();
            }

            // Masquer le menu du bâtiment si disponible
            if (this.scene.uiManager && this.scene.uiManager.hideBuildingMenu) {
                this.scene.uiManager.hideBuildingMenu();
            }

            // Émettre un événement de désélection de bâtiment
            if (this.selectedObject) {
                this.events.emit('buildingDeselected', this.selectedObject);
            }
        }

        // Effacer les références
        this.selectedObject = null;
        this.selectionType = null;
    }

    createUnitSelectionIndicator(unit) {
        // Créer un cercle autour de l'unité sélectionnée
        const indicator = this.scene.add.graphics();
        indicator.lineStyle(2, 0x00ff00, 1);
        indicator.strokeCircle(0, 0, 16);
        indicator.setPosition(unit.sprite.x, unit.sprite.y);

        this.selectionIndicator = indicator;
    }

    createBuildingSelectionIndicator(building) {
        // Créer un indicateur approprié selon que la vue est isométrique ou non
        const indicator = this.scene.add.graphics();
        const cellSize = this.scene.mapManager.config.cellSize;
        const buildingSize = building.size;

        // Utiliser une couleur verte semi-transparente pour l'indicateur
        indicator.lineStyle(3, 0x00ff00, 0.8);

        if (this.scene.mapManager.config.isIsometric) {
            // Pour une vue isométrique, dessiner un losange
            const width = cellSize * buildingSize;
            const height = (cellSize * buildingSize) / 2;

            indicator.beginPath();
            indicator.moveTo(0, -height / 2);
            indicator.lineTo(width / 2, 0);
            indicator.lineTo(0, height / 2);
            indicator.lineTo(-width / 2, 0);
            indicator.closePath();
            indicator.strokePath();

            // Positionner l'indicateur au centre du bâtiment
            const worldX = (building.x - building.y) * cellSize / 2;
            const worldY = (building.x + building.y) * cellSize / 4;
            indicator.setPosition(worldX, worldY);
        } else {
            // Pour une vue normale, dessiner un rectangle
            const width = cellSize * buildingSize;
            const height = cellSize * buildingSize;

            indicator.strokeRect(-width / 2, -height / 2, width, height);

            // Positionner l'indicateur au centre du bâtiment
            const worldX = building.x * cellSize + width / 2;
            const worldY = building.y * cellSize + height / 2;
            indicator.setPosition(worldX, worldY);
        }

        this.selectionIndicator = indicator;
    }

    getUnitActionForBuilding(unit, building) {
        // Déterminer l'action possible d'une unité sur un bâtiment
        const buildingTypeData = gameData.buildingTypes[building.type];

        if (!buildingTypeData) return null;

        // Vérifier s'il y a des actions spécifiques définies pour ce type d'unité
        if (buildingTypeData.unitActions && buildingTypeData.unitActions[unit.type]) {
            return buildingTypeData.unitActions[unit.type];
        }

        // Pour le moment, ne définir aucune action par défaut
        // Cela permettra de sélectionner le bâtiment au lieu d'exécuter une action spécifique
        return null;
    }

    executeUnitAction(unit, building, actionType) {
        console.log(`Exécution de l'action "${actionType}" de l'unité ${unit.type} sur le bâtiment ${building.type}`);

        switch(actionType) {
            case 'work':
                this.scene.uiManager.showMessage(`${unit.type} travaille maintenant dans le bâtiment`, 2000);
                this.moveUnitNearBuilding(unit, building);
                break;

            case 'enter':
                this.scene.uiManager.showMessage(`${unit.type} est entré dans le bâtiment`, 2000);
                unit.sprite.setVisible(false);
                unit.isInside = building.id;
                break;

            case 'guard':
                this.scene.uiManager.showMessage(`${unit.type} garde maintenant le bâtiment`, 2000);
                this.moveUnitNearBuilding(unit, building);
                break;

            case 'repair':
                this.scene.uiManager.showMessage(`${unit.type} répare le bâtiment`, 2000);
                this.moveUnitNearBuilding(unit, building);
                break;

            default:
                this.scene.uiManager.showMessage(`Action "${actionType}" non implémentée`, 2000);
                break;
        }
    }

    moveUnitNearBuilding(unit, building) {
        // Déplacer l'unité à proximité du bâtiment (autour de son périmètre)
        const buildingSize = building.size || 1;
        const positions = [];

        // Générer les positions possibles autour du bâtiment
        for (let dx = -1; dx <= buildingSize; dx++) {
            for (let dy = -1; dy <= buildingSize; dy++) {
                // Ne considérer que les positions sur le périmètre
                if (dx === -1 || dx === buildingSize || dy === -1 || dy === buildingSize) {
                    const x = building.x + dx;
                    const y = building.y + dy;

                    // Vérifier si la position est libre
                    if (this.scene.unitManager.isPositionFree(x, y)) {
                        positions.push({x, y});
                    }
                }
            }
        }

        // Si une position valide est trouvée, y déplacer l'unité
        if (positions.length > 0) {
            // Choisir la position la plus proche de l'unité
            const unitPos = {x: unit.x, y: unit.y};
            positions.sort((a, b) => {
                const distA = Math.pow(a.x - unitPos.x, 2) + Math.pow(a.y - unitPos.y, 2);
                const distB = Math.pow(b.x - unitPos.x, 2) + Math.pow(b.y - unitPos.y, 2);
                return distA - distB;
            });

            this.scene.unitManager.moveUnitTo(unit, positions[0].x, positions[0].y);
        } else {
            // Si aucune position n'est disponible, chercher la position libre la plus proche
            const alternativePosition = this.scene.unitManager.findNearestFreePosition(building.x, building.y);
            if (alternativePosition) {
                this.scene.unitManager.moveUnitTo(unit, alternativePosition.x, alternativePosition.y);
            }
        }
    }

    updateUnitSelectionIndicator() {
        // Mettre à jour la position de l'indicateur de sélection d'unité
        if (this.selectionType === 'unit' && this.selectedObject && this.selectionIndicator) {
            this.selectionIndicator.setPosition(
                this.selectedObject.sprite.x,
                this.selectedObject.sprite.y
            );
        }
    }

    isSelected(object) {
        return this.selectedObject === object;
    }

    isUnitSelected() {
        return this.selectionType === 'unit' && this.selectedObject !== null;
    }

    isBuildingSelected() {
        return this.selectionType === 'building' && this.selectedObject !== null;
    }

    getSelectedObject() {
        return this.selectedObject;
    }

    getSelectionType() {
        return this.selectionType;
    }
}
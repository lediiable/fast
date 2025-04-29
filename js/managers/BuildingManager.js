class BuildingManager {
    constructor(scene, mapManager) {
        this.scene = scene;
        this.mapManager = mapManager;

        this.buildings = [];

        this.buildingTypes = gameData.buildingTypes;

        this.events = new Phaser.Events.EventEmitter();
    }

    init() {
        this.loadExistingBuildings();
    }

    loadExistingBuildings() {
        if (gameData.buildings && gameData.buildings.length > 0) {
            gameData.buildings.forEach(buildingData => {
                this.createBuildingFromData(buildingData);
            });
        }
    }
    createBuildingFromData(buildingData) {
        const { type, x, y, level = 1, id } = buildingData;

        if (!this.buildingTypes[type]) {
            console.error(`Type de bâtiment inconnu: ${type}`);
            return null;
        }

        const building = this.placeBuilding(type, x, y, level, id);

        if (building && level > 1) {
            this.updateBuildingAppearance(building);
        }

        return building;
    }
    placeBuilding(type, gridX, gridY, level = 1) {
        if (!this.mapManager.isValidBuildingLocation(gridX, gridY, this.buildingTypes[type].size)) {
            console.log(`Emplacement invalide (${gridX}, ${gridY}) pour le bâtiment ${type}`);
            return null;
        }

        let x, y;
        const cellSize = this.mapManager.config.cellSize;
        const buildingSize = this.buildingTypes[type].size;

        if (this.mapManager.config.isIsometric) {
            x = (gridX - gridY) * cellSize / 2;
            y = (gridX + gridY) * cellSize / 4;
        } else {
            x = gridX * cellSize;
            y = gridY * cellSize;
        }

        const buildingContainer = this.scene.add.container(x, y);

        const buildingImage = this.scene.add.image(0, 0, type);

        if (this.mapManager.config.isIsometric) {
            buildingImage.setDisplaySize(
                cellSize * buildingSize,
                (cellSize * buildingSize) / 1.5
            );
            buildingImage.setOrigin(0.5, 0.75);
        } else {
            buildingImage.setDisplaySize(cellSize * buildingSize, cellSize * buildingSize);
            buildingImage.setOrigin(0, 0);
        }

        buildingContainer.add(buildingImage);

        if (level > 1) {
            const levelBadge = this.createLevelBadge(level);
            levelBadge.setPosition(
                buildingImage.width / 2 - 15,
                -buildingImage.height / 2 + 15
            );
            buildingContainer.add(levelBadge);
        }

        if (this.mapManager.config.isIsometric) {
            buildingContainer.setInteractive(
                new Phaser.Geom.Polygon([
                    new Phaser.Geom.Point(-cellSize*buildingSize/2, 0),
                    new Phaser.Geom.Point(0, -cellSize*buildingSize/4),
                    new Phaser.Geom.Point(cellSize*buildingSize/2, 0),
                    new Phaser.Geom.Point(0, cellSize*buildingSize/4)
                ]),
                Phaser.Geom.Polygon.Contains
            );
        } else {
            buildingContainer.setInteractive(
                new Phaser.Geom.Rectangle(
                    -buildingImage.width / 2,
                    -buildingImage.height / 2,
                    buildingImage.width,
                    buildingImage.height
                ),
                Phaser.Geom.Rectangle.Contains
            );
        }

        buildingContainer.on('pointerdown', () => {
            const currentBuilding = this.buildings.find(b => b.container === buildingContainer);
            if (currentBuilding) {
                this.onBuildingClicked(buildingContainer, type, currentBuilding.x, currentBuilding.y, level);
            } else {
                this.onBuildingClicked(buildingContainer, type, gridX, gridY, level);
            }
        });

        this.mapManager.buildingLayer.add(buildingContainer);

        const building = {
            id: Date.now() + Math.floor(Math.random() * 1000), // ID unique
            type,
            x: gridX,
            y: gridY,
            size: buildingSize,
            level,
            container: buildingContainer,
            sprite: buildingImage
        };

        this.buildings.push(building);

        if (!gameData.buildings) {
            gameData.buildings = [];
        }

        const buildingData = {
            id: building.id,
            type,
            x: gridX,
            y: gridY,
            level
        };

        gameData.buildings.push(buildingData);

        this.events.emit('buildingPlaced', building);

        return building;
    }
    createLevelBadge(level) {
        const container = this.scene.add.container(0, 0);

        const badge = this.scene.add.graphics();
        badge.fillStyle(0x4444ff, 1);
        badge.fillCircle(0, 0, 15);
        badge.lineStyle(2, 0xffffff, 1);
        badge.strokeCircle(0, 0, 15);

        const text = this.scene.add.text(0, 0, level.toString(), {
            fontSize: '16px',
            color: '#ffffff',
            fontStyle: 'bold'
        });
        text.setOrigin(0.5, 0.5);

        container.add(badge);
        container.add(text);

        return container;
    }

    onBuildingClicked(container, type, x, y, level) {
        console.log(`Bâtiment ${type} (niveau ${level}) cliqué en (${x}, ${y})`);

        // Trouver le bâtiment complet
        const building = this.getBuildingAt(x, y);
        if (building && this.scene.uiManager) {
            // Utiliser la nouvelle interface
            this.scene.uiManager.showBuildingInterface(building);
        } else {
            console.error("Bâtiment non trouvé ou UIManager non disponible");
        }
    }

    showBuildingMenu(container, type, x, y, level) {
        this.hideBuildingMenu();

        const menuElement = document.createElement('div');
        menuElement.id = 'building-menu';

        menuElement.style.position = 'fixed';
        menuElement.style.bottom = '20px';
        menuElement.style.left = '50%';
        menuElement.style.transform = 'translateX(-50%)';
        menuElement.style.display = 'flex';
        menuElement.style.width = '80%';
        menuElement.style.maxWidth = '800px';
        menuElement.style.height = '100px';
        menuElement.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        menuElement.style.borderRadius = '10px';
        menuElement.style.zIndex = '1000';
        menuElement.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';

        const infoContainer = document.createElement('div');
        infoContainer.style.flex = '3';
        infoContainer.style.padding = '10px';
        infoContainer.style.display = 'flex';
        infoContainer.style.alignItems = 'center';
        infoContainer.style.borderRight = '1px solid rgba(255, 255, 255, 0.3)';

        const buildingTitle = document.createElement('h2');
        buildingTitle.style.color = 'white';
        buildingTitle.style.margin = '0';
        buildingTitle.style.fontSize = '18px';
        buildingTitle.innerHTML = `${this.buildingTypes[type].name} <small>(Niveau ${level})</small>`;

        infoContainer.appendChild(buildingTitle);
        menuElement.appendChild(infoContainer);

        const buttonsContainer = document.createElement('div');
        buttonsContainer.style.flex = '2';
        buttonsContainer.style.display = 'flex';
        buttonsContainer.style.justifyContent = 'space-around';
        buttonsContainer.style.alignItems = 'center';
        buttonsContainer.style.padding = '10px';

        const buttonConfigs = [
            { text: 'Info', icon: 'ℹ️', action: () => console.log('Info clicked') },
            { text: 'Améliorer', icon: '⬆️', action: () => this.upgradeBuilding(x, y) },
            { text: 'Déplacer', icon: '🔄', action: () => this.moveBuilding(x, y) },
            { text: 'Supprimer', icon: '🗑️', action: () => this.removeBuilding(x, y) }
        ];

        buttonConfigs.forEach(config => {
            const buttonDiv = document.createElement('div');
            buttonDiv.style.display = 'flex';
            buttonDiv.style.flexDirection = 'column';
            buttonDiv.style.alignItems = 'center';
            buttonDiv.style.cursor = 'pointer';

            const iconSpan = document.createElement('span');
            iconSpan.textContent = config.icon;
            iconSpan.style.fontSize = '24px';
            iconSpan.style.marginBottom = '5px';

            const textSpan = document.createElement('span');
            textSpan.textContent = config.text;
            textSpan.style.color = 'white';
            textSpan.style.fontSize = '12px';

            buttonDiv.appendChild(iconSpan);
            buttonDiv.appendChild(textSpan);

            buttonDiv.addEventListener('click', () => {
                config.action();
                this.hideBuildingMenu();
            });

            buttonsContainer.appendChild(buttonDiv);
        });

        menuElement.appendChild(buttonsContainer);
        document.body.appendChild(menuElement);

        const closeButton = document.createElement('div');
        closeButton.textContent = '✕';
        closeButton.style.position = 'absolute';
        closeButton.style.top = '5px';
        closeButton.style.right = '10px';
        closeButton.style.color = 'white';
        closeButton.style.cursor = 'pointer';
        closeButton.style.fontSize = '16px';

        closeButton.addEventListener('click', () => this.hideBuildingMenu());
        menuElement.appendChild(closeButton);

        this.activeMenu = {
            element: menuElement
        };

        const handleOutsideClick = (e) => {
            if (!menuElement.contains(e.target)) {
                this.hideBuildingMenu();
                document.removeEventListener('mousedown', handleOutsideClick);
            }
        };

        setTimeout(() => {
            document.addEventListener('mousedown', handleOutsideClick);
        }, 100);
    }
    hideBuildingMenu() {
        if (this.activeMenu) {
            if (this.activeMenu.element && document.body.contains(this.activeMenu.element)) {
                document.body.removeChild(this.activeMenu.element);
            }
            if (this.activeMenu.closeArea) {
                this.activeMenu.closeArea.destroy();
            }
            if (this.activeMenu.container) {
                this.activeMenu.container.destroy();
            }
            this.activeMenu = null;
        }
    }

    upgradeBuilding(x, y) {
        const building = this.getBuildingAt(x, y);
        if (!building) return;

        const buildingType = this.buildingTypes[building.type];
        if (!buildingType) return;

        if (building.level >= buildingType.maxLevel) {
            if (this.scene.uiManager) {
                this.scene.uiManager.showMessage(`Niveau maximum atteint!`, 2000);
            }
            return;
        }

        const upgradeCost = {
            gold: 100 * building.level,
            wood: 50 * building.level
        };

        if (gameData.resources.gold >= upgradeCost.gold &&
            gameData.resources.wood >= upgradeCost.wood) {

            gameData.resources.gold -= upgradeCost.gold;
            gameData.resources.wood -= upgradeCost.wood;

            building.level++;

            this.updateBuildingAppearance(building);

            const savedBuilding = gameData.buildings.find(b => b.id === building.id);
            if (savedBuilding) {
                savedBuilding.level = building.level;
            }

            this.events.emit('buildingUpgraded', building);
            this.scene.gameEventEmitter.emit('resourcesChanged');

            if (this.scene.uiManager) {
                this.scene.uiManager.showMessage(`Bâtiment amélioré au niveau ${building.level}!`, 2000);
            }

            console.log(`Bâtiment amélioré au niveau ${building.level}`);
        } else {
            console.log('Ressources insuffisantes pour améliorer ce bâtiment');
            if (this.scene.uiManager) {
                this.scene.uiManager.showMessage('Ressources insuffisantes!', 2000);
            }
        }
    }

    moveBuilding(x, y) {
        // Trouver le bâtiment aux coordonnées données
        const building = this.getBuildingAt(x, y);
        if (!building) {
            console.log(`Aucun bâtiment trouvé à (${x}, ${y})`);
            return;
        }

        console.log(`Déplacement du bâtiment ${building.type} depuis (${x}, ${y})`);

        const buildingIndex = this.buildings.findIndex(b => b.x === x && b.y === y);
        if (buildingIndex !== -1) {
            this.buildings.splice(buildingIndex, 1);
            console.log(`Bâtiment retiré temporairement de la liste (index: ${buildingIndex})`);
        } else {
            console.log("ATTENTION: Bâtiment non trouvé dans la liste!");
        }

        const savedIndex = gameData.buildings.findIndex(b => b.x === x && b.y === y);
        if (savedIndex !== -1) {
            this.temporarySavedBuilding = gameData.buildings[savedIndex];
            gameData.buildings.splice(savedIndex, 1);
            console.log("Bâtiment temporairement retiré des données sauvegardées");
        }

        this.buildingBeingMoved = building;

        building.container.setVisible(false);

        if (this.scene.uiManager) {
            this.scene.uiManager.createMovePlacementGhost(building.type, building.level);

            this.scene.uiManager.setMoveCompleteCallback((newX, newY) => {
                return this.finalizeBuildingMove(building, newX, newY);
            });
        }
    }
    finalizeBuildingMove(building, newX, newY) {
        console.log(`Tentative de finalisation du déplacement vers (${newX}, ${newY})`);

        if (!this.mapManager.isValidBuildingLocation(newX, newY, building.size)) {
            console.log('Emplacement invalide pour le déplacement');

            this.buildings.push(building);
            console.log("Bâtiment remis dans la liste à sa position d'origine");

            if (this.temporarySavedBuilding) {
                gameData.buildings.push(this.temporarySavedBuilding);
                this.temporarySavedBuilding = null;
                console.log("Données sauvegardées restaurées");
            }

            building.container.setVisible(true);
            this.buildingBeingMoved = null;
            return false;
        }

        building.x = newX;
        building.y = newY;

        let x, y;
        const cellSize = this.mapManager.config.cellSize;

        if (this.mapManager.config.isIsometric) {
            x = (newX - newY) * cellSize / 2;
            y = (newX + newY) * cellSize / 4;
        } else {
            x = newX * cellSize;
            y = newY * cellSize;
        }

        building.container.setPosition(x, y);
        building.container.setVisible(true);

        building.container.off('pointerdown');
        building.container.on('pointerdown', () => {
            this.onBuildingClicked(building.container, building.type, newX, newY, building.level);
        });

        this.buildings.push(building);
        console.log("Bâtiment remis dans la liste avec les nouvelles coordonnées");

        const existingBuildingIndex = gameData.buildings.findIndex(b => b.id === building.id);

        if (existingBuildingIndex !== -1) {
            gameData.buildings[existingBuildingIndex].x = newX;
            gameData.buildings[existingBuildingIndex].y = newY;
            console.log("Données de bâtiment existantes mises à jour");
        } else {
            const buildingData = {
                id: building.id,
                type: building.type,
                x: newX,
                y: newY,
                level: building.level
            };
            gameData.buildings.push(buildingData);
            console.log("Nouvelles données de bâtiment créées (cas rare)");
        }

        this.temporarySavedBuilding = null;

        this.buildingBeingMoved = null;

        this.events.emit('buildingMoved', building);

        console.log(`Bâtiment déplacé avec succès à (${newX}, ${newY})`);
        return true;
    }
    removeBuilding(x, y) {
        const building = this.getBuildingAt(x, y);
        if (!building) return;

        const confirmed = true;

        if (confirmed) {
            const index = this.buildings.findIndex(b => b.id === building.id);
            if (index !== -1) {
                this.buildings.splice(index, 1);
            }

            building.container.destroy();

            const savedIndex = gameData.buildings.findIndex(b => b.id === building.id);
            if (savedIndex !== -1) {
                gameData.buildings.splice(savedIndex, 1);
            }

            this.events.emit('buildingRemoved', building);
        }
    }

    updateBuildingAppearance(building) {
        building.container.list.forEach(child => {
            if (child !== building.sprite) {
                child.destroy();
            }
        });

        const newSprite = this.getBuildingSpriteByLevel(building.type, building.level);
        if (newSprite) {
            building.sprite.setTexture(newSprite);

            const cellSize = this.mapManager.config.cellSize;
            const buildingSize = building.size;

            if (this.mapManager.config.isIsometric) {
                building.sprite.setDisplaySize(
                    cellSize * buildingSize,
                    (cellSize * buildingSize) / 1.5
                );
                building.sprite.setOrigin(0.5, 0.75);
            } else {
                building.sprite.setDisplaySize(cellSize * buildingSize, cellSize * buildingSize);
                building.sprite.setOrigin(0, 0);
            }
        }
    }
    getBuildingAt(x, y) {
        const building = this.buildings.find(building => building.x === x && building.y === y);
        if (!building) {
            console.log(`Aucun bâtiment trouvé aux coordonnées (${x}, ${y})`);
            if (this.buildings.length > 0) {
                console.log("Bâtiments existants:");
                this.buildings.forEach(b => {
                    console.log(`- Type: ${b.type}, Position: (${b.x}, ${b.y})`);
                });
            } else {
                console.log("Aucun bâtiment dans la liste");
            }
        }
        return building;
    }

    getBuildingSpriteByLevel(type, level) {
        const buildingType = this.buildingTypes[type];

        if (buildingType && buildingType.sprites && buildingType.sprites[level]) {
            return buildingType.sprites[level];
        }

        switch (type) {
            case 'townhall':
                if (level <= 1) return 'townhall';
                if (level === 2) return 'townhall2';
                if (level === 3) return 'townhall3';
                return 'townhall4';
            case 'house':
                if (level <= 1) return 'house';
                if (level === 2) return 'house2';
                if (level === 3) return 'house3';
                if (level === 4) return 'house4';
                return 'house5';

            case 'farm':
                return 'farm';

            default:
                return type;
        }
    }
    getBuildingById(id) {
        return this.buildings.find(building => building.id === id);
    }

    getAllBuildings() {
        return this.buildings;
    }

    getBuildingsByType(type) {
        return this.buildings.filter(building => building.type === type);
    }

    calculateResourceProduction() {
        let production = {
            gold: 0,
            food: 0,
            wood: 0,
            stone: 0,
            cash: 0
        };

        this.buildings.forEach(building => {
            switch (building.type) {
                case 'townhall':
                    production.gold += 5 * building.level;
                    break;
                case 'house':
                    break;
                case 'farm':
                    production.food += 10 * building.level;
                    break;
            }
        });

        return production;
    }
}
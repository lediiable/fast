class MainGame extends Phaser.Scene {
    constructor() {
        super({ key: 'MainGame' });
        this.mapManager = null;
        this.uiManager = null;
        this.regionManager = null;
        this.buildingManager = null;
        this.unitManager = null;
        this.economyManager = null;
        this.saveManager = null;
        this.populationCalculator = null;
        this.selectionManager = null; // Nouveau gestionnaire de sélection
        this.gameEventEmitter = new Phaser.Events.EventEmitter();
    }

    create() {
        // Initialiser le gestionnaire de sauvegarde
        this.saveManager = new SaveManager();
        this.saveManager.init();

        // Initialiser le gestionnaire de carte
        this.mapManager = new MapManager(this);
        this.mapManager.init();

        // Initialiser le gestionnaire de régions
        this.regionManager = new RegionManager(this, this.mapManager);
        this.regionManager.init();

        // Initialiser le gestionnaire de bâtiments
        this.buildingManager = new BuildingManager(this, this.mapManager);
        this.buildingManager.init();

        // Utiliser le nouveau gestionnaire d'unités efficace
        this.unitManager = new EfficientUnitManager(this, this.mapManager, this.buildingManager);
        this.unitManager.init();

        // Initialiser le gestionnaire de sélection (NOUVEAU)
        this.selectionManager = new SelectionManager(this);
        this.selectionManager.init();

        if (this.saveManager.tempTrainingQueues) {
            this.saveManager.restoreTrainingQueues();
        }

        // Initialiser le calculateur de population
        this.populationCalculator = new PopulationCalculator(this.buildingManager);
        this.populationCalculator.updatePopulationCap();

        // Initialiser le gestionnaire d'économie
        this.economyManager = new EconomyManager(this, this.buildingManager);
        this.economyManager.init();

        // Initialiser le gestionnaire d'interface utilisateur en dernier
        this.uiManager = new UIManager(this, this.mapManager);
        this.uiManager.init();

        // Configurer les événements du jeu
        this.setupGameEvents();

        // Initialiser l'économie
        this.economyManager.lastUpdate = Date.now();

        // Mise à jour périodique de l'économie (chaque seconde)
        this.time.addEvent({
            delay: 1000,
            callback: () => {
                if (this.economyManager) {
                    this.economyManager.updateResources();
                }
            },
            callbackScope: this,
            loop: true
        });

        // Initialiser les contrôles d'entrée pour placer les bâtiments
        this.setupInputHandlers();
    }

    setupInputHandlers() {
        // Gestionnaire pour le clic de la souris
        this.input.on('pointerdown', (pointer) => {
            // Ne pas traiter si le clic droit ou si c'est un élément d'interface
            if (pointer.rightButtonDown() || (pointer.isDown && pointer.downElement &&
                pointer.downElement.tagName !== 'CANVAS')) {
                return;
            }

            // Si en mode construction, essayer de placer un bâtiment
            if (this.uiManager && this.uiManager.buildMode && this.uiManager.buildMode.active) {
                const gridCoords = this.mapManager.screenToGrid(pointer.x, pointer.y);
                this.uiManager.tryPlaceBuilding(gridCoords.x, gridCoords.y);
            }

            // Note: Les clics pour la sélection sont maintenant gérés par le SelectionManager
        });

        // Gestionnaire pour le déplacement de la souris
        this.input.on('pointermove', (pointer) => {
            // Si en mode construction, mettre à jour le fantôme de placement
            if (this.uiManager && this.uiManager.buildMode && this.uiManager.buildMode.active) {
                const gridCoords = this.mapManager.screenToGrid(pointer.x, pointer.y);
                this.uiManager.updatePlacementGhost(gridCoords.x, gridCoords.y);
            }
        });
    }

    setupGameEvents() {
        // Gestion des ressources
        this.economyManager.events.on('resourcesUpdated', (resources) => {
            if (this.uiManager) {
                this.uiManager.updateResourceDisplay();
            }
        });

        // Gestion des bâtiments - Mise à jour pour utiliser le SelectionManager
        this.buildingManager.events.on('buildingPlaced', (building) => {
            this.gameEventEmitter.emit('buildingPlaced', building.type, building.x, building.y);
            // Mettre à jour la capacité de population
            this.populationCalculator.updatePopulationCap();
            this.saveManager.saveGame();
        });

        this.buildingManager.events.on('buildingUpgraded', (building) => {
            // Mettre à jour la capacité de population
            this.populationCalculator.updatePopulationCap();
            this.saveManager.saveGame();
        });

        this.buildingManager.events.on('buildingRemoved', (building) => {
            // Vérifier si le bâtiment était sélectionné
            if (this.selectionManager && this.selectionManager.isSelected(building)) {
                this.selectionManager.clearSelection();
            }

            // Mettre à jour la capacité de population
            this.populationCalculator.updatePopulationCap();
            this.saveManager.saveGame();
        });

        // Gestion des régions
        this.regionManager.events.on('regionUnlocked', (regionId) => {
            this.gameEventEmitter.emit('regionUnlocked', regionId);
            this.saveManager.saveGame();
        });

        // Événements généraux
        this.gameEventEmitter.on('resourcesChanged', () => {
            if (this.uiManager) {
                this.uiManager.updateResourceDisplay();
                if (this.uiManager.updateBuildingButtons) {
                    this.uiManager.updateBuildingButtons();
                }
            }
        });

        // Événement pour les changements de capacité de population
        this.gameEventEmitter.on('populationCapChanged', () => {
            if (this.uiManager) {
                this.uiManager.updateResourceDisplay();
            }
        });

        // Événement pour la création d'unités
        this.gameEventEmitter.on('unitCreated', () => {
            // Vérifier que la population ne dépasse pas la capacité maximale
            if (gameData.resources.population > gameData.resources.populationCap) {
                gameData.resources.population = gameData.resources.populationCap;
            }
        });

        // Gestion des unités - Mise à jour pour utiliser le SelectionManager
        this.unitManager.events.on('unitCreated', (unit) => {
            this.saveManager.saveGame();
        });

        this.unitManager.events.on('trainingQueueChanged', () => {
            this.saveManager.saveGame();
        });

        this.gameEventEmitter.on('unitMoved', (unit) => {
            // Mettre à jour les coordonnées de l'unité dans les données sauvegardées
            const unitData = gameData.units.find(u => u.id === unit.id);
            if (unitData) {
                unitData.x = unit.x;
                unitData.y = unit.y;
            }

            // Mettre à jour l'indicateur de sélection si l'unité est sélectionnée
            if (this.selectionManager && this.selectionManager.isSelected(unit)) {
                this.selectionManager.updateUnitSelectionIndicator();
            }

            this.saveManager.saveGame();
        });

        // Événement de destruction d'unité
        this.unitManager.events.on('unitRemoved', (unit) => {
            // Vérifier si l'unité était sélectionnée
            if (this.selectionManager && this.selectionManager.isSelected(unit)) {
                this.selectionManager.clearSelection();
            }

            this.saveManager.saveGame();
        });

        // Sauvegarde rapide avec Ctrl+S
        this.input.keyboard.on('keydown-S', (event) => {
            if (event.ctrlKey || event.metaKey) {
                event.preventDefault();
                const success = this.saveManager.saveGame();
                console.log(success ? 'Jeu sauvegardé' : 'Échec de la sauvegarde');
            }
        });

        // Écouter les événements du SelectionManager
        if (this.selectionManager) {
            this.selectionManager.events.on('unitSelected', (unit) => {
                console.log(`Unité sélectionnée: ${unit.type} (ID: ${unit.id})`);
            });

            this.selectionManager.events.on('buildingSelected', (building) => {
                console.log(`Bâtiment sélectionné: ${building.type} (ID: ${building.id})`);
            });

            this.selectionManager.events.on('unitDeselected', (unit) => {
                console.log(`Unité désélectionnée: ${unit.type} (ID: ${unit.id})`);
            });

            this.selectionManager.events.on('buildingDeselected', (building) => {
                console.log(`Bâtiment désélectionné: ${building.type} (ID: ${building.id})`);
            });
        }
    }

    onBuildingPlaced(buildingType, x, y) {
        if (buildingType === 'house') {
            gameData.resources.populationCap = (gameData.resources.populationCap || 0) + 5;
        }
    }
}
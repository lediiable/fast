class MainGame extends Phaser.Scene {
    constructor() {
        super({ key: 'MainGame' });
        this.mapManager = null;
        this.uiManager = null;
        this.regionManager = null;
        this.buildingManager = null;
        this.economyManager = null;
        this.saveManager = null;
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
                console.log("Clic détecté en mode construction à la position grid:", gridCoords);
                this.uiManager.tryPlaceBuilding(gridCoords.x, gridCoords.y);
            }
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

        // Gestion des bâtiments
        this.buildingManager.events.on('buildingPlaced', (building) => {
            this.gameEventEmitter.emit('buildingPlaced', building.type, building.x, building.y);
            this.saveManager.saveGame();
        });

        this.buildingManager.events.on('buildingUpgraded', (building) => {
            this.saveManager.saveGame();
        });

        this.buildingManager.events.on('buildingRemoved', (building) => {
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

        this.gameEventEmitter.on('buildingPlaced', this.onBuildingPlaced, this);

        // Sauvegarde rapide avec Ctrl+S
        this.input.keyboard.on('keydown-S', (event) => {
            if (event.ctrlKey || event.metaKey) {
                event.preventDefault();
                const success = this.saveManager.saveGame();
                console.log(success ? 'Jeu sauvegardé' : 'Échec de la sauvegarde');
            }
        });
    }

    onBuildingPlaced(buildingType, x, y) {
        if (buildingType === 'house') {
            gameData.resources.populationCap = (gameData.resources.populationCap || 0) + 5;
        }
    }
}
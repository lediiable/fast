class SaveManager {
    constructor() {
        this.saveKey = 'social_empire_save';
        this.autoSaveInterval = 60000; // 1 minute
        this.autoSaveTimer = null;
    }

    init() {
        // Charger les données sauvegardées au démarrage
        this.loadGame();

        // Configurer la sauvegarde automatique
        this.setupAutoSave();
    }

    setupAutoSave() {
        // Mettre en place une sauvegarde automatique périodique
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
        }

        this.autoSaveTimer = setInterval(() => {
            this.saveGame();
        }, this.autoSaveInterval);
    }

    saveGame() {
        try {
            // Récupérer les files d'attente de formation si UnitManager existe
            let trainingQueues = {};
            if (this.scene && this.scene.unitManager) {
                trainingQueues = this.scene.unitManager.trainingQueues;
            }

            // Préparer les données à sauvegarder
            const saveData = {
                playerName: gameData.playerName,
                playerLevel: gameData.playerLevel,
                resources: gameData.resources,
                buildings: gameData.buildings.map(building => ({
                    id: building.id,
                    type: building.type,
                    x: building.x,
                    y: building.y,
                    level: building.level || 1
                })),
                units: gameData.units.map(unit => ({
                    id: unit.id,
                    type: unit.type,
                    level: unit.level,
                    x: unit.x,
                    y: unit.y,
                    moveType: unit.moveType || 'ground'
                })),
                trainingQueues: trainingQueues,
                map: gameData.map,
                lastSave: Date.now()
            };

            // Convertir en chaîne JSON
            const saveString = JSON.stringify(saveData);

            // Sauvegarder dans le localStorage
            localStorage.setItem(this.saveKey, saveString);

            return true;
        } catch (error) {
            console.error("Erreur lors de la sauvegarde:", error);
            return false;
        }
    }


    loadGame() {
        try {
            // Récupérer les données depuis le localStorage
            const saveString = localStorage.getItem(this.saveKey);

            if (!saveString) {
                return false;
            }

            // Convertir la chaîne JSON en objet
            const saveData = JSON.parse(saveString);

            // Valider les données chargées
            if (!this.validateSaveData(saveData)) {
                return false;
            }

            // Mettre à jour les données du jeu
            this.updateGameData(saveData);

            return true;
        } catch (error) {
            return false;
        }
    }

    validateSaveData(saveData) {
        // Vérifier si les données de sauvegarde contiennent toutes les propriétés requises
        const requiredProperties = ['playerName', 'playerLevel', 'resources', 'buildings', 'map'];

        for (const prop of requiredProperties) {
            if (saveData[prop] === undefined) {
                return false;
            }
        }

        return true;
    }

    updateGameData(saveData) {
        // Mettre à jour les données du jeu avec les données chargées
        gameData.playerName = saveData.playerName;
        gameData.playerLevel = saveData.playerLevel;
        gameData.resources = saveData.resources;
        gameData.buildings = saveData.buildings || [];
        gameData.units = saveData.units || []; // Ajouter les unités

        // Mise à jour des données de la carte
        if (saveData.map) {
            gameData.map.unlockedRegions = saveData.map.unlockedRegions || [12];

            // Mettre à jour les régions débloquées
            if (gameData.regions) {
                gameData.regions.forEach(region => {
                    region.unlocked = saveData.map.unlockedRegions.includes(region.id);
                });
            }
        }
        if (saveData.trainingQueues) {
            this.tempTrainingQueues = saveData.trainingQueues;
        }
    }

    restoreTrainingQueues() {
        if (this.tempTrainingQueues && this.scene && this.scene.unitManager) {
            // Restaurer les files d'attente
            this.scene.unitManager.trainingQueues = this.tempTrainingQueues;
            console.log("Files d'attente de formation restaurées");

            // Nettoyer la référence temporaire
            this.tempTrainingQueues = null;
        }
    }

    resetGame() {
        // Réinitialiser le jeu aux valeurs par défaut
        try {
            // Supprimer la sauvegarde
            localStorage.removeItem(this.saveKey);

            // Recharger la page pour réinitialiser les données
            window.location.reload();

            return true;
        } catch (error) {
            return false;
        }
    }

    exportSave() {
        // Exporter la sauvegarde sous forme de chaîne pour que le joueur puisse la copier
        try {
            const saveString = localStorage.getItem(this.saveKey);

            if (!saveString) {
                return 'Aucune sauvegarde à exporter.';
            }

            // Encoder en Base64 pour faciliter le partage
            return btoa(saveString);
        } catch (error) {
            console.error('Erreur lors de l\'exportation de la sauvegarde:', error);
            return null;
        }
    }

    importSave(importString) {
        // Importer une sauvegarde depuis une chaîne
        try {
            // Décoder depuis Base64
            const saveString = atob(importString);

            // Vérifier si la chaîne est un JSON valide
            const saveData = JSON.parse(saveString);

            // Valider les données
            if (!this.validateSaveData(saveData)) {
                console.error('Données d\'importation invalides.');
                return false;
            }

            // Sauvegarder les données importées
            localStorage.setItem(this.saveKey, saveString);

            // Recharger la page pour appliquer les nouvelles données
            window.location.reload();

            return true;
        } catch (error) {
            console.error('Erreur lors de l\'importation de la sauvegarde:', error);
            return false;
        }
    }
}
class PopulationCalculator {
    constructor(buildingManager) {
        this.buildingManager = buildingManager;

        // Configuration de base pour la population
        this.baseCap = 5; // Valeur de base donnée par l'hôtel de ville
    }

    /**
     * Calcule la capacité maximale de population en fonction des bâtiments actuels
     * @returns {number} La capacité de population totale
     */
    calculatePopulationCap() {
        // Commencer avec la valeur de base
        let populationCap = this.baseCap;

        // Récupérer tous les bâtiments qui affectent la population
        const allBuildings = this.buildingManager.getAllBuildings();

        // Parcourir tous les bâtiments
        allBuildings.forEach(building => {
            const buildingType = gameData.buildingTypes[building.type];
            const level = building.level || 1;

            // Vérifier si ce type de bâtiment a un bonus de population
            if (buildingType && buildingType.populationBonus && buildingType.populationBonus[level]) {
                // Ajouter le bonus spécifique au niveau
                populationCap += buildingType.populationBonus[level];
            }
        });

        // Arrondir le résultat pour éviter les valeurs décimales
        return Math.floor(populationCap);
    }

    /**
     * Met à jour la capacité maximale de population dans gameData
     */
    updatePopulationCap() {
        const newCap = this.calculatePopulationCap();

        // Mettre à jour seulement si la valeur a changé
        if (gameData.resources.populationCap !== newCap) {
            gameData.resources.populationCap = newCap;

            // Si la population actuelle dépasse la nouvelle capacité, la limiter
            if (gameData.resources.population > newCap) {
                gameData.resources.population = newCap;
            }

            // Émettre un événement pour informer les autres systèmes
            if (this.buildingManager.scene.gameEventEmitter) {
                this.buildingManager.scene.gameEventEmitter.emit('populationCapChanged', newCap);
            }

            console.log(`Capacité de population mise à jour: ${newCap}`);
            return true; // Indique que la valeur a été mise à jour
        }

        return false; // Indique qu'aucun changement n'a été nécessaire
    }
}
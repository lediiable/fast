class EconomyManager {
    constructor(scene, buildingManager) {
        this.scene = scene;
        this.buildingManager = buildingManager;

        // Références aux ressources du jeu
        this.resources = gameData.resources;

        // Taux de génération de base par seconde
        this.baseGenerationRates = {
            gold: 0.1,      // Base de 0.1 or par seconde
            food: 0.05,     // Base de 0.05 nourriture par seconde
            wood: 0,
            stone: 0,
            cash: 0,
            population: 0.01 // Croissance naturelle de population
        };

        // Dernière mise à jour des ressources
        this.lastUpdate = 0;

        // Limites de stockage des ressources
        this.resourceLimits = {
            gold: 1000,
            food: 1000,
            wood: 500,
            stone: 500,
            cash: 50,
            population: 5   // Limité par populationCap
        };

        // Statistiques d'économie
        this.stats = {
            totalProduced: {
                gold: 0,
                food: 0,
                wood: 0,
                stone: 0,
                cash: 0
            },
            totalSpent: {
                gold: 0,
                food: 0,
                wood: 0,
                stone: 0,
                cash: 0
            }
        };

        // Émetteur d'événements
        this.events = new Phaser.Events.EventEmitter();
    }

    init() {
        // Initialiser les limites de stockage en fonction du niveau de l'hôtel de ville
        this.updateResourceLimits();

        // Configurer la mise à jour périodique des statistiques
        this.setupPeriodicStats();
    }

    setupPeriodicStats() {
        // Configurer une mise à jour périodique des statistiques (toutes les 60 secondes)
        this.scene.time.addEvent({
            delay: 60000, // 60 secondes
            callback: () => {
                this.calculateEconomyStats();
            },
            callbackScope: this,
            loop: true
        });
    }

    calculateEconomyStats() {
        // Calculer les statistiques économiques actuelles
        // Cette fonction pourrait être utilisée pour générer des rapports ou ajuster l'équilibre du jeu
        const production = this.buildingManager.calculateResourceProduction();

        console.log('=== Statistiques économiques ===');
        console.log('Production par minute:');
        for (const [resource, amount] of Object.entries(production)) {
            console.log(`${resource}: ${amount}`);
        }

        console.log('Ressources actuelles:');
        for (const [resource, amount] of Object.entries(this.resources)) {
            if (typeof amount === 'number') {
                const limit = this.getResourceLimit(resource);
                console.log(`${resource}: ${Math.floor(amount)}/${limit}`);
            }
        }
    }

    updateResources() {
        // Calculer le temps écoulé depuis la dernière mise à jour
        const now = Date.now();
        const deltaSeconds = (now - this.lastUpdate) / 1000;
        this.lastUpdate = now;

        // Si le delta est trop grand (plus de 5 minutes), limiter pour éviter les sauts
        const cappedDelta = Math.min(deltaSeconds, 300);

        // Calculer la production basée sur les bâtiments (par minute)
        const buildingProduction = this.buildingManager ?
            this.buildingManager.calculateResourceProduction() :
            { gold: 0, food: 0, wood: 0, stone: 0, cash: 0 };

        // Calculer la production totale (par seconde)
        const totalProduction = {};
        for (const resource in this.baseGenerationRates) {
            totalProduction[resource] = this.baseGenerationRates[resource] +
                (buildingProduction[resource] || 0) / 60; // Convertir en "par seconde"
        }

        // Consommation de nourriture par la population
        const populationFoodConsumption = this.resources.population * 0.01; // 0.01 nourriture par habitant par seconde

        // Appliquer la production et la consommation aux ressources
        let resourcesChanged = false;

        for (const resource in totalProduction) {
            if (this.resources[resource] !== undefined) {
                let amount = totalProduction[resource] * cappedDelta;

                // Appliquer la consommation de nourriture
                if (resource === 'food') {
                    amount -= populationFoodConsumption * cappedDelta;
                }

                // Traitement spécial pour la population
                if (resource === 'population') {
                    // La population ne peut pas dépasser sa capacité maximale
                    if (this.resources.population < this.resources.populationCap) {
                        this.resources[resource] += amount;

                        // Limiter à la capacité maximale
                        if (this.resources[resource] > this.resources.populationCap) {
                            this.resources[resource] = this.resources.populationCap;
                        }

                        resourcesChanged = true;
                    }
                }
                // Pour les autres ressources
                else {
                    const limit = this.getResourceLimit(resource);

                    // Ne pas dépasser les limites de stockage
                    if (amount > 0 && this.resources[resource] < limit) {
                        this.resources[resource] += amount;

                        // Limiter au maximum
                        if (this.resources[resource] > limit) {
                            this.resources[resource] = limit;
                        }

                        resourcesChanged = true;
                    }
                    else if (amount < 0) {
                        // Pour les ressources qui sont consommées (comme la nourriture)
                        this.resources[resource] += amount;

                        // Ne pas descendre sous zéro
                        if (this.resources[resource] < 0) {
                            this.resources[resource] = 0;

                            // Si la nourriture tombe à zéro, déclencher la famine
                            if (resource === 'food') {
                                this.triggerFamine();
                            }
                        }

                        resourcesChanged = true;
                    }
                }

                // Arrondir les valeurs à 2 décimales pour éviter les erreurs de précision
                if (this.resources[resource] !== undefined) {
                    this.resources[resource] = Math.floor(this.resources[resource] * 100) / 100;
                }
            }
        }

        // Émettre un événement si les ressources ont changé
        if (resourcesChanged) {
            this.events.emit('resourcesUpdated', this.resources);
            this.scene.gameEventEmitter.emit('resourcesChanged');
        }
    }

    triggerFamine() {
        // La famine réduit progressivement la population
        if (this.resources.population > 0) {
            // Réduire la population de 5%
            const reduction = Math.max(1, Math.floor(this.resources.population * 0.05));
            this.resources.population -= reduction;

            // Afficher un avertissement
            if (this.scene.uiManager) {
                this.scene.uiManager.showMessage('⚠️ Famine! Votre population diminue! Produisez plus de nourriture!', 5000);
            }
        }
    }

    updateResourceLimits() {
        // Mettre à jour les limites de stockage en fonction du niveau de l'hôtel de ville
        const townhalls = this.buildingManager.getBuildingsByType('townhall');

        if (townhalls.length > 0) {
            const townhallLevel = townhalls[0].level || 1;

            // Augmenter les limites en fonction du niveau
            this.resourceLimits = {
                gold: 1000 * townhallLevel,
                food: 1000 * townhallLevel,
                wood: 500 * townhallLevel,
                stone: 500 * townhallLevel,
                cash: 50 * townhallLevel,
                population: this.resources.populationCap || 5
            };
        }
    }

    addResources(type, amount) {
        // Ajouter des ressources directement (pour les récompenses, événements, etc.)
        if (this.resources[type] !== undefined) {
            const limit = this.getResourceLimit(type);

            // Ne pas dépasser la limite
            const newAmount = Math.min(this.resources[type] + amount, limit);
            const actualAdded = newAmount - this.resources[type];

            this.resources[type] = newAmount;

            // Mettre à jour les statistiques
            if (this.stats.totalProduced[type] !== undefined) {
                this.stats.totalProduced[type] += actualAdded;
            }

            // Émettre un événement
            this.events.emit('resourcesUpdated', this.resources);
            this.scene.gameEventEmitter.emit('resourcesChanged');

            return actualAdded;
        }
        return 0;
    }

    removeResources(type, amount) {
        // Retirer des ressources (pour les achats, constructions, etc.)
        if (this.resources[type] !== undefined && this.resources[type] >= amount) {
            this.resources[type] -= amount;

            // Mettre à jour les statistiques
            if (this.stats.totalSpent[type] !== undefined) {
                this.stats.totalSpent[type] += amount;
            }

            // Émettre un événement
            this.events.emit('resourcesUpdated', this.resources);
            this.scene.gameEventEmitter.emit('resourcesChanged');

            return true;
        }
        return false;
    }

    hasEnoughResources(costs) {
        // Vérifier si le joueur a assez de ressources pour un achat
        for (const [resource, amount] of Object.entries(costs)) {
            if (this.resources[resource] === undefined || this.resources[resource] < amount) {
                return false;
            }
        }
        return true;
    }

    purchase(costs) {
        // Effectuer un achat avec plusieurs types de ressources
        if (this.hasEnoughResources(costs)) {
            for (const [resource, amount] of Object.entries(costs)) {
                this.removeResources(resource, amount);
            }
            return true;
        }
        return false;
    }

    getResourceLimit(resourceType) {
        // Récupérer la limite actuelle pour un type de ressource
        return this.resourceLimits[resourceType] || Infinity;
    }

    getResourcesStatus() {
        // Obtenir un rapport d'état des ressources avec pourcentages
        const status = {};

        for (const resource in this.resources) {
            if (typeof this.resources[resource] === 'number') {
                const limit = this.getResourceLimit(resource);
                status[resource] = {
                    current: this.resources[resource],
                    limit: limit,
                    percentage: (limit > 0) ? (this.resources[resource] / limit) * 100 : 100
                };
            }
        }

        return status;
    }

    getResourceGenerationRates() {
        // Calculer les taux de génération actuels (par seconde)
        const buildingProduction = this.buildingManager ?
            this.buildingManager.calculateResourceProduction() :
            { gold: 0, food: 0, wood: 0, stone: 0, cash: 0 };

        const rates = {};
        for (const resource in this.baseGenerationRates) {
            rates[resource] = this.baseGenerationRates[resource] +
                (buildingProduction[resource] || 0) / 60; // Par seconde
        }

        // Soustraire la consommation de nourriture par la population
        if (rates['food'] !== undefined && this.resources.population) {
            rates['food'] -= this.resources.population * 0.01; // 0.01 nourriture par habitant par seconde
        }

        return rates;
    }
}
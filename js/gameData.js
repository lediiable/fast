const gameData = {
    playerName: 'Player',
    playerLevel: 1,
    resources: {
        gold: 100000,
        food: 100000,
        wood: 100000,
        stone: 100000,
        cash: 100000,
        population: 0,      // Population actuelle
        populationCap: 0    // Capacité de population maximale
    },
    buildings: [
        {id: 1, type: 'townhall', level: 1, x: 50, y: 50},
        {id: 2, type: 'house', level: 1, x: 55, y: 45},
        {id: 3, type: 'house', level: 1, x: 45, y: 55},
        {id: 4, type: 'house', level: 1, x: 55, y: 55}
    ],
    units: [],
    map: {
        width: 5,  // Nombre de régions en largeur
        height: 5,  // Nombre de régions en hauteur
        cellSize: 20, // Nombre de cellules par région (20×20)
        cellPixelSize: 64, // Taille en pixels de chaque cellule
        unlockedRegions: [12]  // Région centrale dans une grille 5×5
    },
    // 25 régions au total (grille 5x5)
    regions: [
        // Première ligne
        {id: 0, cost: 0, currency: 'gold', unlocked: false, purchasable: false},
        {id: 1, cost: 0, currency: 'gold', unlocked: false, purchasable: false},
        {id: 2, cost: 0, currency: 'gold', unlocked: false, purchasable: false},
        {id: 3, cost: 0, currency: 'gold', unlocked: false, purchasable: false},
        {id: 4, cost: 0, currency: 'gold', unlocked: false, purchasable: false},
        // Deuxième ligne
        {id: 5, cost: 0, currency: 'gold', unlocked: false, purchasable: false},
        {id: 6, cost: 800, currency: 'gold', unlocked: false, purchasable: true},
        {id: 7, cost: 800, currency: 'gold', unlocked: false, purchasable: true},
        {id: 8, cost: 800, currency: 'gold', unlocked: false, purchasable: true},
        {id: 9, cost: 0, currency: 'gold', unlocked: false, purchasable: false},
        // Troisième ligne (milieu)
        {id: 10, cost: 0, currency: 'gold', unlocked: false, purchasable: false},
        {id: 11, cost: 800, currency: 'gold', unlocked: false, purchasable: true},
        {id: 12, cost: 0, currency: 'gold', unlocked: true, purchasable: false}, // Centre, débloqué
        {id: 13, cost: 800, currency: 'gold', unlocked: false, purchasable: true},
        {id: 14, cost: 0, currency: 'gold', unlocked: false, purchasable: false},
        // Quatrième ligne
        {id: 15, cost: 0, currency: 'gold', unlocked: false, purchasable: false},
        {id: 16, cost: 800, currency: 'gold', unlocked: false, purchasable: true},
        {id: 17, cost: 800, currency: 'gold', unlocked: false, purchasable: true},
        {id: 18, cost: 800, currency: 'gold', unlocked: false, purchasable: true},
        {id: 19, cost: 0, currency: 'gold', unlocked: false, purchasable: false},
        // Cinquième ligne
        {id: 20, cost: 0, currency: 'gold', unlocked: false, purchasable: false},
        {id: 21, cost: 0, currency: 'gold', unlocked: false, purchasable: false},
        {id: 22, cost: 0, currency: 'gold', unlocked: false, purchasable: false},
        {id: 23, cost: 0, currency: 'gold', unlocked: false, purchasable: false},
        {id: 24, cost: 0, currency: 'gold', unlocked: false, purchasable: false}
    ],
    gridPositions: [
        [0, 1, 2, 3, 4],
        [5, 6, 7, 8, 9],
        [10, 11, 12, 13, 14],
        [15, 16, 17, 18, 19],
        [20, 21, 22, 23, 24]
    ],
    // Structure de données des bâtiments améliorée
    buildingTypes: {
        // Hôtel de ville - bâtiment principal, ne peut pas être supprimé
        townhall: {
            name: "Hôtel de Ville",
            description: "Le centre de votre empire. Améliorez-le pour débloquer de nouveaux bâtiments.",
            size: 3,
            canDelete: false,
            maxLevel: 4,
            costs: {
                initial: {gold: 500, wood: 250, stone: 100},
                upgrade: [
                    null, // Niveau 0 (n'existe pas)
                    {gold: 1000, wood: 500, stone: 200}, // Niveau 1 → 2
                    {gold: 2000, wood: 1000, stone: 400}, // Niveau 2 → 3
                    {gold: 4000, wood: 2000, stone: 800}  // Niveau 3 → 4
                ]
            },
            production: [
                null, // Niveau 0 (n'existe pas)
                {gold: 5},  // Niveau 1
                {gold: 10}, // Niveau 2
                {gold: 15}, // Niveau 3
                {gold: 25}  // Niveau 4
            ],
            populationBonus: [
                null,  // Pas de niveau 0
                5,     // Niveau 1: 5 population de base
                10,    // Niveau 2: 10 population de base
                20,    // Niveau 3: 20 population de base
                40     // Niveau 4: 40 population de base
            ],
            specialAction: "trainUnits", // Changé de expandTerritoryUnlock à trainUnits
            trainableUnits: ["villager"],
            sprites: {
                1: "townhall",
                2: "townhall2",
                3: "townhall3",
                4: "townhall4"
            },
            requirements: {level: 0} // Disponible dès le début
        },

        // Maison - augmente la capacité de population
        house: {
            name: "Maison",
            description: "Fournit un logement pour votre population.",
            size: 1,
            canDelete: true,
            maxLevel: 5,
            costs: {
                initial: {gold: 100, wood: 50},
                upgrade: [
                    null,
                    {gold: 200, wood: 100},
                    {gold: 400, wood: 200}
                ]
            },
            sprites: {
                1: "house",
                2: "house2",
                3: "house3",
                4: "house4",
                5: "house5"
            },
            populationBonus: [
                null,  // Pas de niveau 0
                3,     // Niveau 1: +3 population
                7,     // Niveau 2: +7 population
                15,    // Niveau 3: +15 population
                30,    // Niveau 4: +30 population
                60     // Niveau 5: +60 population
            ],
            requirements: {level: 0} // Disponible au niveau 1
        },

        // Ferme - produit de la nourriture
        farm: {
            name: "Ferme",
            description: "Produit de la nourriture pour votre population.",
            size: 1,
            canDelete: true,
            maxLevel: 3,
            costs: {
                initial: {gold: 150, wood: 80},
                upgrade: [
                    null,
                    {gold: 300, wood: 160},
                    {gold: 600, wood: 320}
                ]
            },
            production: [
                null,
                {food: 10},
                {food: 20},
                {food: 30}
            ],
            sprites: {
                1: "farm",
                2: "farm",  // À remplacer par les sprites réels des niveaux supérieurs
                3: "farm"
            },
            requirements: {level: 1} // Disponible au niveau 1
        },

        // Mine d'or - produit de l'or
        goldmine: {
            name: "Mine d'Or",
            description: "Extrait de l'or pour financer votre empire.",
            size: 2,
            canDelete: true,
            maxLevel: 3,
            costs: {
                initial: {gold: 300, wood: 100, stone: 50},
                upgrade: [
                    null,
                    {gold: 600, wood: 200, stone: 100},
                    {gold: 1200, wood: 400, stone: 200}
                ]
            },
            production: [
                null,
                {gold: 20},
                {gold: 40},
                {gold: 60}
            ],
            sprites: {
                1: "goldmine",
                2: "goldmine",
                3: "goldmine"
            },
            requirements: {level: 2} // Disponible au niveau 2 de l'hôtel de ville
        },

        // Scierie - produit du bois
        lumbermill: {
            name: "Scierie",
            description: "Transforme les arbres en bois utilisable pour la construction.",
            size: 2,
            canDelete: true,
            maxLevel: 3,
            costs: {
                initial: {gold: 250, wood: 50, stone: 50},
                upgrade: [
                    null,
                    {gold: 500, wood: 100, stone: 100},
                    {gold: 1000, wood: 200, stone: 200}
                ]
            },
            production: [
                null,
                {wood: 15},
                {wood: 30},
                {wood: 45}
            ],
            sprites: {
                1: "lumbermill",
                2: "lumbermill",
                3: "lumbermill"
            },
            requirements: {level: 2}
        },

        // Carrière - produit de la pierre
        quarry: {
            name: "Carrière",
            description: "Extrait de la pierre pour renforcer vos constructions.",
            size: 2,
            canDelete: true,
            maxLevel: 3,
            costs: {
                initial: {gold: 300, wood: 100},
                upgrade: [
                    null,
                    {gold: 600, wood: 200},
                    {gold: 1200, wood: 400}
                ]
            },
            production: [
                null,
                {stone: 10},
                {stone: 20},
                {stone: 30}
            ],
            sprites: {
                1: "quarry",
                2: "quarry",
                3: "quarry"
            },
            requirements: {level: 2}
        },

        // Marché - permet le commerce de ressources
        market: {
            name: "Marché",
            description: "Permet d'échanger des ressources et d'augmenter vos revenus commerciaux.",
            size: 2,
            canDelete: true,
            maxLevel: 3,
            costs: {
                initial: {gold: 400, wood: 200, stone: 100},
                upgrade: [
                    null,
                    {gold: 800, wood: 400, stone: 200},
                    {gold: 1600, wood: 800, stone: 400}
                ]
            },
            production: [
                null,
                {gold: 10},  // Bonus de revenus commerciaux
                {gold: 20},
                {gold: 30}
            ],
            specialAction: "storeResources", // Changé de tradeResources à storeResources
            sprites: {
                1: "market",
                2: "market",
                3: "market"
            },
            requirements: {level: 2}
        },

        // Caserne - permet de former des unités militaires
        barracks: {
            name: "Caserne",
            description: "Forme des soldats pour défendre votre empire.",
            size: 2,
            canDelete: true,
            maxLevel: 3,
            costs: {
                initial: {gold: 500, wood: 300, stone: 150},
                upgrade: [
                    null,
                    {gold: 1000, wood: 600, stone: 300},
                    {gold: 2000, wood: 1200, stone: 600}
                ]
            },
            specialAction: "trainUnits", // Action spéciale: former des unités
            trainableUnits: ["swordsman", "archer"],
            sprites: {
                1: "barracks",
                2: "barracks",
                3: "barracks"
            },
            requirements: {level: 3}
        },

        // Temple - génère des gemmes
        temple: {
            name: "Temple",
            description: "Un lieu sacré qui génère de rares gemmes magiques.",
            size: 2,
            canDelete: true,
            maxLevel: 3,
            costs: {
                initial: {gold: 1000, wood: 500, stone: 500},
                upgrade: [
                    null,
                    {gold: 2000, wood: 1000, stone: 1000},
                    {gold: 4000, wood: 2000, stone: 2000}
                ]
            },
            production: [
                null,
                {cash: 1},
                {cash: 2},
                {cash: 3}
            ],
            sprites: {
                1: "temple",
                2: "temple",
                3: "temple"
            },
            requirements: {level: 4}
        }
    },

    // Définition des types d'unités formables
    unitTypes: {
        villager: {
            name: "Villageois",
            description: "Un travailleur qui peut récolter des ressources et construire des bâtiments.",
            cost: {
                food: 50,
                wood: 20,
                gold: 20,
                stone: 10
            },
            trainingTime: 10,
            hitPoints: 25,
            damage: 3,
            speed: 1.2,
            range: 1,
            moveType: 'ground',
            icon: 'assets/icon/villager.svg',
            sprites: {
                static: 'assets/units/villager/villager.svg',
                moving: {
                    north: 'assets/units/villager/villager_north.json',
                    northeast: 'assets/units/villager/villager_northeast.json',
                    east: 'assets/units/villager/villager_east.json',
                    southeast: 'assets/units/villager/villager_southeast.json',
                    south: 'assets/units/villager/villager_south.json',
                    southwest: 'assets/units/villager/villager_southwest.json',
                    west: 'assets/units/villager/villager_west.json',
                    northwest: 'assets/units/villager/villager_northwest.json'
                }
            },
            requiredBuilding: 'townhall',
            requiredBuildingLevel: 1
        },
        swordsman: {
            name: "Épéiste",
            description: "Un soldat équipé d'une épée pour le combat rapproché.",
            cost: {
                gold: 100,
                food: 50
            },
            trainingTime: 15,
            hitPoints: 60,
            damage: 8,
            speed: 0.9,
            range: 1,
            moveType: 'ground',
            icon: 'assets/icon/swordsman.svg',
            requiredBuilding: 'barracks',
            requiredBuildingLevel: 1
        },
        archer: {
            name: "Archer",
            description: "Un soldat équipé d'un arc pour attaquer à distance.",
            cost: {
                gold: 80,
                wood: 40
            },
            trainingTime: 18,
            hitPoints: 40,
            damage: 6,
            speed: 1.0,
            range: 4,
            moveType: 'ground',
            icon: 'assets/icon/archer.svg',
            requiredBuilding: 'barracks',
            requiredBuildingLevel: 2
        },
        flyingUnit: {
            name: "Éclaireur Volant",
            description: "Une unité volante qui peut se déplacer par-dessus les obstacles.",
            cost: {
                gold: 150,
                wood: 30,
                stone: 20
            },
            trainingTime: 20,
            hitPoints: 35,
            damage: 5,
            speed: 1.5,
            range: 2,
            moveType: 'air',  // Type de déplacement aérien
            icon: 'assets/icon/flying.svg',
            requiredBuilding: 'temple',
            requiredBuildingLevel: 2
        }
    }
};
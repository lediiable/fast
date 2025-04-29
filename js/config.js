const config = {
    type: Phaser.CANVAS,
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: '#669C2C',
    parent: 'game-container',
    scene: [Boot, Preload, MainGame],
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    dom: {
        createContainer: true
    },
    // Options pour l'interface utilisateur
    ui: {
        // Tailles des éléments d'interface
        fontSize: {
            small: '12px',
            medium: '16px',
            large: '20px',
            title: '24px'
        },
        // Couleurs pour l'interface
        colors: {
            primary: '#4b6584',
            secondary: '#a5b1c2',
            success: '#20bf6b',
            danger: '#eb3b5a',
            warning: '#f7b731',
            info: '#3867d6',
            light: '#d1d8e0',
            dark: '#2f3542'
        }
    },
    // Options pour le jeu
    game: {
        // Économie
        economy: {
            startingResources: {
                gold: 1000,
                food: 500,
                wood: 300,
                stone: 200,
                cash: 10
            }
        },
        // Map
        map: {
            size: 100,
            constructibleSize: 60,
            startingSize: 20,
            cellSize: 64,
            isIsometric: true
        },
        // Bâtiments
        buildings: {
            // Coûts des bâtiments
            costs: {
                townhall: { gold: 500, wood: 250, stone: 100 },
                house: { gold: 100, wood: 50 },
                farm: { gold: 150, wood: 80 }
            },
            // Production des bâtiments
            production: {
                townhall: { gold: 5 },
                house: {},  // Les maisons augmentent la population, pas la production
                farm: { food: 10 }
            }
        }
    }
};
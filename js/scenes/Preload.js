class Preload extends Phaser.Scene {
    constructor() {
        super({key: 'Preload'});
    }

    preload() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        const loadingBg = this.add.image(width / 2, height / 2, 'loading-background');
        loadingBg.setDisplaySize(width, height);

        const progressBar = this.add.graphics();
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);

        const loadingText = this.make.text({
            x: width / 2,
            y: height / 2 - 50,
            text: 'Loading...',
            style: {
                font: '20px Arial',
                fill: '#ffffff'
            }
        });
        loadingText.setOrigin(0.5, 0.5);

        const percentText = this.make.text({
            x: width / 2,
            y: height / 2,
            text: '0%',
            style: {
                font: '18px Arial',
                fill: '#ffffff'
            }
        });
        percentText.setOrigin(0.5, 0.5);

        const assetText = this.make.text({
            x: width / 2,
            y: height / 2 + 50,
            text: '',
            style: {
                font: '18px Arial',
                fill: '#ffffff'
            }
        });
        assetText.setOrigin(0.5, 0.5);

        this.load.on('progress', function (value) {
            progressBar.clear();
            progressBar.fillStyle(0xffffff, 1);
            progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
            percentText.setText(parseInt(value * 100) + '%');
        });

        this.load.on('fileprogress', function (file) {
            assetText.setText('Loading asset: ' + file.key);
        });

        this.load.on('complete', function () {
            progressBar.destroy();
            progressBox.destroy();
            loadingText.destroy();
            percentText.destroy();
            assetText.destroy();
        });

        this.loadAssets();
    }

    loadAssets() {
        this.load.image('grass', 'templates/img/grass.png');
        this.load.image('forsale', 'assets/items/forsale.svg');

        this.load.image('townhall', 'assets/items/townhall/townhall.svg');
        this.load.image('townhall2', 'assets/items/townhall/townhall2.svg');
        this.load.image('townhall3', 'assets/items/townhall/townhall3.svg');
        this.load.image('townhall4', 'assets/items/townhall/townhall4.svg');

        this.load.image('house', 'assets/items/casa1.png');
        this.load.image('house2', 'assets/items/casa2.png');
        this.load.image('house3', 'assets/items/casa3.png');
        this.load.image('house4', 'assets/items/casa4.png');
        this.load.image('house5', 'assets/items/casa5.png');
        this.load.image('farm', 'assets/buildingthumbs/granja3.jpg');

        this.loadUnitSprites();
    }

    create() {
        this.createUnitAnimations();

        this.game.events.emit('loadingComplete');

        this.cameras.main.fadeOut(500);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('MainGame');
        });
    }

    loadUnitSprites() {
        for (const [unitType, unitData] of Object.entries(gameData.unitTypes)) {
            // Charger l'icône
            this.load.image(`${unitType}_icon`, unitData.icon || `assets/icon/${unitType}.svg`);

            // Charger le sprite statique
            if (unitData.sprites && unitData.sprites.static) {
                // Extraire le nom de fichier sans le chemin ni l'extension
                const staticFileName = unitData.sprites.static.split('/').pop();
                const staticKey = staticFileName.split('.')[0];

                this.load.image(staticKey, unitData.sprites.static);
            } else {
                // Fallback au sprite par défaut si aucun sprite statique n'est défini
                this.load.image(`${unitType}_static`, unitData.icon || `assets/icon/${unitType}.svg`);
            }

            // Charger les sprites d'animation pour chaque direction
            if (unitData.sprites && unitData.sprites.moving) {
                const directions = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];

                directions.forEach(direction => {
                    if (unitData.sprites.moving[direction]) {
                        const spritePath = unitData.sprites.moving[direction];

                        // Pour les sprites atlas (JSON)
                        if (spritePath.endsWith('.json')) {
                            const basePath = spritePath.slice(0, -5);
                            const imgPath = `${basePath}.png`;
                            const jsonPath = spritePath;

                            // Extraire le nom de base du fichier sans le chemin
                            const baseFileName = basePath.split('/').pop();

                            // Charger l'atlas
                            this.load.atlas(baseFileName, imgPath, jsonPath);
                        }
                        // Pour les images simples
                        else {
                            // Extraire le nom de fichier sans le chemin ni l'extension
                            const fileName = spritePath.split('/').pop();
                            const fileKey = fileName.split('.')[0];

                            this.load.image(fileKey, spritePath);
                        }
                    }
                });
            }
        }

        // Toujours charger le sprite par défaut
        this.load.image('default_unit', 'assets/icon/villager.svg');
    }

    createUnitAnimations() {
        for (const [unitType, unitData] of Object.entries(gameData.unitTypes)) {
            if (!unitData.sprites || !unitData.sprites.moving) continue;

            const directions = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];

            directions.forEach(direction => {
                if (unitData.sprites.moving[direction]) {
                    const spritePath = unitData.sprites.moving[direction];

                    // Pour les sprites atlas (JSON)
                    if (spritePath.endsWith('.json')) {
                        const baseFileName = spritePath.split('/').pop().split('.')[0];
                        const animKey = `${unitType}_${direction}`;

                        if (this.textures.exists(baseFileName)) {
                            // Essayer différents formats de nom de frame
                            const nameFormats = [
                                {prefix: '', start: 1, suffix: '.png', end: 12},
                                {prefix: '', start: 0, suffix: '.png', end: 11},
                                {prefix: `${direction}_`, start: 0, suffix: '', end: 11},
                                {prefix: 'frame_', start: 0, suffix: '', end: 11}
                            ];

                            for (const format of nameFormats) {
                                try {
                                    // Tenter de générer des frames avec ce format
                                    const frames = this.anims.generateFrameNames(baseFileName, {
                                        prefix: format.prefix,
                                        start: format.start,
                                        end: format.end,
                                        suffix: format.suffix
                                    });

                                    if (frames.length > 0) {
                                        // Créer l'animation si des frames sont trouvées
                                        if (!this.anims.exists(animKey)) {
                                            this.anims.create({
                                                key: animKey,
                                                frames: frames,
                                                frameRate: 10,
                                                repeat: -1
                                            });
                                        }
                                        break;
                                    }
                                } catch (e) {
                                    // Continuer avec le format suivant
                                }
                            }
                        }
                    }
                }
            });
        }
    }
}
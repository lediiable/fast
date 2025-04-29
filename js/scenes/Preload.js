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
    }

    create() {
        this.game.events.emit('loadingComplete');

        this.cameras.main.fadeOut(500);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('MainGame');
        });
    }
}
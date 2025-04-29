class Boot extends Phaser.Scene {
    constructor() {
        super({ key: 'Boot' });
    }

    preload() {
        this.load.image('loading-background', 'assets/loading/screen1.png');
    }

    create() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        const loadingBg = this.add.image(width / 2, height / 2, 'loading-background');
        loadingBg.setDisplaySize(width, height);

        this.time.delayedCall(700, () => {
            this.scene.start('Preload');
        });
    }
}
document.addEventListener('DOMContentLoaded', function() {
    const game = new Phaser.Game(config);

    // Référence au logo overlay
    const logoOverlay = document.getElementById('logo-overlay');

    // Cacher le logo quand le chargement est terminé
    game.events.on('loadingComplete', function() {
        if (logoOverlay) {
            logoOverlay.style.opacity = '0';
            setTimeout(() => {
                logoOverlay.style.display = 'none';
            }, 500);
        }
    });
});
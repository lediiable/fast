class EfficientUnitManager {
    constructor(scene, mapManager, buildingManager) {
        this.scene = scene;
        this.mapManager = mapManager;
        this.buildingManager = buildingManager;

        this.units = [];
        this.activeUnits = new Set();
        this.selectedUnit = null;
        this.trainingQueues = {};

        this.config = {
            unitScale: 0.7,
            moveSpeed: 100,
            pathFindingInterval: 100,
        };

        this.events = new Phaser.Events.EventEmitter();
    }

    init() {
        this.loadSavedUnits();
        this.setupTrainingProcessor();
        this.setupUpdateLoop();
    }

    findNearestFreePosition(x, y) {
        // Directions possibles (8 directions)
        const directions = [
            {dx: 0, dy: -1},  // Nord
            {dx: 1, dy: -1},  // Nord-Est
            {dx: 1, dy: 0},   // Est
            {dx: 1, dy: 1},   // Sud-Est
            {dx: 0, dy: 1},   // Sud
            {dx: -1, dy: 1},  // Sud-Ouest
            {dx: -1, dy: 0},  // Ouest
            {dx: -1, dy: -1}  // Nord-Ouest
        ];

        // Vérifier d'abord les positions adjacentes
        for (const dir of directions) {
            const newX = x + dir.dx;
            const newY = y + dir.dy;

            if (this.isPositionFree(newX, newY)) {
                return {x: newX, y: newY};
            }
        }

        // Si aucune position adjacente n'est libre, élargir la recherche
        for (let radius = 2; radius <= 5; radius++) {
            // Vérifier chaque position dans le carré de taille 2*radius+1
            for (let dx = -radius; dx <= radius; dx++) {
                for (let dy = -radius; dy <= radius; dy++) {
                    // Ne vérifier que les positions sur le périmètre
                    if (Math.abs(dx) === radius || Math.abs(dy) === radius) {
                        const newX = x + dx;
                        const newY = y + dy;

                        if (this.isPositionFree(newX, newY)) {
                            return {x: newX, y: newY};
                        }
                    }
                }
            }
        }

        // Aucune position libre trouvée dans un rayon raisonnable
        return null;
    }

    findPath(unit, startX, startY, targetX, targetY) {
        // Les unités aériennes peuvent toujours se déplacer directement
        if (unit.moveType === 'air') {
            return [{x: targetX, y: targetY}];
        }

        // Vérifier si la destination est occupée par un bâtiment
        let finalTarget = {x: targetX, y: targetY};
        if (!this.isPositionFreeBuildingOnly(targetX, targetY)) {
            // Trouver une position libre à proximité de la cible
            finalTarget = this.findNearestFreePosition(targetX, targetY) || {x: targetX, y: targetY};
            console.log(`Destination ajustée à (${finalTarget.x}, ${finalTarget.y}) car l'originale est occupée`);
        }

        // Distance directe
        const directDistance = this.heuristic(startX, startY, finalTarget.x, finalTarget.y);

        // Si la distance est courte (<=2), vérifier d'abord si le déplacement direct est possible
        // Notez que nous avons réduit la distance de 3 à 2 pour être plus prudent
        if (directDistance <= 2 && this.canMoveDirectStrict(startX, startY, finalTarget.x, finalTarget.y)) {
            return [{x: finalTarget.x, y: finalTarget.y}];
        }

        // Pour les unités terrestres, générer un chemin qui contourne les bâtiments avec A*
        const openSet = [{
            x: startX,
            y: startY,
            g: 0,
            h: this.heuristic(startX, startY, finalTarget.x, finalTarget.y),
            f: this.heuristic(startX, startY, finalTarget.x, finalTarget.y)
        }];

        const closedSet = new Set();
        const cameFrom = {};
        const gScore = {};
        gScore[`${startX},${startY}`] = 0;

        let iterations = 0;
        const maxIterations = 150; // Augmenté pour permettre une recherche plus approfondie

        while (openSet.length > 0 && iterations < maxIterations) {
            iterations++;

            // Trier les nœuds par score f = g + h (coût actuel + estimation restante)
            openSet.sort((a, b) => a.f - b.f);
            const current = openSet.shift();

            // Conversion en chaîne pour utilisation comme clé
            const currentKey = `${current.x},${current.y}`;

            // Si on a atteint la destination
            if (current.x === finalTarget.x && current.y === finalTarget.y) {
                const path = this.reconstructPath(cameFrom, current);
                return this.smoothPath(path);
            }

            // Ajouter au set fermé
            closedSet.add(currentKey);

            // Examiner tous les voisins (8 directions pour plus de flexibilité)
            const neighbors = this.getNeighbors(current.x, current.y);

            for (const neighbor of neighbors) {
                const neighborKey = `${neighbor.x},${neighbor.y}`;

                // Ignorer les voisins déjà traités
                if (closedSet.has(neighborKey)) continue;

                // CRITIQUE: Vérification stricte si la position est libre
                if (!this.isPositionFree(neighbor.x, neighbor.y)) continue;

                // CRITIQUE: Vérifier aussi si le déplacement direct entre points est possible
                if (!this.canMoveDirectStrict(current.x, current.y, neighbor.x, neighbor.y)) continue;

                // Calculer le coût du chemin jusqu'à ce voisin
                let moveCost = 1;
                if (neighbor.x !== current.x && neighbor.y !== current.y) {
                    moveCost = 1.4; // Approximation de sqrt(2) pour les diagonales
                }

                const tentativeG = gScore[currentKey] + moveCost;

                // Si ce voisin n'est pas dans l'ensemble ouvert ou si on a trouvé un meilleur chemin
                if (!gScore[neighborKey] || tentativeG < gScore[neighborKey]) {
                    // Mettre à jour les informations du voisin
                    cameFrom[neighborKey] = current;
                    gScore[neighborKey] = tentativeG;

                    const h = this.heuristic(neighbor.x, neighbor.y, finalTarget.x, finalTarget.y);

                    // Ajouter ou mettre à jour le voisin dans l'ensemble ouvert
                    const existingIndex = openSet.findIndex(n => n.x === neighbor.x && n.y === neighbor.y);

                    if (existingIndex === -1) {
                        openSet.push({
                            x: neighbor.x,
                            y: neighbor.y,
                            g: tentativeG,
                            h: h,
                            f: tentativeG + h
                        });
                    } else {
                        openSet[existingIndex].g = tentativeG;
                        openSet[existingIndex].f = tentativeG + h;
                    }
                }
            }
        }

        console.warn("Chemin A* non trouvé. Recherche du meilleur chemin partiel...");

        // Si on n'a pas trouvé de chemin complet, utiliser le meilleur point partiel
        if (closedSet.size > 0) {
            // Trouver le point le plus proche de la destination parmi ceux explorés
            let bestNode = null;
            let bestDistance = Infinity;

            closedSet.forEach(key => {
                const [x, y] = key.split(',').map(Number);
                const distance = this.heuristic(x, y, finalTarget.x, finalTarget.y);

                if (distance < bestDistance) {
                    bestDistance = distance;
                    bestNode = {x, y};
                }
            });

            if (bestNode) {
                const key = `${bestNode.x},${bestNode.y}`;
                if (cameFrom[key]) {
                    return this.smoothPath(this.reconstructPath(cameFrom, bestNode));
                }
            }
        }

        console.warn("ATTENTION: Utilisation d'un chemin direct en dernier recours");
        // Essayons une dernière fois avec un chemin direct
        if (this.canMoveDirectStrict(startX, startY, finalTarget.x, finalTarget.y)) {
            return [{x: finalTarget.x, y: finalTarget.y}];
        }

        // Vraiment aucune solution - informer le joueur
        this.scene.uiManager.showMessage("Chemin bloqué! Impossible d'atteindre cette destination", 2000);
        return [];
    }

    smoothPath(path) {
        if (!path || path.length <= 2) return path;

        const smoothedPath = [path[0]];
        let currentIndex = 0;

        while (currentIndex < path.length - 1) {
            const current = smoothedPath[smoothedPath.length - 1];

            let furthestReachable = currentIndex + 1;

            if (this.canMoveDirectStrict(current.x, current.y, path[path.length - 1].x, path[path.length - 1].y)) {
                furthestReachable = path.length - 1;
            } else {
                for (let i = path.length - 2; i > currentIndex; i--) {
                    if (this.canMoveDirectStrict(current.x, current.y, path[i].x, path[i].y)) {
                        furthestReachable = i;
                        break;
                    }
                }
            }

            if (furthestReachable !== currentIndex) {
                smoothedPath.push(path[furthestReachable]);
                currentIndex = furthestReachable;
            } else {
                smoothedPath.push(path[currentIndex + 1]);
                currentIndex++;
            }
        }

        return smoothedPath;
    }

    heuristic(x1, y1, x2, y2) {
        return Math.abs(x1 - x2) + Math.abs(y1 - y2);
    }

    getNeighbors(x, y) {
        // 8 directions possibles pour plus de flexibilité dans le pathfinding
        const directions = [
            {dx: 0, dy: -1},  // Nord
            {dx: 1, dy: 0},   // Est
            {dx: 0, dy: 1},   // Sud
            {dx: -1, dy: 0},  // Ouest
            {dx: 1, dy: -1},  // Nord-Est
            {dx: 1, dy: 1},   // Sud-Est
            {dx: -1, dy: 1},  // Sud-Ouest
            {dx: -1, dy: -1}  // Nord-Ouest
        ];

        return directions.map(dir => ({
            x: x + dir.dx,
            y: y + dir.dy
        }));
    }

    reconstructPath(cameFrom, current) {
        const path = [current];
        let currentKey = `${current.x},${current.y}`;

        while (cameFrom[currentKey]) {
            current = cameFrom[currentKey];
            currentKey = `${current.x},${current.y}`;
            path.unshift(current);
        }

        // Supprimer le premier point du chemin car c'est la position actuelle
        path.shift();

        return path;
    }

    isPositionFreeBuildingOnly(x, y) {
        // Vérifier s'il y a un bâtiment à cette position
        for (const building of this.buildingManager.buildings) {
            // Utiliser la méthode améliorée pour vérifier si un point est dans un bâtiment
            if (this.isPositionInBuilding(x, y, building)) {
                return false;
            }
        }
        return true;
    }

    isPositionInBuilding(gridX, gridY, building) {
        const buildingX = building.x;
        const buildingY = building.y;
        const buildingSize = building.size || 1;

        // Vérifier si la position est à l'intérieur du rectangle du bâtiment
        // C'est la vérification standard pour un bâtiment rectangulaire
        return (
            gridX >= buildingX && gridX < buildingX + buildingSize &&
            gridY >= buildingY && gridY < buildingY + buildingSize
        );
    }

    isPositionFree(x, y) {
        // Vérifier si la position est dans une région débloquée
        if (!this.mapManager.isRegionUnlocked(this.mapManager.getRegionIdForPosition(x, y))) {
            return false;
        }

        // Vérifier s'il y a un bâtiment à cette position
        if (!this.isPositionFreeBuildingOnly(x, y)) {
            return false;
        }

        // Vérifier s'il y a une autre unité à cette position
        for (const unit of this.units) {
            if (unit.x === x && unit.y === y) {
                return false;
            }
        }

        return true;
    }

    canMoveDirect(startX, startY, targetX, targetY) {
        const dx = targetX - startX;
        const dy = targetY - startY;
        const steps = Math.max(Math.abs(dx), Math.abs(dy));

        if (steps === 0) return true;

        const xStep = dx / steps;
        const yStep = dy / steps;

        // Vérifier chaque point sur la ligne avec une tolérance pour les bâtiments
        for (let i = 1; i <= steps; i++) {
            const checkX = Math.round(startX + xStep * i);
            const checkY = Math.round(startY + yStep * i);

            // Vérifier les bâtiments avec plus de précision
            // Pour chaque position, vérifier également les positions adjacentes pour gérer le cas
            // où la ligne passe entre les "pixels" de la grille mais traverserait quand même un bâtiment
            for (let ox = -1; ox <= 1; ox++) {
                for (let oy = -1; oy <= 1; oy++) {
                    // Ne vérifier que les positions sur la ligne et les positions adjacentes directes
                    if (ox === 0 || oy === 0) {
                        if (!this.isPositionFreeBuildingOnly(checkX + ox, checkY + oy)) {
                            return false;
                        }
                    }
                }
            }
        }

        return true;
    }

    updateUnitMovement(unit) {
        if (!unit.isMoving || !unit.path || unit.path.length === 0) {
            this.setUnitSprite(unit, 'static');
            return;
        }

        const currentX = unit.x;
        const currentY = unit.y;

        const targetPoint = unit.path[0];
        const targetX = targetPoint.x;
        const targetY = targetPoint.y;

        let targetWorldX, targetWorldY;
        const cellSize = this.mapManager.config.cellSize;

        // Calculer les coordonnées mondiales de la cible
        if (this.mapManager.config.isIsometric) {
            targetWorldX = (targetX - targetY) * cellSize / 2;
            targetWorldY = (targetX + targetY) * cellSize / 4;
        } else {
            targetWorldX = targetX * cellSize;
            targetWorldY = targetY * cellSize;
        }

        // Calculer la distance et la direction vers la cible
        const dx = targetWorldX - unit.sprite.x;
        const dy = targetWorldY - unit.sprite.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Mettre à jour l'animation de l'unité selon la direction
        // Mais seulement si le déplacement est significatif pour éviter les rotations erratiques
        if (distance > 2) {
            this.updateUnitDirection(unit, dx, dy);
        }

        // Si l'unité est presque arrivée à sa destination
        if (distance < 5) {
            // Mettre à jour les coordonnées de grille de l'unité
            unit.x = targetX;
            unit.y = targetY;

            // Supprimer ce point du chemin
            unit.path.shift();

            // Si c'était le dernier point du chemin
            if (unit.path.length === 0) {
                unit.isMoving = false;

                // Mettre à jour les coordonnées dans les données sauvegardées
                const savedUnit = gameData.units.find(u => u.id === unit.id);
                if (savedUnit) {
                    savedUnit.x = unit.x;
                    savedUnit.y = unit.y;
                }

                // Remettre le sprite statique
                this.setUnitSprite(unit, 'static');

                // Retirer l'unité de la liste des unités actives
                this.activeUnits.delete(unit);

                // Émettre un événement pour signaler que l'unité a été déplacée
                this.scene.gameEventEmitter.emit('unitMoved', unit);

                return;
            }
        } else {
            // Calculer le mouvement en fonction de la vitesse de l'unité
            const speed = unit.stats.speed * this.config.moveSpeed / 10;
            const moveDistance = Math.min(speed, distance);
            const moveRatio = moveDistance / distance;

            // Déplacer le sprite de l'unité
            unit.sprite.x += dx * moveRatio;
            unit.sprite.y += dy * moveRatio;

            // Déplacer aussi l'indicateur de sélection si présent
            if (unit.selectionIndicator) {
                unit.selectionIndicator.setPosition(unit.sprite.x, unit.sprite.y);
            }
        }
    }

    setupUpdateLoop() {
        this.scene.events.on('update', (time, delta) => {
            Array.from(this.activeUnits).forEach(unit => {
                if (unit.isMoving) {
                    this.updateUnitMovement(unit);
                } else {
                    this.activeUnits.delete(unit);
                }
            });
        });
    }

    updateUnitDirection(unit, dx, dy) {
        // Calculer l'angle seulement si le déplacement est significatif
        if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) return;

        let angle = Math.atan2(dy, dx);
        if (angle < 0) angle += 2 * Math.PI;

        // Définir les plages d'angles pour chaque direction
        const directions = [
            {name: 'east', min: 0, max: Math.PI / 4},
            {name: 'southeast', min: Math.PI / 4, max: Math.PI * 3 / 4},
            {name: 'south', min: Math.PI * 3 / 4, max: Math.PI * 5 / 4},
            {name: 'southwest', min: Math.PI * 5 / 4, max: Math.PI * 7 / 4},
            {name: 'west', min: Math.PI * 7 / 4, max: Math.PI * 2}
        ];

        // Déterminer la direction en fonction de l'angle
        let direction = unit.currentDirection; // Garder la même direction par défaut

        for (const dir of directions) {
            if (angle >= dir.min && angle < dir.max) {
                direction = dir.name;
                break;
            }
        }

        // Vérifier si la direction est au nord (cas spécial à cheval sur 0 et 2π)
        if (angle >= 0 && angle < Math.PI / 8 || angle >= Math.PI * 15 / 8 && angle < Math.PI * 2) {
            direction = 'east';
        }

        // Changer d'animation seulement si la direction a changé et reste stable
        if (!unit.lastDirectionChangeTime ||
            Date.now() - unit.lastDirectionChangeTime > 200) { // Au moins 200ms entre les changements

            if (unit.currentDirection !== direction) {
                unit.currentDirection = direction;
                unit.lastDirectionChangeTime = Date.now();
                this.setUnitSprite(unit, 'moving', direction);
            }
        }
    }

    loadSavedUnits() {
        if (gameData.units && Array.isArray(gameData.units)) {
            gameData.units.forEach(unitData => {
                this.createUnitFromData(unitData);
            });
        } else {
            gameData.units = [];
        }
    }

    createUnitFromData(unitData) {
        const unitTypeInfo = gameData.unitTypes[unitData.type];
        if (!unitTypeInfo) {
            console.error(`Type d'unité inconnu dans les données chargées: ${unitData.type}`);
            return null;
        }

        const {x, y} = unitData;
        let worldX, worldY;
        const cellSize = this.mapManager.config.cellSize;

        if (this.mapManager.config.isIsometric) {
            worldX = (x - y) * cellSize / 2;
            worldY = (x + y) * cellSize / 4;
        } else {
            worldX = x * cellSize;
            worldY = y * cellSize;
        }

        // Choisir la texture à utiliser pour cette unité
        const staticTexture = this.getUnitStaticTexture(unitData.type);

        // Créer le sprite
        const unitSprite = this.scene.add.sprite(worldX, worldY, staticTexture);
        unitSprite.setScale(this.config.unitScale);

        // Calculer les stats en fonction du niveau
        const unitStats = this.calculateUnitStats(unitTypeInfo, unitData.level || 1);

        // Créer l'objet unité complète
        const unit = {
            id: unitData.id || Date.now() + Math.floor(Math.random() * 1000),
            type: unitData.type,
            level: unitData.level || 1,
            x: x,
            y: y,
            stats: unitStats,
            sprite: unitSprite,
            isMoving: false,
            moveTarget: null,
            path: [],
            moveType: unitData.moveType || unitTypeInfo.moveType || 'ground',
            currentDirection: 'south',
        };

        // Ajouter l'interactivité
        unitSprite.setInteractive();
        unitSprite.on('pointerdown', () => {
            this.onUnitClicked(unit);
        });

        // Enregistrer l'unité et créer ses animations
        this.units.push(unit);
        this.createAnimationsForUnit(unit);

        console.log(`Unité chargée: ${unitData.type} (ID: ${unit.id}) à la position (${x}, ${y})`);
        return unit;
    }

    getUnitStaticTexture(unitType) {
        const unitTypeData = gameData.unitTypes[unitType];
        if (!unitTypeData) return 'default_unit';

        // Options possibles pour la texture statique dans l'ordre de priorité
        const options = [];

        // 1. Si sprites.static est défini, utiliser son nom de base
        if (unitTypeData.sprites && unitTypeData.sprites.static) {
            const staticPath = unitTypeData.sprites.static;
            options.push(staticPath.split('/').pop().split('.')[0]);
        }

        // 2. Nom du type + _static
        options.push(`${unitType}_static`);

        // 3. Juste le nom du type
        options.push(unitType);

        // 4. Utiliser une icône s'il y en a une
        if (unitTypeData.icon) {
            options.push(unitTypeData.icon.split('/').pop().split('.')[0]);
        }

        // 5. Pas de fallback codé en dur - utiliser 'default_unit' à la fin

        // Choisir la première texture qui existe
        for (const option of options) {
            if (option && this.scene.textures.exists(option)) {
                console.log(`Texture trouvée pour ${unitType}: ${option}`);
                return option;
            }
        }

        // Si aucune texture n'est trouvée, on utilise default_unit et on log pour debug
        console.warn(`Aucune texture trouvée pour l'unité ${unitType}. Utilisation de default_unit.`);
        return 'default_unit';
    }

    createAnimationsForUnit(unit) {
        const unitTypeData = gameData.unitTypes[unit.type];
        if (!unitTypeData || !unitTypeData.sprites || !unitTypeData.sprites.moving) {
            // Pas d'animations définies pour cette unité
            return;
        }

        const directions = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];

        directions.forEach(direction => {
            if (unitTypeData.sprites.moving[direction]) {
                const spritePath = unitTypeData.sprites.moving[direction];
                const animKey = `${unit.type}_${direction}`;

                // Éviter de recréer des animations existantes
                if (this.scene.anims.exists(animKey)) {
                    return;
                }

                // Pour les atlas JSON
                if (spritePath.endsWith('.json')) {
                    const baseName = spritePath.split('/').pop().split('.')[0];

                    if (this.scene.textures.exists(baseName)) {
                        // Créer l'animation à partir des frames disponibles
                        this.tryCreateAnimation(animKey, baseName, direction);
                    } else {
                        console.warn(`Texture atlas non trouvée pour ${unit.type}_${direction}: ${baseName}`);
                    }
                } else {
                    // Pour les frames individuelles ou autres types de sprites
                    console.log(`Animation non créée pour ${unit.type}_${direction}: format non supporté`);
                }
            }
        });
    }

    tryCreateAnimation(animKey, baseTexture, direction) {
        // Formats possibles pour les noms de frames
        const nameFormats = [
            {prefix: '', start: 1, suffix: '.png', end: 12},
            {prefix: '', start: 0, suffix: '.png', end: 11},
            {prefix: `${direction}_`, start: 0, suffix: '', end: 11},
            {prefix: 'frame_', start: 0, suffix: '', end: 11}
        ];

        for (const format of nameFormats) {
            try {
                // Tenter de générer des frames avec ce format
                const frames = this.scene.anims.generateFrameNames(baseTexture, {
                    prefix: format.prefix,
                    start: format.start,
                    end: format.end,
                    suffix: format.suffix
                });

                if (frames && frames.length > 0) {
                    // Créer l'animation avec les frames trouvées
                    this.scene.anims.create({
                        key: animKey,
                        frames: frames,
                        frameRate: 10,
                        repeat: -1
                    });

                    console.log(`Animation créée pour ${animKey} avec ${frames.length} frames`);
                    return true;
                }
            } catch (e) {
                // Continuer avec le format suivant
                console.debug(`Format ${format.prefix}[n]${format.suffix} non valide pour ${baseTexture}`);
            }
        }

        console.warn(`Impossible de créer l'animation ${animKey}: aucun format de frame valide trouvé`);
        return false;
    }

    createUnit(unitType, building, level = 1) {
        const unitTypeData = gameData.unitTypes[unitType];
        if (!unitTypeData) {
            console.error(`Type d'unité inconnu: ${unitType}`);
            return null;
        }

        level = Math.min(level, building.level);

        const spawnPosition = this.findSpawnPosition(building);
        if (!spawnPosition) {
            console.warn(`Impossible de trouver une position de spawn pour l'unité ${unitType}`);
            return null;
        }

        const {gridX, gridY, worldX, worldY} = spawnPosition;

        // Utiliser la fonction getUnitStaticTexture pour trouver la texture disponible
        const staticTexture = this.getUnitStaticTexture(unitType);
        const unitSprite = this.scene.add.sprite(worldX, worldY, staticTexture);
        unitSprite.setScale(this.config.unitScale);

        // Créer les stats de l'unité d'après les données de gameData
        const unitStats = this.calculateUnitStats(unitTypeData, level);

        const unit = {
            id: Date.now() + Math.floor(Math.random() * 1000),
            type: unitType,
            level: level,
            x: gridX,
            y: gridY,
            stats: unitStats,
            sprite: unitSprite,
            isMoving: false,
            moveTarget: null,
            path: [],
            moveType: unitTypeData.moveType || 'ground',
            currentDirection: 'south',
        };

        unitSprite.setInteractive();
        unitSprite.on('pointerdown', () => {
            this.onUnitClicked(unit);
        });

        this.units.push(unit);
        this.createAnimationsForUnit(unit);

        // Sauvegarder les données de l'unité dans gameData
        const unitData = {
            id: unit.id,
            type: unitType,
            level: level,
            x: gridX,
            y: gridY,
            moveType: unit.moveType
        };

        gameData.units.push(unitData);

        // Mettre à jour la population
        gameData.resources.population += 1;
        this.scene.gameEventEmitter.emit('resourcesChanged');

        // Émettre des événements
        this.events.emit('unitCreated', unit);
        this.scene.gameEventEmitter.emit('unitCreated', unit);

        console.log(`Unité ${unitType} (ID: ${unit.id}) créée avec succès à la position (${gridX}, ${gridY})`);
        return unit;
    }

    calculateUnitStats(baseStats, level) {
        const levelMultiplier = 1 + (level - 1) * 0.2;

        return {
            hitPoints: Math.floor(baseStats.hitPoints * levelMultiplier),
            damage: Math.floor(baseStats.damage * levelMultiplier),
            speed: baseStats.speed * (1 + (level - 1) * 0.1),
            range: baseStats.range,
        };
    }

    findSpawnPosition(building) {
        const size = building.size || 1;
        const cellSize = this.mapManager.config.cellSize;
        const directions = [
            {dx: 0, dy: -1},
            {dx: 1, dy: 0},
            {dx: 0, dy: 1},
            {dx: -1, dy: 0},
            {dx: 1, dy: -1},
            {dx: 1, dy: 1},
            {dx: -1, dy: 1},
            {dx: -1, dy: -1}
        ];

        for (const dir of directions) {
            const gridX = building.x + size * dir.dx;
            const gridY = building.y + size * dir.dy;

            if (this.isPositionFree(gridX, gridY)) {
                let worldX, worldY;

                if (this.mapManager.config.isIsometric) {
                    worldX = (gridX - gridY) * cellSize / 2;
                    worldY = (gridX + gridY) * cellSize / 4;
                } else {
                    worldX = gridX * cellSize;
                    worldY = gridY * cellSize;
                }

                return {gridX, gridY, worldX, worldY};
            }
        }

        return null;
    }

    onUnitClicked(unit) {
        // Note: Cette méthode est conservée pour la compatibilité avec le code existant,
        // mais elle n'est plus utilisée activement lorsque le SelectionManager est activé.

        // Si le gestionnaire de sélection est disponible, l'utiliser
        if (this.scene.selectionManager) {
            // Déléguer la gestion du clic au SelectionManager
            this.scene.selectionManager.handleUnitClick(unit);
            return;
        }

        // Code de secours au cas où le SelectionManager n'est pas disponible
        if (this.selectedUnit) {
            if (this.selectedUnit.selectionIndicator) {
                this.selectedUnit.selectionIndicator.destroy();
                this.selectedUnit.selectionIndicator = null;
            }
        }

        if (this.selectedUnit === unit) {
            this.selectedUnit = null;
            return;
        }

        this.selectedUnit = unit;

        const selectionIndicator = this.scene.add.graphics();
        selectionIndicator.lineStyle(2, 0x00ff00, 1);
        selectionIndicator.strokeCircle(0, 0, 16);
        selectionIndicator.setPosition(unit.sprite.x, unit.sprite.y);
        unit.selectionIndicator = selectionIndicator;

        if (this.scene.uiManager) {
            this.scene.uiManager.showUnitInterface(unit);
        }

        this.setupMoveEvent();
    }

    setupMoveEvent() {
        // Note: Cette méthode est conservée pour la compatibilité avec le code existant,
        // mais elle n'est plus utilisée activement lorsque le SelectionManager est activé.

        // Si le gestionnaire de sélection est disponible, ne pas configurer d'écouteur ici
        if (this.scene.selectionManager) {
            return;
        }

        // Code de secours au cas où le SelectionManager n'est pas disponible
        if (this._moveListener) {
            this.scene.input.off('pointerdown', this._moveListener);
        }

        this._moveListener = (pointer) => {
            // Ignore les clics sur les éléments d'interface autres que le canvas
            if (pointer.downElement && pointer.downElement.tagName !== 'CANVAS') return;

            // Si aucune unité n'est sélectionnée, ne rien faire
            if (!this.selectedUnit) return;

            // Convertir les coordonnées d'écran en coordonnées de grille
            const gridCoords = this.mapManager.screenToGrid(pointer.x, pointer.y);

            // Déplacer l'unité à cet endroit
            this.moveUnitTo(this.selectedUnit, gridCoords.x, gridCoords.y);
        };

        this.scene.input.on('pointerdown', this._moveListener);
    }

    moveUnitTo(unit, targetX, targetY) {
        // Vérifier d'abord si la destination est valide
        if (!this.isValidMoveTarget(unit, targetX, targetY)) {
            if (this.scene.uiManager) {
                this.scene.uiManager.showMessage("Destination inaccessible", 1500);
            }
            return false;
        }

        // Si la destination est un bâtiment pour une unité terrestre, trouver automatiquement une position proche
        if (unit.moveType !== 'air' && !this.isPositionFreeBuildingOnly(targetX, targetY)) {
            const nearbyPos = this.findNearestFreePosition(targetX, targetY);
            if (nearbyPos) {
                targetX = nearbyPos.x;
                targetY = nearbyPos.y;
                console.log(`Destination ajustée automatiquement à (${targetX}, ${targetY})`);
            } else {
                // Si impossible de trouver une position libre à proximité
                if (this.scene.uiManager) {
                    this.scene.uiManager.showMessage("Aucun accès possible à cet endroit", 1500);
                }
                return false;
            }
        }

        // Calculer le chemin avec notre algorithme amélioré
        const path = this.findPath(unit, unit.x, unit.y, targetX, targetY);

        // Si aucun chemin n'est trouvé
        if (!path || path.length === 0) {
            if (this.scene.uiManager) {
                this.scene.uiManager.showMessage("Impossible de trouver un chemin", 1500);
            }
            return false;
        }

        // Vérifier si la destination est occupée par une autre unité
        if (this.isOccupiedByUnit(targetX, targetY, unit)) {
            const alternativePosition = this.findNearestFreePosition(targetX, targetY);
            if (alternativePosition) {
                // Recalculer le chemin vers la position alternative
                const newPath = this.findPath(unit, unit.x, unit.y, alternativePosition.x, alternativePosition.y);
                if (newPath && newPath.length > 0) {
                    unit.moveTarget = {x: alternativePosition.x, y: alternativePosition.y};
                    unit.path = newPath;
                } else {
                    // En cas d'échec, utiliser le chemin original
                    unit.moveTarget = {x: targetX, y: targetY};
                    unit.path = path;
                }
            } else {
                unit.moveTarget = {x: targetX, y: targetY};
                unit.path = path;
            }
        } else {
            unit.moveTarget = {x: targetX, y: targetY};
            unit.path = path;
        }

        unit.isMoving = true;
        this.activeUnits.add(unit);

        return true;
    }

    isOccupiedByUnit(x, y, excludedUnit = null) {
        return this.units.some(unit => {
            return unit !== excludedUnit && unit.x === x && unit.y === y;
        });
    }

    isValidMoveTarget(unit, targetX, targetY) {
        if (unit.moveType === 'air') {
            return this.mapManager.isRegionUnlocked(
                this.mapManager.getRegionIdForPosition(targetX, targetY)
            );
        }

        return this.isPositionFree(targetX, targetY);
    }

    setUnitSprite(unit, state, direction = null) {
        if (!unit || !unit.sprite) return;

        const unitType = unit.type;
        const unitTypeData = gameData.unitTypes[unitType];
        if (!unitTypeData) {
            console.warn(`Données manquantes pour le type d'unité: ${unitType}`);
            return;
        }

        if (state === 'static') {
            // Utiliser la fonction getUnitStaticTexture pour récupérer la meilleure texture disponible
            const staticTexture = this.getUnitStaticTexture(unitType);

            try {
                unit.sprite.setTexture(staticTexture);
            } catch (e) {
                console.warn(`Erreur lors du changement de texture pour ${unitType}: ${e.message}`);
                // En cas d'erreur, essayer d'utiliser default_unit
                if (this.scene.textures.exists('default_unit')) {
                    unit.sprite.setTexture('default_unit');
                }
            }

            // Arrêter l'animation si elle est en cours
            if (unit.sprite.anims && unit.sprite.anims.isPlaying) {
                unit.sprite.anims.stop();
            }
        } else if (state === 'moving' && direction) {
            // Vérifier si l'animation existe avant de l'utiliser
            const animKey = `${unitType}_${direction}`;
            if (this.scene.anims.exists(animKey)) {
                unit.sprite.play(animKey);
            } else {
                // Essayer de trouver une image statique pour cette direction
                const dirTexture = this.getDirectionalTexture(unitType, direction);
                if (dirTexture && this.scene.textures.exists(dirTexture)) {
                    unit.sprite.setTexture(dirTexture);
                } else {
                    // Revenir au sprite statique si pas d'animation ni de sprite directionnel
                    this.setUnitSprite(unit, 'static');
                }
            }
        }
    }

    getDirectionalTexture(unitType, direction) {
        const unitTypeData = gameData.unitTypes[unitType];
        if (!unitTypeData || !unitTypeData.sprites || !unitTypeData.sprites.moving) {
            return null;
        }

        // Si la direction a un sprite spécifique, essayer d'extraire son nom
        if (unitTypeData.sprites.moving[direction]) {
            const spritePath = unitTypeData.sprites.moving[direction];
            if (spritePath.endsWith('.json')) {
                // Pour les atlas JSON, utiliser le nom de base
                return spritePath.split('/').pop().split('.')[0];
            } else if (spritePath.endsWith('.svg') ||
                spritePath.endsWith('.png') ||
                spritePath.endsWith('.jpg')) {
                // Pour les images, extraire le nom sans extension
                return spritePath.split('/').pop().split('.')[0];
            }
        }

        // Si pas de sprite directionnel, construire un nom basé sur le type et la direction
        return `${unitType}_${direction}`;
    }

    setupTrainingProcessor() {
        this.scene.time.addEvent({
            delay: 1000,
            callback: this.processTrainingQueues,
            callbackScope: this,
            loop: true
        });
    }

    processTrainingQueues() {
        Object.keys(this.trainingQueues).forEach(buildingId => {
            const queue = this.trainingQueues[buildingId];

            if (queue && queue.length > 0) {
                const trainingItem = queue[0];

                trainingItem.elapsedTime += 1;

                if (trainingItem.elapsedTime >= trainingItem.unitData.trainingTime) {
                    queue.shift();

                    const building = this.buildingManager.getBuildingById(parseInt(buildingId));

                    if (building) {
                        this.createUnit(trainingItem.unitData.type, building, building.level);
                    } else {
                        console.error("Bâtiment de formation non trouvé:", buildingId);
                    }

                    this.events.emit('trainingQueueChanged', buildingId, queue);
                }
            }
        });
    }

    trainUnit(unitType, buildingId) {
        const building = this.buildingManager.getBuildingById(buildingId);
        if (!building) return false;

        const unitTypeData = gameData.unitTypes[unitType];
        if (!unitTypeData) return false;

        const buildingType = gameData.buildingTypes[building.type];
        if (!buildingType.trainableUnits || !buildingType.trainableUnits.includes(unitType)) {
            return false;
        }

        if (building.level < unitTypeData.requiredBuildingLevel) {
            return false;
        }

        const cost = unitTypeData.cost;
        for (const [resource, amount] of Object.entries(cost)) {
            if (gameData.resources[resource] < amount) {
                return false;
            }
        }

        for (const [resource, amount] of Object.entries(cost)) {
            gameData.resources[resource] -= amount;
        }

        this.scene.gameEventEmitter.emit('resourcesChanged');

        if (!this.trainingQueues[buildingId]) {
            this.trainingQueues[buildingId] = [];
        }

        const trainingItem = {
            unitData: {
                type: unitType,
                level: building.level,
                trainingTime: unitTypeData.trainingTime
            },
            elapsedTime: 0
        };

        this.trainingQueues[buildingId].push(trainingItem);

        this.events.emit('trainingQueueChanged', buildingId, this.trainingQueues[buildingId]);

        return true;
    }

    getTrainingQueue(buildingId) {
        return this.trainingQueues[buildingId] || [];
    }

    cancelTraining(buildingId, index) {
        const queue = this.trainingQueues[buildingId];

        if (!queue || index >= queue.length) {
            return false;
        }

        const trainingItem = queue[index];
        const unitType = trainingItem.unitData.type;
        const unitTypeData = gameData.unitTypes[unitType];

        const refundRate = 0.8;
        const cost = unitTypeData.cost;

        for (const [resource, amount] of Object.entries(cost)) {
            gameData.resources[resource] += Math.floor(amount * refundRate);
        }

        queue.splice(index, 1);

        this.events.emit('trainingQueueChanged', buildingId, queue);
        this.scene.gameEventEmitter.emit('resourcesChanged');

        return true;
    }

    removeUnit(unit) {
        const index = this.units.findIndex(u => u.id === unit.id);

        if (index !== -1) {
            this.units.splice(index, 1);
            this.activeUnits.delete(unit);

            const savedIndex = gameData.units.findIndex(u => u.id === unit.id);
            if (savedIndex !== -1) {
                gameData.units.splice(savedIndex, 1);
            }

            gameData.resources.population -= 1;
            this.scene.gameEventEmitter.emit('resourcesChanged');

            if (unit.selectionIndicator) {
                unit.selectionIndicator.destroy();
            }

            if (unit.sprite) {
                unit.sprite.destroy();
            }

            // Émettre un événement pour que d'autres systèmes puissent réagir
            this.events.emit('unitRemoved', unit);

            return true;
        }

        return false;
    }

    getUnitById(id) {
        return this.units.find(unit => unit.id === id);
    }

    isBuildingNearby(x, y, radius = 1) {
        for (let dx = -radius; dx <= radius; dx++) {
            for (let dy = -radius; dy <= radius; dy++) {
                const checkX = x + dx;
                const checkY = y + dy;

                if (!this.isPositionFreeBuildingOnly(checkX, checkY)) {
                    return true;
                }
            }
        }
        return false;
    }

    pointToLineDistance(pointX, pointY, lineX1, lineY1, lineX2, lineY2) {
        // Distance d'un point à une ligne définie par deux points
        const A = pointX - lineX1;
        const B = pointY - lineY1;
        const C = lineX2 - lineX1;
        const D = lineY2 - lineY1;

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;

        if (lenSq !== 0) {
            param = dot / lenSq;
        }

        let xx, yy;

        if (param < 0) {
            xx = lineX1;
            yy = lineY1;
        } else if (param > 1) {
            xx = lineX2;
            yy = lineY2;
        } else {
            xx = lineX1 + param * C;
            yy = lineY1 + param * D;
        }

        const dx = pointX - xx;
        const dy = pointY - yy;

        return Math.sqrt(dx * dx + dy * dy);
    }

    canMoveDirectStrict(startX, startY, targetX, targetY) {
        const dx = targetX - startX;
        const dy = targetY - startY;
        const steps = Math.max(Math.abs(dx), Math.abs(dy)) * 2; // Doubler les points vérifiés pour plus de précision

        if (steps === 0) return true;

        const xStep = dx / steps;
        const yStep = dy / steps;

        // Vérifier TOUS les points intermédiaires
        for (let i = 1; i < steps; i++) {
            const checkX = Math.floor(startX + xStep * i);
            const checkY = Math.floor(startY + yStep * i);

            // Vérification stricte des points intermédiaires
            if (!this.isPositionFreeBuildingOnly(checkX, checkY)) {
                return false;
            }

            // Vérifier aussi les points adjacents sur le chemin pour éviter que les unités
            // ne passent entre les "pixels" de la grille
            const offsetsToCheck = [
                {x: 0, y: 1}, {x: 1, y: 0}, {x: 0, y: -1}, {x: -1, y: 0}
            ];

            for (const offset of offsetsToCheck) {
                const adjacentX = checkX + offset.x;
                const adjacentY = checkY + offset.y;

                // Si un bâtiment est détecté à proximité immédiate du chemin, considérer le chemin comme bloqué
                if (!this.isPositionFreeBuildingOnly(adjacentX, adjacentY)) {
                    // Vérifier si le point est vraiment proche de la ligne de déplacement
                    const distToLine = this.pointToLineDistance(
                        adjacentX, adjacentY,
                        startX, startY,
                        targetX, targetY
                    );

                    // Si le point est suffisamment proche de la ligne de déplacement, bloquer
                    if (distToLine < 0.8) {
                        return false;
                    }
                }
            }
        }

        return true;
    }


}
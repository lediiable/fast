class UIManager {
    constructor(scene, mapManager) {
        this.scene = scene;
        this.mapManager = mapManager;

        // État de l'interface
        this.buildMode = {
            active: false,
            selectedBuilding: null,
            placementGhost: null
        };

        // Références à l'interface
        this.resourcesUI = null;
        this.buildingsUI = null;
        this.tooltipUI = null;
        this.resources = this.preloadResources();

    }

    preloadResources() {
        return [
            {key: 'gold', icon: 'assets/icon/gold.svg'},
            {key: 'food', icon: 'assets/icon/food.svg'},
            {key: 'wood', icon: 'assets/icon/wood.svg'},
            {key: 'stone', icon: 'assets/icon/stone.svg'}
        ];
    }

    init() {
        // Initialiser l'interface utilisateur
        this.createResourcesUI();
        this.createBuildingsUI();

        // Ajouter un bouton pour ouvrir le menu de construction
        this.createBuildButton();
    }

    hideBuildingMenu() {
        if (this.activeMenu) {
            if (this.activeMenu.element && document.body.contains(this.activeMenu.element)) {
                document.body.removeChild(this.activeMenu.element);
            }
            if (this.activeMenu.closeArea) {
                this.activeMenu.closeArea.destroy();
            }
            if (this.activeMenu.container) {
                this.activeMenu.container.destroy();
            }
            this.activeMenu = null;
        }
    }

// La partie principale de showBuildingInterface avec la modification de l'affichage des ressources

// La partie principale de showBuildingInterface avec la modification de l'affichage des ressources

    showBuildingInterface(building) {
        // Masquer toute interface existante
        if (this.hideBuildingMenu) {
            this.hideBuildingMenu();
        } else if (this.activeMenu) {
            if (this.activeMenu.element && document.body.contains(this.activeMenu.element)) {
                document.body.removeChild(this.activeMenu.element);
            }
            if (this.activeMenu.closeArea) {
                this.activeMenu.closeArea.destroy();
            }
            if (this.activeMenu.container) {
                this.activeMenu.container.destroy();
            }
            this.activeMenu = null;
        }

        this.hideBuildingInterface();

        const buildingType = gameData.buildingTypes[building.type];
        if (!buildingType) return;

        // Créer l'élément principal de l'interface
        const interfaceElement = document.createElement('div');
        interfaceElement.id = 'building-interface';
        interfaceElement.style.position = 'fixed';
        interfaceElement.style.bottom = '0';
        interfaceElement.style.left = '50%';
        interfaceElement.style.transform = 'translateX(-50%)';
        interfaceElement.style.width = '90%';
        interfaceElement.style.maxWidth = '800px';
        interfaceElement.style.height = 'auto';
        interfaceElement.style.minHeight = '180px';
        interfaceElement.style.backgroundImage = 'url("assets/interfaces/bg.png")';
        interfaceElement.style.backgroundSize = 'cover';
        interfaceElement.style.zIndex = '1000';
        interfaceElement.style.display = 'flex';
        interfaceElement.style.flexDirection = 'row';
        interfaceElement.style.flexWrap = 'wrap';
        interfaceElement.style.padding = '10px';
        interfaceElement.style.borderRadius = '10px 10px 0 0';
        interfaceElement.style.boxShadow = '0 0 15px rgba(0, 0, 0, 0.7)';

        // Section gauche - Image du bâtiment et PV
        const leftSection = document.createElement('div');
        leftSection.style.flex = '0 0 120px';
        leftSection.style.display = 'flex';
        leftSection.style.flexDirection = 'column';
        leftSection.style.alignItems = 'center';
        leftSection.style.marginRight = '15px';
        leftSection.style.position = 'relative';
        leftSection.style.paddingTop = '2%';
        leftSection.style.minHeight = '160px';

        // Image du bâtiment avec cadre
        const buildingImgContainer = document.createElement('div');
        buildingImgContainer.style.width = '100px';
        buildingImgContainer.style.height = '100px';
        buildingImgContainer.style.position = 'relative';
        buildingImgContainer.style.marginBottom = '10px';

        // Cadre
        const frameBg = document.createElement('img');
        frameBg.src = 'assets/interfaces/cadre.svg';
        frameBg.style.width = '100%';
        frameBg.style.height = '100%';
        frameBg.style.position = 'absolute';
        frameBg.style.top = '0';
        frameBg.style.left = '0';
        frameBg.style.zIndex = '1';

        // Image du bâtiment selon le niveau
        const buildingImg = document.createElement('img');
        buildingImg.src = this.getBuildingThumbnailByLevel(building.type, building.level);
        buildingImg.style.width = '80%';
        buildingImg.style.height = '80%';
        buildingImg.style.position = 'absolute';
        buildingImg.style.top = '10%';
        buildingImg.style.left = '10%';
        buildingImg.style.zIndex = '0';
        buildingImg.style.borderRadius = '5px';

        buildingImgContainer.appendChild(buildingImg);
        buildingImgContainer.appendChild(frameBg);

        // PV sous l'image
        const pvContainer = document.createElement('div');
        pvContainer.style.display = 'flex';
        pvContainer.style.alignItems = 'center';
        pvContainer.style.marginTop = '5px';

        const pvIcon = document.createElement('img');
        pvIcon.src = 'assets/icon/time.svg';
        pvIcon.style.width = '16px';
        pvIcon.style.height = '16px';
        pvIcon.style.marginRight = '5px';

        const pvText = document.createElement('span');
        pvText.textContent = 'PV: 1000/1000';
        pvText.style.color = '#333';
        pvText.style.fontSize = '12px';

        pvContainer.appendChild(pvIcon);
        pvContainer.appendChild(pvText);

        leftSection.appendChild(buildingImgContainer);
        leftSection.appendChild(pvContainer);

        // Section centrale - Nom et statistiques
        const centerSection = document.createElement('div');
        centerSection.style.flex = '1';
        centerSection.style.minWidth = '200px';
        centerSection.style.display = 'flex';
        centerSection.style.flexDirection = 'column';
        centerSection.style.padding = '5px 15px';
        centerSection.style.paddingTop = '2%';

        // Nom du bâtiment
        const buildingName = document.createElement('div');
        buildingName.textContent = buildingType.name;
        buildingName.style.color = '#333';
        buildingName.style.fontWeight = 'bold';
        buildingName.style.fontSize = '18px';
        buildingName.style.marginBottom = '10px';

        centerSection.appendChild(buildingName);

        // Statistiques sous le nom (dégâts, temps, cible)
        const statsContainer = document.createElement('div');
        statsContainer.style.display = 'flex';
        statsContainer.style.flexDirection = 'column';
        statsContainer.style.marginBottom = '10px';

        const statItems = [
            {name: 'Dégâts', value: '0', icon: 'assets/icon/sword.svg'},
            {name: 'Temps', value: '0', icon: 'assets/icon/time.svg'},
            {name: 'Cible', value: '0', icon: 'assets/icon/cible.svg'}
        ];

        statItems.forEach(stat => {
            const statRow = document.createElement('div');
            statRow.style.display = 'flex';
            statRow.style.alignItems = 'center';
            statRow.style.margin = '3px 0';

            const statIcon = document.createElement('img');
            statIcon.src = stat.icon;
            statIcon.style.width = '16px';
            statIcon.style.height = '16px';
            statIcon.style.marginRight = '8px';

            const statValue = document.createElement('span');
            statValue.textContent = `${stat.name}: ${stat.value}`;
            statValue.style.color = '#333';
            statValue.style.fontSize = '12px';

            statRow.appendChild(statIcon);
            statRow.appendChild(statValue);
            statsContainer.appendChild(statRow);
        });

        centerSection.appendChild(statsContainer);

        // Section droite - Actions avec zone de formation distincte
        const rightSection = document.createElement('div');
        rightSection.style.display = 'flex';
        rightSection.style.flexDirection = 'row';
        rightSection.style.minWidth = '300px';
        rightSection.style.padding = '5px';
        rightSection.style.paddingTop = '2%';
        rightSection.style.gap = '10px';
        rightSection.style.justifyContent = 'space-between';

        // Vérifier les actions disponibles pour ce bâtiment
        const canTrain = buildingType.specialAction === 'trainUnits';
        const canStore = buildingType.specialAction === 'storeResources';

        // Zone de formation - occupe la partie gauche de la section droite
        if (canTrain) {
            // Récupérer le premier type d'unité formable pour ce bâtiment
            const unitType = buildingType.trainableUnits[0];

            // Récupérer les infos de l'unité
            const unitInfo = gameData.unitTypes[unitType];

            // Créer un conteneur responsive pour la zone de formation
            const trainArea = document.createElement('div');
            trainArea.style.flex = '1';
            trainArea.style.position = 'relative';
            trainArea.style.minWidth = '180px';
            trainArea.style.maxWidth = '300px';
            trainArea.style.height = '160px';
            trainArea.style.cursor = 'pointer';
            trainArea.style.marginRight = '10px';

            // Nom de la troupe
            const troopName = document.createElement('div');
            troopName.textContent = `${unitInfo.name} ${building.level}`;
            troopName.style.position = 'absolute';
            troopName.style.top = '8%';
            troopName.style.left = '50%';
            troopName.style.transform = 'translateX(-50%)';
            troopName.style.color = '#333';
            troopName.style.fontSize = '14px';
            troopName.style.fontWeight = 'bold';
            troopName.style.textAlign = 'center';
            troopName.style.width = '90%';
            troopName.style.overflow = 'hidden';
            troopName.style.textOverflow = 'ellipsis';
            troopName.style.whiteSpace = 'nowrap';

            // Créer le fond de la zone de formation
            const trainBackground = document.createElement('img');
            trainBackground.src = 'assets/interfaces/train.svg';
            trainBackground.style.width = '100%';
            trainBackground.style.height = '100%';
            trainBackground.style.position = 'absolute';
            trainBackground.style.top = '0';
            trainBackground.style.left = '0';
            trainBackground.style.objectFit = 'contain';

            // Pas de bouton/indicateur supplémentaire - nous utilisons directement la zone de formation

            // Style pour chaque ressource
            const resources = this.resources;

            // Créer le tooltip avec les détails des coûts
            const costTooltip = document.createElement('div');
            costTooltip.style.position = 'absolute';
            costTooltip.style.bottom = '60%';  // Position au-dessus de la zone de formation
            costTooltip.style.left = '50%';
            costTooltip.style.transform = 'translateX(-50%)';
            costTooltip.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
            costTooltip.style.padding = '10px';
            costTooltip.style.borderRadius = '5px';
            costTooltip.style.zIndex = '1002';
            costTooltip.style.display = 'none';  // Caché par défaut
            costTooltip.style.width = 'auto';
            costTooltip.style.maxWidth = '250px';
            costTooltip.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';

            // Ajouter un titre au tooltip
            const tooltipTitle = document.createElement('div');
            tooltipTitle.textContent = 'Ressources nécessaires';
            tooltipTitle.style.color = 'white';
            tooltipTitle.style.fontSize = '14px';
            tooltipTitle.style.fontWeight = 'bold';
            tooltipTitle.style.marginBottom = '8px';
            tooltipTitle.style.textAlign = 'center';
            costTooltip.appendChild(tooltipTitle);

            // Conteneur pour les items des ressources
            const resourcesGrid = document.createElement('div');
            resourcesGrid.style.display = 'grid';
            resourcesGrid.style.gridTemplateColumns = 'repeat(2, 1fr)';
            resourcesGrid.style.gap = '8px';
            costTooltip.appendChild(resourcesGrid);

            // Variable pour vérifier si le joueur a assez de ressources
            let hasResources = true;

            // Ajouter les détails de coût au tooltip
            resources.forEach(resource => {
                if (unitInfo.cost[resource.key]) {
                    // Vérifier si le joueur a assez de cette ressource
                    const hasEnough = gameData.resources[resource.key] >= unitInfo.cost[resource.key];
                    if (!hasEnough) hasResources = false;

                    const resourceItem = document.createElement('div');
                    resourceItem.style.display = 'flex';
                    resourceItem.style.alignItems = 'center';

                    const resourceIcon = document.createElement('img');
                    resourceIcon.src = resource.icon;
                    resourceIcon.style.width = '20px';
                    resourceIcon.style.height = '20px';
                    resourceIcon.style.marginRight = '8px';

                    const resourceValue = document.createElement('span');
                    resourceValue.textContent = unitInfo.cost[resource.key];
                    resourceValue.style.fontSize = '14px';
                    resourceValue.style.color = hasEnough ? '#4CAF50' : '#FF5252';
                    resourceValue.style.fontWeight = 'bold';

                    resourceItem.appendChild(resourceIcon);
                    resourceItem.appendChild(resourceValue);
                    resourcesGrid.appendChild(resourceItem);
                }
            });

            // Afficher/masquer le tooltip au survol de la zone de formation
            trainArea.addEventListener('mouseenter', () => {
                costTooltip.style.display = 'block';
            });

            trainArea.addEventListener('mouseleave', () => {
                costTooltip.style.display = 'none';
            });

            // Pas de bouton de formation dans le tooltip
            // Indication du statut des ressources
            const statusMessage = document.createElement('div');
            statusMessage.textContent = hasResources ? 'Cliquez pour former' : 'Ressources insuffisantes';
            statusMessage.style.color = hasResources ? '#4CAF50' : '#FF5252';
            statusMessage.style.textAlign = 'center';
            statusMessage.style.marginTop = '10px';
            statusMessage.style.fontWeight = 'bold';
            statusMessage.style.fontSize = '12px';
            costTooltip.appendChild(statusMessage);

            // Pas d'indicateur séparé à mettre à jour

            // Ajouter les éléments au conteneur
            trainArea.appendChild(trainBackground);
            trainArea.appendChild(troopName);
            trainArea.appendChild(costTooltip);

            // Ajouter l'écouteur d'événement pour la formation directe au clic sur la zone
            trainArea.addEventListener('click', (event) => {
                // Masquer le tooltip après le clic
                costTooltip.style.display = 'none';

                if (hasResources) {
                    // Former l'unité directement
                    this.trainUnitDirectly(building, unitType);
                } else {
                    // Afficher un message d'erreur
                    this.showMessage('Ressources insuffisantes!', 2000);
                }
            });

            rightSection.appendChild(trainArea);
        }

        // Zone des autres boutons - occupe la partie droite de la section droite
        const actionsContainer = document.createElement('div');
        actionsContainer.style.display = 'grid';
        actionsContainer.style.gridTemplateColumns = 'repeat(1, 1fr)';
        actionsContainer.style.gridTemplateRows = 'repeat(3, 1fr)';
        actionsContainer.style.gap = '5px';
        actionsContainer.style.width = '80px';
        actionsContainer.style.height = '160px';

        // Bouton déplacer (toujours présent)
        const moveButton = this.createActionButton('Move', 'assets/interfaces/move.svg', () => {
            this.scene.buildingManager.moveBuilding(building.x, building.y);
            this.hideBuildingInterface();
        });
        moveButton.style.gridRow = '1';
        moveButton.style.width = '80%';
        moveButton.style.height = '80%';
        actionsContainer.appendChild(moveButton);

        // Bouton stocker (si disponible)
        if (canStore) {
            const storeButton = this.createActionButton('Store', 'assets/interfaces/store.svg', () => {
                console.log('Stockage non implémenté');
            });
            storeButton.style.gridRow = '2';
            storeButton.style.width = '80%';
            storeButton.style.height = '80%';
            actionsContainer.appendChild(storeButton);
        }

        // Bouton améliorer (si niveau < max)
        if (building.level < buildingType.maxLevel) {
            const upgradeButton = this.createActionButton('Upgrade', 'assets/interfaces/upgrade.svg', () => {
                this.scene.buildingManager.upgradeBuilding(building.x, building.y);
                this.hideBuildingInterface();
            });
            upgradeButton.style.gridRow = canStore ? '3' : '2';
            upgradeButton.style.width = '80%';
            upgradeButton.style.height = '80%';
            actionsContainer.appendChild(upgradeButton);
        }

        rightSection.appendChild(actionsContainer);

        // Ajouter les sections à l'interface
        interfaceElement.appendChild(leftSection);
        interfaceElement.appendChild(centerSection);
        interfaceElement.appendChild(rightSection);

        // Ajouter règles de style pour la résponsivité sur petits écrans
        const mediaQuery = document.createElement('style');
        mediaQuery.textContent = `
    @media screen and (max-width: 600px) {
        #building-interface {
            flex-direction: column;
            align-items: center;
        }
        #building-interface > div {
            margin-bottom: 10px;
            width: 100%;
        }
    }
`;
        document.head.appendChild(mediaQuery);

        // Ajouter l'interface au corps de la page
        document.body.appendChild(interfaceElement);

        this.activeBuildingInterface = interfaceElement;
    }

    createActionButton(name, iconSrc, clickHandler) {
        const button = document.createElement('div');
        button.style.width = '80px';
        button.style.height = '80px';
        button.style.cursor = 'pointer';
        button.style.display = 'flex';
        button.style.flexDirection = 'column';
        button.style.justifyContent = 'center';
        button.style.alignItems = 'center';

        const iconContainer = document.createElement('div');
        iconContainer.style.width = '100%';
        iconContainer.style.height = '100%';
        iconContainer.style.position = 'relative';
        iconContainer.style.display = 'flex';
        iconContainer.style.justifyContent = 'center';
        iconContainer.style.alignItems = 'center';

        const icon = document.createElement('img');
        icon.src = iconSrc;
        icon.style.width = '100%';
        icon.style.height = '100%';
        icon.style.objectFit = 'contain';

        iconContainer.appendChild(icon);
        button.appendChild(iconContainer);

        button.addEventListener('click', clickHandler);

        return button;
    }

    /**
     * Former une unité directement sans passer par l'interface de formation
     * @param {object} building - Bâtiment qui forme l'unité
     * @param {string} unitType - Type d'unité à former
     */
    trainUnitDirectly(building, unitType) {
        // Récupérer les informations de l'unité depuis gameData
        const unitInfo = gameData.unitTypes[unitType] || {};
        const unitCost = unitInfo.cost || {food: 50};

        // Déterminer la ressource principale nécessaire (nourriture ou or)
        const costResource = unitInfo.cost && unitInfo.cost.food ? 'food' : 'gold';
        const costAmount = unitInfo.cost && unitInfo.cost.food ? unitInfo.cost.food : 50;

        // Vérifier si le joueur a suffisamment de ressources
        if (gameData.resources[costResource] >= costAmount) {
            // Déduire les ressources
            gameData.resources[costResource] -= costAmount;

            // Mettre à jour l'affichage des ressources
            this.updateResourceDisplay();

            // Afficher un message de confirmation
            this.showMessage(`Formation de ${unitInfo.name || unitType} lancée!`, 2000);

            // TODO: Ajouter l'unité à la file de formation et implémenter le délai de formation
            console.log(`Formation de ${unitType} lancée directement!`);
        } else {
            // Afficher un message d'erreur
            const resourceName = costResource === 'food' ? 'Nourriture' : 'Or';
            this.showMessage(`${resourceName} insuffisant!`, 2000);
        }
    }

    hideBuildingInterface() {
        if (this.activeBuildingInterface && document.body.contains(this.activeBuildingInterface)) {
            document.body.removeChild(this.activeBuildingInterface);
        }
        this.activeBuildingInterface = null;
    }

    getBuildingThumbnailByLevel(type, level) {
        // Mappings des types de bâtiments vers les chemins d'images
        const thumbnailMappings = {
            'townhall': [
                'assets/buildingthumbs/ayuntamiento.jpg',
                'assets/buildingthumbs/ayuntamiento.jpg',
                'assets/buildingthumbs/ayuntamiento2.jpg',
                'assets/buildingthumbs/ayuntamiento3.jpg',
                'assets/buildingthumbs/ayuntamiento4.jpg'
            ],
            'house': [
                'assets/buildingthumbs/casa.jpg',
                'assets/buildingthumbs/casa.jpg',
                'assets/buildingthumbs/casa2.jpg',
                'assets/buildingthumbs/casa3.jpg',
                'assets/buildingthumbs/casa4.jpg'
            ],
            'farm': [
                'assets/buildingthumbs/granja.jpg',
                'assets/buildingthumbs/granja.jpg',
                'assets/buildingthumbs/granja2.jpg',
                'assets/buildingthumbs/granja3.jpg'
            ],
            'barracks': [
                'assets/buildingthumbs/cuartel.jpg',
                'assets/buildingthumbs/cuartel.jpg',
                'assets/buildingthumbs/cuartel2.jpg',
                'assets/buildingthumbs/cuartel3.jpg'
            ],
            'goldmine': [
                'assets/buildingthumbs/mina.jpg',
                'assets/buildingthumbs/mina.jpg',
                'assets/buildingthumbs/mina2.jpg',
                'assets/buildingthumbs/mina3.jpg'
            ],
            'lumbermill': [
                'assets/buildingthumbs/aserradero.jpg',
                'assets/buildingthumbs/aserradero.jpg',
                'assets/buildingthumbs/aserradero2.jpg',
                'assets/buildingthumbs/aserradero3.jpg'
            ],
            'quarry': [
                'assets/buildingthumbs/cantera.jpg',
                'assets/buildingthumbs/cantera.jpg',
                'assets/buildingthumbs/cantera2.jpg',
                'assets/buildingthumbs/cantera3.jpg'
            ],
            'market': [
                'assets/buildingthumbs/mercado.jpg',
                'assets/buildingthumbs/mercado.jpg',
                'assets/buildingthumbs/mercado2.jpg',
                'assets/buildingthumbs/mercado3.jpg'
            ],
            'temple': [
                'assets/buildingthumbs/templo.jpg',
                'assets/buildingthumbs/templo.jpg',
                'assets/buildingthumbs/templo2.jpg',
                'assets/buildingthumbs/templo3.jpg'
            ]
        };

        // Récupérer les images pour ce type de bâtiment
        const images = thumbnailMappings[type] || ['assets/buildingthumbs/default.jpg'];

        // Si le niveau est hors limites, utiliser la dernière image disponible
        return level < images.length ? images[level] : images[images.length - 1];
    }

    createResourcesUI() {
        // Supprimer l'UI existante si présente
        if (this.resourcesUI) {
            this.resourcesUI.destroy();
        }

        // Créer une ressource en HTML pur fixée à l'écran
        // Cela évite complètement les problèmes de positionnement de Phaser

        // D'abord supprimer l'ancien élément s'il existe
        const existingUI = document.getElementById('fixed-resources-ui');
        if (existingUI) {
            document.body.removeChild(existingUI);
        }

        // Créer un nouvel élément div pour contenir l'interface des ressources
        const uiContainer = document.createElement('div');
        uiContainer.id = 'fixed-resources-ui';

        // Définir le style CSS pour le fixer en haut à droite
        uiContainer.style.position = 'fixed';
        uiContainer.style.top = '20px';
        uiContainer.style.right = '20px';
        uiContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        uiContainer.style.padding = '10px';
        uiContainer.style.borderRadius = '8px';
        uiContainer.style.color = 'white';
        uiContainer.style.fontFamily = 'Arial, sans-serif';
        uiContainer.style.zIndex = '9999'; // S'assurer qu'il est toujours au-dessus
        uiContainer.style.minWidth = '140px';

        // Créer les éléments pour chaque ressource
        const resources = gameData.resources;
        this.resourceElements = {}; // Stocker les références aux éléments HTML

        const resourceTypes = [
            {key: 'gold', iconKey: 'assets/icon/gold.svg', color: '#FFD700'},
            {key: 'food', iconKey: 'assets/icon/food.svg', color: '#32CD32'},
            {key: 'wood', iconKey: 'assets/icon/wood.svg', color: '#8B4513'},
            {key: 'stone', iconKey: 'assets/icon/stone.svg', color: '#A9A9A9'},
            {key: 'cash', iconKey: 'assets/icon/cash.svg', color: '#9370DB'},
            {
                key: 'population',
                iconKey: 'assets/icon/population.svg',
                color: '#1E90FF',
                showMax: true,
                maxKey: 'populationCap'
            }
        ];

        // Générer le contenu HTML pour chaque ressource
        resourceTypes.forEach(resource => {
            const resourceDiv = document.createElement('div');
            resourceDiv.style.margin = '5px 0';
            resourceDiv.style.display = 'flex';
            resourceDiv.style.justifyContent = 'space-between';

            // Texte de la valeur
            const valueSpan = document.createElement('span');
            if (resource.showMax) {
                valueSpan.textContent = `${Math.floor(resources[resource.key])}/${Math.floor(resources[resource.maxKey])}`;
            } else {
                valueSpan.textContent = Math.floor(resources[resource.key]);
            }
            valueSpan.style.color = resource.color;
            valueSpan.style.textShadow = '1px 1px 2px black';
            valueSpan.style.fontWeight = 'bold';

            // Icône
            const iconSpan = document.createElement('span');
            iconSpan.style.marginLeft = '10px';
            iconSpan.style.display = 'flex';
            iconSpan.style.alignItems = 'center';

            const iconImg = document.createElement('img');
            // Utiliser l'URL complète basée sur la clé de texture
            iconImg.src = resource.iconKey;
            iconImg.style.width = '20px';
            iconImg.style.height = '20px';
            iconSpan.appendChild(iconImg);

            // Assembler
            resourceDiv.appendChild(valueSpan);
            resourceDiv.appendChild(iconSpan);
            uiContainer.appendChild(resourceDiv);

            // Stocker la référence pour les mises à jour
            this.resourceElements[resource.key] = {
                element: valueSpan,
                showMax: resource.showMax,
                maxKey: resource.maxKey
            };
        });

        // Ajouter l'élément au DOM
        document.body.appendChild(uiContainer);

        // Créer un conteneur vide dans Phaser juste pour la compatibilité
        this.resourcesUI = this.scene.add.container(0, 0);
        this.resourcesUI.name = 'resourcesUI';

        return this.resourcesUI;
    }

    updateResourceDisplay() {
        // Mettre à jour l'affichage des ressources
        const resources = gameData.resources;

        for (const [resource, data] of Object.entries(this.resourceElements)) {
            if (data.showMax) {
                data.element.textContent = `${Math.floor(resources[resource])}/${Math.floor(resources[data.maxKey])}`;
            } else {
                data.element.textContent = Math.floor(resources[resource]);
            }
        }
    }

    createBuildButton() {
        // Ajouter un bouton fixe en bas de l'écran pour ouvrir le menu de construction
        const buildButton = document.createElement('div');
        buildButton.id = 'build-button';
        buildButton.style.position = 'fixed';
        buildButton.style.bottom = '20px';
        buildButton.style.left = '20px';
        buildButton.style.width = '50px';
        buildButton.style.height = '50px';
        buildButton.style.backgroundColor = '#4b6584';
        buildButton.style.color = 'white';
        buildButton.style.borderRadius = '50%';
        buildButton.style.display = 'flex';
        buildButton.style.justifyContent = 'center';
        buildButton.style.alignItems = 'center';
        buildButton.style.fontSize = '24px';
        buildButton.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.3)';
        buildButton.style.cursor = 'pointer';
        buildButton.style.zIndex = '9998';
        buildButton.textContent = '🏗️';

        buildButton.addEventListener('click', () => {
            this.openBuildMenu();
        });

        document.body.appendChild(buildButton);
    }

    openBuildMenu() {
        // Fermer le menu existant s'il y en a un
        this.closeBuildMenu();

        // Récupérer la liste des bâtiments disponibles
        const availableBuildings = this.scene.buildingManager.getAvailableBuildingTypes();

        if (availableBuildings.length === 0) {
            this.showMessage('Aucun bâtiment disponible', 2000);
            return;
        }

        // Créer le menu modal
        const modal = document.createElement('div');
        modal.id = 'build-menu-modal';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        modal.style.display = 'flex';
        modal.style.justifyContent = 'center';
        modal.style.alignItems = 'center';
        modal.style.zIndex = '9999';

        // Créer le contenu du menu
        const menuContent = document.createElement('div');
        menuContent.style.backgroundColor = '#333';
        menuContent.style.borderRadius = '10px';
        menuContent.style.padding = '20px';
        menuContent.style.maxWidth = '80%';
        menuContent.style.maxHeight = '80%';
        menuContent.style.overflow = 'auto';
        menuContent.style.boxShadow = '0 0 20px rgba(0, 0, 0, 0.5)';

        // Titre du menu
        const title = document.createElement('h2');
        title.textContent = 'Construire un bâtiment';
        title.style.color = 'white';
        title.style.marginTop = '0';
        title.style.borderBottom = '1px solid rgba(255, 255, 255, 0.3)';
        title.style.paddingBottom = '10px';

        menuContent.appendChild(title);

        // Grille de bâtiments
        const buildingsGrid = document.createElement('div');
        buildingsGrid.style.display = 'grid';
        buildingsGrid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(150px, 1fr))';
        buildingsGrid.style.gap = '15px';
        buildingsGrid.style.marginTop = '15px';

        // Ajouter chaque bâtiment disponible
        availableBuildings.forEach(building => {
            const canAfford = this.canAffordBuilding(building.cost);

            const buildingItem = document.createElement('div');
            buildingItem.style.backgroundColor = canAfford ? '#4b6584' : '#666';
            buildingItem.style.borderRadius = '8px';
            buildingItem.style.padding = '15px';
            buildingItem.style.textAlign = 'center';
            buildingItem.style.cursor = canAfford ? 'pointer' : 'not-allowed';
            buildingItem.style.opacity = canAfford ? '1' : '0.7';

            const buildingIcon = document.createElement('div');
            buildingIcon.style.fontSize = '30px';
            buildingIcon.style.marginBottom = '10px';

            // Icône selon le type de bâtiment
            let icon = '🏠';
            switch (building.type) {
                case 'townhall':
                    icon = '🏛️';
                    break;
                case 'house':
                    icon = '🏠';
                    break;
                case 'farm':
                    icon = '🌾';
                    break;
                case 'goldmine':
                    icon = '⛏️';
                    break;
                case 'lumbermill':
                    icon = '🪓';
                    break;
                case 'quarry':
                    icon = '🪨';
                    break;
                case 'market':
                    icon = '🛒';
                    break;
                case 'barracks':
                    icon = '⚔️';
                    break;
                case 'temple':
                    icon = '🔮';
                    break;
                default:
                    icon = '🏗️';
            }

            buildingIcon.textContent = icon;

            const name = document.createElement('div');
            name.textContent = building.name;
            name.style.color = 'white';
            name.style.fontWeight = 'bold';
            name.style.marginBottom = '5px';

            const description = document.createElement('div');
            description.textContent = building.description;
            description.style.color = 'rgba(255, 255, 255, 0.8)';
            description.style.fontSize = '12px';
            description.style.marginBottom = '10px';
            description.style.height = '40px';
            description.style.overflow = 'hidden';

            const costs = document.createElement('div');
            costs.style.fontSize = '12px';
            costs.style.color = 'white';

            for (const [resource, amount] of Object.entries(building.cost)) {
                const costItem = document.createElement('div');
                const hasEnough = gameData.resources[resource] >= amount;
                costItem.style.color = hasEnough ? '#32CD32' : '#eb3b5a';
                costItem.textContent = `${resource}: ${amount}`;
                costs.appendChild(costItem);
            }

            buildingItem.appendChild(buildingIcon);
            buildingItem.appendChild(name);
            buildingItem.appendChild(description);
            buildingItem.appendChild(costs);

            if (canAfford) {
                buildingItem.addEventListener('click', () => {
                    this.startBuildMode(building.type);
                    this.closeBuildMenu();
                });
            }

            buildingsGrid.appendChild(buildingItem);
        });

        menuContent.appendChild(buildingsGrid);

        // Bouton de fermeture
        const closeButton = document.createElement('button');
        closeButton.textContent = 'Fermer';
        closeButton.style.display = 'block';
        closeButton.style.margin = '20px auto 0';
        closeButton.style.padding = '10px 20px';
        closeButton.style.backgroundColor = '#666';
        closeButton.style.color = 'white';
        closeButton.style.border = 'none';
        closeButton.style.borderRadius = '5px';
        closeButton.style.cursor = 'pointer';

        closeButton.addEventListener('click', () => {
            this.closeBuildMenu();
        });

        menuContent.appendChild(closeButton);
        modal.appendChild(menuContent);

        // Fermer si on clique en dehors du menu
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeBuildMenu();
            }
        });

        document.body.appendChild(modal);
    }

    closeBuildMenu() {
        const modal = document.getElementById('build-menu-modal');
        if (modal) {
            document.body.removeChild(modal);
        }
    }

    canAffordBuilding(costs) {
        // Vérifier si le joueur a assez de ressources
        for (const [resource, amount] of Object.entries(costs)) {
            if (gameData.resources[resource] < amount) {
                return false;
            }
        }
        return true;
    }

    startBuildMode(buildingType) {
        // Annuler le mode précédent s'il était actif
        if (this.buildMode.active) {
            this.cancelBuildMode();
        }

        // Activer le mode construction
        this.buildMode.active = true;
        this.buildMode.selectedBuilding = buildingType;

        // Créer un fantôme pour le placement
        this.createPlacementGhost(buildingType);

        console.log(`Mode construction activé: ${buildingType}`);
        this.showMessage(`Sélectionnez un emplacement pour construire: ${gameData.buildingTypes[buildingType].name}`, 3000);
    }

    createPlacementGhost(buildingType) {
        // Récupérer les caractéristiques du bâtiment
        const building = gameData.buildingTypes[buildingType];
        if (!building) return;

        // Déterminer quel sprite utiliser (niveau 1)
        const spriteKey = building.sprites && building.sprites[1] ? building.sprites[1] : buildingType;

        // Créer un sprite fantôme semi-transparent
        const ghost = this.scene.add.image(0, 0, spriteKey);
        ghost.setAlpha(0.6);

        // Ajuster l'échelle selon la taille du bâtiment
        const size = building.size;
        const cellSize = this.mapManager.config.cellSize;

        if (this.mapManager.config.isIsometric) {
            ghost.setDisplaySize(cellSize * size, (cellSize / 2) * size);
            ghost.setOrigin(0.5, 0.5);
        } else {
            ghost.setDisplaySize(cellSize * size, cellSize * size);
            ghost.setOrigin(0, 0);
        }

        // Utiliser un rectangle graphique au lieu de l'image highlight
        const highlight = this.scene.add.graphics();
        if (this.mapManager.config.isIsometric) {
            highlight.fillStyle(0x00ff00, 0.3);
            highlight.fillRect(-cellSize * size / 2, -cellSize * size / 4, cellSize * size, cellSize * size / 2);
        } else {
            highlight.fillStyle(0x00ff00, 0.3);
            highlight.fillRect(0, 0, cellSize * size, cellSize * size);
        }

        // Créer un container pour le fantôme et la mise en évidence
        const container = this.scene.add.container(0, 0, [highlight, ghost]);

        // Stocker les références
        this.buildMode.placementGhost = {
            container: container,
            sprite: ghost,
            highlight: highlight,
            size: size
        };
    }

    updatePlacementGhost(gridX, gridY) {
        if (!this.buildMode.placementGhost) return;

        const ghost = this.buildMode.placementGhost;
        const cellSize = this.mapManager.config.cellSize;
        const isIsometric = this.mapManager.config.isIsometric;

        let x, y;
        if (isIsometric) {
            x = (gridX - gridY) * cellSize / 2;
            y = (gridX + gridY) * cellSize / 4;
        } else {
            x = gridX * cellSize;
            y = gridY * cellSize;
        }

        // Positionner le fantôme aux coordonnées de la grille
        ghost.container.setPosition(x, y);

        // Vérifier si l'emplacement est valide
        const isValid = this.mapManager.isValidBuildingLocation(gridX, gridY, ghost.size);

        // Mettre à jour le graphique du highlight
        ghost.highlight.clear();
        if (isValid) {
            ghost.highlight.fillStyle(0x00ff00, 0.3);
        } else {
            ghost.highlight.fillStyle(0xff0000, 0.3);
        }

        if (isIsometric) {
            ghost.highlight.fillRect(-cellSize * ghost.size / 2, -cellSize * ghost.size / 4,
                cellSize * ghost.size, cellSize * ghost.size / 2);
        } else {
            ghost.highlight.fillRect(0, 0, cellSize * ghost.size, cellSize * ghost.size);
        }
    }

    createMovePlacementGhost(buildingType, level) {
        // Annuler le mode précédent s'il était actif
        if (this.buildMode.active) {
            this.cancelBuildMode();
        }

        // Activer le mode déplacement
        this.buildMode.active = true;
        this.buildMode.selectedBuilding = buildingType;
        this.buildMode.isMoving = true;

        // Récupérer les caractéristiques du bâtiment
        const building = gameData.buildingTypes[buildingType];
        if (!building) return;

        // Déterminer quel sprite utiliser en fonction du niveau
        let spriteKey = buildingType;
        if (building.sprites && building.sprites[level]) {
            spriteKey = building.sprites[level];
        }

        // Créer un sprite fantôme semi-transparent
        const ghost = this.scene.add.image(0, 0, spriteKey);
        ghost.setAlpha(0.6);

        // Ajuster l'échelle selon la taille du bâtiment (sans mise à l'échelle basée sur le niveau)
        const size = building.size;
        const cellSize = this.mapManager.config.cellSize;

        if (this.mapManager.config.isIsometric) {
            ghost.setDisplaySize(cellSize * size, (cellSize / 2) * size);
            ghost.setOrigin(0.5, 0.5);
        } else {
            ghost.setDisplaySize(cellSize * size, cellSize * size);
            ghost.setOrigin(0, 0);
        }

        // Utiliser un rectangle graphique pour l'indicateur de placement
        const highlight = this.scene.add.graphics();
        if (this.mapManager.config.isIsometric) {
            highlight.fillStyle(0x00ff00, 0.3);
            highlight.fillRect(-cellSize * size / 2, -cellSize * size / 4, cellSize * size, cellSize * size / 2);
        } else {
            highlight.fillStyle(0x00ff00, 0.3);
            highlight.fillRect(0, 0, cellSize * size, cellSize * size);
        }

        // Créer un container pour le fantôme et la mise en évidence
        const container = this.scene.add.container(0, 0, [highlight, ghost]);

        // Stocker les références
        this.buildMode.placementGhost = {
            container: container,
            sprite: ghost,
            highlight: highlight,
            size: size
        };

        console.log(`Mode déplacement activé pour: ${buildingType}, niveau ${level}, sprite: ${spriteKey}`);
        this.showMessage(`Sélectionnez un nouvel emplacement pour le bâtiment`, 3000);
    }

    setMoveCompleteCallback(callback) {
        // Définir la fonction de rappel à appeler lorsque le déplacement est terminé
        this.buildMode.moveCompleteCallback = callback;
    }

    tryPlaceBuilding(gridX, gridY) {
        if (!this.buildMode.active || !this.buildMode.selectedBuilding) return;

        const buildingType = this.buildMode.selectedBuilding;

        // DÉBOGAGE
        console.log("Mode de construction actif: ", {
            isMoving: this.buildMode.isMoving,
            selectedBuilding: this.buildMode.selectedBuilding
        });
        console.log("Tentative de placement à: ", gridX, gridY);

        // Vérifier si nous sommes en mode déplacement
        if (this.buildMode.isMoving && this.buildMode.moveCompleteCallback) {
            console.log("En mode déplacement, appel du callback");

            // Appeler la fonction de rappel avec les nouvelles coordonnées
            const success = this.buildMode.moveCompleteCallback(gridX, gridY);
            console.log("Résultat du déplacement: ", success);

            if (success) {
                // Terminer le mode déplacement
                this.cancelBuildMode();
                // Afficher un message de succès
                this.showMessage("Bâtiment déplacé avec succès!", 2000);
            } else {
                // Afficher un message d'erreur
                this.showMessage("Impossible de déplacer le bâtiment ici", 2000);
            }
            return;
        }

        // Si on est en mode construction normale (pas déplacement)
        // Vérifier si l'emplacement est valide pour un nouveau bâtiment
        if (!this.mapManager.isValidBuildingLocation(gridX, gridY,
            gameData.buildingTypes[buildingType].size)) {
            console.log('Emplacement invalide pour le bâtiment');
            this.showMessage('Emplacement invalide!', 2000);
            return;
        }

        // Vérifier si le joueur a assez de ressources
        const costs = config.game.buildings.costs[buildingType];
        let hasResources = true;

        if (costs) {
            for (const [resource, amount] of Object.entries(costs)) {
                if (gameData.resources[resource] < amount) {
                    hasResources = false;
                    break;
                }
            }

            if (!hasResources) {
                console.log('Ressources insuffisantes pour construire ce bâtiment');
                this.showMessage('Ressources insuffisantes!', 2000);
                return;
            }

            // Déduire les ressources
            for (const [resource, amount] of Object.entries(costs)) {
                gameData.resources[resource] -= amount;
            }

            // Mettre à jour l'affichage des ressources
            this.updateResourceDisplay();
        }

        // Placer le bâtiment
        const building = this.scene.buildingManager.placeBuilding(buildingType, gridX, gridY);

        if (building) {
            console.log(`Bâtiment ${buildingType} placé aux coordonnées: ${gridX}, ${gridY}`);
            this.showMessage(`Bâtiment construit!`, 2000);

            // Terminer le mode construction
            this.cancelBuildMode();
        }
    }

    cancelBuildMode() {
        if (!this.buildMode.active) return;

        console.log("Annulation du mode construction/déplacement");

        // Désactiver le mode construction
        this.buildMode.active = false;

        // Supprimer le fantôme
        if (this.buildMode.placementGhost) {
            // S'assurer que le container existe avant d'essayer de le détruire
            if (this.buildMode.placementGhost.container &&
                this.buildMode.placementGhost.container.scene) {
                this.buildMode.placementGhost.container.destroy();
            }
            this.buildMode.placementGhost = null;
        }

        // Nettoyer proprement le reste des paramètres
        this.buildMode.selectedBuilding = null;
        this.buildMode.isMoving = false;

        // Important: Nettoyer le callback pour éviter des références persistantes
        if (this.buildMode.moveCompleteCallback) {
            this.buildMode.moveCompleteCallback = null;
        }

        console.log('Mode construction/déplacement annulé avec succès');
    }

    showMessage(text, duration = 3000) {
        // Afficher un message temporaire à l'utilisateur

        // Supprimer tout message existant
        if (this.messageContainer) {
            // Annuler toutes les tweens existantes sur ce container
            this.scene.tweens.killTweensOf(this.messageContainer);
            this.messageContainer.destroy();
            this.messageContainer = null;
        }

        // Vérifier si la scène est encore active
        if (!this.scene || !this.scene.sys || !this.scene.sys.isActive()) {
            return;
        }

        // Créer un nouveau conteneur pour le message
        this.messageContainer = this.scene.add.container(
            this.scene.cameras.main.width / 2,
            100
        );

        // Fond du message
        const bg = this.scene.add.graphics();
        bg.fillStyle(0x000000, 0.7);
        bg.fillRoundedRect(-150, -30, 300, 60, 10);

        // Texte du message
        const messageText = this.scene.add.text(0, 0, text, {
            fontSize: '18px',
            color: '#ffffff',
            align: 'center'
        });
        messageText.setOrigin(0.5);

        this.messageContainer.add(bg);
        this.messageContainer.add(messageText);

        // Fixer le message à la caméra
        this.messageContainer.setScrollFactor(0);
        this.messageContainer.setDepth(1000);

        // Animation d'apparition
        this.messageContainer.setAlpha(0);

        // Référence au UIManager pour utilisation dans les callbacks
        const uiManager = this;

        // Créer et démarrer la tween
        this.scene.tweens.add({
            targets: this.messageContainer,
            alpha: 1,
            duration: 200,
            ease: 'Linear',
            onComplete: function () {
                // S'assurer que le message existe toujours
                if (!uiManager.messageContainer) return;

                // Configurer la disparition du message après un délai
                uiManager.scene.time.delayedCall(duration, function () {
                    // Vérifier à nouveau que le message existe toujours
                    if (!uiManager.messageContainer) return;

                    uiManager.scene.tweens.add({
                        targets: uiManager.messageContainer,
                        alpha: 0,
                        duration: 200,
                        ease: 'Linear',
                        onComplete: function () {
                            // Dernière vérification avant de détruire
                            if (uiManager.messageContainer) {
                                uiManager.messageContainer.destroy();
                                uiManager.messageContainer = null;
                            }
                        }
                    });
                });
            }
        });
    }

    createBuildingsUI() {
        // Cette méthode est remplacée par le bouton de construction et le menu modal
    }
}
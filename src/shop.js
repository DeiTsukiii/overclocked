import { MODULES, DATA_TYPES } from './data.js';
import { formatNum } from './format.js';
import { MODULES_CLASSES } from './modules/classes.js';
import { saveGame } from './save.js';

function toggleShop(scene) {
    const w = scene.scale.width;
    scene.isShopOpen = !scene.isShopOpen;

    if (scene.isShopOpen) {
        scene.shopPanel.x = w - 240;
        scene.shopToggleBtn.setFillStyle(0xef4444);
        scene.shopToggleBtn.setStrokeStyle(1, 0xf87171);
        scene.shopToggleTxt.setText("SHOP [Close]");
    } else {
        scene.shopPanel.x = w;
        scene.shopToggleBtn.setFillStyle(0x2563eb);
        scene.shopToggleBtn.setStrokeStyle(1, 0x3b82f6);
        scene.shopToggleTxt.setText("SHOP [Open]");
    }
}

function createShopItem(scene, x, y, label, type, dataType, cost, multiplier) {
    const btn = scene.add.rectangle(x, y, 200, 35, 0x131a2a).setOrigin(0).setStrokeStyle(1, 0x263554);
    const nb = scene.modules.filter(m => m.type === type && m.dataType === dataType).length;
    let finalCost = Math.round(cost * Math.pow(multiplier, nb));
    const txt = scene.add.text(x + 10, y + 10, `${label} [$${formatNum(finalCost)}]`, { fontSize: '14px', fill: '#cbd5e1', fontWeight: 'bold', fontFamily: 'monospace' });
    btn.setInteractive({ useHandCursor: true });
    txt.finalCost = finalCost;

    scene.shopPanel.add([btn, txt]);

    btn.on('pointerover', () => { btn.setFillStyle(0x1c263f); btn.setStrokeStyle(1, 0x3b5284); });
    btn.on('pointerout', () => { btn.setFillStyle(0x131a2a); btn.setStrokeStyle(1, 0x263554); });
    btn.on('pointerdown', (pointer) => {
        if (pointer.leftButtonDown() && scene.globalMoney >= txt.finalCost) {
            scene.globalMoney -= txt.finalCost;
            const spawnX = Math.round((scene.cameras.main.scrollX + scene.scale.width / 2) / scene.grid.GRID_SIZE) * scene.grid.GRID_SIZE;
            const spawnY = Math.round((scene.cameras.main.scrollY + scene.scale.height / 2) / scene.grid.GRID_SIZE) * scene.grid.GRID_SIZE;
            new MODULES_CLASSES[type](scene, spawnX, spawnY, type, dataType);
            saveGame(scene);
            txt.finalCost = Math.round(cost * Math.pow(multiplier, scene.modules.filter(m => m.type === type && m.dataType === dataType).length));
            txt.setText(`${label} [$${formatNum(txt.finalCost)}]`);
        }
    });

    return txt;
}

export function createShop(scene, w, h) {
    scene.shopToggleBtn = scene.add.rectangle(w - 140, 10, 120, 30, 0x2563eb).setOrigin(0).setStrokeStyle(1, 0x3b82f6);
    scene.shopToggleTxt = scene.add.text(w - 140 + 60, 25, "SHOP [Open]", {
        fontSize: '11px', fill: '#ffffff', fontWeight: 'bold', fontFamily: 'monospace'
    }).setOrigin(0.5);
    scene.uiContainer.add([scene.shopToggleBtn, scene.shopToggleTxt]);

    scene.shopToggleBtn.setInteractive({ useHandCursor: true });
    scene.shopToggleBtn.on('pointerover', () => { scene.shopToggleBtn.setFillStyle(0x1d4ed8); });
    scene.shopToggleBtn.on('pointerout', () => { scene.shopToggleBtn.setFillStyle(scene.isShopOpen ? 0xef4444 : 0x2563eb); });
    scene.shopToggleBtn.on('pointerdown', () => { toggleShop(scene); });

    scene.shopPanel = scene.add.container(w, 50);
    scene.shopPanelBg = scene.add.rectangle(0, 0, 240, h - 80, 0x0f1322, 0.95).setOrigin(0).setStrokeStyle(1, 0x1f293d);
    scene.shopPanel.add(scene.shopPanelBg);
    scene.uiContainer.add(scene.shopPanel);
}

export function populateShop(scene) {
    const items = [
        { Class: "Ressources", items: ['network', 'cpu', 'overclocker', 'cooler'] },
        { Class: "Downloaders", items: ['downloader:text', 'downloader:image'] },
        { Class: "Security", items: ['antivirus', 'quarantine'] },
        { Class: "Money", items: ['seller', 'collector', 'task_worker'] },
    ];
    scene.shopItems = items;

    let startY = 5;
    items.forEach(item => {
        const classHeader = scene.add.text(20, startY + 20, `>>> ${item.Class}:`, { fontSize: '12px', fill: '#38bdf8', fontWeight: 'bold', fontFamily: 'monospace' });
        scene.shopPanel.add(classHeader);
        startY += 45;
        item.items.forEach(subItem => {
            const subType = subItem.split(":")[0];
            const subDataType = subItem.split(":")[1] || 'empty';
            const priceData = subDataType !== 'empty' ? DATA_TYPES[subDataType].dlPrice : MODULES[subType].price;
            const title = (subDataType !== 'empty' ? `${DATA_TYPES[subDataType].title} ` : '') + MODULES[subType].title;
            item.txt = createShopItem(scene, 20, startY, title, subType, subDataType, priceData.base, priceData.multiplier);
            startY += 45;
        });
    });
}
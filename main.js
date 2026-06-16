function formatNum(num) {
    if (num === 0 || !num) return "0";
    const suffixes = ["", "K", "M", "B", "T", "Qa", "Qi", "QD"];
    const i = Math.floor(Math.log10(Math.abs(num)) / 3);
    if (i <= 0) return Math.floor(num).toString();
    const suffixIndex = Math.min(i, suffixes.length - 1);
    const value = num / Math.pow(10, suffixIndex * 3);
    return `${value.toFixed(1).toString().replace(/\.0$/, '')}${suffixes[suffixIndex]}`;
}

function formatBytes(bytes) {
    if (bytes <= 0 || !bytes) return "0 B";
    const suffixes = ["B", "KB", "MB", "GB", "TB", "PB"];
    const i = Math.floor(Phaser.Math.Clamp(Math.log(bytes) / Math.log(1024), 0, suffixes.length - 1));
    if (i <= 0) return `${Math.floor(bytes)} B`;
    const suffixIndex = Math.min(i, suffixes.length - 1);
    const value = bytes / Math.pow(1024, suffixIndex);
    return `${value.toFixed(1).toString().replace(/\.0$/, '')} ${suffixes[suffixIndex]}`;
}

function formatSpeed(Bps) {
    if (Bps <= 0 || !Bps) return "0 Bps";
    const suffixes = ["Bps", "KBps", "MBps", "GBps", "TBps", "PBps"];
    const base = Bps;
    const idx = Math.floor(Math.log(base) / Math.log(1024));
    if (idx <= 0) return `${Math.floor(base)} Bps`;
    const suffixIndex = Math.min(idx, suffixes.length - 1);
    const value = base / Math.pow(1024, suffixIndex);
    return `${value.toFixed(1).toString().replace(/\.0$/, '')} ${suffixes[suffixIndex]}`;
}

function formatHz(hz) {
    if (hz <= 0 || !hz) return "0 Hz";
    const suffixes = ["Hz", "kHz", "MHz", "GHz", "THz"];
    const i = Math.floor(Math.log10(hz) / 3);
    if (i <= 0) return `${Math.floor(hz)} Hz`;
    const suffixIndex = Math.min(i, suffixes.length - 1);
    const value = hz / Math.pow(1000, suffixIndex);
    return `${value.toFixed(1).toString().replace(/\.0$/, '')} ${suffixes[suffixIndex]}`;
}

const PORT_COLORS = { 
    download: 0x00ff88, 
    upload: 0x00bfff, 
    text: 0x00ffcc, 
    image: 0xff00ff, 
    money: 0xccff00, 
    clock: 0xff6600, 
    coolant: 0x00ffff,
    virus: 0xef4444,   
    empty: 0xffffff 
};
const GRID_SIZE = 40; 
const GRID_COLS = 200;
const GRID_ROWS = 200;

const SIZE_TEXT_FILE = 102400;   // 100 KB
const SIZE_IMAGE_FILE = 1572864; // 1.5 MB

class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    init() {
        this.globalMoney = 200;
        this.modules = [];       
        this.connections = [];   
        this.nodeIdCounter = 0;
        
        this.isWiring = false;   
        this.activeWiringSource = null; 
        this.hoveredPort = null;        
        this.activeDraggingModule = null; 
        
        this.collectorRateCounter = 0;
        this.currentCollectorDisplayRate = 0;
        this.workerTimer = 0; 

        this.isShopOpen = false;
        this.shopButtons = [];
    }

    createTasks() {
        const tasks = [
            { label: "Buy a Network module", condition: () => this.modules.some(m => m.type === 'network') },
            { label: "Buy a Text Downloader", condition: () => this.modules.some(m => m.type === 'downloader') },
            { label: "Buy a Data Seller", condition: () => this.modules.some(m => m.type === 'seller') },
            { label: "Buy a Collector", condition: () => this.modules.some(m => m.type === 'collector') },
            { label: "Wire a Network to a Text Downloader", condition: () => this.connections.some(c => c.fromModule.type === 'network' && c.toModule.type === 'downloader') },
            { label: "Wire a Text Downloader to a Seller", condition: () => this.connections.some(c => c.fromModule.type === 'downloader' && c.toModule.type === 'seller') },
            { label: "Wire a Network to a Seller", condition: () => this.connections.some(c => c.fromModule.type === 'network' && c.toModule.type === 'seller') },
            { label: "Wire a Seller to a Collector", condition: () => this.connections.some(c => c.fromModule.type === 'seller' && c.toModule.type === 'collector') },

            { label: "Upgrade a Network module", condition: () => this.modules.some(m => m.type === 'network' && m.level > 1) },

            { label: "Earn $600", condition: () => this.globalMoney >= 600 },
            { label: "Buy a CPU Core", condition: () => this.modules.some(m => m.type === 'cpu') },
            { label: "Buy a Task Worker", condition: () => this.modules.some(m => m.type === 'task_worker') },

            { label: "Earn $650", condition: () => this.globalMoney >= 650 },
            { label: "Buy an Antivirus Filter", condition: () => this.modules.some(m => m.type === 'antivirus') },

            { label: "Earn $900", condition: () => this.globalMoney >= 950 },
            { label: "Buy a Quarantine Wall", condition: () => this.modules.some(m => m.type === 'quarantine') },

            { label: "Earn $100k", condition: () => this.globalMoney >= 1e5 },
            { label: "Buy an Image Downloader", condition: () => this.modules.some(m => m.type === 'imager') },

            { label: "Earn $1M", condition: () => this.globalMoney >= 1e6 },
            { label: "Buy an Overclocker", condition: () => this.modules.some(m => m.type === 'overclocker') },
            { label: "Use an Overclocker boost", condition: () => this.modules.some(m => m.type === 'overclocker' && m.isBoosting) },
            { label: "Buy a Liquid Cooler", condition: () => this.modules.some(m => m.type === 'cooler') },

            { label: "Earn $10M", condition: () => this.globalMoney >= 1e7 },
            { label: "Earn $100M", condition: () => this.globalMoney >= 1e8 },
            { label: "Earn $1B", condition: () => this.globalMoney >= 1e9 },
        ];

        this.tasks = tasks.map(t => ({ ...t, completed: false }));
        this.currentTaskIndex = 0;

        const panelWidth = 360;
        const panelHeight = 54;

        const taskBg = this.add.rectangle(0, 0, panelWidth, panelHeight, 0x090d16, 0.85)
            .setOrigin(0)
            .setStrokeStyle(1, 0x1e293b);

        const accentLine = this.add.rectangle(0, 0, 4, panelHeight, 0x38bdf8).setOrigin(0);

        const taskHeaderTxt = this.add.text(14, 8, `OBJECTIVE [01/${this.tasks.length}]`, {
            fontSize: '10px',
            fill: '#64748b',
            fontWeight: 'bold',
            fontFamily: 'monospace',
            letterSpacing: 1
        });

        const taskTxt = this.add.text(36, 34, this.tasks[this.currentTaskIndex].label, {
            fontSize: '12px',
            fill: '#f8fafc',
            fontWeight: '600',
            fontFamily: 'monospace'
        }).setOrigin(0, 0.5);

        const taskCase = this.add.rectangle(20, 34, 10, 10, 0x090d16)
            .setOrigin(0.5)
            .setStrokeStyle(1, 0x38bdf8);

        const taskContainer = this.add.container(20, 75);
        taskContainer.add([taskBg, accentLine, taskHeaderTxt, taskTxt, taskCase]);
        this.uiContainer.add(taskContainer);

        this.completeTaskUi = () => {
            accentLine.setFillStyle(0x10b981);
            taskCase.setFillStyle(0x10b981).setStrokeStyle(1, 0x10b981);
            taskTxt.setFill('#10b981');

            this.tweens.add({
                targets: [taskContainer],
                x: -800,
                duration: 500,
                delay: 150,
                onComplete: () => {
                    if (this.currentTaskIndex < this.tasks.length) {
                        const paddedIdx = String(this.currentTaskIndex + 1).padStart(2, '0');
                        taskHeaderTxt.setText(`OBJECTIVE [${paddedIdx}/${this.tasks.length}]`);
                        taskTxt.setText(this.tasks[this.currentTaskIndex].label);
                        
                        accentLine.setFillStyle(0x38bdf8);
                        taskCase.setFillStyle(0x090d16).setStrokeStyle(1, 0x38bdf8);
                        taskTxt.setFill('#f8fafc');
                    
                    } else {
                        taskHeaderTxt.setText('ALL TASKS COMPLETED!');
                        taskTxt.setText("Congratulations! You've completed all tasks!");
                        
                        accentLine.setFillStyle(0xeab308);
                        taskCase.setFillStyle(0xeab308).setStrokeStyle(1, 0xeab308);
                        taskTxt.setFill('#eab308');
                    }
                    
                    this.tweens.add({
                        targets: [taskContainer],
                        x: 20,
                        duration: 800
                    });
                }
            });
        }
    }

    updateTask() {
        if (this.currentTaskIndex < this.tasks.length && (this.tasks[this.currentTaskIndex].condition() || this.tasks[this.currentTaskIndex].completed)) {
            this.tasks[this.currentTaskIndex].completed = true;
            this.currentTaskIndex++;
            this.completeTaskUi();
        }
    }

    create() {
        const w = this.scale.width;
        const h = this.scale.height;

        const worldWidth = GRID_COLS * GRID_SIZE;
        const worldHeight = GRID_ROWS * GRID_SIZE;
        this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);

        this.gridGraphics = this.add.graphics();
        this.gridGraphics.lineStyle(1, 0x121824, 0.8);
        
        for (let x = 0; x <= worldWidth; x += GRID_SIZE) {
            this.gridGraphics.moveTo(x, 0);
            this.gridGraphics.lineTo(x, worldHeight);
        }
        for (let y = 0; y <= worldHeight; y += GRID_SIZE) {
            this.gridGraphics.moveTo(0, y);
            this.gridGraphics.lineTo(worldWidth, y);
        }
        this.gridGraphics.strokePath();

        this.wireGraphics = this.add.graphics();
        this.input.mouse.disableContextMenu();

        this.uiCamera = this.cameras.add(0, 0, w, h).setScroll(0, 0).setName('UICamera');
        this.uiContainer = this.add.container(0, 0).setDepth(100);
        
        this.headerBg = this.add.rectangle(0, 0, w * 2, 50, 0x0b0f19).setOrigin(0).setStrokeStyle(1, 0x1f293d);
        this.balanceText = this.add.text(25, 15, `Money: $${formatNum(this.globalMoney)} [${formatNum(this.globalMoneyPerSecond)}/s]`, {
            fontSize: '18px', fill: '#ffb700', fontWeight: 'bold', fontFamily: 'monospace'
        });
        this.uiContainer.add([this.headerBg, this.balanceText]);

        this.shopToggleBtn = this.add.rectangle(w - 140, 10, 120, 30, 0x2563eb).setOrigin(0).setStrokeStyle(1, 0x3b82f6);
        this.shopToggleTxt = this.add.text(w - 140 + 60, 25, "SHOP [Open]", {
            fontSize: '11px', fill: '#ffffff', fontWeight: 'bold', fontFamily: 'monospace'
        }).setOrigin(0.5);
        this.uiContainer.add([this.shopToggleBtn, this.shopToggleTxt]);

        this.shopToggleBtn.setInteractive({ useHandCursor: true });
        this.shopToggleBtn.on('pointerover', () => { this.shopToggleBtn.setFillStyle(0x1d4ed8); });
        this.shopToggleBtn.on('pointerout', () => { this.shopToggleBtn.setFillStyle(this.isShopOpen ? 0xef4444 : 0x2563eb); });
        this.shopToggleBtn.on('pointerdown', () => { this.toggleShop(); });

        this.saveBtn = this.add.rectangle(w - 270, 10, 110, 30, 0x059669).setOrigin(0).setStrokeStyle(1, 0x10b981);
        this.saveTxt = this.add.text(w - 270 + 55, 25, "SAVE", { fontSize: '11px', fill: '#ffffff', fontWeight: 'bold', fontFamily: 'monospace' }).setOrigin(0.5);
        this.saveBtn.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.saveGame());
        this.uiContainer.add([this.saveBtn, this.saveTxt]);

        this.shopPanel = this.add.container(w, 50);
        this.shopPanelBg = this.add.rectangle(0, 0, 240, h - 80, 0x0f1322, 0.95).setOrigin(0).setStrokeStyle(1, 0x1f293d);
        this.shopPanel.add(this.shopPanelBg);
        this.uiContainer.add(this.shopPanel);

        this.footerBg = this.add.rectangle(0, h - 30, w * 2, 30, 0x0b0f19).setOrigin(0);
        this.hintText = this.add.text(20, h - 22, "Buy components, sell data, manage your empire!", {
            fontSize: '11px', fill: '#4f6587', fontWeight: 'bold', fontFamily: 'monospace'
        });
        this.uiContainer.add([this.footerBg, this.hintText]);

        this.cameras.main.ignore(this.uiContainer); 
        this.uiCamera.ignore([this.gridGraphics, this.wireGraphics]); 

        this.scale.on('resize', (gameSize) => {
            const width = gameSize.width;
            const height = gameSize.height;
            this.uiCamera.setSize(width, height);
            
            this.headerBg.width = width * 2;
            this.footerBg.y = height - 30;
            this.footerBg.width = width * 2;
            this.hintText.y = height - 22;

            this.shopToggleBtn.x = width - 140;
            this.shopToggleTxt.x = width - 140 + 60;
            this.saveBtn.x = width - 270;
            this.saveTxt.x = width - 270 + 55;

            this.shopPanelBg.height = height - 80;
            this.shopPanel.x = this.isShopOpen ? width - 240 : width;
        });

        this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
            let targetZoom = this.cameras.main.zoom - deltaY * 0.0008;
            targetZoom = Phaser.Math.Clamp(targetZoom, 0.3, 2.0); 
            this.cameras.main.setZoom(targetZoom);
        });

        this.input.on('pointermove', (pointer) => {
            const worldPointer = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
            if (this.activeDraggingModule && !this.isWiring) {
                const m = this.activeDraggingModule;
                m.container.x = Math.round((worldPointer.x - m.dragOffsetX) / GRID_SIZE) * GRID_SIZE;
                m.container.y = Math.round((worldPointer.y - m.dragOffsetY) / GRID_SIZE) * GRID_SIZE;
                this.updatePortsPosition(m);
            } 
            else if (pointer.rightButtonDown()) {
                this.cameras.main.scrollX -= (pointer.x - pointer.prevPosition.x) / this.cameras.main.zoom;
                this.cameras.main.scrollY -= (pointer.y - pointer.prevPosition.y) / this.cameras.main.zoom;
            }
        });

        this.input.on('pointerup', (pointer) => {
            if (this.activeDraggingModule) {
                const m = this.activeDraggingModule;
                m.container.x = Math.round(m.container.x / GRID_SIZE) * GRID_SIZE;
                m.container.y = Math.round(m.container.y / GRID_SIZE) * GRID_SIZE;
                this.updatePortsPosition(m);
                this.activeDraggingModule = null;
            }
            this.handleGlobalPointerUp();
        });

        this.time.addEvent({
            delay: 1000,
            loop: true,
            callback: () => {
                this.currentCollectorDisplayRate = this.collectorRateCounter;
                this.collectorRateCounter = 0;
            }
        });
        
        this.cameras.main.scrollX = (worldWidth / 2) - (w / 2);
        this.cameras.main.scrollY = (worldHeight / 2) - (h / 2);

        this.createTasks();

        this.time.delayedCall(100, () => {
            this.loadGame();
            this.populateShop();
        });
    }

    toggleShop() {
        const w = this.scale.width;
        this.isShopOpen = !this.isShopOpen;

        if (this.isShopOpen) {
            this.shopPanel.x = w - 240;
            this.shopToggleBtn.setFillStyle(0xef4444);
            this.shopToggleBtn.setStrokeStyle(1, 0xf87171);
            this.shopToggleTxt.setText("SHOP [Close]");
        } else {
            this.shopPanel.x = w;
            this.shopToggleBtn.setFillStyle(0x2563eb);
            this.shopToggleBtn.setStrokeStyle(1, 0x3b82f6);
            this.shopToggleTxt.setText("SHOP [Open]");
        }
    }

    populateShop() {
        const items = [
            { Class: "Ressources" },
            { label: "Network", type: 'network', cost: 10, multiplier: 1e9 },
            { label: "CPU Core", type: 'cpu', cost: 600, multiplier: 1e9 },
            { label: "Overclocker", type: 'overclocker', cost: 1e6, multiplier: 1e8 },
            { label: "Liquid Cooler", type: 'cooler', cost: 150, multiplier: 1e6 },

            { Class: "Downloaders" },
            { label: "Text Downloader", type: 'downloader', cost: 25, multiplier: 6 },
            { label: "Image Downloader", type: 'imager', cost: 1e5, multiplier: 6 },

            { Class: "Security" },
            { label: "Antivirus Filter", type: 'antivirus', cost: 650, multiplier: 6 },
            { label: "Quarantine Wall", type: 'quarantine', cost: 900, multiplier: 6 },

            { Class: "Money" },
            { label: "Data Seller", type: 'seller', cost: 50, multiplier: 100 },
            { label: "Collector", type: 'collector', cost: 100, multiplier: 1e9 },
            { label: "Task Worker", type: 'task_worker', cost: 60, multiplier: 1e9 },
        ];
        this.shopItems = items;

        let startY = 5;
        items.forEach(item => {
            if (item.Class) {
                const classHeader = this.add.text(20, startY + 20, `>>> ${item.Class}:`, { fontSize: '12px', fill: '#38bdf8', fontWeight: 'bold', fontFamily: 'monospace' });
                this.shopPanel.add(classHeader);
                startY += 45;
            } else {
                item.txt = this.createShopItem(20, startY, item.label, item.type, item.cost, item.multiplier);
                startY += 45;
            }
        });
    }

    createShopItem(x, y, label, type, cost, multiplier) {
        const btn = this.add.rectangle(x, y, 200, 35, 0x131a2a).setOrigin(0).setStrokeStyle(1, 0x263554);
        const nb = this.modules.filter(m => m.type === type).length;
        let finalCost = Math.round(cost * Math.pow(multiplier, nb));
        const txt = this.add.text(x + 10, y + 10, `${label} [$${formatNum(finalCost)}]`, { fontSize: '14px', fill: '#cbd5e1', fontWeight: 'bold', fontFamily: 'monospace' });
        btn.setInteractive({ useHandCursor: true });
        txt.finalCost = finalCost;
        
        this.shopPanel.add([btn, txt]);

        btn.on('pointerover', () => { btn.setFillStyle(0x1c263f); btn.setStrokeStyle(1, 0x3b5284); });
        btn.on('pointerout', () => { btn.setFillStyle(0x131a2a); btn.setStrokeStyle(1, 0x263554); });
        btn.on('pointerdown', (pointer) => {
            if (pointer.leftButtonDown() && this.globalMoney >= txt.finalCost) {
                this.globalMoney -= txt.finalCost;
                this.spawnModule(type);
                this.saveGame();
                txt.finalCost = Math.round(cost * Math.pow(multiplier, this.modules.filter(m => m.type === type).length));
                txt.setText(`${label} [$${formatNum(txt.finalCost)}]`);
            }
        });

        return txt;
    }

    spawnModule(type, customData = {}) {
        const { x: customX, y: customY, id: customId, level: customLevel } = customData;
        if (customId) {
            this.nodeIdCounter = Math.max(this.nodeIdCounter, customId);
        } else {
            this.nodeIdCounter++;
        }
        const id = customId || this.nodeIdCounter;
        
        const spawnX = customX !== undefined ? customX : Math.round((this.cameras.main.scrollX + this.scale.width / 2) / GRID_SIZE) * GRID_SIZE;
        const spawnY = customY !== undefined ? customY : Math.round((this.cameras.main.scrollY + this.scale.height / 2) / GRID_SIZE) * GRID_SIZE;
        
        const width = 160; 
        const height = 160; 

        const container = this.add.container(spawnX, spawnY);
        this.uiCamera.ignore(container); 

        const bg = this.add.rectangle(0, 0, width, height, 0x0f1322, 0.95).setOrigin(0).setStrokeStyle(2, 0x1e2640);
        container.add(bg);

        bg.setInteractive({ useHandCursor: true });
        bg.on('pointerdown', (pointer) => {
            if (pointer.leftButtonDown()) {
                this.activeDraggingModule = mData;
                const wp = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
                mData.dragOffsetX = wp.x - container.x;
                mData.dragOffsetY = wp.y - container.y;
            }
        });

        const headerModBg = this.add.rectangle(1, 1, width - 2, 32, 0x141b30).setOrigin(0);
        container.add(headerModBg);

        let title = "";
        let inputConfigs = [];  
        let outputConfigs = []; 
        let defaultStats = { download: 25600, upload: 51200, textStock: 0, imageStock: 0, virusStock: 0, rawTextStock: 0, rawImageStock: 0, vault: 0, clock: 1000, heat: 0, coolingPower: 1.0 };
        
        if (type === 'network') {
            title = "Network [Lvl. " + (customLevel || 1) + "]";
            outputConfigs = [
                { idName: 'download', name: 'Download Speed\n', type: 'download', y: 55, isSquare: false },
                { idName: 'upload', name: 'Upload Speed\n', type: 'upload', y: 95, isSquare: false }
            ];
        } else if (type === 'downloader') {
            title = "Text Downloader";
            inputConfigs = [{ idName: 'download', name: 'Download Speed\n', type: 'download', y: 65, isSquare: false, connectedWires: [] }];
            outputConfigs = [{ idName: 'text', name: 'Text\n', suffix: ' files', type: 'text', y: 115, isSquare: true }];
        } else if (type === 'imager') {
            title = "Image Downloader";
            inputConfigs = [{ idName: 'download', name: 'Download Speed\n', type: 'download', y: 65, isSquare: false, connectedWires: [] }];
            outputConfigs = [{ idName: 'image', name: 'Image\n', suffix: ' files', type: 'image', y: 115, isSquare: true }];
        } else if (type === 'seller') {
            title = "Data Seller";
            inputConfigs = [
                { idName: 'resource', name: 'Data\n', suffix: ' files', type: 'empty', y: 65, isSquare: true, connectedWires: [] },
                { idName: 'upload', name: 'Upload Speed\n', type: 'upload', y: 115, isSquare: false, connectedWires: [] }
            ];
            outputConfigs = [{ idName: 'money', name: 'Money\n', suffix: '$', type: 'money', y: 90, isSquare: false }];
        } else if (type === 'antivirus') {
            title = "Antivirus Filter";
            inputConfigs = [
                { idName: 'clock', name: 'Clock Speed\n', type: 'clock', y: 65, isSquare: false, connectedWires: [] },
                { idName: 'mixed_input', name: 'File\n', type: 'empty', y: 115, isSquare: true, connectedWires: [] }
            ];
            outputConfigs = [
                { idName: 'clean_output', name: 'Clean File\n', type: 'empty', y: 55, isSquare: true },
                { idName: 'virus_output', name: 'Infected File\n', type: 'virus', y: 125, isSquare: true }
            ];
        } else if (type === 'quarantine') {
            title = "Quarantine Wall";
            inputConfigs = [
                { idName: 'clock', name: 'Clock Speed\n', type: 'clock', y: 65, isSquare: false, connectedWires: [] },
                { idName: 'virus_input', name: 'Infected File\n', type: 'virus', y: 115, isSquare: true, connectedWires: [] }
            ];
            outputConfigs = [{ idName: 'money', name: 'Money\n', suffix: '$', type: 'money', y: 90, isSquare: false }];
        } else if (type === 'collector') {
            title = "Collector";
            inputConfigs = [{ idName: 'money', name: 'Money\n', suffix: ' $/s', type: 'money', y: 90, isSquare: false, connectedWires: [] }];
        } else if (type === 'cpu') {
            title = "CPU Core [Lvl. " + (customLevel || 1) + "]";
            outputConfigs = [{ idName: 'clock', name: 'Clock Speed\n', type: 'clock', y: 80, isSquare: false }];
            defaultStats.clock = 1000; 
        } else if (type === 'task_worker') {
            title = "Task Worker";
            inputConfigs = [{ idName: 'clock', name: 'Clock Speed\n', type: 'clock', y: 65, isSquare: false, connectedWires: [] }];
            outputConfigs = [{ idName: 'money', name: 'Money\n', suffix: '$', type: 'money', y: 115, isSquare: false }];
        } else if (type === 'overclocker') {
            title = "Overclocker";
            inputConfigs = [
                { idName: 'inputSpeed', name: 'Speed\n', type: 'empty', y: 55, isSquare: false, connectedWires: [] },
                { idName: 'coolant', name: 'Cooling\n', type: 'coolant', y: 105, isSquare: false, connectedWires: [] }
            ];
            outputConfigs = [{ idName: 'outputSpeed', name: 'Speed\n', type: 'empty', y: 75, isSquare: false }];
        } else if (type === 'cooler') {
            title = "Liquid Cooler [Lvl. " + (customLevel || 1) + "]";
            outputConfigs = [{ idName: 'coolant_out', name: 'Coolant\n', type: 'coolant', y: 75, isSquare: false }];
            defaultStats.coolingPower = 1.2; 
        }

        const titleTxt = this.add.text(10, 9, title, { fontSize: '10px', fill: '#ffffff', fontWeight: 'bold', fontFamily: 'monospace' });
        container.add(titleTxt);

        const deleteBtn = this.add.text(width - 5, 5, 'X', { fontSize: '15px', fill: '#ef4444', fontWeight: 'bold', fontFamily: 'monospace' }).setOrigin(1, 0);
        deleteBtn.setInteractive({ useHandCursor: true });
        deleteBtn.on('pointerdown', (pointer, localX, localY, event) => {
            if (event) event.stopPropagation();
            this.deleteModule(mData);
        });
        container.add(deleteBtn);

        const mData = {
            id, type, container, width, height, title,
            inputs: customData.inputs || [], outputs: customData.outputs || [], progress: customData.progress || 0, currentBytes: customData.currentBytes || 0,
            stats: customData.stats || defaultStats,
            activeInputs: customData.activeInputs || { download: 0, upload: 0, clock: 0, overclockerInput: 0, coolantPower: 0 },
            dragOffsetX: 0, dragOffsetY: 0,
            portLabels: customData.portLabels || {},
            sellerAcceptedType: customData.sellerAcceptedType || null,
            antivirusInputType: customData.antivirusInputType || null,
            quarantineActiveType: customData.quarantineActiveType || null,
            quarantineFileCount: customData.quarantineFileCount || 0,
            overclockerType: customData.overclockerType || 'empty',
            isBoosting: customData.isBoosting || false,
            level: customData.level || 1,
            upgradeCost: customData.upgradeCost || (type === 'cpu' ? 60 : (type === 'cooler' ? 150 : 50))
        };

        inputConfigs.forEach(p => {
            const lbl = this.add.text(12, p.y - 12, '', { fontSize: '9px', fill: '#cbd5e1', fontFamily: 'monospace' });
            container.add(lbl);
            mData.portLabels[p.idName] = { obj: lbl, template: p.name, suffix: p.suffix || '' };
            mData.inputs.push({ ...p, connectedWires: [] });
        });
        outputConfigs.forEach(p => {
            const lbl = this.add.text(width - 12, p.y - 12, '', { fontSize: '9px', fill: '#cbd5e1', fontFamily: 'monospace', align: 'right' }).setOrigin(1, 0);
            container.add(lbl);
            mData.portLabels[p.idName] = { obj: lbl, template: p.name, suffix: p.suffix || '' };
            mData.outputs.push({ ...p, connectedWires: [] });
        });

        if (type === 'downloader' || type === 'imager' || type === 'seller' || type === 'antivirus' || type === 'quarantine') {
            mData.byteLabelLeft = this.add.text(10, height - 25, '0', { fontSize: '9px', fill: '#627d98', fontFamily: 'monospace' });
            mData.byteLabelRight = this.add.text(width - 10, height - 25, '0', { fontSize: '9px', fill: '#627d98', fontFamily: 'monospace', align: 'right' }).setOrigin(1, 0);
            container.add(mData.byteLabelLeft);
            container.add(mData.byteLabelRight);
        }

        if (type !== 'collector') {
            const barBg = this.add.graphics();
            barBg.fillStyle(0x090d16, 1);
            barBg.fillRect(10, height - 12, width - 20, 4);
            container.add(barBg);

            const progBar = this.add.graphics();
            container.add(progBar);
            mData.progBar = progBar;
        }

        if (type === 'overclocker') {
            const boostBtn = this.add.rectangle(10, height - 35, width - 20, 20, 0xef4444, 0.25).setOrigin(0).setStrokeStyle(1, 0xef4444);
            const boostTxt = this.add.text(width / 2, height - 25, "BOOST (Hold)", { fontSize: '9px', fill: '#fca5a5', fontWeight: 'bold', fontFamily: 'monospace' }).setOrigin(0.5);
            container.add([boostBtn, boostTxt]);

            boostBtn.setInteractive({ useHandCursor: true });
            boostBtn.on('pointerdown', (pointer, localX, localY, event) => {
                if (event) event.stopPropagation();
                if (mData.stopBoost) return;
                mData.isBoosting = true;
                boostBtn.setFillStyle(0xef4444, 0.6);
            });

            const stopBoost = () => {
                mData.isBoosting = false;
                boostBtn.setFillStyle(0xef4444, 0.25);
            };
            boostBtn.on('pointerup', stopBoost);
            boostBtn.on('pointerout', stopBoost);
            mData.boostTxt = boostTxt;
        }

        if (type === 'network' || type === 'cpu' || type === 'cooler') {
            const upBtn = this.add.rectangle(10, height - 35, width - 20, 20, 0x1b233a).setOrigin(0).setStrokeStyle(1, 0x334155);
            const upTxt = this.add.text(width / 2, height - 25, `Upgrade: $${formatNum(mData.upgradeCost)}`, {
                fontSize: '9px', fill: '#38bdf8', fontWeight: 'bold', fontFamily: 'monospace'
            }).setOrigin(0.5);
            
            container.add([upBtn, upTxt]);
            upBtn.setInteractive({ useHandCursor: true });

            upBtn.on('pointerover', () => { upBtn.setFillStyle(0x24304f); });
            upBtn.on('pointerout', () => { upBtn.setFillStyle(0x1b233a); });
            
            upBtn.on('pointerdown', (pointer, localX, localY, event) => {
                if (event) event.stopPropagation();
                if (this.globalMoney >= mData.upgradeCost) {
                    this.globalMoney -= mData.upgradeCost;
                    mData.level++;
                    if (type === 'network') {
                        mData.stats.download *= 1.5;
                        mData.stats.upload *= 1.5;
                        mData.upgradeCost = Math.round(mData.upgradeCost * 1.6);
                    } else if (type === 'cpu') {
                        mData.stats.clock *= 1.5;
                        mData.upgradeCost = Math.round(mData.upgradeCost * 1.5);
                    } else if (type === 'cooler') {
                        mData.stats.coolingPower += 0.4;
                        mData.upgradeCost = Math.round(mData.upgradeCost * 1.7);
                    }
                    titleTxt.setText(`${title.split(' [')[0]} [Lvl. ${mData.level}]`);
                    upTxt.setText(`Upgrade: $${formatNum(mData.upgradeCost)}`);
                    this.saveGame();
                }
            });
        }

        this.instantiatePortsGraphics(mData);
        this.modules.push(mData);
        this.updatePortsPosition(mData);

        return mData;
    }

    deleteModule(mData) {
        const refundAmount = this.shopItems.find(item => item.type === mData.type)?.cost ? this.shopItems.find(item => item.type === mData.type).cost * 0.5 : 10;
        if (!confirm(`Are you sure you want to delete: ${mData.title}? It will give you $${formatNum(refundAmount)}.`)) {
            return;
        }
        mData.inputs.forEach(p => {
            if (p.connectedWires) {
                this.disconnectAllFromPort(p);
            }
        });
        mData.outputs.forEach(p => {
            if (p.connectedWires) {
                this.disconnectAllFromPort(p);
            }
        });
        mData.container.destroy();
        this.modules = this.modules.filter(m => m.id !== mData.id);

        this.globalMoney += refundAmount;
        this.saveGame();

        this.shopItems.forEach(item => {
            if (item.Class) return;
            const txt = item.txt;
            const nb = this.modules.filter(m => m.type === item.type).length;
            txt.finalCost = Math.round(item.cost * Math.pow(item.multiplier, nb));
            if (txt) txt.setText(`${item.label} [$${formatNum(txt.finalCost)}]`);
        });
    }

    instantiatePortsGraphics(mData) {
        const createPortVisual = (p, isInput) => {
            const pX = isInput ? 0 : mData.width;
            const pY = p.y;
            let visualNode;

            if (p.type === 'money') {
                visualNode = this.add.graphics();
                visualNode.fillStyle(PORT_COLORS.money, 1);
                visualNode.lineStyle(2, 0x0f1322, 1);
                
                visualNode.drawTriangleShape = (strokeWidth, strokeColor) => {
                    visualNode.clear();
                    visualNode.fillStyle(PORT_COLORS.money, 1);
                    visualNode.lineStyle(strokeWidth, strokeColor, 1);
                    let size = 12;
                    let points = [];
                    if (isInput) {
                        points = [ -size/2, 0, size/2, -size/2, size/2, size/2 ];
                    } else {
                        points = [ size/2, 0, -size/2, -size/2, -size/2, size/2 ];
                    }
                    visualNode.fillTriangle(points[0], points[1], points[2], points[3], points[4], points[5]);
                    visualNode.strokeTriangle(points[0], points[1], points[2], points[3], points[4], points[5]);
                    const geomTri = new Phaser.Geom.Triangle(points[0], points[1], points[2], points[3], points[4], points[5]);
                    visualNode.setInteractive(geomTri, Phaser.Geom.Triangle.Contains);
                    visualNode.setDepth(20);
                    visualNode.input.cursor = 'pointer';
                };
                visualNode.drawTriangleShape(2, 0x0f1322);
                visualNode.x = pX;
                visualNode.y = pY;
                visualNode.setFillStyle = (color) => { visualNode.drawTriangleShape(2, 0x0f1322); };
            } else if (p.isSquare) {
                const color = (() => {
                    if (mData.type === 'antivirus' && ['mixed_input', 'clean_output'].includes(p.idName)) {
                        p.type = mData.antivirusInputType || 'empty';
                        return PORT_COLORS[mData.antivirusInputType] || PORT_COLORS.empty;
                    } else if (mData.type === 'seller' && p.idName === 'resource') {
                        p.type = mData.sellerAcceptedType || 'empty';
                        return PORT_COLORS[mData.sellerAcceptedType] || PORT_COLORS.empty;
                    }
                })();
                visualNode = this.add.rectangle(pX, pY, 10, 10, color || PORT_COLORS[p.type]).setInteractive({ useHandCursor: true }).setDepth(20);
                visualNode.setStrokeStyle(2, 0x0f1322);
            } else {
                visualNode = this.add.circle(pX, pY, 6, PORT_COLORS[p.type]).setInteractive({ useHandCursor: true }).setDepth(20);
                visualNode.setStrokeStyle(2, 0x0f1322);
            }

            this.uiCamera.ignore(visualNode);
            const portInstance = { ...p, sprite: visualNode, isInput, moduleData: mData };

            visualNode.lastClickTime = 0;
            visualNode.on('pointerdown', (pointer) => {
                if (!pointer.leftButtonDown()) return;
                const currentTime = this.time.now;
                if (currentTime - visualNode.lastClickTime < 300) {
                    this.disconnectAllFromPort(portInstance);
                    visualNode.lastClickTime = 0;
                    return;
                }
                visualNode.lastClickTime = currentTime;
                this.isWiring = true;
                this.activeWiringSource = { module: mData, port: portInstance };
            });

            visualNode.on('pointerover', () => {
                this.hoveredPort = portInstance;
                if (p.type === 'money') {
                    visualNode.drawTriangleShape(2, 0xffffff);
                } else {
                    visualNode.setStrokeStyle(2, 0xffffff);
                }
            });
            visualNode.on('pointerout', () => {
                this.hoveredPort = null;
                if (p.type === 'money') {
                    visualNode.drawTriangleShape(2, 0x0f1322);
                } else {
                    visualNode.setStrokeStyle(2, 0x0f1322);
                }
            });

            mData.container.add(visualNode);
            if (isInput) {
                const idx = mData.inputs.findIndex(i => i.idName === p.idName);
                mData.inputs[idx] = portInstance;
            } else {
                const idx = mData.outputs.findIndex(o => o.idName === p.idName);
                mData.outputs[idx] = portInstance;
            }
        };

        mData.inputs.forEach(p => createPortVisual(p, true));
        mData.outputs.forEach(p => createPortVisual(p, false));
    }

    updatePortsPosition(m) {}

    handleGlobalPointerUp() {
        if (this.isWiring && this.activeWiringSource) {
            if (this.hoveredPort) {
                const src = this.activeWiringSource.port;
                const dest = this.hoveredPort;

                if (src.isInput !== dest.isInput && src.moduleData.id !== dest.moduleData.id) {
                    const inPort = src.isInput ? src : dest;
                    const outPort = src.isInput ? dest : src;

                    this.connectPorts(outPort, inPort);
                }
            }
        }
        this.isWiring = false;
        this.activeWiringSource = null;
    }

    connectPorts(outPort, inPort) {
        if (inPort.type !== 'empty' && outPort.type !== 'empty' && inPort.type !== outPort.type) {
            if (['seller', 'quarantine', 'antivirus'].includes(inPort.moduleData.type) && inPort.connectedWires.length === 0 && ['text', 'image', 'virus'].includes(inPort.type)) {
                if (inPort.moduleData.type === 'antivirus') inPort.moduleData.inputs[1].type = outPort.type;

                inPort.moduleData.stats.textStock = 0;
                inPort.moduleData.stats.imageStock = 0;
                inPort.moduleData.stats.virusStock = 0;
                inPort.moduleData.stats.rawTextStock = 0;
                inPort.moduleData.stats.rawImageStock = 0;
                inPort.moduleData.stats.rawVirusStock = 0;
            } else {
                this.isWiring = false;
                this.activeWiringSource = null;
                return;
            }
        }
        if (outPort.moduleData.type === 'overclocker' && (outPort.type === 'empty' || outPort.type !== inPort.type)) {
            this.isWiring = false;
            this.activeWiringSource = null;
            return;
        }
        if (['image', 'text'].includes(outPort.type) && outPort.connectedWires.length > 0) {
            this.isWiring = false;
            this.activeWiringSource = null;
            return;
        }

        if (inPort.moduleData.type === 'seller' && inPort.idName === 'resource') {
            if ((outPort.type !== 'text' && outPort.type !== 'image')) {
                this.isWiring = false;
                this.activeWiringSource = null;
                return;
            }
            const sMod = inPort.moduleData;
            sMod.sellerAcceptedType = outPort.type;
            inPort.type = outPort.type;
            inPort.sprite.setFillStyle(PORT_COLORS[outPort.type]);
            if (outPort.type === 'text') {
                inPort.name = "Text\n";
                sMod.portLabels['resource'].template = "Text\n";
            } else {
                inPort.name = "Image\n";
                sMod.portLabels['resource'].template = "Image\n";
            }
        }

        if (inPort.moduleData.type === 'quarantine' && inPort.idName === 'virus_input') {
            if (inPort.connectedWires.length > 0 || outPort.type !== 'virus') {
                this.isWiring = false;
                this.activeWiringSource = null;
                return;
            }
            const qMod = inPort.moduleData;
            if (['text', 'image'].includes(outPort.moduleData.inputs[1].type)) {
                qMod.quarantineActiveType = outPort.moduleData.inputs[1].type;
                inPort.name = `Infected ${qMod.quarantineActiveType.charAt(0).toUpperCase() + qMod.quarantineActiveType.slice(1)}\n`;
                qMod.portLabels['virus_input'].template = `Infected ${qMod.quarantineActiveType.charAt(0).toUpperCase() + qMod.quarantineActiveType.slice(1)}\n`;
            } else {
                qMod.quarantineActiveType = 'unknown';
                inPort.name = `Infected File\n`;
                qMod.portLabels['virus_input'].template = `Infected File\n`;
            }
        }

        if (inPort.moduleData.type === 'overclocker' && inPort.idName === 'inputSpeed') {
            const validSpeeds = ['clock', 'download', 'upload'];
            if (!validSpeeds.includes(outPort.type)) {
                this.isWiring = false;
                this.activeWiringSource = null;
                return;
            }
            const ovMod = inPort.moduleData;
            ovMod.overclockerType = outPort.type;
            inPort.type = outPort.type;
            inPort.sprite.setFillStyle(PORT_COLORS[outPort.type]);
            const outSpeedPort = ovMod.outputs.find(o => o.idName === 'outputSpeed');
            outSpeedPort.type = outPort.type;
            outSpeedPort.sprite.setFillStyle(PORT_COLORS[outPort.type]);
        } else if (inPort.moduleData.type === 'antivirus' && inPort.idName === 'mixed_input') {
            if (outPort.type !== 'text' && outPort.type !== 'image') {
                this.isWiring = false;
                this.activeWiringSource = null;
                return;
            }
            const avMod = inPort.moduleData;
            if (inPort.type !== 'empty' && inPort.type !== outPort.type) {
                this.isWiring = false;
                this.activeWiringSource = null;
                return;
            }
            avMod.antivirusInputType = outPort.type;
            inPort.type = outPort.type;
            inPort.sprite.setFillStyle(PORT_COLORS[outPort.type]);
            const cleanOut = avMod.outputs.find(o => o.idName === 'clean_output');
            cleanOut.type = outPort.type;
            cleanOut.sprite.setFillStyle(PORT_COLORS[outPort.type]);
        }

        const newWire = { outPort, inPort, fromModule: outPort.moduleData, toModule: inPort.moduleData };
        outPort.connectedWires = outPort.connectedWires || [];
        inPort.connectedWires = inPort.connectedWires || [];
        outPort.connectedWires.push(newWire);
        inPort.connectedWires.push(newWire);
        this.connections.push(newWire);

        this.isWiring = false;
        this.activeWiringSource = null;
    }

    disconnectAllFromPort(portInstance) {
        const wiresToDisconnect = [...(portInstance.connectedWires || [])];
        wiresToDisconnect.forEach(wire => {
            wire.outPort.connectedWires = wire.outPort.connectedWires.filter(w => w !== wire);
            wire.inPort.connectedWires = wire.inPort.connectedWires.filter(w => w !== wire);
            this.connections = this.connections.filter(w => w !== wire);
            
            const inM = wire.inPort.moduleData;
            const inP = wire.inPort;

            if (inP && inP.connectedWires.length === 0) {
                if (inM.type === 'overclocker' && inP.idName === 'inputSpeed') {
                    inM.overclockerType = 'empty';
                    inP.type = 'empty';
                    inP.sprite.setFillStyle(PORT_COLORS['empty']);
                    const outSpeedPort = inM.outputs.find(o => o.idName === 'outputSpeed');
                    if (outSpeedPort) {
                        outSpeedPort.type = 'empty';
                        outSpeedPort.sprite.setFillStyle(PORT_COLORS['empty']);
                    }
                }
            }
        });
    }

    saveGame() {
        const savedModules = this.modules.map(m => ({
            id: m.id,
            type: m.type,
            x: m.container.x,
            y: m.container.y,
            level: m.level,
            upgradeCost: m.upgradeCost,
            stats: m.stats,
            sellerAcceptedType: m.sellerAcceptedType,
            antivirusInputType: m.antivirusInputType,
            quarantineActiveType: m.quarantineActiveType,
            quarantineFileCount: m.quarantineFileCount,
            overclockerType: m.overclockerType
        }));

        const savedWires = this.connections.map(w => ({
            fromModuleId: w.fromModule.id,
            outPortIdName: w.outPort.idName,
            toModuleId: w.toModule.id,
            inPortIdName: w.inPort.idName
        }));

        const savedTasks = this.tasks.map((t, i) => t.completed ? i : null).filter(i => i !== null) || [];

        const saveData = {
            globalMoney: this.globalMoney,
            modules: savedModules,
            wires: savedWires,
            nodeIdCounter: this.nodeIdCounter,
            tasks: savedTasks[savedTasks.length - 1] || -1
        };

        localStorage.setItem('overclocked_save', JSON.stringify(saveData));
        if (this.saveTxt) {
            this.saveTxt.setText("SAVED !");
            this.time.delayedCall(1500, () => { if (this.saveTxt) this.saveTxt.setText("SAVE"); });
        }
    }

    loadGame() {
        const dataStr = localStorage.getItem('overclocked_save');
        if (!dataStr) return;

        try {
            const saveData = JSON.parse(dataStr);
            this.modules.forEach(m => m.container.destroy());
            this.modules = [];
            this.connections = [];
            this.wireGraphics.clear();

            this.globalMoney = saveData.globalMoney;
            this.nodeIdCounter = saveData.nodeIdCounter || 0;

            saveData.modules.forEach(mSave => {
                const m = this.spawnModule(mSave.type, mSave);
                m.level = mSave.level || 1;
                m.upgradeCost = mSave.upgradeCost || 50;
                m.stats = { ...m.stats, ...mSave.stats };
                m.sellerAcceptedType = mSave.sellerAcceptedType || null;
                m.antivirusInputType = mSave.antivirusInputType || null;
                m.quarantineActiveType = mSave.quarantineActiveType || null;
                m.quarantineFileCount = mSave.quarantineFileCount || 0;
                m.overclockerType = mSave.overclockerType || 'empty';
            });

            saveData.wires.forEach(wSave => {
                const fromMod = this.modules.find(m => m.id === wSave.fromModuleId);
                const toMod = this.modules.find(m => m.id === wSave.toModuleId);

                if (fromMod && toMod) {
                    const outPort = fromMod.outputs.find(o => o.idName === wSave.outPortIdName);
                    const inPort = toMod.inputs.find(i => i.idName === wSave.inPortIdName);

                    if (outPort && inPort) {
                        this.connectPorts(outPort, inPort);
                    }
                }
            });

            this.tasks.forEach((t, i) => {
                t.completed = i <= (saveData.tasks || -1);
            });

        } catch (e) {
            console.error("Erreur de sauvegarde:", e);
        }
    }

    update(time, delta) {
        const dt = delta / 1000;
        this.balanceText.setText(`Money: $${formatNum(this.globalMoney)} [${formatNum(this.globalMoneyPerSecond)}/s]`);

        this.modules.forEach(m => {
            m.activeInputs = { download: 0, upload: 0, clock: 0, overclockerInput: 0, coolantPower: 0 };
        });

        this.modules.forEach(src => {
            if (src.type === 'overclocker') return; 
            src.outputs.forEach(outPort => {
                const connectedCount = outPort.connectedWires ? outPort.connectedWires.length : 0;
                if (connectedCount === 0) return;

                let baseValue = 0;
                if (outPort.type === 'download') baseValue = src.stats.download;
                else if (outPort.type === 'upload') baseValue = src.stats.upload;
                else if (outPort.type === 'clock') baseValue = src.stats.clock;
                else if (outPort.type === 'coolant') baseValue = src.stats.coolingPower;

                const sharedValue = baseValue / connectedCount;

                outPort.connectedWires.forEach(wire => {
                    const dest = wire.inPort.moduleData;
                    if (dest.type === 'overclocker' && wire.inPort.idName === 'inputSpeed') {
                        dest.activeInputs.overclockerInput += sharedValue;
                    } else if (outPort.type === 'download') dest.activeInputs.download += sharedValue;
                    else if (outPort.type === 'upload') dest.activeInputs.upload += sharedValue;
                    else if (outPort.type === 'clock') dest.activeInputs.clock += sharedValue;
                    else if (outPort.type === 'coolant') dest.activeInputs.coolantPower += sharedValue;
                });
            });
        });

        this.modules.forEach(src => {
            if (src.type !== 'overclocker') return;
            src.outputs.forEach(outPort => {
                const connectedCount = outPort.connectedWires ? outPort.connectedWires.length : 0;
                if (connectedCount === 0) return;

                const baseValue = src.activeInputs.overclockerInput && src.stats.heat < 100 ?
                    (src.isBoosting ?
                        src.activeInputs.overclockerInput * 2
                    : src.activeInputs.overclockerInput * (src.stopBoost ? 0 : 1))
                : 0;

                const sharedValue = baseValue / connectedCount;

                outPort.connectedWires.forEach(wire => {
                    const dest = wire.inPort.moduleData;
                    if (src.overclockerType === 'download') dest.activeInputs.download += sharedValue;
                    else if (src.overclockerType === 'upload') dest.activeInputs.upload += sharedValue;
                    else if (src.overclockerType === 'clock') dest.activeInputs.clock += sharedValue;
                });
            });
        });

        this.connections.forEach(wire => {
            const src = wire.fromModule;
            const dest = wire.inPort.moduleData;

            if (dest.type === 'antivirus' && wire.inPort.idName === 'mixed_input') {
                if (src.type === 'downloader' && src.stats.textStock > 0 && dest.antivirusInputType === 'text') {
                    const trans = Math.min(src.stats.textStock, 5);
                    src.stats.textStock -= trans;
                    dest.stats.rawTextStock += trans;
                } else if (src.type === 'imager' && src.stats.imageStock > 0 && dest.antivirusInputType === 'image') {
                    const trans = Math.min(src.stats.imageStock, 2);
                    src.stats.imageStock -= trans;
                    dest.stats.rawImageStock += trans;
                }
            }
            if (dest.type === 'quarantine' && wire.inPort.idName === 'virus_input') {
                if (src.type === 'antivirus' && src.stats.virusStock > 0) {
                    const trans = Math.min(src.stats.virusStock, 5);
                    src.stats.virusStock -= trans;
                    dest.quarantineFileCount += trans;
                }
            }
            if (dest.type === 'seller' && wire.inPort.idName === 'resource') {
                if (src.type === 'downloader' && src.stats.textStock > 0 && dest.sellerAcceptedType === 'text') {
                    const trans = Math.min(src.stats.textStock, 10);
                    src.stats.textStock -= trans;
                    dest.stats.textStock += trans;
                } else if (src.type === 'imager' && src.stats.imageStock > 0 && dest.sellerAcceptedType === 'image') {
                    const trans = Math.min(src.stats.imageStock, 5);
                    src.stats.imageStock -= trans;
                    dest.stats.imageStock += trans;
                } else if (src.type === 'antivirus') {
                    if (dest.sellerAcceptedType === 'text' && src.stats.textStock > 0) {
                        const trans = Math.min(src.stats.textStock, 10);
                        src.stats.textStock -= trans;
                        dest.stats.textStock += trans;
                    } else if (dest.sellerAcceptedType === 'image' && src.stats.imageStock > 0) {
                        const trans = Math.min(src.stats.imageStock, 5);
                        src.stats.imageStock -= trans;
                        dest.stats.imageStock += trans;
                    }
                }
            }
            if (dest.type === 'collector' && wire.inPort.idName === 'money') {
                if (src.stats.vault > 0) {
                    this.globalMoney += src.stats.vault;
                    this.collectorRateCounter += src.stats.vault;
                    src.stats.vault = 0;
                }
            }
            if (src.type === 'antivirus') {
                if (dest.type === 'seller' ) {
                    dest.sellerAcceptedType = src.antivirusInputType;
                    if (dest.sellerAcceptedType === 'text') {
                        dest.inputs.find(i => i.idName === 'resource').sprite.setFillStyle(PORT_COLORS['text']);
                    } else if (dest.sellerAcceptedType === 'image') {
                        dest.inputs.find(i => i.idName === 'resource').sprite.setFillStyle(PORT_COLORS['image']);
                    } else {
                        dest.inputs.find(i => i.idName === 'resource').sprite.setFillStyle(PORT_COLORS['empty']);
                    }
                } else if (dest.type === 'quarantine') {
                    dest.quarantineActiveType = src.antivirusInputType;
                }
            }
        });

        this.globalMoneyPerSecond = 0;
        this.modules.forEach(m => {
            if (m.type === 'network') {
                m.portLabels['download'].obj.setText(`Download\n${formatSpeed(m.stats.download)}`);
                m.portLabels['upload'].obj.setText(`Upload\n${formatSpeed(m.stats.upload)}`);
            } 
            else if (m.type === 'downloader') {
                const inSpeed = m.activeInputs.download;
                m.portLabels['download'].obj.setText(`Download\n${formatSpeed(inSpeed)}`);
                
                if (inSpeed > 0) {
                    m.currentBytes += inSpeed * dt;
                    if (m.currentBytes >= SIZE_TEXT_FILE) {
                        const count = Math.floor(m.currentBytes / SIZE_TEXT_FILE);
                        m.stats.textStock += count;
                        m.currentBytes %= SIZE_TEXT_FILE;
                    }
                    m.progress = (m.currentBytes / SIZE_TEXT_FILE) * 100;
                } else {
                    m.currentBytes = 0;
                    m.progress = 0;
                }
                m.portLabels['text'].obj.setText(`Text\n${formatNum(m.stats.textStock)} files`);
                m.byteLabelLeft.setText(formatBytes(m.currentBytes));
                m.byteLabelRight.setText(formatBytes(SIZE_TEXT_FILE));
                this.drawBar(m);
            } 
            else if (m.type === 'imager') {
                const inSpeed = m.activeInputs.download;
                m.portLabels['download'].obj.setText(`Download\n${formatSpeed(inSpeed)}`);
                
                if (inSpeed > 0) {
                    m.currentBytes += inSpeed * dt;
                    if (m.currentBytes >= SIZE_IMAGE_FILE) {
                        const count = Math.floor(m.currentBytes / SIZE_IMAGE_FILE);
                        m.stats.imageStock += count;
                        m.currentBytes %= SIZE_IMAGE_FILE;
                    }
                    m.progress = (m.currentBytes / SIZE_IMAGE_FILE) * 100;
                } else {
                    m.currentBytes = 0;
                    m.progress = 0;
                }
                m.portLabels['image'].obj.setText(`Image\n${formatNum(m.stats.imageStock)} files`);
                m.byteLabelLeft.setText(formatBytes(m.currentBytes));
                m.byteLabelRight.setText(formatBytes(SIZE_IMAGE_FILE));
                this.drawBar(m);
            } 
            else if (m.type === 'seller') {
                const inSpeed = m.activeInputs.upload;
                m.portLabels['upload'].obj.setText(`Upload Speed\n${formatSpeed(inSpeed)}`);
                
                let stock = m.sellerAcceptedType === 'text' ? m.stats.textStock : (m.sellerAcceptedType === 'image' ? m.stats.imageStock : 0);
                let pricePerFile = m.sellerAcceptedType === 'text' ? 15 : (m.sellerAcceptedType === 'image' ? 35 : 0);
                let bytesPerFile = m.sellerAcceptedType === 'text' ? SIZE_TEXT_FILE : (m.sellerAcceptedType === 'image' ? SIZE_IMAGE_FILE : 1);

                const mInputs = m.inputs.find(i => i.idName === 'resource');
                let sum = [];

                if (mInputs && mInputs.connectedWires) {
                    mInputs.connectedWires.forEach(w => {
                        if (w.fromModule.type === 'antivirus') {
                            const typeMultiplier = w.fromModule.antivirusInputType === 'text' ? 1 : 0.4;
                            const filesPerSecond = w.fromModule.activeInputs.clock * 50 * typeMultiplier;
                            sum.push([2, filesPerSecond]);
                        } else {
                            const typeMultiplier = w.fromModule.type === 'downloader' ? 1 : 0.4;
                            const filesPerSecond = w.fromModule.activeInputs.download * typeMultiplier;
                            sum.push([1, filesPerSecond]);
                        }
                    });
                }

                const betterFilePerSecond = Math.max(...sum.map(m => m[1] || 0)) || 1;

                const totalWeightedRatio = sum.reduce((acc, [multiplier, fps]) => acc + (multiplier * (fps / betterFilePerSecond)), 0);
                const totalRatio = sum.reduce((acc, [_, fps]) => acc + (fps / betterFilePerSecond), 0);

                const cleanFiles = totalRatio === 0 ? 1 : totalWeightedRatio / totalRatio;
                
                if (m.sellerAcceptedType === 'text') {
                    m.portLabels['resource'].obj.setText(`Text\n${formatNum(stock)} files`);
                } else if (m.sellerAcceptedType === 'image') {
                    m.portLabels['resource'].obj.setText(`Image\n${formatNum(stock)} files`);
                } else {
                    m.portLabels['resource'].obj.setText(`Data\n0 files`);
                }

                if (stock > 0 && inSpeed > 0) {
                    m.currentBytes += inSpeed * dt;
                    if (m.currentBytes >= bytesPerFile) {
                        const count = Math.min(stock, Math.floor(m.currentBytes / bytesPerFile));
                        if (m.sellerAcceptedType === 'text') m.stats.textStock -= count;
                        else m.stats.imageStock -= count;
                        m.stats.vault += count * pricePerFile * cleanFiles;
                        m.currentBytes %= bytesPerFile;
                    }
                    m.progress = (m.currentBytes / bytesPerFile) * 100;
                } else {
                    m.currentBytes = 0;
                    m.progress = 0;
                }
                m.portLabels['money'].obj.setText(`Money\n${formatNum(m.stats.vault)}$ [${formatNum(pricePerFile * cleanFiles)} $/u]`);
                m.byteLabelLeft.setText(formatBytes(m.currentBytes));
                m.byteLabelRight.setText(formatBytes(bytesPerFile));
                this.drawBar(m);

                if (m.sellerAcceptedType && stock === 0 && m.inputs.find(i => i.idName === 'resource').connectedWires.length === 0) {
                    m.sellerAcceptedType = null;
                    m.stats.textStock = 0;
                    m.stats.imageStock = 0;
                    m.stats.virusStock = 0;
                    m.currentBytes = 0;

                    m.portLabels['resource'].obj.setText("Data\n");
                    m.portLabels['resource'].template = "Data\n";
                    m.inputs.find(i => i.idName === 'resource').sprite.setFillStyle(PORT_COLORS['empty']);
                }
            } 
            else if (m.type === 'antivirus') {
                const inClock = m.activeInputs.clock;
                m.portLabels['clock'].obj.setText(`Clock Speed\n${formatHz(inClock)}`);

                const totalRaw = m.stats.rawTextStock + m.stats.rawImageStock;
                if (m.antivirusInputType === 'text') {
                    m.portLabels['mixed_input'].obj.setText(`Text\n${formatNum(totalRaw)} files`);
                    m.portLabels['clean_output'].obj.setText(`Clean Text\n${formatNum(m.stats.textStock)} files`);
                    m.portLabels['virus_output'].obj.setText(`Infected Text\n${formatNum(m.stats.virusStock)} files`);
                } else if (m.antivirusInputType === 'image') {
                    m.portLabels['mixed_input'].obj.setText(`Image\n${formatNum(totalRaw)} files`);
                    m.portLabels['clean_output'].obj.setText(`Clean Image\n${formatNum(m.stats.imageStock)} files`);
                    m.portLabels['virus_output'].obj.setText(`Infected Image\n${formatNum(m.stats.virusStock)} files`);
                } else {
                    m.portLabels['mixed_input'].obj.setText(`File\n0 files`);
                    m.portLabels['clean_output'].obj.setText(`Clean File\n0 files`);
                    m.portLabels['virus_output'].obj.setText(`Infected File\n0 files`);
                }

                let targetFileBytes = m.antivirusInputType === 'image' ? SIZE_IMAGE_FILE : SIZE_TEXT_FILE;
                let bpsSpeed = inClock * 50; 

                if (totalRaw > 0 && bpsSpeed > 0) {
                    m.currentBytes += bpsSpeed * dt;
                    if (m.currentBytes >= targetFileBytes) {
                        const processCount = Math.min(totalRaw, Math.floor(m.currentBytes / targetFileBytes));
                        for (let k = 0; k < processCount; k++) {
                            const r = Math.random();    
                            m.stats[`raw${m.antivirusInputType === 'text' ? 'Text' : 'Image'}Stock`]--;
                            if ((m.antivirusInputType === 'text' && r < 0.35) || (m.antivirusInputType === 'image' && r < 0.40)) m.stats.virusStock++;
                            else m.stats[`${m.antivirusInputType}Stock`]++;
                        }
                        m.currentBytes %= targetFileBytes;
                    }
                    m.progress = (m.currentBytes / targetFileBytes) * 100;
                } else {
                    m.currentBytes = 0;
                    m.progress = 0;
                }

                m.byteLabelLeft.setText(formatBytes(m.currentBytes));
                m.byteLabelRight.setText(formatBytes(targetFileBytes));
                this.drawBar(m);

                
                if (m.antivirusInputType && totalRaw === 0 && m.inputs.find(i => i.idName === 'mixed_input').connectedWires.length === 0) {
                    m.antivirusInputType = null;
                    m.stats.rawTextStock = 0;
                    m.stats.rawImageStock = 0;
                    m.currentBytes = 0;

                    m.portLabels['mixed_input'].obj.setText("File\n");
                    m.inputs.find(i => i.idName === 'mixed_input').name = "File\n";
                    m.portLabels['mixed_input'].template = "File\n";
                    m.inputs.find(i => i.idName === 'mixed_input').sprite.setFillStyle(PORT_COLORS['empty']);

                    const cleanOut = m.outputs.find(o => o.idName === 'clean_output');
                    if (cleanOut) {
                        cleanOut.type = 'empty';
                        cleanOut.name = "Clean File\n";
                        m.portLabels['clean_output'].template = "Clean File\n";
                        cleanOut.sprite.setFillStyle(PORT_COLORS['empty']);
                    }

                    const virusOut = m.outputs.find(o => o.idName === 'virus_output');
                    if (virusOut) {
                        virusOut.name = "Infected File\n";
                        m.portLabels['virus_output'].template = "Infected File\n";
                    }
                }
            } 
            else if (m.type === 'quarantine') {
                const inClock = m.activeInputs.clock;
                m.portLabels['clock'].obj.setText(`Clock Speed\n${formatHz(inClock)}`);
                
                let prefix = m.quarantineActiveType === 'text' ? 'Text' : (m.quarantineActiveType === 'image' ? 'Image' : 'File');
                m.portLabels['virus_input'].obj.setText(`Infected ${prefix}\n${formatNum(m.quarantineFileCount)} files`);

                let basePrice = 0;
                let targetFileBytes = m.quarantineActiveType === 'image' ? SIZE_IMAGE_FILE : SIZE_TEXT_FILE;
                if (m.quarantineActiveType === 'text') basePrice = 22;
                else if (m.quarantineActiveType === 'image') basePrice = 52;

                let bpsSpeed = inClock * 50;

                if (m.quarantineFileCount > 0 && bpsSpeed > 0) {
                    m.currentBytes += bpsSpeed * dt;
                    if (m.currentBytes >= targetFileBytes) {
                        const count = Math.min(m.quarantineFileCount, Math.floor(m.currentBytes / targetFileBytes));
                        m.quarantineFileCount -= count;
                        m.stats.vault += count * basePrice;
                        m.currentBytes %= targetFileBytes;
                    }
                    m.progress = (m.currentBytes / targetFileBytes) * 100;
                } else {
                    m.currentBytes = 0;
                    m.progress = 0;
                }
                m.portLabels['money'].obj.setText(`Money\n${formatNum(m.stats.vault)}$ [${formatNum(basePrice)} $/u]`);

                m.byteLabelLeft.setText(formatBytes(m.currentBytes));
                m.byteLabelRight.setText(formatBytes(targetFileBytes));
                this.drawBar(m);

                
                if (m.quarantineActiveType && m.quarantineFileCount === 0 && m.inputs.find(i => i.idName === 'virus_input').connectedWires.length === 0) {
                    m.quarantineActiveType = null;
                    m.inputs.find(i => i.idName === 'virus_input').name = "Infected File\n";
                    m.portLabels['virus_input'].template = "Infected File\n";
                    m.quarantineFileCount = 0;
                    m.currentBytes = 0;
                }
            } 
            else if (m.type === 'collector') {
                m.portLabels['money'].obj.setText(`Money\n${formatNum(this.currentCollectorDisplayRate)} $/s`);
                this.globalMoneyPerSecond += this.currentCollectorDisplayRate;
            } 
            else if (m.type === 'cpu') {
                m.portLabels['clock'].obj.setText(`Clock Speed\n${formatHz(m.stats.clock)}`);
            } 
            else if (m.type === 'task_worker') {
                const inClock = m.activeInputs.clock;
                m.portLabels['clock'].obj.setText(`Clock Speed\n${formatHz(inClock)}`);
                const cycle = 1000;
                if (inClock > 0) {
                    m.currentBytes += inClock * dt;
                    if (m.currentBytes >= cycle) {
                        const counts = Math.floor(m.currentBytes / cycle);
                        m.stats.vault += counts * 10;
                        m.currentBytes %= cycle;
                    }
                    m.progress = (m.currentBytes / cycle) * 100;
                } else {
                    m.currentBytes = 0;
                    m.progress = 0;
                }
                m.portLabels['money'].obj.setText(`Money\n${formatNum(m.stats.vault)}$ [10 $/u]`);
                this.drawBar(m);
            } 
            else if (m.type === 'overclocker') {
                const inSpeed = m.activeInputs.overclockerInput || 0;
                const cooling = m.activeInputs.coolantPower || 0;
                
                const boostFactor = m.stats.heat < 100 ? (m.isBoosting ? 2 : 1) : 0;
                let effectiveOutSpeed = inSpeed * boostFactor;

                let speedTextIn = m.overclockerType === 'clock' ? formatHz(inSpeed) : (m.overclockerType === 'empty' ? '0' : formatSpeed(inSpeed));
                let speedTextOut = (m.overclockerType === 'clock' ? formatHz(effectiveOutSpeed) : (m.overclockerType === 'empty' ? '0' : formatSpeed(effectiveOutSpeed))) + (boostFactor > 1 ? ' [x2]' : '');
                
                m.portLabels['inputSpeed'].obj.setText(`${m.overclockerType.charAt(0).toUpperCase() + m.overclockerType.slice(1)} Speed\n${speedTextIn}`);
                m.portLabels['coolant'].obj.setText(`Cooling\n${cooling.toFixed(1)}x`);
                m.portLabels['outputSpeed'].obj.setText(`${m.overclockerType.charAt(0).toUpperCase() + m.overclockerType.slice(1)} Speed\n${speedTextOut}`);

                const up = (35 - cooling * 2) * dt;
                const down = up * 0.8 * (m.stopBoost ? 0.2 : 1);
                if (m.isBoosting && inSpeed > 0) {
                    m.stats.heat += up;
                } else {
                    m.stats.heat -= down;
                }

                const overHeating = m.stats.heat >= 100;
                if (overHeating) {
                    m.isBoosting = false;
                    m.stopBoost = true;
                    m.boostTxt.setText("OVERHEATED");
                } else if (m.stats.heat <= 0) {
                    m.boostTxt.setText("BOOST (Hold)");
                    m.stopBoost = false;
                }
                m.stats.heat = Phaser.Math.Clamp(m.stats.heat, 0, 100);

                m.progress = m.stats.heat;
                this.drawBar(m);
            } 
            else if (m.type === 'cooler') {
                m.portLabels['coolant_out'].obj.setText(`Coolant Power\n${m.stats.coolingPower.toFixed(1)}x`);
            }
        });

        this.wireGraphics.clear();
        this.connections.forEach(wire => {
            let sX = wire.outPort.sprite.x + wire.fromModule.container.x;
            let sY = wire.outPort.sprite.y + wire.fromModule.container.y;
            let eX = wire.inPort.sprite.x + wire.toModule.container.x;
            let eY = wire.inPort.sprite.y + wire.toModule.container.y;

            if (wire.outPort.type === 'money') {
                sX = wire.fromModule.container.x + wire.fromModule.width;
                sY = wire.fromModule.container.y + wire.outPort.y;
            }
            if (wire.inPort.type === 'money') {
                eX = wire.toModule.container.x;
                eY = wire.toModule.container.y + wire.inPort.y;
            }

            this.drawOrthogonalWire(sX, sY, eX, eY, PORT_COLORS[wire.outPort.type]);
        });

        if (this.isWiring && this.activeWiringSource) {
            const sCircle = this.activeWiringSource.port.sprite;
            const wp = this.cameras.main.getWorldPoint(this.input.x, this.input.y);
            
            let sX = sCircle.x + this.activeWiringSource.module.container.x;
            let sY = sCircle.y + this.activeWiringSource.module.container.y;
            if (this.activeWiringSource.port.type === 'money') {
                const mod = this.activeWiringSource.port.moduleData;
                sX = this.activeWiringSource.port.isInput ? mod.container.x : mod.container.x + mod.width;
                sY = mod.container.y + this.activeWiringSource.port.y;
            }
            this.drawOrthogonalWire(sX, sY, wp.x, wp.y, PORT_COLORS[this.activeWiringSource.port.type]);
        }

        this.updateTask();
    }

    drawBar(mod) {
        if (!mod.progBar) return;
        mod.progBar.clear();
        if (mod.type === 'overclocker') {
            const col = mod.stats.heat > 75 ? 0xef4444 : 0xeab308;
            mod.progBar.fillStyle(col, 1);
        } else {
            mod.progBar.fillStyle(0x00ff88, 1);
        }
        mod.progBar.fillRect(10, mod.height - 12, (mod.width - 20) * (mod.progress / 100), 4);
    }

    drawOrthogonalWire(sX, sY, eX, eY, color) {
        this.wireGraphics.lineStyle(2.5, color, 1);
        this.wireGraphics.beginPath();
        this.wireGraphics.moveTo(sX, sY);
        
        const midX = sX + (eX - sX) / 2;
        this.wireGraphics.lineTo(midX, sY);
        this.wireGraphics.lineTo(midX, eY);
        this.wireGraphics.lineTo(eX, eY);
        this.wireGraphics.strokePath();
    }
}

const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: '#06080e',
    parent: 'phaser-game',
    scene: [GameScene]
};

const game = new Phaser.Game(config);
window.addEventListener('resize', () => {
    game.scale.resize(window.innerWidth, window.innerHeight);
});
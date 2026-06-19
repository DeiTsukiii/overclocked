import { MODULES_CLASSES } from '../modules/classes.js';
import { formatNum, formatBytes, formatSpeed, formatHz } from '../format.js';
import { drawOrthogonalWire } from '../ports.js';
import { saveGame, loadGame } from '../save.js';
import { connectPorts, drawWires } from '../ports.js';
import { DATA_TYPES } from '../data.js';
import { createShop, populateShop } from '../shop.js';
import { createTasks, updateTasks } from '../tasks.js';

const GRID_SIZE = 40; 
const GRID_COLS = 200;
const GRID_ROWS = 200;

export default class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    init() {
        this.dev = window.location.search.includes('dev=true');
        this.globalMoney = this.dev ? 2000000000000000000000 : 200;
        this.globalMoneyPerSecond = 0;
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

        this.grid = {
            GRID_SIZE: GRID_SIZE,
            GRID_COLS: GRID_COLS,
            GRID_ROWS: GRID_ROWS
        };
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

        this.saveBtn = this.add.rectangle(w - 270, 10, 110, 30, 0x059669).setOrigin(0).setStrokeStyle(1, 0x10b981);
        this.saveTxt = this.add.text(w - 270 + 55, 25, "SAVE", { fontSize: '11px', fill: '#ffffff', fontWeight: 'bold', fontFamily: 'monospace' }).setOrigin(0.5);
        this.saveBtn.setInteractive({ useHandCursor: true }).on('pointerdown', () => saveGame(this));
        this.uiContainer.add([this.saveBtn, this.saveTxt]);

        createShop(this, w, h);

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
                m.x = Math.round((worldPointer.x - m.dragOffsetX) / GRID_SIZE) * GRID_SIZE;
                m.y = Math.round((worldPointer.y - m.dragOffsetY) / GRID_SIZE) * GRID_SIZE;
            } 
            else if (pointer.rightButtonDown()) {
                this.cameras.main.scrollX -= (pointer.x - pointer.prevPosition.x) / this.cameras.main.zoom;
                this.cameras.main.scrollY -= (pointer.y - pointer.prevPosition.y) / this.cameras.main.zoom;
            }
        });

        this.input.on('pointerup', (pointer) => {
            if (this.activeDraggingModule) {
                const m = this.activeDraggingModule;
                m.x = Math.round(m.x / GRID_SIZE) * GRID_SIZE;
                m.y = Math.round(m.y / GRID_SIZE) * GRID_SIZE;
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

        createTasks(this);

        this.time.delayedCall(100, () => {
            loadGame(this);
            populateShop(this);
        });
    }

    handleGlobalPointerUp() {
        if (this.isWiring && this.activeWiringSource) {
            if (this.hoveredPort) {
                const src = this.activeWiringSource.port;
                const dest = this.hoveredPort;

                if (src.isInput !== dest.isInput && src.moduleData.id !== dest.moduleData.id) {
                    const inPort = src.isInput ? src : dest;
                    const outPort = src.isInput ? dest : src;
                    connectPorts(this, outPort, inPort);
                }
            }
        }
        this.isWiring = false;
        this.activeWiringSource = null;
    }

    update(time, delta) {
        this.globalMoneyPerSecond = 0;
        this.modules.forEach(m => m.update(time, delta));
        this.balanceText.setText(`Money: $${formatNum(this.globalMoney)} [${formatNum(this.globalMoneyPerSecond)}/s]`);

        this.wireGraphics.clear();
        drawWires(this.wireGraphics, this.connections);
        if (this.isWiring && this.activeWiringSource) {
            const sCircle = this.activeWiringSource.port.sprite;
            const wp = this.cameras.main.getWorldPoint(this.input.x, this.input.y);
            
            let sX = sCircle.x + this.activeWiringSource.module.x;
            let sY = sCircle.y + this.activeWiringSource.module.y;
            if (this.activeWiringSource.port.type === 'money') {
                const mod = this.activeWiringSource.port.moduleData;
                sX = this.activeWiringSource.port.isInput ? mod.x : mod.x + mod.width;
                sY = mod.y + this.activeWiringSource.port.y;
            }
            drawOrthogonalWire(this.wireGraphics, sX, sY, wp.x, wp.y, DATA_TYPES[this.activeWiringSource.port.type]?.color || DATA_TYPES['empty'].color);
        }

        updateTasks(this);
    }
}
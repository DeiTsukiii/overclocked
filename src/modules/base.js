import { MODULES, DATA_TYPES } from '../data.js';
import { formatBytes, formatNum } from '../format.js';
import { disconnectAllFromPort } from '../ports.js';
import { saveGame } from '../save.js';

export default class Module extends Phaser.GameObjects.Container {
    constructor(scene, x, y, type, dataType, customData = {}) {
        super(scene, x, y);

        this.scene = scene;
        this.type = type;
        this.dataType = dataType;
        this.MODULES = structuredClone(MODULES || {});
        this.DATA_TYPES = structuredClone(DATA_TYPES || {});
        this.init(customData);
    }

    init(customData = {}) {
        this.scene.add.existing(this);

        const { x: customX, y: customY, id: customId, level: customLevel } = customData;

        const width = 160;
        const height = 160;

        this.scene.uiCamera.ignore(this); 

        const bg = this.scene.add.rectangle(0, 0, width, height, 0x0f1322, 0.95).setOrigin(0).setStrokeStyle(2, 0x1e2640);
        this.add(bg);

        bg.setInteractive({ useHandCursor: true });
        bg.on('pointerdown', (pointer) => {
            if (pointer.leftButtonDown()) {
                this.scene.activeDraggingModule = this;
                const wp = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
                this.dragOffsetX = wp.x - this.x;
                this.dragOffsetY = wp.y - this.y;
            }
        });

        const headerModBg = this.scene.add.rectangle(1, 1, width - 2, 32, 0x141b30).setOrigin(0);
        this.add(headerModBg);

        const titleTxt = this.scene.add.text(10, 9, this.MODULES[this.type].title, { fontSize: '10px', fill: '#ffffff', fontWeight: 'bold', fontFamily: 'monospace' });
        this.add(titleTxt);
        this.titleTxt = titleTxt;

        const deleteBtn = this.scene.add.text(width - 5, 5, 'X', { fontSize: '15px', fill: '#ef4444', fontWeight: 'bold', fontFamily: 'monospace' }).setOrigin(1, 0);
        deleteBtn.setInteractive({ useHandCursor: true });
        deleteBtn.on('pointerdown', (pointer, localX, localY, event) => {
            if (event) event.stopPropagation();
            this.delete();
        });
        this.add(deleteBtn);

        this.id = customId || Phaser.Math.RND.uuid();
        this.type = this.type;
        this.width = width;
        this.height = height;
        this.title = this.MODULES[this.type].title;
        this.inputs = this.MODULES[this.type].inputs;
        this.outputs = this.MODULES[this.type].outputs;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;

        this.inputs?.forEach(p => {
            if (p.type === 'file' || p.type === 'speed') {p.type = this.dataType; p.file = true;}
            const lbl = this.scene.add.text(12, p.y - 12, '', { fontSize: '9px', fill: '#cbd5e1', fontFamily: 'monospace' });
            this.add(lbl);
            p.label = { obj: lbl, template: p.type };
            p.connectedWires = [];
        });
        this.outputs?.forEach(p => {
            if (p.type === 'file' || p.type === 'speed') {p.type = this.dataType; p.file = true;}
            const lbl = this.scene.add.text(width - 12, p.y - 12, '', { fontSize: '9px', fill: '#cbd5e1', fontFamily: 'monospace' }).setOrigin(1, 0);
            this.add(lbl);
            p.label = { obj: lbl, template: p.type };
            p.connectedWires = [];
        });

        const byteLabelLeft = this.scene.add.text(10, height - 25, '', { fontSize: '9px', fill: '#627d98', fontFamily: 'monospace' });
        const byteLabelRight = this.scene.add.text(width - 10, height - 25, '', { fontSize: '9px', fill: '#627d98', fontFamily: 'monospace', align: 'right' }).setOrigin(1, 0);
        
        this.add(byteLabelLeft);
        this.add(byteLabelRight);

        const barBg = this.scene.add.graphics();
        this.add(barBg);

        const progBar = this.scene.add.graphics();
        this.add(progBar);
        this.progressBar = { bar: progBar, bg: barBg, label: { left: byteLabelLeft, right: byteLabelRight }, init: () => {
            byteLabelLeft.setText(formatBytes(0));
            byteLabelRight.setText(formatBytes(this.DATA_TYPES[this.dataType].size));
            barBg.fillStyle(0x090d16, 1);
            barBg.fillRect(10, height - 12, width - 20, 4);
        }, setProgress: (value, max = this.DATA_TYPES[this.dataType]?.size || 1, color = 0x00ff88) => {
            if (!progBar) return;
            progBar.clear();
            progBar.fillStyle(color, 1);
            value = Phaser.Math.Clamp(value, 0, max);
            progBar.fillRect(10, this.height - 12, (this.width - 20) * (value / max), 4);
            byteLabelLeft.setText(formatBytes(value));
        }};

        const upBtn = this.scene.add.rectangle(10, height - 30, width - 20, 20, 0x1b233a).setOrigin(0).setStrokeStyle(1, 0x334155).setAlpha(0);
        const upTxt = this.scene.add.text(width / 2, height - 20, '', {
            fontSize: '9px', fill: '#38bdf8', fontWeight: 'bold', fontFamily: 'monospace'
        }).setOrigin(0.5);
        
        this.add([upBtn, upTxt]);
        upBtn.setInteractive({ useHandCursor: true });

        upBtn.on('pointerover', () => { upBtn.setFillStyle(0x24304f); });
        upBtn.on('pointerout', () => { upBtn.setFillStyle(0x1b233a); });
        
        upBtn.on('pointerdown', (pointer, localX, localY, event) => {
            if (event) event.stopPropagation();
            const upgradeCost = (this.MODULES[this.type].upgrade?.base || 0) * (this.MODULES[this.type].upgrade?.multiplier || 1) ** ((this.level || 1) - 1);
            
            if (this.scene.globalMoney >= upgradeCost) {
                this.scene.globalMoney -= upgradeCost;
                this.level++;

                titleTxt.setText(`${titleTxt.text.split(' [')[0]} [Lvl. ${this.level}]`);
                upTxt.setText(`Upgrade [$${formatNum(upgradeCost * (this.MODULES[this.type].upgrade?.multiplier || 1))}]`);
                saveGame(this.scene);
            }
        });
        this.upgradeBtn = { btn: upBtn, txt: upTxt, init: () => {
            const upgradeCost = (this.MODULES[this.type].upgrade?.base || 0) * (this.MODULES[this.type].upgrade?.multiplier || 1) ** ((this.level || 1) - 1);
            upTxt.setText(`Upgrade [$${formatNum(upgradeCost)}]`);
            upBtn.setAlpha(1);
        }};

        this.instantiatePortsGraphics();
        this.scene.modules.push(this);
    }

    instantiatePortsGraphics() {
        const createPortVisual = (p, isInput) => {
            const pX = isInput ? 0 : this.width;
            const pY = p.y;
            let visualNode;
            const color = this.DATA_TYPES[p.type]?.color || 0xffffff;

            if (this.DATA_TYPES[p.type]?.form === 'triangle') {
                visualNode = this.scene.add.graphics();
                visualNode.fillStyle(color, 1);
                visualNode.lineStyle(2, 0x0f1322, 1);
                
                visualNode.drawTriangleShape = (strokeWidth, strokeColor) => {
                    visualNode.clear();
                    visualNode.fillStyle(color, 1);
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
            } else if (this.DATA_TYPES[p.type]?.form === 'square') {
                const color = this.DATA_TYPES[p.type]?.color || 0xffffff;
                visualNode = this.scene.add.rectangle(pX, pY, 10, 10, color).setInteractive({ useHandCursor: true }).setDepth(20);
                visualNode.setStrokeStyle(2, 0x0f1322);
            } else {
                visualNode = this.scene.add.circle(pX, pY, 6, this.DATA_TYPES[p.type]?.color).setInteractive({ useHandCursor: true }).setDepth(20);
                visualNode.setStrokeStyle(2, 0x0f1322);
            }

            const label = this.DATA_TYPES[p.type]?.title || p.type;
            const lbl = this.scene.add.text(pX + (isInput ? 12 : -12), pY-9, `${label}\nxx f`, { fontSize: '9px', fill: '#cbd5e1', fontFamily: 'monospace' }).setOrigin(isInput ? 0 : 1, 0).setAlign(isInput ? 'left' : 'right');
            this.add(lbl);
            p.label.obj = lbl;

            this.scene.uiCamera.ignore(visualNode);
            const portInstance = { ...p, sprite: visualNode, isInput, moduleData: this };

            visualNode.lastClickTime = 0;
            visualNode.on('pointerdown', (pointer) => {
                if (!pointer.leftButtonDown()) return;
                const currentTime = this.scene.time.now;
                if (currentTime - visualNode.lastClickTime < 300) {
                    disconnectAllFromPort(this.scene, portInstance);
                    visualNode.lastClickTime = 0;
                    return;
                }
                visualNode.lastClickTime = currentTime;
                this.scene.isWiring = true;
                this.scene.activeWiringSource = { module: this, port: portInstance, isInput };
            });

            visualNode.on('pointerover', () => {
                this.scene.hoveredPort = portInstance;
                if (this.DATA_TYPES[p.type]?.form === 'triangle') {
                    visualNode.drawTriangleShape(2, 0xffffff);
                } else {
                    visualNode.setStrokeStyle(2, 0xffffff);
                }
            });
            visualNode.on('pointerout', () => {
                this.scene.hoveredPort = null;
                if (this.DATA_TYPES[p.type]?.form === 'triangle') {
                    visualNode.drawTriangleShape(2, 0x0f1322);
                } else {
                    visualNode.setStrokeStyle(2, 0x0f1322);
                }
            });

            this.add(visualNode);
            if (isInput) {
                const idx = this.inputs.findIndex(i => i.type === p.type);
                this.inputs[idx] = portInstance;
            } else {
                const idx = this.outputs.findIndex(o => o.type === p.type);
                this.outputs[idx] = portInstance;
            }
        };

        this.inputs?.forEach(p => createPortVisual(p, true));
        this.outputs?.forEach(p => createPortVisual(p, false));
    }

    getRefundAmount() {
        return this.MODULES[this.type]?.price?.base * 0.5 || 0;
    }

    delete() {
        const refundAmount = this.getRefundAmount();
        if (!confirm(`Are you sure you want to delete: ${this.MODULES[this.type]?.title || 'this module'}? It will give you $${formatNum(refundAmount)}.`)) {
            return;
        }
        this.inputs?.forEach(p => {
            if (p.connectedWires) {
                disconnectAllFromPort(this.scene, p);
            }
        });
        this.outputs?.forEach(p => {
            if (p.connectedWires) {
                disconnectAllFromPort(this.scene, p);
            }
        });

        this.scene.modules = this.scene.modules.filter(m => m.id !== this.id);

        this.scene.globalMoney += refundAmount;

        this.scene.shopItems.forEach(item => {
            if (item.Class) return;
            const txt = item.txt;
            const nb = this.scene.modules.filter(m => m.type === item.type).length;
            txt.finalCost = Math.round(item.cost * Math.pow(item.multiplier, nb));
            if (txt) txt.setText(`${item.label} [$${formatNum(txt.finalCost)}]`);
        });

        saveGame(this.scene);
        this.destroy();
    }

    update(time, delta) {}

    canConnectTo(port, targetPort) {
        return port.type === targetPort.type && port.moduleData !== targetPort.moduleData;
    }
    cantConnectTo(port, targetPort) {
        return false;
    }
}
import Module from './base.js';
import { formatBytes, formatSpeed } from '../format.js';
import { DATA_TYPES } from '../data.js';

export default class Network extends Module {
    constructor(scene, x, y, type, dataType, customData = {}) {
        super(scene, x, y, 'network', 'empty', customData);
    }

    init(customData = {}) {
        super.init(customData);

        this.level = customData && customData.level ? customData.level : 1;

        this.titleTxt.setText(`Network [Lvl. ${this.level}]`);

        this.stats = { download: 25600, upload: 51200 };

        this.upgradeBtn.init();
    }

    update(time, delta) {
        super.update(time, delta);
        
        const outputs = {
            dl: this.outputs.find(o => o.type === 'download'),
            up: this.outputs.find(o => o.type === 'upload')
        }
        const speed = {
            dl: this.stats.download * 1.5 ** (this.level - 1),
            up: this.stats.upload * 1.5 ** (this.level - 1)
        }
        outputs.dl.label.obj.setText(`Download\n${formatSpeed(speed.dl)}`);
        outputs.dl.connectedWires.forEach(wire => {
            wire.data = { type: 'download', speed: speed.dl / outputs.dl.connectedWires.length };
        });

        outputs.up.label.obj.setText(`Upload\n${formatSpeed(speed.up)}`);
        outputs.up.connectedWires.forEach(wire => {
            wire.data = { type: 'upload', speed: speed.up / outputs.up.connectedWires.length };
        });
    }
}
import Module from './base.js';
import { formatBytes, formatHz } from '../format.js';
import { DATA_TYPES } from '../data.js';

export default class CPU extends Module {
    constructor(scene, x, y, type, dataType, customData = {}) {
        super(scene, x, y, 'cpu', 'empty', customData);
    }

    init(customData = {}) {
        super.init(customData);

        this.level = customData && customData.level ? customData.level : 1;

        this.titleTxt.setText(`CPU [Lvl. ${this.level}]`);

        this.stats = { clock: 25600 };

        this.upgradeBtn.init();
    }

    update(time, delta) {
        super.update(time, delta);
        
        const speed = this.stats.clock * 1.5 ** (this.level - 1);
        this.outputs[0].label.obj.setText(`Clock\n${formatHz(speed)}`);
        this.outputs[0].connectedWires.forEach(wire => {
            wire.data = { type: 'clock', speed: speed / this.outputs[0].connectedWires.length };
        });
    }
}
import Module from './base.js';
import { formatNum } from '../format.js';
import { DATA_TYPES } from '../data.js';

export default class Cooler extends Module {
    constructor(scene, x, y, type, dataType, customData = {}) {
        super(scene, x, y, 'cooler', 'empty', customData);
    }

    init(customData = {}) {
        super.init(customData);

        this.level = customData && customData.level ? customData.level : 1;

        this.titleTxt.setText(`Cooler [Lvl. ${this.level}]`);

        this.upgradeBtn.init();
    }

    update(time, delta) {
        super.update(time, delta);
        
        const speed = this.level + 1;
        this.outputs[0].label.obj.setText(`Coolant\n${formatNum(speed)}x`);
        this.outputs[0].connectedWires.forEach(wire => {
            wire.data = { type: 'coolant', speed: speed / this.outputs[0].connectedWires.length };
        });
    }
}
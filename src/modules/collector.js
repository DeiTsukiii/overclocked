import Module from './base.js';
import { formatBytes, formatSpeed, formatNum } from '../format.js';
import { DATA_TYPES } from '../data.js';

export default class Collector extends Module {
    constructor(scene, x, y, type, dataType, customData = {}) {
        super(scene, x, y, 'collector', dataType, customData);
    }

    init(customData = {}) {
        super.init(customData);

        this.lastMoneyCollected = 0;
        this.dps = 0;
        this.dollarPerSecond = 0;
    }

    update(time, delta) {
        super.update(time, delta);

        if (this.inputs[0].connectedWires.length > 0) this.inputs[0].connectedWires.forEach(wire => {
            this.scene.globalMoney += wire.data?.money || 0;
            this.dps += wire.data?.money || 0;
            if (time - this.lastMoneyCollected >= 1000) {
                this.dollarPerSecond = this.dps;
                this.dps = 0;
                this.lastMoneyCollected = time;
            }
            if (wire.data?.money !== undefined) wire.data.money = 0;
        });

        this.scene.globalMoneyPerSecond += this.dollarPerSecond;
        this.inputs[0].label.obj.setText(`Money\n$${formatNum(this.dollarPerSecond)}/s`);
    }

}
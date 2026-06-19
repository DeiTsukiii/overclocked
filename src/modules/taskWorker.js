import Module from './base.js';
import { formatBytes, formatSpeed, formatNum } from '../format.js';
import { DATA_TYPES } from '../data.js';

export default class TaskWorker extends Module {
    constructor(scene, x, y, type, dataType, customData = {}) {
        super(scene, x, y, 'task_worker', dataType, customData);
    }

    init(customData = {}) {
        super.init(customData);

        this.stats = customData && customData.stats ? {
            money: customData.stats.money || 0
        } : { money: 0 };
        
        this.lastMoneyCollected = 0;
    }

    update(time, delta) {
        super.update(time, delta);
        
        const clockSpeed = this.inputs[0].connectedWires.reduce((sum, wire) => sum + (wire.data?.speed || 0), 0);

        this.inputs[0].label.obj.setText(`Clock\n${formatSpeed(clockSpeed)}`);

        if (time - this.lastMoneyCollected >= 1000) {
            this.stats.money += clockSpeed / 1e5;
            this.lastMoneyCollected = time;
        }

        if (this.outputs[0].connectedWires.length > 0) this.outputs[0].connectedWires.forEach(wire => {
            if (this.lastWireSent === wire && this.outputs[0].connectedWires.length > 1) return;
            if (this.stats.money > 0) this.lastWireSent = wire; 
            wire.data = { type: this.dataType, money: wire.data?.money ? wire.data.money + this.stats.money : this.stats.money}
            this.stats.money = 0;
        });

        this.outputs[0].label.obj.setText(`Money\n$${formatNum(this.stats.money)} [${formatNum(clockSpeed / 1000)}/s]`);
    }

}
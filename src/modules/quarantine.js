import Module from './base.js';
import { formatBytes, formatHz, formatNum } from '../format.js';
import { DATA_TYPES } from '../data.js';

export default class Quarantine extends Module {
    constructor(scene, x, y, type, dataType, customData = {}) {
        super(scene, x, y, 'quarantine', dataType, customData);
    }

    init(customData = {}) {
        super.init(customData);

        this.progressBar.init();

        this.stats = customData && customData.stats ? {
            progress: customData.stats.progress || 0,
            files: customData.stats.files || 0,
            money: customData.stats.money || 0
        } : { progress: 0, files: 0, money: 0 };
    }

    update(time, delta) {
        super.update(time, delta);
        
        const clockSpeed = this.inputs[0].connectedWires.reduce((sum, wire) => sum + (wire.data?.speed || 0), 0);
        const inputDataType = this.inputs[1].connectedWires[0]?.data?.type?.replace('infected_', '');
        if (inputDataType && inputDataType !== this.dataType) this.stats.files = 0;
        this.dataType = inputDataType || (this.stats.files > 0 ? this.dataType : 'empty');

        this.stats.progress = this.stats.files > 0 ? this.stats.progress + delta * (clockSpeed / 1000) : 0;

        this.progressBar.setProgress(this.stats.progress);

        const fileSize = DATA_TYPES[this.dataType]?.size || 1;
        const price = DATA_TYPES[this.dataType]?.price || 0;

        if (this.stats.files > 0 && this.stats.progress >= fileSize) {
            const theoreticalSales = Math.floor(this.stats.progress / fileSize);
            
            const actualSales = Math.min(theoreticalSales, this.stats.files);
            
            this.stats.progress -= actualSales * fileSize;
            this.stats.files -= actualSales;
            this.stats.money += actualSales * price;
        }

        if (this.stats.files <= 0) {
            this.stats.progress = 0;
        }

        this.inputs[0].label.obj.setText(`Clock\n${formatHz(clockSpeed)}`);
        this.inputs[1].label.obj.setText(`Infected ${(DATA_TYPES[this.dataType]?.title || 'File').replaceAll('Empty', 'File')}\n${formatNum(this.stats.files)} files`);
        this.outputs[0].label.obj.setText(`Money\n$${formatNum(this.stats.money)} [${formatNum((DATA_TYPES[this.dataType]?.price || 0) * (clockSpeed / (DATA_TYPES[this.dataType]?.size || 1)))}/s]`);

        this.progressBar.label.right.setText(formatBytes(DATA_TYPES[this.dataType]?.size || 0));

        if (this.inputs[1].connectedWires.length > 0) this.inputs[1].connectedWires.forEach(wire => {
            this.stats.files += wire.data?.files || 0;
            if (wire.data?.files !== undefined) wire.data.files = 0;
        });
        if (this.outputs[0].connectedWires.length > 0) this.outputs[0].connectedWires.forEach(wire => {
            if (this.lastWireSent === wire && this.outputs[0].connectedWires.length > 1) return;
            const moneyToSend = (() => {
                if (this.stats.money > 0) {
                    return this.stats.money;
                }
                return 0;
            })();
            this.stats.money -= moneyToSend;
            if (moneyToSend > 0) this.lastWireSent = wire; 
            wire.data = { type: this.dataType, money: wire.data?.money ? wire.data.money + moneyToSend : moneyToSend}
        });
    }

    canConnectTo(port, targetPort) {
        return super.canConnectTo(port, targetPort) || (!targetPort.isInput && DATA_TYPES[targetPort.type]?.isMedia);
    }
}
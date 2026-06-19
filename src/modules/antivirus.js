import Module from './base.js';
import { formatBytes, formatHz, formatNum } from '../format.js';
import { DATA_TYPES } from '../data.js';

export default class Antivirus extends Module {
    constructor(scene, x, y, type, dataType, customData = {}) {
        super(scene, x, y, 'antivirus', dataType, customData);
    }

    init(customData = {}) {
        super.init(customData);

        this.outputs[0].type = `clean_${this.dataType}` || 'empty';

        this.progressBar.init();

        this.stats = customData && customData.stats ? {
            progress: customData.stats.progress || 0,
            files: customData.stats.files || 0,
            cleaned: customData.stats.cleaned || 0,
            viruses: customData.stats.viruses || 0
        } : { progress: 0, files: 0, cleaned: 0, viruses: 0 };
    }

    update(time, delta) {
        super.update(time, delta);
        const clockSpeed = this.inputs[0].connectedWires.reduce((sum, wire) => sum + (wire.data?.speed || 0), 0);
        const inputDataType = this.inputs[1].connectedWires[0]?.data?.type;
        if (inputDataType && inputDataType !== this.dataType) {
            this.stats.files = 0;
            this.stats.cleaned = 0;
            this.stats.viruses = 0;
        }
        this.dataType = inputDataType || (this.stats.files > 0 ? this.dataType : 'empty');
        this.inputs[1].type = this.dataType || 'empty';
        this.outputs[0].type = `clean_${this.dataType}` || 'empty';

        this.stats.progress = this.stats.files > 0 ? this.stats.progress + delta * (clockSpeed / 1000) : 0;

        this.progressBar.setProgress(this.stats.progress);

        const fileSize = DATA_TYPES[this.dataType]?.size || 1;
        const virusChance = DATA_TYPES[this.dataType]?.virusChance || 0;

        if (this.stats.files > 0 && this.stats.progress >= fileSize) {
            const theoreticalProcessed = Math.floor(this.stats.progress / fileSize);
            const actualProcessed = Math.min(theoreticalProcessed, this.stats.files);
            
            let virusCount = 0;
            let cleanCount = 0;

            if (actualProcessed > 100) {
                virusCount = Math.round(actualProcessed * virusChance);
                cleanCount = actualProcessed - virusCount;
            } else {
                for (let i = 0; i < actualProcessed; i++) {
                    if (Math.random() < virusChance) {
                        virusCount++;
                    } else {
                        cleanCount++;
                    }
                }
            }

            this.stats.progress -= actualProcessed * fileSize;
            this.stats.files -= actualProcessed;
            this.stats.cleaned += cleanCount;
            this.stats.viruses += virusCount;
        }

        if (this.stats.files <= 0) {
            this.stats.progress = 0;
        }

        this.inputs[0].label.obj.setText(`Clock\n${formatHz(clockSpeed)}`);
        this.inputs[1].label.obj.setText(`${(DATA_TYPES[this.dataType]?.title || 'File').replaceAll('Empty', 'File')}\n${formatNum(this.stats.files)}`);
        this.outputs[0].label.obj.setText(`Clean ${(DATA_TYPES[this.dataType]?.title || 'File').replaceAll('Empty', 'File')}\n${formatNum(this.stats.cleaned)}`);
        this.outputs[1].label.obj.setText(`Infected ${(DATA_TYPES[this.dataType]?.title || 'File').replaceAll('Empty', 'File')}\n${formatNum(this.stats.viruses)}`);

        this.inputs[1].sprite.setFillStyle(DATA_TYPES[this.dataType]?.color || DATA_TYPES.empty.color, 1);
        this.outputs[0].sprite.setFillStyle(DATA_TYPES[this.dataType]?.color || DATA_TYPES.empty.color, 1);
        this.progressBar.label.right.setText(formatBytes(DATA_TYPES[this.dataType]?.size || 0));

        if (this.inputs[1].connectedWires.length > 0) this.inputs[1].connectedWires.forEach(wire => {
            this.stats.files += wire.data?.files || 0;
            if (wire.data?.files !== undefined) wire.data.files = 0;
        });

        if (this.outputs[0].connectedWires.length > 0) this.outputs[0].connectedWires.forEach(wire => {
            if (this.lastWireSent0 === wire && this.outputs[0].connectedWires.length > 1) return;
            if (this.stats.cleaned > 0) this.lastWireSent0 = wire; 
            wire.data = { type: `clean_${this.dataType}`, files: wire.data?.files ? wire.data.files + this.stats.cleaned : this.stats.cleaned }
            this.stats.cleaned = 0;
        });
        if (this.outputs[1].connectedWires.length > 0) this.outputs[1].connectedWires.forEach(wire => {
            if (this.lastWireSent1 === wire && this.outputs[1].connectedWires.length > 1) return;
            if (this.stats.viruses > 0) this.lastWireSent1 = wire; 
            wire.data = { type: `infected_${this.dataType}`, files: wire.data?.files ? wire.data.files + this.stats.viruses : this.stats.viruses }
            this.stats.viruses = 0;
        });
    }

    canConnectTo(port, targetPort) {
        return super.canConnectTo(port, targetPort) || (!targetPort.isInput && DATA_TYPES[targetPort.type]?.isMedia);
    }
}
import Module from './base.js';
import { formatBytes, formatHz, formatNum } from '../format.js';
import { DATA_TYPES } from '../data.js';
import { disconnectAllFromPort } from '../ports.js';

export default class Overclocker extends Module {
    constructor(scene, x, y, type, dataType, customData = {}) {
        super(scene, x, y, 'overclocker', dataType, customData);
    }

    init(customData = {}) {
        super.init(customData);

        this.progressBar.init();
        this.progressBar.label.right.setText('100%');

        this.stats = customData && customData.stats ? {
            progress: customData.stats.progress || 0
        } : { progress: 0 };

        this.refCool = 1;
        this.cooling = false;
    }

    update(time, delta) {
        super.update(time, delta);
        const inputSpeed = this.inputs[0].connectedWires.reduce((sum, wire) => sum + (wire.data?.speed || 0), 0);
        const coolSpeed = this.inputs[1].connectedWires.reduce((sum, wire) => sum + (wire.data?.speed || 0), 0) || 1;

        const baseProgressPerMs = 100 / (this.refCool * 1000);

        if (inputSpeed > 0 && !this.cooling) this.stats.progress += (delta * baseProgressPerMs) / coolSpeed;
        else if (inputSpeed > 0) this.stats.progress -= (delta * baseProgressPerMs) / (coolSpeed * (2 / coolSpeed));

        const outputSpeed = this.cooling ? inputSpeed : inputSpeed * 2;

        this.stats.progress = Phaser.Math.Clamp(this.stats.progress, 0, 100);

        this.progressBar.setProgress(this.stats.progress, 100, this.cooling ? DATA_TYPES.coolant.color : 0xff0000);
        this.progressBar.label.left.setText(`${formatNum(this.stats.progress)}%`);

        if (!this.cooling && this.stats.progress >= 100) this.cooling = true;
        else if (this.cooling && this.stats.progress <= 0) this.cooling = false;

        this.dataType = this.inputs[0].connectedWires[0]?.data?.type || this.outputs[0].connectedWires[0]?.data?.type || 'speed';
        this.inputs[0].type = this.dataType || 'speed';
        this.outputs[0].type = this.dataType || 'speed';
        
        this.inputs[0].label.obj.setText(`${(DATA_TYPES[this.dataType]?.title || 'Speed')}\n${formatHz(inputSpeed)}`);
        this.inputs[1].label.obj.setText(`Coolant\n${formatNum(coolSpeed)}x`);
        this.outputs[0].label.obj.setText(`${(DATA_TYPES[this.dataType]?.title || 'Speed')}\n${formatHz(outputSpeed)}`);

        this.inputs[0].sprite.setFillStyle(DATA_TYPES[this.dataType]?.color || DATA_TYPES.speed.color, 1);
        this.outputs[0].sprite.setFillStyle(DATA_TYPES[this.dataType]?.color || DATA_TYPES.speed.color, 1);

        if (this.dataType !== 'speed' && this.outputs[0].connectedWires[0] && this.outputs[0].connectedWires[0].data && this.outputs[0].connectedWires[0].data.type !== this.dataType) {
            disconnectAllFromPort(this.scene, this.outputs[0]);
        }

        if (this.outputs[0].connectedWires.length > 0) this.outputs[0].connectedWires.forEach(wire => {
            wire.data = { type: this.dataType, speed: outputSpeed / this.outputs[0].connectedWires.length }
        });
    }

    canConnectTo(port, targetPort) {
        return super.canConnectTo(port, targetPort) || (port.isInput && DATA_TYPES[targetPort.type]?.isSpeed);
    }
}
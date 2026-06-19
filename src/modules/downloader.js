import Module from './base.js';
import { formatBytes, formatSpeed, formatNum } from '../format.js';
import { DATA_TYPES } from '../data.js';

export default class Downloader extends Module {
    constructor(scene, x, y, type, dataType, customData = {}) {
        super(scene, x, y, 'downloader', dataType, customData);
    }

    init(customData = {}) {
        super.init(customData);

        this.titleTxt.setText(`${this.DATA_TYPES[this.dataType].title} Downloader`);
        this.progressBar.init();

        this.stats = customData && customData.stats ? {
            progress: customData.stats.progress || 0,
            files: customData.stats.files || 0
        } : { progress: 0, files: 0 };
    }

    update(time, delta) {
        super.update(time, delta);
        
        const downloadSpeed = this.inputs[0].connectedWires.reduce((sum, wire) => sum + (wire.data?.speed || 0), 0);

        this.stats.progress += delta * (downloadSpeed / 1000);

        this.progressBar.setProgress(this.stats.progress);

        const fileSize = DATA_TYPES[this.dataType]?.size || 1;
        const price = DATA_TYPES[this.dataType]?.price || 0;

        if (this.stats.progress >= fileSize) {
            const nDownloads = Math.floor(this.stats.progress / fileSize);
            
            this.stats.progress -= nDownloads * fileSize;
            this.stats.files += nDownloads;
        }

        this.inputs[0].label.obj.setText(`Download\n${formatSpeed(downloadSpeed)}`);
        this.outputs[0].label.obj.setText(`${DATA_TYPES[this.dataType].title}\n${formatNum(this.stats.files)} [${formatNum(downloadSpeed / DATA_TYPES[this.dataType].size)}/s]`);

        if (this.outputs[0].connectedWires.length > 0) this.outputs[0].connectedWires.forEach(wire => {
            if (this.lastWireSent === wire && this.outputs[0].connectedWires.length > 1) return;
            if (this.stats.files > 0) this.lastWireSent = wire;
            wire.data = { type: this.dataType, files: wire.data?.files ? wire.data.files + this.stats.files : this.stats.files}
            this.stats.files = 0;
        });
    }

    getRefundAmount() {
        return this.DATA_TYPES[this.dataType]?.dlPrice?.base * 0.5 || 0;
    }

}
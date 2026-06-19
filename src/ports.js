import { DATA_TYPES } from "./data.js";

export function drawOrthogonalWire(wireGraphics, sX, sY, eX, eY, color) {
    wireGraphics.lineStyle(2.5, color, 1);
    wireGraphics.beginPath();
    wireGraphics.moveTo(sX, sY);

    const midX = sX + (eX - sX) / 2;
    wireGraphics.lineTo(midX, sY);
    wireGraphics.lineTo(midX, eY);
    wireGraphics.lineTo(eX, eY);
    wireGraphics.strokePath();
}

export function connectPorts(scene, outPort, inPort) {
    if ((!inPort.moduleData.canConnectTo(inPort, outPort) && !outPort.moduleData.canConnectTo(outPort, inPort)) || inPort.moduleData.cantConnectTo(inPort, outPort) || outPort.moduleData.cantConnectTo(outPort, inPort)) {
        scene.isWiring = false;
        scene.activeWiringSource = null;
        return;
    }

    const newWire = { outPort, inPort };
    outPort.connectedWires = outPort.connectedWires || [];
    inPort.connectedWires = inPort.connectedWires || [];
    outPort.connectedWires.push(newWire);
    inPort.connectedWires.push(newWire);
    scene.connections.push(newWire);

    scene.isWiring = false;
    scene.activeWiringSource = null;
}

export function drawWires(wireGraphics, connections) {
    connections.forEach(w => {
        let sX = w.outPort.sprite.x + w.outPort.moduleData.x;
        let sY = w.outPort.sprite.y + w.outPort.moduleData.y;
        let eX = w.inPort.sprite.x + w.inPort.moduleData.x;
        let eY = w.inPort.sprite.y + w.inPort.moduleData.y;
        const color = DATA_TYPES[w.outPort.type]?.color || 0xffffff;

        if (w.outPort.form === 'triangle') {
            sX = w.outPort.moduleData.x + w.outPort.moduleData.width;
            sY = w.outPort.moduleData.y + w.outPort.y;
        }
        if (w.inPort.form === 'triangle') {
            eX = w.inPort.moduleData.x;
            eY = w.inPort.moduleData.y + w.inPort.y;
        }
        drawOrthogonalWire(wireGraphics, sX, sY, eX, eY, color);
    });
}

export function disconnectAllFromPort(scene, portInstance) {
    const wiresToDisconnect = [...(portInstance.connectedWires || [])];
    wiresToDisconnect.forEach(wire => {
        wire.outPort.connectedWires = wire.outPort.connectedWires.filter(w => w !== wire);
        wire.inPort.connectedWires = wire.inPort.connectedWires.filter(w => w !== wire);
        scene.connections = scene.connections.filter(w => w !== wire);
        
        const inM = wire.inPort.moduleData;
        const inP = wire.inPort;
    });
}
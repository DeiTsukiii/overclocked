import { MODULES_CLASSES } from './modules/classes.js';
import { connectPorts } from './ports.js';

export function saveGame(scene) {
    const savedModules = scene.modules.map(m => ({
        id: m.id,
        type: m.type,
        dataType: m.dataType,
        x: m.x,
        y: m.y,
        level: m.level,
        upgradeCost: m.upgradeCost,
        stats: m.stats,
    }));

    const savedWires = scene.connections.map(w => ({
        fromModuleId: w.outPort.moduleData.id,
        outPortType: w.outPort.type,
        toModuleId: w.inPort.moduleData.id,
        inPortType: w.inPort.type
    }));

    const savedTasks = scene.tasks.map((t, i) => t.completed ? i : null).filter(i => i !== null) || [];

    const saveData = {
        globalMoney: scene.globalMoney,
        modules: savedModules,
        wires: savedWires,
        nodeIdCounter: scene.nodeIdCounter,
        tasks: savedTasks[savedTasks.length - 1] || -1
    };
    const key = scene.dev ? 'overclocked_save_dev' : 'overclocked_save';
    localStorage.setItem(key, JSON.stringify(saveData));
    if (scene.saveTxt) {
        scene.saveTxt.setText("SAVED !");
        scene.time.delayedCall(1500, () => { if (scene.saveTxt) scene.saveTxt.setText("SAVE"); });
    }
}

export function loadGame(scene) {
    const key = scene.dev ? 'overclocked_save_dev' : 'overclocked_save';
    const dataStr = localStorage.getItem(key);
    if (!dataStr) return;

    try {
        const saveData = JSON.parse(dataStr);
        scene.modules.forEach(m => m.destroy());
        scene.modules = [];
        scene.connections = [];
        scene.wireGraphics.clear();

        scene.globalMoney = saveData.globalMoney;
        scene.nodeIdCounter = saveData.nodeIdCounter || 0;

        saveData.modules.forEach(mSave => {
            const spawnX = mSave.x !== undefined ? mSave.x : Math.round((scene.cameras.main.scrollX + scene.scale.width / 2) / scene.grid.GRID_SIZE) * scene.grid.GRID_SIZE;
            const spawnY = mSave.y !== undefined ? mSave.y : Math.round((scene.cameras.main.scrollY + scene.scale.height / 2) / scene.grid.GRID_SIZE) * scene.grid.GRID_SIZE;
            const m = new MODULES_CLASSES[mSave.type](scene, spawnX, spawnY, mSave.type, mSave.dataType || 'empty', mSave);
        });

        saveData.wires.forEach(wSave => {
            const fromMod = scene.modules.find(m => m.id === wSave.fromModuleId);
            const toMod = scene.modules.find(m => m.id === wSave.toModuleId);

            if (fromMod && toMod) {
                const outPort = fromMod.outputs.find(o => o.type === wSave.outPortType);
                const inPort = toMod.inputs.find(i => i.type === wSave.inPortType);

                if (outPort && inPort) {
                    connectPorts(scene, outPort, inPort);
                }
            }
        });

        scene.tasks.forEach((t, i) => {
            t.completed = i <= (saveData.tasks || -1);
        });

    } catch (e) {
        console.error("Erreur de sauvegarde:", e);
    }
}
export function createTasks(scene) {
    const tasks = [
        { label: "Buy a Network module", condition: () => scene.modules.some(m => m.type === 'network') },
        { label: "Buy a Text Downloader", condition: () => scene.modules.some(m => m.type === 'downloader' && m.dataType === 'text') },
        { label: "Buy a Data Seller", condition: () => scene.modules.some(m => m.type === 'seller') },
        { label: "Buy a Collector", condition: () => scene.modules.some(m => m.type === 'collector') },
        { label: "Wire a Network to a Text Downloader", condition: () => scene.connections.some(c => c.outPort.moduleData.type === 'network' && c.inPort.moduleData.type === 'downloader') },
        { label: "Wire a Text Downloader to a Seller", condition: () => scene.connections.some(c => c.outPort.moduleData.type === 'downloader' && c.inPort.moduleData.type === 'seller') },
        { label: "Wire a Network to a Seller", condition: () => scene.connections.some(c => c.outPort.moduleData.type === 'network' && c.inPort.moduleData.type === 'seller') },
        { label: "Wire a Seller to a Collector", condition: () => scene.connections.some(c => c.outPort.moduleData.type === 'seller' && c.inPort.moduleData.type === 'collector') },

        { label: "Upgrade a Network module", condition: () => scene.modules.some(m => m.type === 'network' && m.level > 1) },

        { label: "Earn $600", condition: () => scene.globalMoney >= 600 },
        { label: "Buy a CPU Core", condition: () => scene.modules.some(m => m.type === 'cpu') },
        { label: "Buy a Task Worker", condition: () => scene.modules.some(m => m.type === 'task_worker') },

        { label: "Earn $650", condition: () => scene.globalMoney >= 650 },
        { label: "Buy an Antivirus Filter", condition: () => scene.modules.some(m => m.type === 'antivirus') },

        { label: "Earn $900", condition: () => scene.globalMoney >= 950 },
        { label: "Buy a Quarantine Wall", condition: () => scene.modules.some(m => m.type === 'quarantine') },

        { label: "Earn $100k", condition: () => scene.globalMoney >= 1e5 },
        { label: "Buy an Image Downloader", condition: () => scene.modules.some(m => m.type === 'downloader' && m.dataType === 'image') },

        { label: "Earn $1M", condition: () => scene.globalMoney >= 1e6 },
        { label: "Buy an Overclocker", condition: () => scene.modules.some(m => m.type === 'overclocker') },
        { label: "Buy a Liquid Cooler", condition: () => scene.modules.some(m => m.type === 'cooler') },

        { label: "Earn $10M", condition: () => scene.globalMoney >= 1e7 },
        { label: "Earn $100M", condition: () => scene.globalMoney >= 1e8 },
        { label: "Earn $1B", condition: () => scene.globalMoney >= 1e9 },
    ];

    scene.tasks = tasks.map(t => ({ ...t, completed: false }));
    scene.currentTaskIndex = 0;

    const panelWidth = 360;
    const panelHeight = 54;

    const taskBg = scene.add.rectangle(0, 0, panelWidth, panelHeight, 0x090d16, 0.85)
        .setOrigin(0)
        .setStrokeStyle(1, 0x1e293b);

    const accentLine = scene.add.rectangle(0, 0, 4, panelHeight, 0x38bdf8).setOrigin(0);

    const taskHeaderTxt = scene.add.text(14, 8, `OBJECTIVE [01/${scene.tasks.length}]`, {
        fontSize: '10px',
        fill: '#64748b',
        fontWeight: 'bold',
        fontFamily: 'monospace',
        letterSpacing: 1
    });

    const taskTxt = scene.add.text(36, 34, scene.tasks[scene.currentTaskIndex].label, {
        fontSize: '12px',
        fill: '#f8fafc',
        fontWeight: '600',
        fontFamily: 'monospace'
    }).setOrigin(0, 0.5);

    const taskCase = scene.add.rectangle(20, 34, 10, 10, 0x090d16)
        .setOrigin(0.5)
        .setStrokeStyle(1, 0x38bdf8);

    const taskContainer = scene.add.container(20, 75);
    taskContainer.add([taskBg, accentLine, taskHeaderTxt, taskTxt, taskCase]);
    scene.uiContainer.add(taskContainer);

    scene.completeTaskUi = () => {
        accentLine.setFillStyle(0x10b981);
        taskCase.setFillStyle(0x10b981).setStrokeStyle(1, 0x10b981);
        taskTxt.setFill('#10b981');

        scene.tweens.add({
            targets: [taskContainer],
            x: -800,
            duration: 500,
            delay: 150,
            onComplete: () => {
                if (scene.currentTaskIndex < scene.tasks.length) {
                    const paddedIdx = String(scene.currentTaskIndex + 1).padStart(2, '0');
                    taskHeaderTxt.setText(`OBJECTIVE [${paddedIdx}/${scene.tasks.length}]`);
                    taskTxt.setText(scene.tasks[scene.currentTaskIndex].label);
                    
                    accentLine.setFillStyle(0x38bdf8);
                    taskCase.setFillStyle(0x090d16).setStrokeStyle(1, 0x38bdf8);
                    taskTxt.setFill('#f8fafc');
                
                } else {
                    taskHeaderTxt.setText('ALL TASKS COMPLETED!');
                    taskTxt.setText("Congratulations! You've completed all tasks!");
                    
                    accentLine.setFillStyle(0xeab308);
                    taskCase.setFillStyle(0xeab308).setStrokeStyle(1, 0xeab308);
                    taskTxt.setFill('#eab308');
                }
                
                scene.tweens.add({
                    targets: [taskContainer],
                    x: 20,
                    duration: 800
                });
            }
        });
    }
}

export function updateTasks(scene) {
    if (scene.currentTaskIndex < scene.tasks.length && (scene.tasks[scene.currentTaskIndex].condition() || scene.tasks[scene.currentTaskIndex].completed)) {
        scene.tasks[scene.currentTaskIndex].completed = true;
        scene.currentTaskIndex++;
        scene.completeTaskUi();
    }
}
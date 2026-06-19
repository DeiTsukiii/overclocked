export const MODULES = {
    network: {
        title: "Network",
        outputs: [
            { type: 'download', y: 55 },
            { type: 'upload', y: 95 }
        ],
        price: { base: 10, multiplier: 1e9 },
        upgrade: { base: 50, multiplier: 1.5 }
    },
    downloader: {
        title: "Downloader",
        inputs: [
            { type: 'download', y: 65 }
        ],
        outputs: [
            { type: 'file', y: 115 }
        ],
        price: { base: 25, multiplier: 6 }
    },
    seller: {
        title: "Data Seller",
        inputs: [
            { type: 'file', y: 65 },
            { type: 'upload', y: 115 }
        ],
        outputs: [
            { type: 'money', y: 90 }
        ],
        price: { base: 50, multiplier: 100 }
    },
    antivirus: {
        title: "Antivirus Filter",
        inputs: [
            { type: 'clock', y: 65 },
            { type: 'file', y: 115 }
        ],
        outputs: [
            { type: 'file', y: 55 },
            { type: 'virus', y: 125 }
        ],
        price: { base: 650, multiplier: 6 }
    },
    quarantine: {
        title: "Quarantine Wall",
        inputs: [
            { type: 'clock', y: 65 },
            { type: 'virus', y: 115 }
        ],
        outputs: [
            { type: 'money', y: 90 }
        ],
        price: { base: 900, multiplier: 6 }
    },
    collector: {
        title: "Collector",
        inputs: [
            { type: 'money', y: 90 }
        ],
        price: { base: 100, multiplier: 1e9 }
    },
    cpu: {
        title: "CPU Core",
        outputs: [
            { type: 'clock', y: 80 }
        ],
        price: { base: 600, multiplier: 1e9 },
        upgrade: { base: 50, multiplier: 1.5 }
    },
    task_worker: {
        title: "Task Worker",
        inputs: [
            { type: 'clock', y: 65 }
        ],
        outputs: [
            { type: 'money', y: 115 }
        ],
        price: { base: 60, multiplier: 1e9 }
    },
    overclocker: {
        title: "Overclocker",
        inputs: [
            { type: 'speed', y: 55 },
            { type: 'coolant', y: 105 }
        ],
        outputs: [
            { type: 'speed', y: 75 }
        ],
        price: { base: 1e6, multiplier: 1e8 }
    },
    cooler: {
        title: "Liquid Cooler",
        outputs: [
            { type: 'coolant', y: 75 }
        ],
        price: { base: 150, multiplier: 1e6 },
        upgrade: { base: 5000, multiplier: 10 }
    }
}

const baseDataTypes = {
    download: { title: "Download", color: 0x00ff88, form: "circle", isSpeed: true },
    upload: { title: "Upload", color: 0x00bfff, form: "circle", isSpeed: true },
    virus: { title: "Virus", color: 0xef4444, form: "square" },
    money: { title: "Money", color: 0xccff00, form: "triangle" },
    clock: { title: "Clock", color: 0xff6600, form: "circle", isSpeed: true },
    empty: { title: "Empty", color: 0xffffff, form: "square" },
    speed: { title: "Speed", color: 0xffffff, form: "circle" },
    coolant: { title: "Coolant", color: 0x00ffff, form: "circle" },

    text: {
        title: "Text",
        color: 0x00ffcc,
        size: 100 * 1024,
        price: 15,
        form: "square",
        dlPrice: { base: 25, multiplier: 6 },
        virusChance: 0.40,
        isMedia: true
    },
    image: {
        title: "Image",
        color: 0xff00ff,
        size: 1.5 * 1024 * 1024,
        price: 400,
        form: "square",
        dlPrice: { base: 1e5, multiplier: 6 },
        virusChance: 0.35,
        isMedia: true
    }
};

const generatedTypes = {};

for (const [key, value] of Object.entries(baseDataTypes)) {
    if (value.isMedia) {
        const k = `clean_${key}`;
        generatedTypes[k] = {
            ...structuredClone(value),
            title: `Clean ${value.title}`,
            price: value.price * 2,
            virusChance: 0
        };
        delete generatedTypes[k].dlPrice;
    }
}

export const DATA_TYPES = {
    ...baseDataTypes,
    ...generatedTypes
};
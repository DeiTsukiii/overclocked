import Module from './base.js';
import Downloader from './downloader.js';
import Network from './network.js';
import Seller from './seller.js';
import Collector from './collector.js';
import CPU from './cpu.js';
import TaskWorker from './taskWorker.js';
import Antivirus from './antivirus.js';
import Quarantine from './quarantine.js';
import Overclocker from './overclocker.js';
import Cooler from './cooler.js';

export const MODULES_CLASSES = {
    network: Network,
    downloader: Downloader,
    seller: Seller,
    antivirus: Antivirus,
    quarantine: Quarantine,
    collector: Collector,
    cpu: CPU,
    task_worker: TaskWorker,
    overclocker: Overclocker,
    cooler: Cooler,
}
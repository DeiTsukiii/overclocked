const getSuffixes = (base) => 
    ["", "K", "M", "G", "T", "P", "E", "Z", "Y", "R", "Q", "Ch", "Ku", "Me", "Ng", "Sh", "Te", "Vn"]
.map(suffix => suffix + base);

function formate(num, base, suffixes) {
    num = Number(num);
    if (num === 0 || !num) return `0 ${suffixes[0]}`;
    const i = Math.floor(Phaser.Math.Clamp(Math.log(num) / Math.log(base), 0, suffixes.length - 1));
    if (i <= 0) return `${Math.floor(num)} ${suffixes[0]}`;
    const suffixIndex = Math.min(i, suffixes.length - 1);
    const value = num / Math.pow(base, suffixIndex);
    return `${value.toFixed(1).toString().replace(/\.0$/, '')}${suffixes[suffixIndex]}`;
}

export function formatNum(num) {
    return formate(num, 1000, ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc", "UDc", "DDc", "TDc", "QaDc", "QiDc", "SxDc", "SpDc", "OcDc", "NoDc", "Vg", "UVg", "DVg"]).trim();
}

export function formatBytes(bytes) {
    return formate(bytes, 1024, getSuffixes("B")).trim();
}

export function formatSpeed(speed) {
    return formate(speed, 1024, getSuffixes("Bps")).trim();
}

export function formatHz(hz) {
    return formate(hz, 1000, getSuffixes("Hz")).trim();
}
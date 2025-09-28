export const toYYYYMMDD = (date) => new Date(date).toISOString().split('T')[0];

export const hexToBinary = (hexString) => {
    if (!hexString || typeof hexString !== 'string') return '';
    return hexString.split('').map(c => parseInt(c, 16).toString(2).padStart(4, '0')).join('');
};

export const calculateHammingDistance = (hexHash1, hexHash2) => {
    const bin1 = hexToBinary(hexHash1);
    const bin2 = hexToBinary(hexHash2);
    if (bin1.length !== bin2.length || bin1.length === 0) return Infinity;
    let distance = 0;
    for (let i = 0; i < bin1.length; i++) {
        if (bin1[i] !== bin2[i]) distance++;
    }
    return distance;
};


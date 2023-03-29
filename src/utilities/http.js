import { networkInterfaces as getNetworkInterfaces } from 'node:os';

const networkInterfaces = getNetworkInterfaces();

/**
 * Registers a function that runs on server shutdown.
 *
 * @param fn - The function to run on server shutdown
 */
export const registerCloseListener = (fn) => {
    let run = false;

    const wrapper = () => {
        if (!run) {
            run = true;
            fn();
        }
    };

    process.on('SIGINT', wrapper);
    process.on('SIGTERM', wrapper);
    process.on('exit', wrapper);
};

/**
 * Returns the IP address of the host.
 *
 * @returns The address of the host.
 */
export const getNetworkAddress = () => {
    for (const interfaceDetails of Object.values(networkInterfaces)) {
        if (!interfaceDetails) continue;

        for (const details of interfaceDetails) {
            const { address, family, internal } = details;

            if (family === 'IPv4' && !internal) return address;
        }
    }
};

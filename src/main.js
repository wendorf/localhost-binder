import { exit } from 'node:process';
import http from 'node:http';
import { networkInterfaces as getNetworkInterfaces } from 'node:os';
import handler from './handler.js';

const networkInterfaces = getNetworkInterfaces();

export const startServer = async (
    endpoint,
    config,
    previous,
) => {
    const serverHandler = (
        request,
        response,
    ) => {
        // We can't return a promise in a HTTP request handler, so we run our code
        // inside an async function instead.
        const run = async () => {
            await handler(request, response, config);
        };

        // Then we run the async function, and re-throw any errors.
        run().catch((error) => {
            throw error;
        });
    };

    const server = http.createServer(serverHandler);

    // Once the server starts, return the address it is running on so the CLI
    // can tell the user.
    const getServerDetails = () => {
        // Make sure to close the server once the process ends.
        registerCloseListener(() => {
            server.close()
            process.on('SIGINT', () => {
                exit(0);
            });
        });

        // Once the server has started, get the address the server is running on
        // and return it.
        const details = server.address();
        let local;
        let network;
        if (typeof details === 'string') {
            local = details;
        } else if (typeof details === 'object' && details.port) {
            // According to https://www.ietf.org/rfc/rfc2732.txt, IPv6 addresses
            // should be surrounded by square brackets (only the address, not the
            // port).
            let address;
            if (details.address === '::') address = 'localhost';
            else if (details.family === 'IPv6') address = `[${details.address}]`;
            else address = details.address;
            const ip = getNetworkAddress();

            const protocol = 'http';
            local = `${protocol}://${address}:${details.port}`;
            network = ip ? `${protocol}://${ip}:${details.port}` : undefined;
        }

        return {
            local,
            network,
            previous,
        };
    };

    // Listen for any error that occurs while serving, and throw an error
    // if any errors are received.
    server.on('error', (error) => {
        throw new Error(
            `Failed to serve: ${error.stack?.toString() ?? error.message}`,
        );
    });

    // Finally, start the server.
    return new Promise((resolve, _reject) => {
        // If only a port is specified, listen on the given port on localhost.
        if (
            typeof endpoint.port !== 'undefined' &&
            typeof endpoint.host === 'undefined'
        )
            server.listen(endpoint.port, () => resolve(getServerDetails()));
        // If the path to a socket or a pipe is given, listen on it.
        else if (
            typeof endpoint.port === 'undefined' &&
            typeof endpoint.host !== 'undefined'
        )
            server.listen(endpoint.host, () => resolve(getServerDetails()));
        // If a port number and hostname are given, listen on `host:port`.
        else if (
            typeof endpoint.port !== 'undefined' &&
            typeof endpoint.host !== 'undefined'
        )
            server.listen(endpoint.port, endpoint.host, () =>
                resolve(getServerDetails()),
            );
    });
};

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

export const getNetworkAddress = () => {
    for (const interfaceDetails of Object.values(networkInterfaces)) {
        if (!interfaceDetails) continue;

        for (const details of interfaceDetails) {
            const { address, family, internal } = details;

            if (family === 'IPv4' && !internal) return address;
        }
    }
};

const config = { public: 'public', etag: true, symlinks: undefined }
const endpoint = { port: 80 }
// Disabling this rule as we want to start each server one by one.
// eslint-disable-next-line no-await-in-loop
const { local, network, previous } = await startServer(
    endpoint,
    config,
);

let message = ""
if (local) {
    const prefix = network ? '- ' : '';
    const space = network ? '    ' : '  ';

    message += `\n\n${prefix}Local:${space}${local}`;
}
if (network) message += `\n- Network:  ${network}`;
if (previous)
    message += `\n\nThis port was picked because ${previous.toString()} is in use.`;

console.info(message);

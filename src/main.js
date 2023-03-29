import http from 'node:http';
import path from 'node:path';
import {exit} from 'node:process';
import {networkInterfaces as getNetworkInterfaces} from 'node:os';
import {createReadStream} from 'node:fs';

const handler = async (request, response) => {
    let absolutePath = path.join(process.cwd(), 'public', "index.html");
    response.writeHead(200, {
        'Content-Disposition': 'inline; filename="index.html"',
        'Content-Type': 'text/html; charset=utf-8'
    });
    const stream = await createReadStream(absolutePath, {});
    stream.pipe(response);
};

export const startServer = (endpoint) => {
    const server = http.createServer();
    server.on('request', handler)

    const getServerDetails = () => {
        // Make sure to close the server once the process ends.
        registerCloseListener(() => {
            server.close()
            process.on('SIGINT', () => {
                exit(0);
            });
        });

        printServerInfo(server.address())
    };

    // Finally, start the server.
    // If a port number and hostname are given, listen on `host:port`.
    if (typeof endpoint.host !== 'undefined')
        server.listen(endpoint.port, endpoint.host, getServerDetails);
    // Else only a port is specified, listen on the given port on localhost.
    else
        server.listen(endpoint.port, getServerDetails);
};

const registerCloseListener = (fn) => {
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

const endpoint = { port: 80 }
startServer(endpoint);

const getNetworkAddress = () => {
    for (const interfaceDetails of Object.values(getNetworkInterfaces())) {
        if (!interfaceDetails) continue;

        for (const details of interfaceDetails) {
            const { address, family, internal } = details;

            if (family === 'IPv4' && !internal) return address;
        }
    }
};

const printServerInfo = (details) => {
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

    let message = ""
    if (local) {
        const prefix = network ? '- ' : '';
        const space = network ? '    ' : '  ';

        message += `\n\n${prefix}Local:${space}${local}`;
    }
    if (network) message += `\n- Network:  ${network}`;

    console.info(message);
}

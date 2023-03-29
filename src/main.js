import http from 'node:http';
import {exit} from 'node:process';
import {networkInterfaces as getNetworkInterfaces} from 'node:os';

let serverInfo;
const identifier = "🤞"

export const startServer = (endpoint) => {
    const server = http.createServer();

    server.on('request', async (request, response) => {
        response.writeHead(200, {
            'Content-Disposition': 'inline; filename="index.html"',
            'Content-Type': 'text/html; charset=utf-8'
        });
        response.write(`
        <!doctype html>
        <html lang="en" dir="ltr">
        <head>
          <meta charset="utf-8" />
          <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>${identifier}</text></svg>">
          <title>localhost-binder</title>
        </head>
        <body>
          <p>${identifier}</p>
          <p>endpoint: ${JSON.stringify(endpoint)}</p>
          <p>server info: ${JSON.stringify(getServerInfo())}</p>
        </body>
        </html>
        `)
    });

    const getServerInfo = () => {
        if (!serverInfo) {
            const details = server.address()

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

            serverInfo = {local: local, network: network};
        }
        return serverInfo;
    }

    const getServerDetails = () => {
        // Make sure to close the server once the process ends.
        registerCloseListener(() => {
            server.close()
            process.on('SIGINT', () => {
                exit(0);
            });
        });

        printServerInfo(getServerInfo())
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

const endpoint = { port: process.env.PORT || 80 }
if (process.env.HOST) {
    endpoint.host = process.env.HOST
}
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

const printServerInfo = (serverInfo) => {
    let message = ""
    if (serverInfo.local) {
        const prefix = serverInfo.network ? '- ' : '';
        const space = serverInfo.network ? '    ' : '  ';

        message += `\n\n${prefix}Local:${space}${serverInfo.local}`;
    }
    if (serverInfo.network) message += `\n- Network:  ${serverInfo.network}`;

    console.info(message);
}

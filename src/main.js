import http from 'node:http';
import {exit} from 'node:process';
import {networkInterfaces} from 'node:os';
import dns from "dns";
import { promisify } from "util";
import { execSync } from "child_process";

let serverInfo;
const identifier = "😻"

export const startServer = async (endpoint) => {
    const server = http.createServer();

    server.on('request', async (request, response) => {
        response.writeHead(200, {
            'Content-Disposition': 'inline; filename="index.html"',
            'Content-Type': 'text/html; charset=utf-8'
        });
        response.end(`
        <!doctype html>
        <html lang="en" dir="ltr">
        <head>
          <meta charset="utf-8" />
          <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>${identifier}</text></svg>">
          <title>localhost-binder</title>
        </head>
        <body>
          <p>${identifier}</p>
          <pre>${JSON.stringify(await getServerInfo(), null, 2)}</pre>
        </body>
        </html>
        `)
    });

    const getServerInfo = async () => {
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

            const lookup = promisify(dns.lookup)
            const domains = {};

            for (let d of ["localhost"]) {
                domains[d] = (await lookup(d)).address;
            }

            const interfaces = {}
            const ni = networkInterfaces()
            for (let i in ni) {
                interfaces[i] = ni[i].map(a => a.address)
            }

            const ipaddr = execSync("ip addr").toString()
            const iproute = execSync("ip route").toString()

            serverInfo = {local: local, network: network, endpoint: endpoint, domains: domains, networkInterfaces: interfaces, serverAddress: details, iproute: iproute, ipaddr: ipaddr};
        }
        return serverInfo;
    }

    const getServerDetails = async () => {
        // Make sure to close the server once the process ends.
        registerCloseListener(() => {
            server.close()
            process.on('SIGINT', () => {
                exit(0);
            });
        });

        printServerInfo(await getServerInfo())
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

const endpoint = { port: process.env.TEST_PORT || 80 }
if (process.env.TEST_HOST) {
    endpoint.host = process.env.TEST_HOST
}
await startServer(endpoint);

const getNetworkAddress = () => {
    for (const interfaceDetails of Object.values(networkInterfaces())) {
        if (!interfaceDetails) continue;

        for (const details of interfaceDetails) {
            const { address, family, internal } = details;

            if (family === 'IPv4' && !internal) return address;
        }
    }
};

const printServerInfo = (serverInfo) => {
    console.info("serverInfo", serverInfo);
}

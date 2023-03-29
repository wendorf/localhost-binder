import { exit, env } from 'node:process';
import { startServer } from './utilities/server.js';
import { registerCloseListener } from './utilities/http.js';

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

// Print out a message to let the user know we are shutting down the server
// when they press Ctrl+C or kill the process externally.
registerCloseListener(() => {
    console.log();
    console.info('Gracefully shutting down. Please wait...');

    process.on('SIGINT', () => {
        console.log();
        console.error('Force-closing all open sockets...');

        exit(0);
    });
});

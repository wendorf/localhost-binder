import { exit, env } from 'node:process';
import { startServer } from './utilities/server.js';
import { registerCloseListener } from './utilities/http.js';

const args = { _: [ 'public/' ], '--listen': [ { port: 80 } ], '--debug': true }

// Default to listening on port 3000.
if (!args['--listen'])
    args['--listen'] = [{ port: parseInt(env.PORT ?? '3000', 10) }];
// Ensure that the user has passed only one directory to serve.
if (args._.length > 1) {
    console.error('Please provide one path argument at maximum');
    exit(1);
}

const config = { public: 'public', etag: true, symlinks: undefined }

// Start the server for each endpoint passed by the user.
for (const endpoint of args['--listen']) {
    // Disabling this rule as we want to start each server one by one.
    // eslint-disable-next-line no-await-in-loop
    const { local, network, previous } = await startServer(
        endpoint,
        config,
        args,
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
}

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

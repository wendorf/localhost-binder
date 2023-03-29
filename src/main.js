import { cwd as getPwd, exit, env, stdout } from 'node:process';
import path from 'node:path';
import chalk from 'chalk';
import boxen from 'boxen';
import { resolve } from './utilities/promise.js';
import { startServer } from './utilities/server.js';
import { registerCloseListener } from './utilities/http.js';
import { loadConfiguration } from './utilities/config.js';
import { logger } from './utilities/logger.js';

const args = { _: [ 'public/' ], '--listen': [ { port: 80 } ], '--debug': true }

// Default to listening on port 3000.
if (!args['--listen'])
    args['--listen'] = [{ port: parseInt(env.PORT ?? '3000', 10) }];
// Ensure that the user has passed only one directory to serve.
if (args._.length > 1) {
    logger.error('Please provide one path argument at maximum');
    exit(1);
}

// Parse the configuration.
const presentDirectory = getPwd();
const directoryToServe = args._[0] ? path.resolve(args._[0]) : presentDirectory;
const [configError, config] = await resolve(
    loadConfiguration(presentDirectory, directoryToServe, args),
);
// Either TSC complains that `args` is undefined (which it shouldn't), or ESLint
// rightfully complains of an unnecessary condition.
// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
if (configError || !config) {
    logger.error(configError.message);
    exit(1);
}

// Start the server for each endpoint passed by the user.
for (const endpoint of args['--listen']) {
    // Disabling this rule as we want to start each server one by one.
    // eslint-disable-next-line no-await-in-loop
    const { local, network, previous } = await startServer(
        endpoint,
        config,
        args,
    );

    // If we are not in a TTY or Node is running in production mode, print
    // a single line of text with the server address.
    if (!stdout.isTTY || env.NODE_ENV === 'production') {
        const suffix = local ? ` at ${local}` : '';
        logger.info(`Accepting connections${suffix}`);

        continue;
    }

    // Else print a fancy box with the server address.
    let message = chalk.green('Serving!');
    if (local) {
        const prefix = network ? '- ' : '';
        const space = network ? '    ' : '  ';

        message += `\n\n${chalk.bold(`${prefix}Local:`)}${space}${local}`;
    }
    if (network) message += `\n${chalk.bold('- Network:')}  ${network}`;
    if (previous)
        message += chalk.red(
            `\n\nThis port was picked because ${chalk.underline(
                previous.toString(),
            )} is in use.`,
        );

    logger.log(
        boxen(message, {
            padding: 1,
            borderColor: 'green',
            margin: 1,
        }),
    );
}

// Print out a message to let the user know we are shutting down the server
// when they press Ctrl+C or kill the process externally.
registerCloseListener(() => {
    logger.log();
    logger.info('Gracefully shutting down. Please wait...');

    process.on('SIGINT', () => {
        logger.log();
        logger.warn('Force-closing all open sockets...');

        exit(0);
    });
});

import chalk from 'chalk';

const http = (...message) =>
    console.info(chalk.bgBlue.bold(' HTTP '), ...message);
const info = (...message) =>
    console.info(chalk.bgMagenta.bold(' INFO '), ...message);
const warn = (...message) =>
    console.error(chalk.bgYellow.bold(' WARN '), ...message);
const error = (...message) =>
    console.error(chalk.bgRed.bold(' ERROR '), ...message);
const log = console.log;

export const logger = { http, info, warn, error, log };

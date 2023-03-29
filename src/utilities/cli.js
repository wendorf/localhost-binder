import { parse as parseUrl } from 'node:url';
import parseArgv from 'arg';

/**
 * Parse and return the endpoints from the given string.
 *
 * @param uriOrPort - The endpoint to listen on.
 * @returns A list of parsed endpoints.
 */
export const parseEndpoint = (uriOrPort) => {
    // If the endpoint is a port number, return it as is.
    if (!isNaN(Number(uriOrPort))) return { port: Number(uriOrPort) };

    // Cast it as a string, since we know for sure it is not a number.
    const endpoint = uriOrPort;

    // We cannot use `new URL` here, otherwise it will not
    // parse the host properly and it would drop support for IPv6.
    const url = parseUrl(endpoint);

    switch (url.protocol) {
        case 'pipe:': {
            const pipe = endpoint.replace(/^pipe:/, '');
            if (!pipe.startsWith('\\\\.\\'))
                throw new Error(`Invalid Windows named pipe endpoint: ${endpoint}`);

            return { host: pipe };
        }
        case 'unix:':
            if (!url.pathname)
                throw new Error(`Invalid UNIX domain socket endpoint: ${endpoint}`);

            return { host: url.pathname };
        case 'tcp:':
            url.port = url.port ?? '3000';
            url.hostname = url.hostname ?? 'localhost';

            return {
                port: Number(url.port),
                host: url.hostname,
            };
        default:
            throw new Error(
                `Unknown --listen endpoint scheme (protocol): ${
                    url.protocol ?? 'undefined'
                }`,
            );
    }
};

// The options the CLI accepts, and how to parse them.
const options = {
    '--help': Boolean,
    '--version': Boolean,
    '--listen': [parseEndpoint],
    '--single': Boolean,
    '--debug': Boolean,
    '--config': String,
    '--no-clipboard': Boolean,
    '--no-compression': Boolean,
    '--no-etag': Boolean,
    '--symlinks': Boolean,
    '--cors': Boolean,
    '--no-port-switching': Boolean,
    '--ssl-cert': String,
    '--ssl-key': String,
    '--ssl-pass': String,
    '--no-request-logging': Boolean,
    // A list of aliases for the above options.
    '-h': '--help',
    '-v': '--version',
    '-l': '--listen',
    '-s': '--single',
    '-d': '--debug',
    '-c': '--config',
    '-n': '--no-clipboard',
    '-u': '--no-compression',
    '-S': '--symlinks',
    '-C': '--cors',
    '-L': '--no-request-logging',

    // The `-p` option is deprecated and is kept only for backwards-compatibility.
    '-p': '--listen',
};

/**
 * Parses the program's `process.argv` and returns the options and arguments.
 *
 * @returns The parsed options and arguments.
 */
export const parseArguments = () => parseArgv(options);

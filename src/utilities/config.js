import {
    resolve as resolvePath,
    relative as resolveRelativePath,
} from 'node:path';
import { readFile } from 'node:fs/promises';
import { resolve } from './promise.js';
import { logger } from './logger.js';

/**
 * Parses and returns a configuration object from the designated locations.
 *
 * @param presentDirectory - The current working directory.
 * @param directoryToServe - The directory to serve.
 * @param args - The arguments passed to the CLI.
 *
 * @returns The parsed configuration.
 */
export const loadConfiguration = async (
    presentDirectory,
    directoryToServe,
    args,
) => {
    const files = ['serve.json', 'now.json', 'package.json'];
    if (args['--config']) files.unshift(args['--config']);

    const config = {};
    for (const file of files) {
        // Resolve the path to the configuration file relative to the directory
        // with the content in it.
        const location = resolvePath(directoryToServe, file);

        // Disabling the lint rule as we don't want to read all the files at once;
        // if we can retrieve the configuration from the first file itself, we
        // shouldn't waste time and resources fetching the other files too.
        // eslint-disable-next-line no-await-in-loop
        const [error, rawContents] = await resolve(
            readFile(location, 'utf8'),
        );
        if (error) {
            if (error.code === 'ENOENT' && file !== args['--config']) continue;
            else
                throw new Error(
                    `Could not read configuration from file ${location}: ${error.message}`,
                );
        }

        // The configuration can come from three files in different forms:
        // - now.json: `/now/static`
        // - package.json: `/static`
        // - serve.json: `/`

        // Parse the JSON in the file. If the parsed JSON is not an object, or the
        // file does not contain valid JSON, throw an error.
        let parsedJson;
        try {
            parsedJson = JSON.parse(rawContents);
            if (typeof parsedJson !== 'object')
                throw new Error('configuration is not an object');
        } catch (parserError) {
            throw new Error(
                `Could not parse ${location} as JSON: ${
                    parserError.message
                }`,
            );
        }

        // Check if any of these files have a serve specific section.
        if (file === 'now.json') {
            parsedJson = parsedJson.now.static;
        } else if (file === 'package.json') {
            parsedJson = parsedJson.static;
        }
        if (!parsedJson) continue;

        // Once we have found a valid configuration, assign it and stop looking
        // through more configuration files.
        Object.assign(config, parsedJson);

        // Warn the user about using deprecated configuration files.
        if (file === 'now.json' || file === 'package.json')
            logger.warn(
                'The config files `now.json` and `package.json` are deprecated. Please use `serve.json`.',
            );

        break;
    }

    // Make sure the directory with the content is relative to the directoryToServe path
    // provided by the user.
    if (directoryToServe) {
        const staticDirectory = config.public;
        config.public = resolveRelativePath(
            presentDirectory,
            staticDirectory
                ? resolvePath(directoryToServe, staticDirectory)
                : directoryToServe,
        );
    }

    // Configure defaults based on the options the user has passed.
    config.etag = !args['--no-etag'];
    config.symlinks = args['--symlinks'] || config.symlinks;

    return config;
};

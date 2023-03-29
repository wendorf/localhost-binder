// Native
import path from 'node:path';
import {createReadStream} from 'node:fs';

export default async (request, response, config = {}, methods = {}) => {
    const cwd = process.cwd();
    const current = config.public ? path.resolve(cwd, config.public) : cwd;

    const relativePath = "/index.html";
    let absolutePath = path.join(current, relativePath);

    const streamOpts = {};

    let stream = null;

    try {
        stream = await createReadStream(absolutePath, streamOpts);
    } catch (err) {
        return response.end("cool error");
    }

    response.writeHead(response.statusCode || 200, {
        'Content-Length': 334,
        'Content-Disposition': 'inline; filename="index.html"',
        'Accept-Ranges': 'bytes',
        'Content-Type': 'text/html; charset=utf-8'
    });
    stream.pipe(response);
};

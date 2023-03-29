import path from 'node:path';
export const normalize = value => path.posix.normalize(path.posix.join('/', value));

export default value => (value.charAt(0) === '!' ? `!${normalize(value.substr(1))}` : normalize(value));

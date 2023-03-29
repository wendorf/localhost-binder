/**
 * Waits for the passed promise to resolve, then returns the data and error
 * in an array, similar to Go.
 *
 * For example:
 *
 * ```
 * const [error, data] = await resolve(dance())
 * if (error) console.error(error)
 * else console.log(data)
 * ```
 *
 * @param promiseLike - The promise to resolve.
 * @returns An array containing the error as the first element, and the resolved
 *          data as the second element.
 */
export const resolve = async (
        promiseLike
    ) => {
    try {
        const data = await promiseLike;
        return [undefined, data];
    } catch (error) {
        return [error, undefined];
    }
};

/**
 * Promisifies the passed function.
 */
export { promisify } from 'node:util';

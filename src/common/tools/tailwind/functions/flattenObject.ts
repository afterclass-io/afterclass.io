import { type RecursiveKeyValuePair } from "tailwindcss/types/config";

import { hexToRGB } from "./hexToRGB";

type FlattenedObject = Record<string, string>;

/**
 * Flattens a nested object and returns a new object with flattened keys.
 *
 * @param {RecursiveKeyValuePair<string, string>} obj - The nested object to flatten.
 * @param {Object} options - Optional configuration for object flattening.
 * @param {string} [options.parentKey=''] - The prefix to use for the flattened keys.
 * @param {string} [options.separator='-'] - The separator to use between flattened key segments.
 * @param {(hex: string) => string} [options.convertHexToRgb] - Optional function to convert HEX colors to RGB format.
 * @returns {Record<string, string>} An object containing flattened key-value pairs.
 *
 * @template RecursiveKeyValuePair - The type of the nested object to flatten.
 */
export const flattenObject = (
  obj: RecursiveKeyValuePair<string, string>,
  { parentKey = "", separator = "-", convertHexToRgb = true } = {},
): Record<string, string> => {
  return Object.keys(obj).reduce((acc, key) => {
    const fullKey = parentKey ? `${parentKey}${separator}${key}` : key;
    const value = obj[key];

    if (typeof value === "object" && value !== null) {
      const flattened = flattenObject(value, {
        parentKey: fullKey,
        separator,
        convertHexToRgb,
      });
      Object.keys(flattened).forEach((subKey) => {
        const flattenedValue = flattened[subKey];
        if (flattenedValue !== undefined) {
          acc[subKey] = flattenedValue;
        }
      });
    } else if (value !== undefined) {
      const convertedValue = convertHexToRgb ? hexToRGB(value) : value;
      if (convertedValue !== undefined) {
        acc[fullKey] = convertedValue;
      }
    }

    return acc;
  }, {} as FlattenedObject);
};

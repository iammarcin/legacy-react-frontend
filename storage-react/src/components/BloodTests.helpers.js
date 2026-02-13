// docker/storage-react/src/components/BloodTests.helpers.js
export const isOutOfRange = (value, range) => {
  if (
    range === null ||
    range === undefined ||
    String(range).trim() === '' ||
    value === null ||
    value === undefined
  ) {
    return false;
  }

  const numericValue = parseFloat(String(value).replace(/,/g, ''));
  if (isNaN(numericValue)) {
    return false;
  }

  const trimmedRange = String(range).trim();

  if (trimmedRange.includes('-')) {
    const parts = trimmedRange.split('-').map((part) => parseFloat(part.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      const [min, max] = parts;
      return numericValue < min || numericValue > max;
    }
  }

  if (trimmedRange.startsWith('<')) {
    const max = parseFloat(trimmedRange.substring(1).trim());
    if (!isNaN(max)) {
      return numericValue >= max;
    }
  }

  if (trimmedRange.startsWith('>')) {
    const min = parseFloat(trimmedRange.substring(1).trim());
    if (!isNaN(min)) {
      return numericValue <= min;
    }
  }

  return false;
};

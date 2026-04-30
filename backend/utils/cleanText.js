/**
 * Cleans extracted text by removing extra spaces, newlines, and special characters.
 * @param {string} text - The raw extracted text.
 * @returns {string} - The cleaned text.
 */
function cleanText(text) {
  if (!text) return '';
  return text
    .replace(/\r?\n|\r/g, ' ') // Replace newlines with spaces
    .replace(/[^\w\s\.\,]/g, '') // Remove special characters except periods and commas
    .replace(/\s+/g, ' ') // Replace multiple spaces with a single space
    .trim();
}

module.exports = cleanText;

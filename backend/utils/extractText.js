const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

/**
 * Extracts raw text from a PDF or DOCX file buffer.
 * @param {Buffer} buffer - The file buffer.
 * @param {string} mimetype - The MIME type of the file.
 * @returns {Promise<string>} - A promise that resolves to the extracted text.
 */
async function extractText(buffer, mimetype) {
  try {
    if (mimetype === 'application/pdf') {
      const data = await pdfParse(buffer);
      return data.text;
    } else if (
      mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimetype === 'application/msword'
    ) {
      const result = await mammoth.extractRawText({ buffer: buffer });
      return result.value;
    } else {
      throw new Error('Unsupported file type for extraction');
    }
  } catch (error) {
    throw new Error('Failed to extract text from file');
  }
}

module.exports = extractText;

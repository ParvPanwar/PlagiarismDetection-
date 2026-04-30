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
    // If it's a Python file or Plain Text, just return the string
    if (mimetype === 'text/x-python' || mimetype === 'text/plain') {
      return buffer.toString('utf-8');
    }

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
      // If multer let it through and it's not PDF or DOCX, it's a Python script
      return buffer.toString('utf-8');
    }
  } catch (error) {
    throw new Error('Failed to extract text from file');
  }
}

module.exports = extractText;

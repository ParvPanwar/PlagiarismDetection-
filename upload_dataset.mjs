import fs from 'fs';
import path from 'path';

const DATASET_DIR = './dataset';
const API_URL = 'https://plagiarismdetection-1.onrender.com/api/submit';
const ASSIGNMENT_ID = '1';

async function uploadDataset() {
  const files = fs.readdirSync(DATASET_DIR).filter(f => f.endsWith('.py'));
  console.log(`Found ${files.length} Python files to upload.`);

  let studentIdCounter = 5000;
  let successCount = 0;
  let failCount = 0;

  for (const fileName of files) {
    const filePath = path.join(DATASET_DIR, fileName);
    const fileBuffer = fs.readFileSync(filePath);
    const fileBlob = new Blob([fileBuffer], { type: 'text/x-python' });

    const formData = new FormData();
    formData.append('student_id', studentIdCounter.toString());
    formData.append('assignment_id', ASSIGNMENT_ID);
    formData.append('file', fileBlob, fileName);

    try {
      console.log(`[${successCount + failCount + 1}/${files.length}] Uploading ${fileName} as Student ${studentIdCounter}...`);
      
      const response = await fetch(API_URL, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        successCount++;
        console.log(`   -> Success! Highest similarity: ${data.report.length > 0 ? Math.max(...data.report.map(r => r.similarity_percentage)) + '%' : '0%'}`);
      } else {
        failCount++;
        console.log(`   -> Failed: ${data.error}`);
      }
    } catch (err) {
      failCount++;
      console.log(`   -> Error: ${err.message}`);
    }

    studentIdCounter++;
    
    // Slight delay to avoid hammering the free Render server too hard
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log(`\nUpload Complete!`);
  console.log(`Successful: ${successCount}`);
  console.log(`Failed: ${failCount}`);
}

uploadDataset();

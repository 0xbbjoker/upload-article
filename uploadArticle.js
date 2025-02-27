const fs = require('fs');
const axios = require('axios');
const path = require('path');

const AGENT_ID = '0262cf55-8e5d-0031-bc6d-4bbfa1fb0b70';
const ARTICLES_DIR = './articles';
const MAX_CHUNK_SIZE = 25000;

/**
 * Creates a table name from a file name
 */
function createTableName(fileName) {
  // Remove file extension and convert to lowercase
  const baseName = path.basename(fileName, path.extname(fileName)).toLowerCase();
  // Replace underscores with hyphens and add 'article-' prefix
  return `article-${baseName.replace(/_/g, '-')}`;
}

/**
 * Splits content into chunks of specified size
 */
function chunkContent(content, fileName) {
  const chunks = [];
  let offset = 0;
  
  while (offset < content.length) {
    const chunk = content.substring(offset, offset + MAX_CHUNK_SIZE);
    chunks.push({
      content: chunk,
      fileName: fileName,
      chunkIndex: chunks.length + 1,
      totalChunks: Math.ceil(content.length / MAX_CHUNK_SIZE)
    });
    offset += MAX_CHUNK_SIZE;
  }
  
  return chunks;
}

/**
 * Uploads a single chunk to the memory endpoint
 */
async function uploadChunk(chunk, tableName) {
  try {
    const chunkData = {
      tableName: tableName,
      content: chunk.content,
      metadata: {
        fileName: chunk.fileName,
        chunkIndex: chunk.chunkIndex,
        totalChunks: chunk.totalChunks
      }
    };
    
    console.log(`Uploading chunk ${chunk.chunkIndex}/${chunk.totalChunks} of ${chunk.fileName} to table ${tableName}`);
    
    const response = await axios.post(`http://localhost:3001/agents/${AGENT_ID}/memories/set`, chunkData);
    
    console.log(`Chunk ${chunk.chunkIndex} uploaded successfully!`);
    return response.data;
  } catch (error) {
    console.error(`Error uploading chunk ${chunk.chunkIndex}:`, error.message);
    if (error.response) {
      console.error('Server error:', error.response.data);
    }
    throw error;
  }
}

/**
 * Processes and uploads a specific article file
 * Chunks articles larger than 25000 characters
 */
async function uploadArticle(directory, fileName) {
  try {
    const filePath = path.join(directory, fileName);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      return;
    }
    
    // Check if file is a text file
    if (!fileName.toLowerCase().endsWith('.txt')) {
      console.log(`Skipping non-text file: ${fileName}`);
      return;
    }
    
    const tableName = createTableName(fileName);
    
    console.log(`Processing file: ${filePath}`);
    console.log(`Using table name: ${tableName}`);
    
    const content = fs.readFileSync(filePath, 'utf8');
    
    console.log(`File loaded successfully (${content.length} characters)`);
    
    // Check if we need to chunk the content
    if (content.length > MAX_CHUNK_SIZE) {
      console.log(`Content exceeds ${MAX_CHUNK_SIZE} characters, splitting into chunks...`);
      const chunks = chunkContent(content, fileName);
      console.log(`Split into ${chunks.length} chunks`);
      
      // Upload each chunk
      for (const chunk of chunks) {
        await uploadChunk(chunk, tableName);
      }
    } else {
      // Upload as single chunk
      await uploadChunk({
        content,
        fileName: fileName,
        chunkIndex: 1,
        totalChunks: 1
      }, tableName);
    }
    
    console.log('Article processed successfully!');
  } catch (error) {
    console.error('Error processing article:');
    if (error.code === 'ENOENT') {
      console.error(`Directory not found: ${directory}`);
    } else {
      console.error(error.message);
    }
  }
}

/**
 * Process all articles in a directory
 */
async function uploadAllArticles(directory = ARTICLES_DIR) {
  try {
    // Read all files in the articles directory
    const files = fs.readdirSync(directory);
    console.log(`Found ${files.length} files`);
    
    // Filter for .txt files
    const textFiles = files.filter(file => file.toLowerCase().endsWith('.txt'));
    console.log(`Found ${textFiles.length} text files to process`);
    
    for (const file of textFiles) {
      await uploadArticle(directory, file);
    }
    
    console.log('All articles processed successfully!');
  } catch (error) {
    console.error('Error processing articles:');
    if (error.code === 'ENOENT') {
      console.error(`Directory not found: ${directory}`);
    } else {
      console.error(error.message);
    }
  }
}

// Get command line arguments
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('No arguments provided. Usage:');
  console.log('  - Upload all articles: node uploadArticle.js');
  console.log('  - Upload specific file: node uploadArticle.js <directory> <filename>');
  console.log('Using default: uploading all articles in ./articles');
  uploadAllArticles();
} else if (args.length === 2) {
  // Directory and filename provided
  const directory = args[0];
  const fileName = args[1];
  console.log(`Uploading specific file: ${fileName} from directory: ${directory}`);
  uploadArticle(directory, fileName);
} else {
  console.error('Invalid number of arguments. Usage:');
  console.error('  - Upload all articles: node uploadArticle.js');
  console.error('  - Upload specific file: node uploadArticle.js <directory> <filename>');
}
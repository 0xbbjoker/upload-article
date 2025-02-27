This repository contains basic tools to playaround with agent memory. Very very basic!

## Overview

The system works by:
1. Taking text articles as input
2. Chunking large articles into manageable pieces
3. Uploading them to an agent's memory via an API endpoint
4. Creating searchable table names based on the article filenames
5. Enabling agents to retrieve and use this knowledge in actions

## Setup

```bash
# Install dependencies
npm install

# Make sure you have Node.js 18+ installed
node -v
```

## Usage

### 1. Testing the Endpoint

Before uploading articles, test if your endpoint is working:

```bash
node testEndPoint.js
```

This will attempt to send a small payload to verify connectivity.

### 2. Uploading Articles

Place your articles (as .txt files) in the `./articles` directory, then run:

```bash
# Upload all articles in the articles directory
node uploadArticle.js

# Upload a specific article from a specific directory
node uploadArticle.js ./custom-directory my-article.txt
```

#### Important Tips:

- **Use meaningful filenames**: The script creates `tableName` from filenames, which is how you'll search for them later.
- **Keep articles focused**: Smaller, topic-specific articles are easier to retrieve and use.
- **Naming convention**: Filenames will be converted to table names as `article-filename` (with underscores replaced by hyphens).

Example:
- File: `koi_fish.txt` → Table name: `article-koi-fish`
- File: `blockchain_basics.txt` → Table name: `article-blockchain-basics`

## How It Works

### Article Chunking

Large articles are automatically split into chunks of 25,000 characters to ensure they fit within memory constraints:

```javascript
// Function from uploadArticle.js
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
```

### Database Schema

The system uses a SQLite database with the following schema for memories:

```sql
CREATE TABLE IF NOT EXISTS "memories" (
    "id" TEXT PRIMARY KEY,
    "type" TEXT NOT NULL, -- This will be your article table name
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "content" TEXT NOT NULL,
    "embedding" BLOB NOT NULL,
    "userId" TEXT,
    "roomId" TEXT,
    "agentId" TEXT,
    "unique" INTEGER DEFAULT 1 NOT NULL,
    FOREIGN KEY ("userId") REFERENCES "accounts"("id"),
    FOREIGN KEY ("roomId") REFERENCES "rooms"("id"),
    FOREIGN KEY ("agentId") REFERENCES "accounts"("id")
);
```

## Creating Custom Actions

You can create custom actions that use these stored articles. Here's an example:

### Example: Koi Shitpost Action

This action retrieves koi fish facts and generates humorous content:

```typescript
import {
    IAgentRuntime,
    Memory,
    State,
    generateText,
    ModelClass,
    type Action,
    HandlerCallback,
    stringToUuid,
} from "@elizaos/core";

// Koi Shitpost Action
export const koiShitpostAction: Action = {
    name: "KOI_SHITPOST",
    description: "Generate a ridiculous shitpost about koi fish",
    handler: async (
        runtime: IAgentRuntime,
        _message: Memory,
        _state?: State,
        _options?: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        try {
            // Note how we use the tableName that matches our uploaded article
            const tableName = 'article-koi-fish';
            
            // Get koi information from memory
            const koiMemories = await runtime.databaseAdapter.getMemories({
                tableName,
                roomId: stringToUuid(tableName),
                agentId: runtime.agentId,
                count: 5
            });

            // Generate content based on retrieved memories
            const koiShitpost = await generateKoiShitpost(koiMemories, runtime);

            // Send the generated content back through the callback
            callback?.({ text: koiShitpost });

            return true;
        } catch (error) {
            console.error("Error in koi shitpost action:", error);
            callback?.({ text: "Failed to generate content. The fish are silent today." });
            return false;
        }
    },
    // Additional action configuration...
};
```

### Creating Your Own Actions

1. **Define your action**: Create a TypeScript/JavaScript file with your action logic
2. **Use the correct table name**: Reference your article with `tableName: 'article-your-article-name'`
3. **Retrieve memories**: Use `databaseAdapter.getMemories()` to fetch content
4. **Process the content**: Use the retrieved information to generate responses or take actions

## Best Practices

1. **Article Organization**:
   - Create separate articles for distinct topics
   - Use clear, descriptive filenames
   - Keep content focused and well-structured

2. **Memory Retrieval**:
   - Adjust the `count` parameter when retrieving memories based on your needs
   - Handle cases where no memories are found

3. **Action Design**:
   - Include proper error handling
   - Provide fallback responses
   - Add examples of how to invoke your action

## Troubleshooting

- **"Cannot connect to endpoint"**: Check if your local server is running
- **"Error uploading chunk"**: Verify your agent ID and endpoint URL
- **"No memories found"**: Ensure the article was uploaded and the table name matches

## License

ISC

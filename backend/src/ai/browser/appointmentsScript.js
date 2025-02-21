const { Stagehand } = require('@browserbasehq/stagehand');
const { z } = require('zod');
const config = require('../../../stagehand.config.ts');

async function main() {
  const stagehand = new Stagehand(config);
  
  try {
    const page = await stagehand.newPage();

    // Navigate to Wikipedia
    await page.goto('https://www.wikipedia.org');
    
    // Use Stagehand's act API to perform the search
    await page.act('Search for "Artificial Intelligence" and click the search button');

    // Define a schema for the data we want to extract
    const schema = z.object({
      title: z.string(),
      introduction: z.string(),
      keyPoints: z.array(z.string()),
    });

    // Use Stagehand's extract API to get the content
    const content = await page.extract({
      instruction: "Extract the article title, introduction paragraph, and 3 key points about AI from the article",
      schema: schema
    });

    // Log the extracted content
    console.log('Title:', content.title);
    console.log('Introduction:', content.introduction);
    console.log('Key Points:');
    content.keyPoints.forEach((point, index) => {
      console.log(`${index + 1}. ${point}`);
    });

    // Take a screenshot for verification
    await page.screenshot({ path: 'wikipedia-ai.png' });
    
    await stagehand.close();
    
  } catch (error) {
    console.error('An error occurred:', error);
  }
}

main().catch(console.error);
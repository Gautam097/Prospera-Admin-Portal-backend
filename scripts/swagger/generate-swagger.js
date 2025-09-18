import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { swaggerSpec } from '../../src/config/swagger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outputDir = path.join(__dirname, '../../docs/api');
const outputPath = path.join(outputDir, 'swagger.json');

try {
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
        console.log(`Created directory: ${outputDir}`);
    }

    const jsonString = JSON.stringify(swaggerSpec, null, 2);
    if (!jsonString || jsonString === '{}') {
        throw new Error('Generated swaggerSpec is empty. Check your swagger config and paths.');
    }

    fs.writeFileSync(outputPath, jsonString);
    console.log(`Swagger spec successfully generated at: ${outputPath}`);
} catch (err) {
    console.error(`Failed to generate Swagger spec: ${err.message}`);
    process.exit(1);
}

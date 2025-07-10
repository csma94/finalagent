const fs = require('fs');
const path = require('path');

// Get all TypeScript files in src directory
function getAllTsFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      files.push(...getAllTsFiles(fullPath));
    } else if (item.endsWith('.ts')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Fix unused parameters in a file
function fixUnusedParams(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Pattern to match function parameters that should be prefixed with _
  const patterns = [
    // Function parameters
    /(\w+)\s*:\s*[^,)]+(?=\s*[,)])/g,
  ];
  
  // This is a simplified approach - in practice, you'd need more sophisticated parsing
  // For now, let's just run the linter and fix manually
  
  return modified;
}

// Get all TypeScript files
const srcDir = path.join(__dirname, 'src');
const tsFiles = getAllTsFiles(srcDir);

console.log(`Found ${tsFiles.length} TypeScript files`);

// For now, just list the files - manual fixing is more reliable
tsFiles.forEach(file => {
  console.log(file);
});
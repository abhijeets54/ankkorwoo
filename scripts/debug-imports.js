// Debug script to check all imports in layout.tsx
const fs = require('fs');
const path = require('path');

console.log('=== Checking Component Imports ===\n');

// List of components imported in layout.tsx
const componentsToCheck = [
  { name: 'CartProvider', path: '../src/components/cart/CartProvider.tsx', type: 'default' },
  { name: 'LoadingProvider', path: '../src/components/providers/LoadingProvider.tsx', type: 'default' },
  { name: 'CustomerProvider', path: '../src/components/providers/CustomerProvider.tsx', type: 'named' },
  { name: 'ToastProvider', path: '../src/components/ui/toast.tsx', type: 'named' },
  { name: 'LaunchingSoonProvider', path: '../src/components/providers/LaunchingSoonProvider.tsx', type: 'default' },
  { name: 'NavbarWrapper', path: '../src/components/layout/NavbarWrapper.tsx', type: 'default' },
  { name: 'FooterWrapper', path: '../src/components/layout/FooterWrapper.tsx', type: 'default' },
  { name: 'LaunchingStateServer', path: '../src/components/LaunchingStateServer.tsx', type: 'default' },
  { name: 'LaunchUtilsInitializer', path: '../src/components/utils/LaunchUtilsInitializer.tsx', type: 'default' },
];

componentsToCheck.forEach(({ name, path: componentPath, type }) => {
  const fullPath = path.join(__dirname, componentPath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`❌ ${name}: FILE NOT FOUND at ${componentPath}`);
    return;
  }
  
  const content = fs.readFileSync(fullPath, 'utf8');
  
  // Check for default export
  const hasDefaultExport = 
    content.includes('export default') || 
    content.includes('export { default }') ||
    content.includes('export =');
    
  // Check for named export
  const hasNamedExport = new RegExp(`export\\s*{[^}]*\\b${name}\\b[^}]*}|export\\s+(const|function|class)\\s+${name}\\b`).test(content);
  
  if (type === 'default' && !hasDefaultExport) {
    console.log(`❌ ${name}: Expected DEFAULT export but not found`);
  } else if (type === 'named' && !hasNamedExport) {
    console.log(`❌ ${name}: Expected NAMED export but not found`);
  } else {
    console.log(`✅ ${name}: Export type matches (${type})`);
  }
});

console.log('\n=== Checking for circular dependencies ===\n');

// Simple check for potential circular dependencies
const checkCircular = (filePath, visited = new Set(), stack = []) => {
  if (visited.has(filePath)) {
    if (stack.includes(filePath)) {
      console.log(`⚠️  Potential circular dependency detected: ${stack.join(' -> ')} -> ${filePath}`);
    }
    return;
  }
  
  visited.add(filePath);
  stack.push(filePath);
  
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    const importRegex = /import\s+.*?\s+from\s+['"](.+?)['"]/g;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];
      if (importPath.startsWith('@/')) {
        const resolvedPath = path.join(__dirname, '../src', importPath.replace('@/', '') + '.tsx');
        checkCircular(resolvedPath, visited, [...stack]);
      }
    }
  }
  
  stack.pop();
};

// Check layout.tsx for circular dependencies
const layoutPath = path.join(__dirname, '../src/app/layout.tsx');
checkCircular(layoutPath);

console.log('\n=== Done ===');
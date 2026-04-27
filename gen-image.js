const fs = require('fs');
const b64 = fs.readFileSync('ui/assets/journey-chart.png').toString('base64');
const content = 'export const journeyImage: string = "data:image/png;base64,' + b64 + '";\n';
fs.writeFileSync('ui/assets/journeyImage.ts', content, 'utf8');
console.log('Written, base64 length:', b64.length);

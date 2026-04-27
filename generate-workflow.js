const fs = require('fs');

// Read tiles
let raw = fs.readFileSync('c:/Users/john.kelly/Documents/GitHub/sre-maturity-assessment/cwv-tiles.json', 'utf8');
if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
const tiles = JSON.parse(raw);

// Unique task names for each tile
const taskNames = {
  '109': 'cls_kpi',
  '110': 'inp_kpi',
  '111': 'lcp_kpi',
  '112': 'error_count',
  '113': 'page_load_time',
  '114': 'navigations',
  '117': 'user_actions',
  '118': 'cwv_health',
  '121': 'applications',
  '122': 'lcp_trend',
  '123': 'inp_trend',
  '124': 'cls_trend'
};

const titleMap = {
  '109': 'CLS KPI',
  '110': 'INP KPI',
  '111': 'LCP KPI',
  '112': 'Error Count',
  '113': 'Page Load Time',
  '114': 'Navigations',
  '117': 'User Actions',
  '118': 'CWV Health',
  '121': 'Applications',
  '122': 'LCP Trend',
  '123': 'INP Trend',
  '124': 'CLS Trend'
};

function processQuery(query) {
  let q = query;

  // Add timeframe to fetch statement (none start with data json)
  q = q.replace(/^(fetch\s+user\.events)/, '$1, from: @d-1d, to: @d');

  // Check for active (uncommented) limit
  const lines = q.split('\n');
  const hasActiveLimit = lines.some(line => {
    const trimmed = line.trim();
    return !trimmed.startsWith('//') && /\blimit\b/i.test(trimmed);
  });

  if (!hasActiveLimit) {
    q = q.trimEnd() + '\n| limit 25';
  }

  return q;
}

// Build tasks
const tasks = {};
const dqlTaskNames = [];
const promptTaskNames = [];
const prompt2TaskNames = [];

const startX = -Math.floor(tiles.length / 2);

tiles.forEach((tile, idx) => {
  const name = taskNames[tile.tileId];
  const title = titleMap[tile.tileId];
  const promptName = name + '_prompt';
  const prompt2Name = name + '_prompt_2';
  const query = processQuery(tile.query);

  dqlTaskNames.push(name);
  promptTaskNames.push(promptName);
  prompt2TaskNames.push(prompt2Name);

  // DQL task
  tasks[name] = {
    name: name,
    input: { query: query },
    action: 'dynatrace.automations:execute-dql-query',
    position: { x: startX + idx, y: 1 },
    description: 'Make use of Dynatrace Grail data in your workflow.',
    predecessors: []
  };

  // Prompt task (detailed analysis)
  tasks[promptName] = {
    name: promptName,
    input: {
      config: 'disabled',
      prompt: `Provide a report for the following use case:\n## ${title} Analysis Report\n`,
      autoTrim: true,
      instruction: 'Provide a Summary, Insights, Observations and Recommendations.',
      supplementary: `Format examples in tables instead of bulleted lists.\nWhere applicable convert units for readability, e.g. 1000000000 bytes is 1 TiB.\nWhere applicable show relative percentages, e.g. 100 used and 1000 allocatable is 10% utilized.\nUse this analysis:\n{{result("${name}")["records"]}}\n`
    },
    action: 'dynatrace.davis.copilot.workflow.actions:davis-copilot',
    position: { x: startX + idx, y: 3 },
    conditions: { states: { [name]: 'OK' } },
    description: 'Prompt the Dynatrace Intelligence generative AI',
    predecessors: [name]
  };

  // Prompt_2 task (yes/no attention check)
  tasks[prompt2Name] = {
    name: prompt2Name,
    input: {
      config: 'disabled',
      prompt: `Provide a report for the following use case:\n## ${title} KPI Analysis Report`,
      autoTrim: true,
      instruction: 'Simple yes/no, does the analysis need my attention?',
      supplementary: `Format examples in tables instead of bulleted lists.\nWhere applicable convert units for readability, e.g. 1000000000 bytes is 1 TiB.\nWhere applicable show relative percentages, e.g. 100 used and 1000 allocatable is 10% utilized.\nUse this analysis:\n{{result("${name}")["records"]}}`
    },
    action: 'dynatrace.davis.copilot.workflow.actions:davis-copilot',
    position: { x: startX + idx, y: 2 },
    conditions: { states: { [name]: 'OK' } },
    description: 'Prompt the Dynatrace Intelligence generative AI',
    predecessors: [name]
  };
});

// Overall prompt - waits on ALL prompt and prompt_2 tasks
const allPromptNames = [...promptTaskNames, ...prompt2TaskNames];
const overallStates = {};
allPromptNames.forEach(n => { overallStates[n] = 'OK'; });

// Supplementary only uses the detailed _prompt results (not _prompt_2), matching example pattern
const overallSupplementary = 'Format examples in tables instead of bulleted lists.\nUse this analysis:\n' +
  promptTaskNames.map(n => `{{result("${n}").text}}`).join('\n') + '\n\n';

tasks.overall_prompt = {
  name: 'overall_prompt',
  input: {
    config: 'disabled',
    prompt: 'Provide a report for the following use case:\n## Frontend Observability for CWV Dashboard Executive Report',
    autoTrim: true,
    instruction: 'Provide a Summary, Insights, Observations and Recommendations.',
    supplementary: overallSupplementary
  },
  action: 'dynatrace.davis.copilot.workflow.actions:davis-copilot',
  position: { x: 0, y: 4 },
  conditions: { states: overallStates },
  description: 'Prompt the Dynatrace Intelligence generative AI',
  predecessors: allPromptNames
};

// Executive summary email
tasks.email_exec_report = {
  name: 'email_exec_report',
  input: {
    cc: [],
    to: ['john.kelly@dynatrace.com'],
    bcc: [],
    content: '#\n# Dashboard Overall Summary \n#\n{{result("overall_prompt").text}}\n',
    subject: 'Dynatrace Frontend Observability for CWV Dashboard Executive Summary Report'
  },
  action: 'dynatrace.email:send-email',
  position: { x: 1, y: 5 },
  conditions: { states: { overall_prompt: 'OK' } },
  description: 'Send email',
  predecessors: ['overall_prompt']
};

// Dashboard detail email with conditional includes (matches example pattern)
let detailContent = '#\n# Dashboard Overall Summary\n#\n{{result("overall_prompt").text}}\n#\n# Dashboard Tiles That Need Attention \n#\n';
promptTaskNames.forEach((promptName, idx) => {
  const prompt2Name = prompt2TaskNames[idx];
  detailContent += `{% if result("${prompt2Name}.text") == "Yes." %}\n{{result("${promptName}").text}}\n{% endif %}\n`;
});

tasks.email_dashboard_report = {
  name: 'email_dashboard_report',
  input: {
    cc: [],
    to: ['john.kelly@dynatrace.com'],
    bcc: [],
    content: detailContent,
    subject: 'Dynatrace Frontend Observability for CWV Dashboard Tile Report'
  },
  action: 'dynatrace.email:send-email',
  position: { x: -1, y: 5 },
  conditions: { states: { overall_prompt: 'OK' } },
  description: 'Send email',
  predecessors: ['overall_prompt']
};

// Build workflow
const workflow = {
  title: 'Frontend Observability for CWV Report',
  description: 'This Workflow generates Frontend Observability for CWV reports and emails to the specified addresses.',
  ownerType: 'USER',
  isPrivate: true,
  schemaVersion: 4,
  trigger: {},
  result: null,
  type: 'STANDARD',
  input: {},
  hourlyExecutionLimit: 10,
  guide: '# Frontend Observability for CWV Report\nGet Core Web Vitals metrics from your frontend applications. This Workflow queries Grail and provides data to Dynatrace Intelligence to get recommendations. These recommendations are then sent to email(s) of your choice.\n\n# Setup\n1. Change emails (`to`, `cc`, `bcc`) to be an array of strings.\n2. Test with a manual Run, by click the `Run` button.\n3. If everything works as expected, change the [Trigger](?trigger=) to a schedule, e.g. Weekly, Daily, etc.',
  tasks: tasks
};

fs.writeFileSync('c:/Users/john.kelly/Documents/GitHub/sre-maturity-assessment/cwv-workflow.json', JSON.stringify(workflow, null, 2), 'utf8');

console.log('Workflow generated successfully!');
console.log('DQL tasks:', dqlTaskNames.length);
console.log('Dynatrace Intelligence tasks:', promptTaskNames.length + prompt2TaskNames.length + 1); // +1 for overall_prompt
console.log('Email tasks: 2');
console.log('Total tasks:', Object.keys(tasks).length);
console.log('\nDQL task names:', dqlTaskNames.join(', '));

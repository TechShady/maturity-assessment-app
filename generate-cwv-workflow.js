const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Step 1: Get dashboard content from tenant via dtctl
// Use dtctl diff with a dummy to get the raw tile data, or use describe with debug
// Actually, let's use a cleaner approach: write a minimal dashboard, use diff -o json
console.log("Fetching dashboard from tenant...");

// Use dtctl to get the raw document via the Dynatrace API
// The edit command with a custom EDITOR can dump the content
const tmpFile = path.join(__dirname, 'cwv-jk-edit-tmp.json');

// Set EDITOR to a program that copies stdin to a file
// On Windows, we'll use a different approach: call the API directly
// Let's extract from the diff output which we already have

// Parse the diff output we captured earlier
const diffFile = path.join(__dirname, '..', 'AppData', 'Roaming', 'Code', 'User', 'workspaceStorage', 'd683593e36a57a27ea42ca4353515038', 'GitHub.copilot-chat', 'chat-session-resources', 'aa0cbaac-edb4-42c0-bef3-b1d9b31cf870', 'toolu_bdrk_01WTvagRCn65iQp39nbuWKcw__vscode-1777131181561', 'content.txt');

let diffContent;
try {
  diffContent = fs.readFileSync(diffFile, 'utf8');
  console.log("Read diff from cached file.");
} catch (e) {
  console.log("Cached diff not found, re-generating...");
  const dummyDash = JSON.stringify({
    name: "Frontend Observability for CWV - jk",
    type: "dashboard",
    content: { version: 21, tiles: {}, layouts: {} }
  });
  fs.writeFileSync(path.join(__dirname, 'dummy-dash.json'), dummyDash, 'utf8');
  try {
    diffContent = execSync('dtctl diff dashboard 30688d2b-d6ef-4aac-9761-de88820918cb -f dummy-dash.json --plain', {
      cwd: __dirname,
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024
    });
  } catch (diffErr) {
    // dtctl diff exits with code 1 when there are differences, which is expected
    diffContent = diffErr.stdout || '';
    if (!diffContent) {
      console.error("No diff stdout, trying stderr...");
      diffContent = diffErr.stderr || '';
    }
  }
}

// Parse tiles from diff output
// Each line starts with "- content.tiles.{id}: {json}"
const tileRegex = /^- content\.tiles\.(\d+): (.+)$/gm;
const tiles = {};
let match;
while ((match = tileRegex.exec(diffContent)) !== null) {
  const tileId = match[1];
  try {
    const tileData = JSON.parse(match[2]);
    tiles[tileId] = tileData;
  } catch (e) {
    console.error(`Failed to parse tile ${tileId}: ${e.message}`);
  }
}

console.log(`Found ${Object.keys(tiles).length} tiles in dashboard.`);

// Filter tiles: skip tiles where query starts with "data record" or "data json"
// and only include tiles with DQL queries
const dqlTiles = {};
for (const [id, tile] of Object.entries(tiles)) {
  if (!tile.query) continue;
  const query = tile.query.trim();
  if (query.startsWith('data record') || query.startsWith('data json')) {
    console.log(`Skipping tile ${id} (${tile.title || 'no title'}): starts with data record/json`);
    continue;
  }
  dqlTiles[id] = tile;
}

console.log(`\n${Object.keys(dqlTiles).length} DQL tiles to include in workflow:`);
for (const [id, tile] of Object.entries(dqlTiles)) {
  console.log(`  Tile ${id}: ${tile.title}`);
}

// Create task names from tile titles
function titleToTaskName(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '_');
}

// Build the workflow
const taskEntries = [];
for (const [id, tile] of Object.entries(dqlTiles)) {
  let taskName = titleToTaskName(tile.title);
  // Ensure unique names
  if (taskEntries.find(t => t.name === taskName)) {
    taskName = taskName + '_' + id;
  }
  
  // Modify DQL according to rules
  let query = tile.query;
  
  // Fix user_events -> user.events if present
  query = query.replace(/fetch\s+user_events/g, 'fetch user.events');
  
  // Remove variable filters (lines with $variable)
  query = query.split('\n').filter(line => {
    // Remove filter lines that reference $variables
    if (line.match(/\$\w+/)) {
      console.log(`  Removing variable filter from ${taskName}: ${line.trim()}`);
      return false;
    }
    return true;
  }).join('\n');
  
  // Add timeframe filter "from: @d-1d, to: @d" to fetch command
  // For queries starting with "fetch <table>", add after the table name
  query = query.replace(
    /^(fetch\s+user\.events)\s*$/m,
    '$1, from: @d-1d, to: @d'
  );
  query = query.replace(
    /^(fetch\s+user\.events)\s*\n/m,
    '$1, from: @d-1d, to: @d\n'
  );
  // Handle case where fetch already has parameters on same line
  if (!/fetch\s+user\.events\s*,\s*from:/.test(query)) {
    query = query.replace(
      /^(fetch\s+user\.events)/m,
      '$1, from: @d-1d, to: @d'
    );
  }
  // Deduplicate if we added it twice
  const fromCount = (query.match(/from: @d-1d, to: @d/g) || []).length;
  if (fromCount > 1) {
    let first = true;
    query = query.replace(/,\s*from: @d-1d, to: @d/g, (m) => {
      if (first) { first = false; return m; }
      return '';
    });
  }
  
  // Add limit 25 if no active (uncommented) limit exists
  // Check each line for an uncommented limit
  const hasActiveLimit = query.split('\n').some(line => {
    const trimmed = line.trim();
    return !trimmed.startsWith('//') && /\blimit\s+\d+/i.test(trimmed);
  });
  if (!hasActiveLimit) {
    query = query.trimEnd() + '\n| limit 25';
  }
  
  taskEntries.push({
    id: id,
    name: taskName,
    title: tile.title,
    query: query
  });
}

console.log('\nTask names:');
taskEntries.forEach(t => console.log(`  ${t.name} (tile ${t.id}: ${t.title})`));

// Build the workflow JSON following the example pattern
const tasks = {};
const numTasks = taskEntries.length;

// Row 1: DQL tasks (spread across x positions)
taskEntries.forEach((entry, idx) => {
  const xPos = idx - Math.floor(numTasks / 2);
  tasks[entry.name] = {
    name: entry.name,
    input: {
      query: entry.query
    },
    action: "dynatrace.automations:execute-dql-query",
    position: { x: xPos, y: 1 },
    description: "Make use of Dynatrace Grail data in your workflow.",
    predecessors: []
  };
});

// Row 2: KPI prompts (_prompt_2) - "Simple yes/no, does the analysis need my attention?"
taskEntries.forEach((entry, idx) => {
  const promptName2 = `${entry.name}_prompt_2`;
  const xPos = idx - Math.floor(numTasks / 2);
  tasks[promptName2] = {
    name: promptName2,
    input: {
      config: "disabled",
      prompt: `Provide a simple yes/no answer with no other details for the following use case:\n## ${entry.title} KPI Analysis Report`,
      autoTrim: true,
      instruction: "Simple yes/no, does the analysis need my attention?",
      supplementary: `Format examples in tables instead of bulleted lists.\nWhere applicable convert units for readability, e.g. 1000000000 bytes is 1 TiB.\nWhere applicable show relative percentages, e.g. 100 used and 1000 allocatable is 10% utilized.\nUse this analysis:\n{{result("${entry.name}")["records"]}}`
    },
    action: "dynatrace.davis.copilot.workflow.actions:davis-copilot",
    position: { x: xPos, y: 2 },
    conditions: {
      states: {
        [entry.name]: "OK"
      }
    },
    description: "Prompt the Dynatrace Intelligence generative AI",
    predecessors: [entry.name]
  };
});

// Row 3: Full analysis prompts (_prompt)
taskEntries.forEach((entry, idx) => {
  const promptName = `${entry.name}_prompt`;
  const xPos = idx - Math.floor(numTasks / 2);
  tasks[promptName] = {
    name: promptName,
    input: {
      config: "disabled",
      prompt: `Provide a report for the following use case:\n## ${entry.title} Analysis Report\n`,
      autoTrim: true,
      instruction: "Provide a Summary, Insights, Observations and Recommendations.",
      supplementary: `Format examples in tables instead of bulleted lists.\nWhere applicable convert units for readability, e.g. 1000000000 bytes is 1 TiB.\nWhere applicable show relative percentages, e.g. 100 used and 1000 allocatable is 10% utilized.\nUse this analysis:\n{{result("${entry.name}")["records"]}}\n`
    },
    action: "dynatrace.davis.copilot.workflow.actions:davis-copilot",
    position: { x: xPos, y: 3 },
    conditions: {
      states: {
        [entry.name]: "OK"
      }
    },
    description: "Prompt the Dynatrace Intelligence generative AI",
    predecessors: [entry.name]
  };
});

// Row 4: Overall prompt - depends on ALL prompt tasks
const allPromptNames = taskEntries.flatMap(e => [`${e.name}_prompt`, `${e.name}_prompt_2`]);
const overallConditionStates = {};
allPromptNames.forEach(name => { overallConditionStates[name] = "OK"; });

// Build the supplementary text for overall_prompt referencing all _prompt results
const overallSupplementary = "Format examples in tables instead of bulleted lists.\nUse this analysis:\n" +
  taskEntries.map(e => `{{result("${e.name}_prompt").text}}`).join('\n') + '\n\n';

tasks['overall_prompt'] = {
  name: 'overall_prompt',
  input: {
    config: "disabled",
    prompt: "Provide a report for the following use case:\n## Frontend Observability for CWV Dashboard Executive Report",
    autoTrim: true,
    instruction: "Provide a Summary, Insights, Observations and Recommendations.",
    supplementary: overallSupplementary
  },
  action: "dynatrace.davis.copilot.workflow.actions:davis-copilot",
  position: { x: 0, y: 4 },
  conditions: {
    states: overallConditionStates
  },
  description: "Prompt the Dynatrace Intelligence generative AI",
  predecessors: allPromptNames
};

// Row 5: Email tasks
// Executive summary email
tasks['email_exec_report'] = {
  name: 'email_exec_report',
  input: {
    cc: [],
    to: ["john.kelly@dynatrace.com"],
    bcc: [],
    content: "#\n# Dashboard Overall Summary \n#\n{{result(\"overall_prompt\").text}}\n",
    subject: "Dynatrace Frontend Observability for CWV Dashboard Executive Summary Report"
  },
  action: "dynatrace.email:send-email",
  position: { x: 1, y: 5 },
  conditions: {
    states: { overall_prompt: "OK" }
  },
  description: "Send email",
  predecessors: ["overall_prompt"]
};

// Detailed dashboard report email
const detailEmailContent = "#\n# Dashboard Overall Summary\n#\n{{result(\"overall_prompt\").text}}\n#\n# Dashboard Tiles That Need Attention \n#\n" +
  taskEntries.map(e => {
    return `{% if result("${e.name}_prompt_2.text") == "Yes." %}\n{{result("${e.name}_prompt").text}}\n{% endif %}`;
  }).join('\n') + '';

tasks['email_dashboard_report'] = {
  name: 'email_dashboard_report',
  input: {
    cc: [],
    to: ["john.kelly@dynatrace.com"],
    bcc: [],
    content: detailEmailContent,
    subject: "Dynatrace Frontend Observability for CWV Dashboard Tile Report"
  },
  action: "dynatrace.email:send-email",
  position: { x: -1, y: 5 },
  conditions: {
    states: { overall_prompt: "OK" }
  },
  description: "Send email",
  predecessors: ["overall_prompt"]
};

// Build the full workflow
const workflow = {
  title: "Frontend Observability for CWV Report",
  description: "This Workflow generates Frontend Observability for CWV reports and emails to the specified addresses.",
  ownerType: "USER",
  isPrivate: true,
  schemaVersion: 4,
  trigger: {},
  result: null,
  type: "STANDARD",
  input: {},
  hourlyExecutionLimit: 10,
  guide: "# Frontend Observability for CWV Report\nGet Core Web Vitals analysis. This Workflow queries Grail and provides data to Dynatrace Intelligence to get recommendations. These recommendations are then sent to email(s) of your choice.\n\n# Setup\n1. Change emails (`to`, `cc`, `bcc`) to be an array of strings.\n2. Test with a manual Run, by click the `Run` button.\n3. If everything works as expected, change the [Trigger](?trigger=) to a schedule, e.g. Weekly, Daily, etc.",
  tasks: tasks
};

// Write the workflow to a file
const outputFile = path.join(__dirname, 'cwv-jk-workflow.json');
fs.writeFileSync(outputFile, JSON.stringify(workflow, null, 2), 'utf8');

// Summary
const dqlTaskCount = taskEntries.length;
const promptTaskCount = taskEntries.length * 2;
const totalTasks = dqlTaskCount + promptTaskCount + 1 + 2; // DQL + prompts + overall + 2 email
console.log(`\nWorkflow generated: ${outputFile}`);
console.log(`  DQL tasks: ${dqlTaskCount}`);
console.log(`  Dynatrace Intelligence tasks: ${promptTaskCount + 1} (${promptTaskCount} per-tile + 1 overall)`);
console.log(`  Email tasks: 2`);
console.log(`  Total tasks: ${totalTasks}`);

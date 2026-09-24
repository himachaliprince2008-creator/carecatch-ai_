const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');

// Config
const OWNER = 'hackhrono12-byte';
const REPO = 'care_catch_ai_';
const TOKEN = process.env.GH_TOKEN;
const BRANCH = 'main';
const PROJECT_DIR = path.join(__dirname, '..');

if (!TOKEN) {
  console.error('❌ GH_TOKEN env variable not set!');
  console.error('Run: $env:GH_TOKEN="your_token_here"; node scripts/push-to-github.js');
  process.exit(1);
}

// Files/dirs to ignore
const IGNORE = new Set([
  'node_modules', '.next', '.git', 'dist', 'build',
  '.env.local', '.env', 'tsconfig.tsbuildinfo',
  'push-to-github.js'
]);

function getAllFiles(dir, base = '') {
  const results = [];
  const entries = fs.readdirSync(dir);
  for (const entry of entries) {
    if (IGNORE.has(entry)) continue;
    const fullPath = path.join(dir, entry);
    const relPath = base ? `${base}/${entry}` : entry;
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results.push(...getAllFiles(fullPath, relPath));
    } else {
      results.push({ fullPath, relPath });
    }
  }
  return results;
}

function apiRequest(method, endpoint, body = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${OWNER}/${REPO}${endpoint}`,
      method,
      headers: {
        'Authorization': `token ${TOKEN}`,
        'User-Agent': 'carematch-deploy-script',
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(responseData) });
        } catch {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function createBlob(content, encoding = 'base64') {
  const res = await apiRequest('POST', '/git/blobs', { content, encoding });
  return res.data.sha;
}

async function main() {
  console.log('🚀 Pushing CareMatch AI to GitHub...\n');

  // Get all files
  const files = getAllFiles(PROJECT_DIR);
  console.log(`📁 Found ${files.length} files to push\n`);

  // Get current commit SHA (or create initial)
  let baseTreeSha = null;
  let baseCommitSha = null;

  try {
    const refRes = await apiRequest('GET', `/git/refs/heads/${BRANCH}`);
    if (refRes.status === 200) {
      baseCommitSha = refRes.data.object.sha;
      const commitRes = await apiRequest('GET', `/git/commits/${baseCommitSha}`);
      baseTreeSha = commitRes.data.tree.sha;
      console.log(`✅ Found existing branch: ${BRANCH}`);
    }
  } catch {
    console.log('📌 Creating new branch...');
  }

  // Create blobs for all files
  const treeItems = [];
  let count = 0;
  for (const { fullPath, relPath } of files) {
    try {
      const content = fs.readFileSync(fullPath);
      const isText = isTextFile(fullPath);
      const blobContent = isText 
        ? content.toString('utf8')
        : content.toString('base64');
      const encoding = isText ? 'utf-8' : 'base64';
      
      const blobSha = await createBlob(blobContent, encoding);
      treeItems.push({
        path: relPath,
        mode: '100644',
        type: 'blob',
        sha: blobSha
      });
      count++;
      if (count % 10 === 0) console.log(`   ⏳ Uploaded ${count}/${files.length} files...`);
    } catch (err) {
      console.warn(`   ⚠️  Skipped ${relPath}: ${err.message}`);
    }
  }

  console.log(`\n✅ Created ${treeItems.length} blobs`);

  // Create tree
  const treePayload = baseTreeSha
    ? { base_tree: baseTreeSha, tree: treeItems }
    : { tree: treeItems };
  
  const treeRes = await apiRequest('POST', '/git/trees', treePayload);
  const newTreeSha = treeRes.data.sha;
  console.log('✅ Created Git tree');

  // Create commit
  const commitPayload = {
    message: '🚀 CareMatch AI - Full deployment with 250 Indian hospitals, AI chatbot, voice search, admin console',
    tree: newTreeSha,
    ...(baseCommitSha ? { parents: [baseCommitSha] } : { parents: [] })
  };

  const commitRes = await apiRequest('POST', '/git/commits', commitPayload);
  const newCommitSha = commitRes.data.sha;
  console.log('✅ Created commit');

  // Update or create ref
  if (baseCommitSha) {
    await apiRequest('PATCH', `/git/refs/heads/${BRANCH}`, {
      sha: newCommitSha,
      force: true
    });
  } else {
    await apiRequest('POST', '/git/refs', {
      ref: `refs/heads/${BRANCH}`,
      sha: newCommitSha
    });
  }

  console.log('\n🎉 SUCCESS! Code pushed to GitHub!');
  console.log(`🔗 https://github.com/${OWNER}/${REPO}`);
  console.log('\nNext: Go to vercel.com/new → Import this repo → Deploy! ✅');
}

function isTextFile(filePath) {
  const textExtensions = new Set([
    '.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.mdx',
    '.css', '.html', '.txt', '.env', '.example', '.gitignore',
    '.prisma', '.sql', '.yaml', '.yml', '.toml', '.lock',
    '.mjs', '.cjs', '.config', '.rc'
  ]);
  const ext = path.extname(filePath).toLowerCase();
  return textExtensions.has(ext) || !path.extname(filePath);
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});

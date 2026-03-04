/**
 * Express API Server
 * Provides REST endpoints for Twitter scraping
 */

import express from 'express';
import { AdsPowerClient } from './adspower';
import { TwitterScraper } from './scraper';
import { Database } from './database';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 5003;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize components
const adspowerConfig = {
  server: process.env.ADSPOWER_SERVER || '95.217.224.154',
  apiPort: parseInt(process.env.ADSPOWER_API_PORT || '50325'),
  wsPort: parseInt(process.env.ADSPOWER_WS_PORT || '8080'),
  profileId: process.env.ADSPOWER_PROFILE_ID || 'your-profile-id',
  apiKey: process.env.ADSPOWER_API_KEY || 'your-api-key',
  apiKeyMode: (process.env.ADSPOWER_API_KEY_MODE || 'GET') as 'GET' | 'HEADER'
};

const adspower = new AdsPowerClient(adspowerConfig);
const scraper = new TwitterScraper(adspower, 50);
const db = new Database(process.env.DATABASE_PATH || 'data/twitter.db');

// ==================== DASHBOARD ROUTES ====================

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>X Scraper TS</title>
      <style>
        body { font-family: system-ui; max-width: 800px; margin: 50px auto; padding: 20px; background: #f5f8fa; }
        h1 { color: #1DA1F2; }
        .stat { background: #f7f9fa; padding: 20px; border-radius: 8px; margin: 10px 0; }
        .endpoint { background: #fff; padding: 10px; border: 1px solid #e1e8ed; border-radius: 4px; margin: 5px 0; }
        code { background: #f0f3f4; padding: 2px 6px; border-radius: 4px; }
        .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
        .get { background: #61affe; color: white; }
        .post { background: #49cc90; color: white; }
        
        /* Scrape Button Styles */
        .scrape-section { background: white; padding: 25px; border-radius: 12px; margin: 20px 0; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .scrape-form { display: flex; gap: 10px; margin-bottom: 15px; }
        .scrape-input { flex: 1; padding: 12px 15px; border: 2px solid #e1e8ed; border-radius: 8px; font-size: 16px; }
        .scrape-input:focus { outline: none; border-color: #1DA1F2; }
        .scrape-btn { padding: 12px 30px; background: #1DA1F2; color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: bold; cursor: pointer; transition: all 0.2s; }
        .scrape-btn:hover { background: #0c85d0; transform: translateY(-1px); }
        .scrape-btn:active { transform: translateY(0); }
        .scrape-btn:disabled { background: #ccc; cursor: not-allowed; }
        
        /* Results Area */
        .results-area { margin-top: 20px; display: none; }
        .results-area.show { display: block; }
        .result-item { background: #fff; border: 1px solid #e1e8ed; border-radius: 8px; padding: 15px; margin-bottom: 10px; }
        .result-item h4 { margin: 0 0 8px 0; color: #1DA1F2; }
        .result-item p { margin: 4px 0; font-size: 14px; color: #536471; }
        .result-item .meta { font-size: 12px; color: #8b98a5; }
        
        /* Status Messages */
        .status-msg { padding: 12px 15px; border-radius: 8px; margin-bottom: 15px; display: none; }
        .status-msg.show { display: block; }
        .status-msg.loading { background: #fff3cd; color: #856404; border: 1px solid #ffc107; }
        .status-msg.success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .status-msg.error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        
        .spinner { display: inline-block; width: 16px; height: 16px; border: 2px solid #f3f3f3; border-top: 2px solid #1DA1F2; border-radius: 50%; animation: spin 1s linear infinite; margin-right: 8px; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      </style>
    </head>
    <body>
      <h1>🐦 X Scraper TS v1.0</h1>
      <p>TypeScript + Puppeteer-core + AdsPower</p>

      <div class="scrape-section">
        <h2>🚀 Scrape Now</h2>
        <p style="color: #536471; margin-bottom: 15px;">Enter a Twitter username to scrape their latest tweets (max 50)</p>
        
        <div class="scrape-form">
          <input type="text" id="username" class="scrape-input" placeholder="@username" />
          <button id="scrapeBtn" class="scrape-btn" onclick="scrapeUser()">Scrape Now</button>
        </div>
        
        <div id="statusMsg" class="status-msg"></div>
        
        <div id="resultsArea" class="results-area">
          <h3>Results</h3>
          <div id="resultsList"></div>
        </div>
      </div>

      <div class="stat">
        <h2>📊 Statistics</h2>
        <p>Accounts: <strong id="accounts">Loading...</strong></p>
        <p>Tweets: <strong id="tweets">Loading...</strong></p>
        <p>Recent (24h): <strong id="recent">Loading...</strong></p>
      </div>

      <h2>🔌 API Endpoints</h2>

      <h3>Scraping</h3>
      <div class="endpoint">
        <span class="badge post">POST</span>
        <code>/api/scrape/profile/:username</code>
        <p>Scrape tweets from user profile</p>
      </div>
      <div class="endpoint">
        <span class="badge post">POST</span>
        <code>/api/scrape/search/:query</code>
        <p>Search Twitter</p>
      </div>
      <div class="endpoint">
        <span class="badge get">GET</span>
        <code>/api/scrape/stats</code>
        <p>Get scraping stats</p>
      </div>

      <h3>Accounts</h3>
      <div class="endpoint">
        <span class="badge get">GET</span>
        <code>/api/accounts</code>
        <p>List all accounts</p>
      </div>
      <div class="endpoint">
        <span class="badge post">POST</span>
        <code>/api/accounts</code>
        <p>Add account to monitor</p>
      </div>
      <div class="endpoint">
        <span class="badge post">POST</span>
        <code>/api/accounts/:id/scrape</code>
        <p>Scrape account tweets</p>
      </div>

      <h3>Tweets</h3>
      <div class="endpoint">
        <span class="badge get">GET</span>
        <code>/api/tweets</code>
        <p>Get collected tweets</p>
      </div>

      <h3>Stats</h3>
      <div class="endpoint">
        <span class="badge get">GET</span>
        <code>/api/stats</code>
        <p>Dashboard statistics</p>
      </div>

      <script>
        // Load stats on page load
        fetch('/api/stats')
          .then(r => r.json())
          .then(data => {
            document.getElementById('accounts').textContent = data.stats.accounts;
            document.getElementById('tweets').textContent = data.stats.tweets;
            document.getElementById('recent').textContent = data.stats.recent;
          });

        // Scrape user function
        async function scrapeUser() {
          const usernameInput = document.getElementById('username');
          const scrapeBtn = document.getElementById('scrapeBtn');
          const statusMsg = document.getElementById('statusMsg');
          const resultsArea = document.getElementById('resultsArea');
          const resultsList = document.getElementById('resultsList');
          
          let username = usernameInput.value.trim();
          
          if (!username) {
            showStatus('Please enter a username', 'error');
            return;
          }
          
          // Remove @ if present
          username = username.replace('@', '');
          
          // Show loading state
          scrapeBtn.disabled = true;
          scrapeBtn.textContent = 'Scraping...';
          showStatus('<span class="spinner"></span> Scraping @' + username + ' tweets... This may take up to 60 seconds.', 'loading');
          resultsArea.classList.remove('show');
          
          try {
            const response = await fetch('/api/scrape/profile/' + username, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ count: 20 })
            });
            
            const data = await response.json();
            
            if (data.success) {
              showStatus('✅ Successfully scraped ' + data.scraped + ' tweets! Saved ' + data.saved + ' to database.', 'success');
              
              // Show results
              if (data.tweets && data.tweets.length > 0) {
                resultsList.innerHTML = data.tweets.map(tweet => \`
                  <div class="result-item">
                    <h4>\${tweet.author}</h4>
                    <p>\${tweet.text}</p>
                    <div class="meta">
                      💬 \${tweet.replies || 0} | 🔄 \${tweet.retweets || 0} | ❤️ \${tweet.likes || 0} | 
                      📅 \${new Date(tweet.timestamp || Date.now()).toLocaleString()}
                    </div>
                  </div>
                \`).join('');
                resultsArea.classList.add('show');
              }
              
              // Refresh stats
              fetch('/api/stats')
                .then(r => r.json())
                .then(statsData => {
                  document.getElementById('accounts').textContent = statsData.stats.accounts;
                  document.getElementById('tweets').textContent = statsData.stats.tweets;
                  document.getElementById('recent').textContent = statsData.stats.recent;
                });
            } else {
              showStatus('❌ ' + (data.error || 'Failed to scrape tweets. Make sure AdsPower is configured.'), 'error');
            }
          } catch (error) {
            showStatus('❌ Network error: ' + error.message, 'error');
          } finally {
            scrapeBtn.disabled = false;
            scrapeBtn.textContent = 'Scrape Now';
          }
        }
        
        function showStatus(message, type) {
          const statusMsg = document.getElementById('statusMsg');
          statusMsg.innerHTML = message;
          statusMsg.className = 'status-msg show ' + type;
        }
        
        // Allow Enter key to trigger scrape
        document.getElementById('username').addEventListener('keypress', function(e) {
          if (e.key === 'Enter') {
            scrapeUser();
          }
        });
      </script>
    </body>
    </html>
  `);
});

// ==================== API ROUTES ====================

// Statistics
app.get('/api/stats', (req, res) => {
  try {
    const stats = db.getStats();
    res.json({ success: true, stats });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Accounts
app.get('/api/accounts', (req, res) => {
  try {
    const accounts = db.getAccounts();
    res.json({ success: true, accounts });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/accounts', (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ success: false, error: 'Username required' });
    }

    const cleanUsername = username.replace('@', '').trim();
    const account = db.addAccount(cleanUsername);

    res.json({ success: true, account_id: account.id });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/accounts/:accountId', (req, res) => {
  try {
    const { accountId } = req.params;
    const success = db.deleteAccount(accountId);
    res.json({ success });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/accounts/:accountId', (req, res) => {
  try {
    const { accountId } = req.params;
    const success = db.updateAccount(accountId, req.body);
    res.json({ success });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/accounts/:accountId/scrape', async (req, res) => {
  try {
    const { accountId } = req.params;
    const accounts = db.getAccounts();
    const account = accounts.find(a => a.id === accountId);

    if (!account) {
      return res.status(404).json({ success: false, error: 'Account not found' });
    }

    const count = req.body?.count || 20;
    const tweets = await scraper.scrapeProfile(account.username, Math.min(count, 50));

    // Save tweets
    let saved = 0;
    for (const tweet of tweets) {
      if (db.saveTweet(tweet, accountId)) {
        saved++;
      }
    }

    res.json({
      success: true,
      username: account.username,
      scraped: tweets.length,
      saved,
      tweets: tweets.slice(0, 10)
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Tweets
app.get('/api/tweets', (req, res) => {
  try {
    const accountId = req.query.accountId as string;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

    const tweets = db.getTweets({ accountId, limit });
    res.json({ success: true, tweets });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Scraping endpoints
app.post('/api/scrape/profile/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const count = req.body?.count || 20;

    console.log(`\n📥 Scraping request for @${username} (${count} tweets)`);

    const tweets = await scraper.scrapeProfile(username, Math.min(count, 50));

    if (!tweets || tweets.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No tweets scraped'
      });
    }

    // Save to database (create account if needed)
    let saved = 0;
    let account: any;

    const accounts = db.getAccounts();
    account = accounts.find(a => a.username === username);

    if (!account) {
      account = db.addAccount(username);
    }

    for (const tweet of tweets) {
      if (db.saveTweet(tweet, account.id)) {
        saved++;
      }
    }

    const stats = scraper.getStats();

    res.json({
      success: true,
      username,
      scraped: tweets.length,
      saved,
      tweets: tweets.slice(0, 10),
      stats
    });
  } catch (error: any) {
    console.error('❌ Error scraping profile:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/scrape/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const count = req.body?.count || 20;

    console.log(`\n🔍 Search request for: ${query}`);

    const tweets = await scraper.searchTwitter(query, Math.min(count, 50));

    if (!tweets || tweets.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No tweets found'
      });
    }

    // Save to database (without specific account for search results)
    let saved = 0;
    for (const tweet of tweets) {
      // Try to find matching account, otherwise create
      let accountId: string | null = null;
      const accounts = db.getAccounts();
      const account = accounts.find(a => a.username === tweet.author);

      if (account) {
        accountId = account.id;
      } else {
        const newAccount = db.addAccount(tweet.author);
        accountId = newAccount.id;
      }

      if (accountId && db.saveTweet(tweet, accountId)) {
        saved++;
      }
    }

    const stats = scraper.getStats();

    res.json({
      success: true,
      query,
      scraped: tweets.length,
      saved,
      tweets: tweets.slice(0, 10),
      stats
    });
  } catch (error: any) {
    console.error('❌ Error searching:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/scrape/stats', (req, res) => {
  try {
    const stats = scraper.getStats();
    res.json({ success: true, stats });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Batch scrape all accounts
app.post('/api/accounts/batch-scrape', async (req, res) => {
  try {
    const accounts = db.getAccounts();
    const results: any[] = [];

    for (const account of accounts) {
      try {
        const tweets = await scraper.scrapeProfile(account.username, 20);

        let saved = 0;
        for (const tweet of tweets) {
          if (db.saveTweet(tweet, account.id)) {
            saved++;
          }
        }

        results.push({
          username: account.username,
          success: true,
          scraped: tweets.length,
          saved
        });
      } catch (error: any) {
        results.push({
          username: account.username,
          success: false,
          error: error.message
        });
      }
    }

    res.json({ success: true, results });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Cron endpoint for scheduled scraping
app.post('/api/scrape/publisherinabox', async (req, res) => {
  try {
    const username = 'publisherinabox';
    const count = 50;

    console.log(`[CRON] ${new Date().toISOString()} - Starting scheduled scrape for @${username}`);

    const tweets = await scraper.scrapeProfile(username, count);

    if (!tweets || tweets.length === 0) {
      console.log(`[CRON] ${new Date().toISOString()} - No tweets scraped for @${username}`);
      return res.json({
        success: false,
        username,
        scraped: 0,
        message: 'No tweets scraped',
        timestamp: new Date().toISOString()
      });
    }

    // Save to database
    let saved = 0;
    let account: any;

    const accounts = db.getAccounts();
    account = accounts.find(a => a.username === username);

    if (!account) {
      account = db.addAccount(username);
    }

    for (const tweet of tweets) {
      if (db.saveTweet(tweet, account.id)) {
        saved++;
      }
    }

    console.log(`[CRON] ${new Date().toISOString()} - Successfully scraped ${tweets.length} tweets, saved ${saved}`);

    res.json({
      success: true,
      username,
      scraped: tweets.length,
      saved,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error(`[CRON] Error scraping publisherinabox:`, error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ==================== START SERVER ====================

app.listen(PORT, '0.0.0.0', () => {
  console.log('🐦 X Scraper TS v1.0');
  console.log('📍 Dashboard: http://0.0.0.0:' + PORT);
  console.log('🔧 Stack: TypeScript + Puppeteer-core + AdsPower');
  console.log('⚠️  Make sure AdsPower credentials are configured!');
  console.log('');
  console.log('Required environment variables:');
  console.log('  ADSPOWER_SERVER (default: 95.217.224.154)');
  console.log('  ADSPOWER_API_PORT (default: 50325)');
  console.log('  ADSPOWER_WS_PORT (default: 8080)');
  console.log('  ADSPOWER_PROFILE_ID (required)');
  console.log('  ADSPOWER_API_KEY (required)');
  console.log('  ADSPOWER_API_KEY_MODE (default: GET)');
});

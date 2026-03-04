# X Scraper TypeScript Edition

Twitter/X scraper using TypeScript + Puppeteer-core + AdsPower browser.

## Tech Stack

- **TypeScript** - Type-safe JavaScript
- **Express.js** - REST API
- **Puppeteer-core** - Browser automation (NO bundled browser)
- **AdsPower** - External browser for anti-detection
- **SQLite** - Data storage
- **Docker** - Railway deployment

## Features

- ✅ Scrape user profiles
- ✅ Search Twitter/X
- ✅ Anti-detection via AdsPower
- ✅ REST API endpoints
- ✅ SQLite database
- ✅ Railway deployment ready

## Environment Variables

Create a `.env` file with:

```bash
ADSPOWER_SERVER=95.217.224.154
ADSPOWER_API_PORT=50325
ADSPOWER_WS_PORT=8080
ADSPOWER_PROFILE_ID=your-profile-id
ADSPOWER_API_KEY=your-api-key
ADSPOWER_API_KEY_MODE=GET
DATABASE_PATH=data/twitter.db
PORT=5003
```

## Installation

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Start development server
npm run dev

# Start production server
npm start
```

## API Endpoints

### Scraping

- `POST /api/scrape/profile/:username` - Scrape user profile
- `POST /api/scrape/search/:query` - Search Twitter
- `GET /api/scrape/stats` - Scraping statistics

### Accounts

- `GET /api/accounts` - List all accounts
- `POST /api/accounts` - Add account to monitor
- `DELETE /api/accounts/:id` - Delete account
- `PUT /api/accounts/:id` - Update account
- `POST /api/accounts/:id/scrape` - Scrape account tweets

### Tweets

- `GET /api/tweets` - Get collected tweets

### Stats

- `GET /api/stats` - Dashboard statistics
- `GET /health` - Health check

## Example Usage

```bash
# Scrape a profile
curl -X POST http://localhost:5003/api/scrape/profile/OpenAI \\
  -H "Content-Type: application/json" \\
  -d '{"count": 20}'

# Search Twitter
curl -X POST http://localhost:5003/api/scrape/search/typescript \\
  -H "Content-Type: application/json" \\
  -d '{"count": 20}'

# Get stats
curl http://localhost:5003/api/stats
```

## Railway Deployment

1. Push to GitHub
2. Create Railway project
3. Connect GitHub repo
4. Add environment variables
5. Deploy!

## Key Changes from Python Version

- ✅ Migrated from Flask to Express.js
- ✅ Replaced Selenium with Puppeteer-core
- ✅ Integrated AdsPower external browser
- ✅ Type-safe with TypeScript
- ✅ Better error handling
- ✅ Improved resource cleanup
- ✅ Docker deployment ready

## Important Notes

- **No bundled browsers** - Uses AdsPower external browser only
- **Always closes browser** - Prevents memory leaks
- **Closes all pages** - Cleanup after each scrape
- **50 tweet limit** - Per scraping request
- **Daily limit** - Configurable (default 50)

## License

MIT

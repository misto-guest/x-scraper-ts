# Railway Cron Job Setup Guide

This guide explains how to set up a daily cron job for the X Scraper.

## Cron Job Details

- **Endpoint**: `POST /api/scrape/publisherinabox`
- **Purpose**: Scrape 50 tweets from @publisherinabox daily
- **Recommended Time**: 09:00 UTC (10:00 AM CET / 04:00 AM EST)
- **Duration**: ~60 seconds (scraping takes time)

## Setup Instructions

### Method 1: Using Railway Dashboard

1. **Go to Railway Dashboard**
   - Visit https://railway.app
   - Select your `x-scraper-ts` project

2. **Create Cron Job**
   - Click "New Service" → "Cron Job"
   - Name it: `daily-publisherinabox-scrape`
   - Schedule: `0 9 * * *` (daily at 09:00 UTC)
   - Command: Use the HTTP trigger method

3. **Configure HTTP Trigger**
   - URL: `https://x-scraper-ts-production.up.railway.app/api/scrape/publisherinabox`
   - Method: `POST`
   - Headers: `Content-Type: application/json`
   - Body: `{}` (empty JSON)

4. **Add Environment Variables to Main Service**
   Make sure these are set in your main `x-scraper-ts` service:
   ```
   ADSPOWER_SERVER=95.217.224.154
   ADSPOWER_API_PORT=50325
   ADSPOWER_WS_PORT=8080
   ADSPOWER_PROFILE_ID=your-actual-profile-id
   ADSPOWER_API_KEY=your-actual-api-key
   ADSPOWER_API_KEY_MODE=GET
   DATABASE_PATH=data/twitter.db
   ```

5. **Verify Configuration**
   - Check cron job logs in Railway dashboard
   - Look for `[CRON]` prefixed log messages
   - Confirm tweets appear in database

### Method 2: Using Railway CLI

```bash
# Install Railway CLI (if not installed)
npm install -g @railway/cli

# Login
railway login

# Add cron job
railway add cron --schedule "0 9 * * *" \
  --name "daily-publisherinabox-scrape" \
  --command "curl -X POST https://x-scraper-ts-production.up.railway.app/api/scrape/publisherinabox -H 'Content-Type: application/json' -d '{}'"
```

## Cron Schedule Examples

| Schedule | Expression | Description |
|----------|------------|-------------|
| Daily at 9 AM UTC | `0 9 * * *` | Once per day |
| Twice daily | `0 9,21 * * *` | 9 AM and 9 PM UTC |
| Every 6 hours | `0 */6 * * *` | Every 6 hours |
| Weekdays only | `0 9 * * 1-5` | Mon-Fri at 9 AM UTC |

## Testing the Cron Endpoint

Before setting up the cron job, test the endpoint:

```bash
curl -X POST https://x-scraper-ts-production.up.railway.app/api/scrape/publisherinabox \
  -H "Content-Type: application/json" \
  -d '{}'
```

Expected response:
```json
{
  "success": true,
  "username": "publisherinabox",
  "scraped": 50,
  "saved": 50,
  "timestamp": "2026-03-04T09:00:00.000Z"
}
```

## Monitoring Cron Runs

1. **Check Logs in Railway Dashboard**
   - Go to your cron job service
   - View logs for each execution
   - Look for status codes and response times

2. **Verify Data in Database**
   ```bash
   # SSH into Railway service
   railway shell

   # Check database
   sqlite3 data/twitter.db
   SELECT * FROM tweets ORDER BY created_at DESC LIMIT 10;
   ```

3. **Check Stats Endpoint**
   ```bash
   curl https://x-scraper-ts-production.up.railway.app/api/stats
   ```

## Troubleshooting

### Issue: "No tweets scraped"

**Cause**: AdsPower credentials not configured or incorrect

**Solution**:
1. Verify ADSPOWER_PROFILE_ID and ADSPOWER_API_KEY are set in Railway environment variables
2. Check AdsPower browser is running and accessible
3. Test AdsPower connection manually

### Issue: Cron job fails with timeout

**Cause**: Scraping takes longer than Railway timeout

**Solution**:
1. Reduce tweet count in cron endpoint (change `count: 50` to `count: 20`)
2. Or increase Railway timeout settings

### Issue: Cron runs but no data saved

**Cause**: Database path issue or permissions

**Solution**:
1. Ensure DATABASE_PATH is set correctly
2. Check Railway service has write permissions
3. Verify database directory exists

## Current Deployment URLs

- **Production**: https://x-scraper-ts-production.up.railway.app
- **Dashboard**: https://x-scraper-ts-production.up.railway.app/
- **Scrape Now**: Use the "Scrape Now" button on dashboard
- **API Stats**: https://x-scraper-ts-production.up.railway.app/api/stats
- **Health Check**: https://x-scraper-ts-production.up.railway.app/health

## Next Steps

1. ✅ Set up AdsPower environment variables in Railway
2. ✅ Test scrape endpoint manually
3. ✅ Create cron job via Railway dashboard
4. ✅ Monitor first few cron runs
5. ✅ Adjust schedule if needed

## Support

- GitHub: https://github.com/misto-guest/x-scraper-ts
- Railway Docs: https://docs.railway.app/reference/cron-jobs

/**
 * Twitter/X Scraper using Puppeteer-core + AdsPower
 */

import puppeteer from 'puppeteer-core';
import { AdsPowerClient } from './adspower';

export interface Tweet {
  id: string;
  text: string;
  author: string;
  author_name: string;
  date: string;
  url: string;
  likes: number;
  retweets: number;
  replies: number;
}

export interface ScrapingStats {
  today: number;
  limit: number;
  this_week: number;
  total: number;
}

export class TwitterScraper {
  private adspower: AdsPowerClient;
  private maxDaily: number;

  constructor(adspower: AdsPowerClient, maxDaily: number = 50) {
    this.adspower = adspower;
    this.maxDaily = maxDaily;
  }

  /**
   * Scrape tweets from user profile
   */
  async scrapeProfile(username: string, count: number = 20): Promise<Tweet[]> {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔄 Scraping @${username}`);
    console.log(`${'='.repeat(60)}\n`);

    // Enforce max 50 per request
    count = Math.min(count, 50);

    let browserInstance;

    try {
      // Start AdsPower browser
      browserInstance = await this.adspower.startBrowser();
      const browser = browserInstance.browser;

      // Cleanup existing pages
      await this.adspower.cleanupPages(browser);

      // Create new page
      const page = await browser.newPage();

      // Set user agent
      await page.setUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      // Navigate to profile
      const url = `https://twitter.com/${username}`;
      console.log(`🌐 Opening ${url}`);

      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

      // Wait for tweets to load
      await this.waitForTweets(page);

      // Calculate scrolls needed
      const tweetsPerScroll = 10;
      const scrollsNeeded = Math.ceil(count / tweetsPerScroll);

      console.log(`📊 Will scroll ${scrollsNeeded} times to get ~${count} tweets\n`);

      // Scroll to load tweets
      for (let i = 0; i < scrollsNeeded; i++) {
        console.log(`--- Scroll ${i + 1}/${scrollsNeeded} ---`);

        await this.scrollLikeHuman(page);
        await this.randomDelay();
      }

      // Extract tweets
      console.log(`\n📤 Extracting tweets...`);
      const tweets = await this.extractTweets(page);

      // Limit to requested count
      const limitedTweets = tweets.slice(0, count);

      console.log(`\n✅ Successfully scraped ${limitedTweets.length} tweets`);

      return limitedTweets;
    } catch (error) {
      console.error(`❌ Error scraping @${username}:`, error);
      return [];
    } finally {
      // Always close browser
      if (browserInstance) {
        await browserInstance.close();
      }
    }
  }

  /**
   * Search Twitter for keyword/hashtag
   */
  async searchTwitter(query: string, count: number = 20): Promise<Tweet[]> {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔍 Searching Twitter for: ${query}`);
    console.log(`${'='.repeat(60)}\n`);

    // Enforce max 50 per request
    count = Math.min(count, 50);

    let browserInstance;

    try {
      // Start AdsPower browser
      browserInstance = await this.adspower.startBrowser();
      const browser = browserInstance.browser;

      // Cleanup existing pages
      await this.adspower.cleanupPages(browser);

      // Create new page
      const page = await browser.newPage();

      // Set user agent
      await page.setUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      // Navigate to search
      const url = `https://twitter.com/search?q=${encodeURIComponent(query)}`;
      console.log(`🌐 Opening ${url}`);

      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

      // Wait for tweets to load
      await this.waitForTweets(page);

      // Scroll for results
      const scrollsNeeded = Math.ceil(count / 10);

      for (let i = 0; i < scrollsNeeded; i++) {
        console.log(`--- Scroll ${i + 1}/${scrollsNeeded} ---`);

        await this.scrollLikeHuman(page);
        await this.randomDelay();
      }

      // Extract tweets
      const tweets = await this.extractTweets(page);
      const limitedTweets = tweets.slice(0, count);

      console.log(`\n✅ Found ${limitedTweets.length} tweets for '${query}'`);

      return limitedTweets;
    } catch (error) {
      console.error(`❌ Error searching '${query}':`, error);
      return [];
    } finally {
      // Always close browser
      if (browserInstance) {
        await browserInstance.close();
      }
    }
  }

  /**
   * Wait for tweets to appear on page
   */
  private async waitForTweets(page: any): Promise<void> {
    try {
      await page.waitForSelector('article', { timeout: 15000 });
    } catch (error) {
      console.log('⚠️ Timeout waiting for tweets, continuing...');
    }
  }

  /**
   * Scroll down like a human
   */
  private async scrollLikeHuman(page: any): Promise<void> {
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
  }

  /**
   * Random delay between actions
   */
  private async randomDelay(): Promise<void> {
    const delay = Math.random() * 2000 + 1500; // 1.5-3.5 seconds
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Extract tweets from current page
   */
  private async extractTweets(page: any): Promise<Tweet[]> {
    try {
      const tweets = await page.evaluate(() => {
        const results: any[] = [];

        // Find all tweet articles
        const articles = document.querySelectorAll('article');

        articles.forEach(article => {
          try {
            const tweet: any = {};

            // Tweet text
            const textElem = article.querySelector('[data-testid="tweetText"]');
            tweet.text = textElem?.textContent || '';

            // Author
            const usernameElem = article.querySelector('[data-testid="User-Name"] a');
            tweet.author = usernameElem?.textContent?.replace('@', '') || 'unknown';
            tweet.author_name = tweet.author; // Fallback

            // Tweet ID and URL
            const linkElem = article.querySelector('a[href*="/status/"]');
            const href = linkElem?.getAttribute('href');
            tweet.url = href || '';
            tweet.id = href ? href.split('/status/')[1]?.split('?')[0] : `unknown_${Date.now()}`;

            // Date
            const timeElem = article.querySelector('time');
            tweet.date = timeElem?.getAttribute('datetime') || new Date().toISOString();

            // Metrics (default to 0 if not found)
            tweet.likes = 0;
            tweet.retweets = 0;
            tweet.replies = 0;

            // Only add if has text
            if (tweet.text) {
              results.push(tweet);
            }
          } catch (e) {
            // Skip problematic tweets
          }
        });

        return results;
      });

      console.log(`✅ Extracted ${tweets.length} tweets from page`);
      return tweets;
    } catch (error) {
      console.error('⚠️ Error extracting tweets:', error);
      return [];
    }
  }

  /**
   * Get scraping statistics
   */
  getStats(): ScrapingStats {
    // Return mock stats for now
    return {
      today: 0,
      limit: this.maxDaily,
      this_week: 0,
      total: 0
    };
  }
}

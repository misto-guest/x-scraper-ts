/**
 * AdsPower Browser Client
 * Connects to remote AdsPower server for browser automation
 */

import puppeteer from 'puppeteer-core';
import fetch from 'node-fetch';

export interface AdsPowerConfig {
  server: string;
  apiPort: number;
  wsPort: number;
  profileId: string;
  apiKey: string;
  apiKeyMode: 'GET' | 'HEADER';
}

export interface BrowserInstance {
  browser: any;
  close: () => Promise<void>;
}

export class AdsPowerClient {
  private config: AdsPowerConfig;
  private baseUrl: string;

  constructor(config: AdsPowerConfig) {
    this.config = config;
    this.baseUrl = `http://${config.server}:${config.apiPort}/api/v2/`;
  }

  /**
   * Start AdsPower browser profile and connect via Puppeteer
   */
  async startBrowser(): Promise<BrowserInstance> {
    try {
      console.log('🚀 Starting AdsPower browser...');

      // Start the browser profile
      const startResponse = await fetch(`${this.baseUrl}browser-profile/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile_id: this.config.profileId,
          launch_args: [
            '--remote-allow-origins=*',
            '--disable-web-security',
            '--disable-site-isolation-trials'
          ]
        })
      });

      const data = (await startResponse.json()) as any;

      if (data.code !== 0) {
        throw new Error(`Failed to start browser: ${data.msg}`);
      }

      const wsUrl = data.data.ws.puppeteer;
      console.log('📡 Original CDP URL:', wsUrl);

      // Extract port and GUID for remote connection
      const portMatch = wsUrl.match(/:(\d+)\//);
      const guidMatch = wsUrl.match(/\/browser\/([0-9a-f\-]+)/);

      if (!portMatch || !guidMatch) {
        throw new Error('Invalid CDP URL format');
      }

      const port = portMatch[1];
      const guid = guidMatch[1];

      // Reconstruct URL for remote AdsPower server
      let wsUrlModified = `ws://${this.config.server}:${this.config.wsPort}/port/${port}/devtools/browser/${guid}`;
      console.log('🔗 Modified URL for remote connection:', wsUrlModified);

      // Prepare headers
      const headers: Record<string, string> = { Host: 'localhost' };

      if (this.config.apiKeyMode === 'HEADER') {
        headers['X-Api-Key'] = this.config.apiKey;
      } else {
        wsUrlModified += `?api_key=${this.config.apiKey}`;
      }

      // Connect Puppeteer to AdsPower browser
      const browser = await puppeteer.connect({
        browserWSEndpoint: wsUrlModified,
        defaultViewport: null,
        headers
      });

      console.log('✅ Successfully connected to AdsPower!');

      // Return wrapper with cleanup logic
      return {
        browser,
        close: async () => {
          await this.stopBrowser(browser);
        }
      };
    } catch (error) {
      console.error('❌ Error starting AdsPower browser:', error);
      throw error;
    }
  }

  /**
   * Stop browser profile
   */
  async stopBrowser(browser: any): Promise<void> {
    try {
      // Disconnect from browser (without closing profile)
      await browser.disconnect();

      // Call AdsPower API to stop profile
      await fetch(`${this.baseUrl}browser-profile/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile_id: this.config.profileId,
          force_close: true
        })
      });

      console.log('✅ Browser stopped');
    } catch (error) {
      console.error('⚠️ Error stopping browser:', error);
    }
  }

  /**
   * Cleanup: close all pages to prevent memory leaks
   */
  async cleanupPages(browser: any): Promise<void> {
    try {
      const pages = await browser.pages();
      console.log(`🧹 Closing ${pages.length} existing pages...`);

      for (const page of pages) {
        try {
          await page.close();
        } catch (e) {
          // Page might already be closed
        }
      }

      console.log('✅ Pages cleaned up');
    } catch (error) {
      console.error('⚠️ Error cleaning up pages:', error);
    }
  }
}

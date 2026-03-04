/**
 * SQLite Database Layer using sql.js
 * Manages accounts, tweets, and actionable items
 */

import initSqlJs, { Database as SQLDatabase } from 'sql.js';
import * as fs from 'fs';
import * as path from 'path';

export interface Account {
  id: string;
  username: string;
  display_name?: string;
  description?: string;
  followers_count?: number;
  created_at: string;
  active: number;
}

export interface Tweet {
  id: string;
  account_id: string;
  text: string;
  created_at: string;
  retweet_count: number;
  like_count: number;
  reply_count: number;
  url: string;
  collected_at: string;
}

export interface ActionableItem {
  id: string;
  tweet_id: string;
  action_text: string;
  category: string;
  priority: string;
  status: string;
  sent_to_project?: string;
  created_at: string;
  updated_at: string;
}

export class Database {
  private db: SQLDatabase | null = null;
  private dbPath: string;

  constructor(dbPath: string = 'data/twitter.db') {
    this.dbPath = dbPath;
    this.init();
  }

  /**
   * Initialize database
   */
  private async init(): Promise<void> {
    // Ensure directory exists
    const dir = path.dirname(this.dbPath);
    fs.mkdirSync(dir, { recursive: true });

    // Load or create database
    let dbBuffer: Uint8Array | null = null;

    if (fs.existsSync(this.dbPath)) {
      dbBuffer = fs.readFileSync(this.dbPath);
    }

    const SQL = await initSqlJs();
    this.db = new SQL.Database(dbBuffer);

    // Enable foreign keys
    this.db.run('PRAGMA foreign_keys = ON');

    // Initialize tables
    this.initTables();

    // Save to disk
    this.save();

    console.log('✅ Database initialized');
  }

  /**
   * Initialize database tables
   */
  private initTables(): void {
    if (!this.db) return;

    // Accounts table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        display_name TEXT,
        description TEXT,
        followers_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        active BOOLEAN DEFAULT 1
      )
    `);

    // Tweets table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS tweets (
        id TEXT PRIMARY KEY,
        account_id TEXT,
        text TEXT NOT NULL,
        created_at TEXT,
        retweet_count INTEGER DEFAULT 0,
        like_count INTEGER DEFAULT 0,
        reply_count INTEGER DEFAULT 0,
        url TEXT,
        collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (account_id) REFERENCES accounts(id)
      )
    `);

    // Actionable items table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS actionable_items (
        id TEXT PRIMARY KEY,
        tweet_id TEXT NOT NULL,
        action_text TEXT NOT NULL,
        category TEXT NOT NULL,
        priority TEXT DEFAULT 'medium',
        status TEXT DEFAULT 'pending',
        sent_to_project TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tweet_id) REFERENCES tweets(id)
      )
    `);
  }

  /**
   * Save database to disk
   */
  private save(): void {
    if (!this.db) return;
    const data = this.db.export();
    fs.writeFileSync(this.dbPath, data);
  }

  /**
   * Get all active accounts
   */
  getAccounts(): Account[] {
    if (!this.db) return [];

    const stmt = this.db.prepare('SELECT * FROM accounts WHERE active = 1 ORDER BY username');
    stmt.bind([]);
    const results: Account[] = [];

    while (stmt.step()) {
      const row = stmt.getAsObject() as any;
      results.push(row as Account);
    }

    stmt.free();
    return results;
  }

  /**
   * Add a new account
   */
  addAccount(username: string): Account {
    if (!this.db) throw new Error('Database not initialized');

    const accountId = `${username}_${Date.now()}`;

    this.db.run(`
      INSERT INTO accounts (id, username, display_name, active)
      VALUES (?, ?, ?, 1)
    `, [accountId, username, username]);

    this.save();

    return {
      id: accountId,
      username,
      display_name: username,
      active: 1,
      created_at: new Date().toISOString()
    };
  }

  /**
   * Delete an account (soft delete)
   */
  deleteAccount(accountId: string): boolean {
    if (!this.db) return false;

    this.db.run('UPDATE accounts SET active = 0 WHERE id = ?', [accountId]);
    this.save();

    return true;
  }

  /**
   * Update account details
   */
  updateAccount(accountId: string, updates: Partial<Account>): boolean {
    if (!this.db) return false;

    const fields: string[] = [];
    const params: any[] = [];

    if (updates.display_name !== undefined) {
      fields.push('display_name = ?');
      params.push(updates.display_name);
    }
    if (updates.description !== undefined) {
      fields.push('description = ?');
      params.push(updates.description);
    }
    if (updates.followers_count !== undefined) {
      fields.push('followers_count = ?');
      params.push(updates.followers_count);
    }
    if (updates.username !== undefined) {
      fields.push('username = ?');
      params.push(updates.username);
    }
    if (updates.active !== undefined) {
      fields.push('active = ?');
      params.push(updates.active ? 1 : 0);
    }

    if (fields.length === 0) return false;

    params.push(accountId);
    this.db.run(`UPDATE accounts SET ${fields.join(', ')} WHERE id = ?`, params);
    this.save();

    return true;
  }

  /**
   * Save tweet to database
   */
  saveTweet(tweet: any, accountId: string): boolean {
    if (!this.db) return false;

    try {
      // Check if tweet already exists
      const checkStmt = this.db.prepare('SELECT id FROM tweets WHERE id = ?');
      checkStmt.bind([tweet.id]);
      const exists = checkStmt.step();
      checkStmt.free();

      if (exists) return false; // Duplicate

      const stmt = this.db.prepare(`
        INSERT INTO tweets (id, account_id, text, created_at, retweet_count, like_count, reply_count, url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run([
        tweet.id,
        accountId,
        tweet.text,
        tweet.date,
        tweet.retweets || 0,
        tweet.likes || 0,
        tweet.replies || 0,
        tweet.url || ''
      ]);

      stmt.free();
      this.save();

      return true;
    } catch (error) {
      console.error('❌ Error saving tweet:', error);
      return false;
    }
  }

  /**
   * Get tweets with optional filters
   */
  getTweets(options: { accountId?: string; limit?: number } = {}): any[] {
    if (!this.db) return [];

    let query = `
      SELECT t.*, a.username
      FROM tweets t
      JOIN accounts a ON t.account_id = a.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (options.accountId) {
      query += ' AND t.account_id = ?';
      params.push(options.accountId);
    }

    query += ' ORDER BY t.collected_at DESC LIMIT ?';
    params.push(options.limit || 50);

    const stmt = this.db.prepare(query);
    stmt.bind(params);
    const results: any[] = [];

    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }

    stmt.free();
    return results;
  }

  /**
   * Get actionable items
   */
  getActionableItems(options: { category?: string; status?: string; limit?: number } = {}): any[] {
    if (!this.db) return [];

    let query = `
      SELECT a.*, t.text, t.url, t.created_at as tweet_date, acc.username
      FROM actionable_items a
      JOIN tweets t ON a.tweet_id = t.id
      JOIN accounts acc ON t.account_id = acc.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (options.category) {
      query += ' AND a.category = ?';
      params.push(options.category);
    }

    if (options.status) {
      query += ' AND a.status = ?';
      params.push(options.status);
    }

    query += ' ORDER BY a.created_at DESC LIMIT ?';
    params.push(options.limit || 50);

    const stmt = this.db.prepare(query);
    stmt.bind(params);
    const results: any[] = [];

    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }

    stmt.free();
    return results;
  }

  /**
   * Save actionable item
   */
  saveActionableItem(item: Omit<ActionableItem, 'created_at' | 'updated_at'>): boolean {
    if (!this.db) return false;

    try {
      const stmt = this.db.prepare(`
        INSERT INTO actionable_items (id, tweet_id, action_text, category, priority, status, sent_to_project)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run([
        item.id,
        item.tweet_id,
        item.action_text,
        item.category,
        item.priority,
        item.status,
        item.sent_to_project || null
      ]);

      stmt.free();
      this.save();

      return true;
    } catch (error) {
      console.error('❌ Error saving actionable item:', error);
      return false;
    }
  }

  /**
   * Update actionable item
   */
  updateActionableItem(itemId: string, updates: Partial<ActionableItem>): boolean {
    if (!this.db) return false;

    const fields: string[] = [];
    const params: any[] = [];

    if (updates.status !== undefined) {
      fields.push('status = ?');
      params.push(updates.status);
    }
    if (updates.sent_to_project !== undefined) {
      fields.push('sent_to_project = ?');
      params.push(updates.sent_to_project);
    }

    if (fields.length === 0) return false;

    fields.push('updated_at = CURRENT_TIMESTAMP');
    params.push(itemId);

    this.db.run(`UPDATE actionable_items SET ${fields.join(', ')} WHERE id = ?`, params);
    this.save();

    return true;
  }

  /**
   * Get dashboard statistics
   */
  getStats(): { accounts: number; tweets: number; recent: number } {
    if (!this.db) return { accounts: 0, tweets: 0, recent: 0 };

    const accountsStmt = this.db.prepare('SELECT COUNT(*) as count FROM accounts WHERE active = 1');
    accountsStmt.bind([]);
    accountsStmt.step();
    const accountsCount = (accountsStmt.getAsObject() as any).count;
    accountsStmt.free();

    const tweetsStmt = this.db.prepare('SELECT COUNT(*) as count FROM tweets');
    tweetsStmt.bind([]);
    tweetsStmt.step();
    const tweetsCount = (tweetsStmt.getAsObject() as any).count;
    tweetsStmt.free();

    // Recent tweets (24h)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const recentStmt = this.db.prepare('SELECT COUNT(*) as count FROM tweets WHERE collected_at >= ?');
    recentStmt.bind([yesterday]);
    recentStmt.step();
    const recentCount = (recentStmt.getAsObject() as any).count;
    recentStmt.free();

    return {
      accounts: accountsCount as number,
      tweets: tweetsCount as number,
      recent: recentCount as number
    };
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.save();
      this.db.close();
      this.db = null;
    }
  }
}

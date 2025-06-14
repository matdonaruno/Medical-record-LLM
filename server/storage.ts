import { User, Message, InsertUser, InsertMessage, users, messages, chats, Chat, InsertChat } from "@shared/schema";
import session from "express-session";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

// モデル設定用のインターフェース
export interface ModelSettings {
  id: number;
  model_name: string;
  is_default: boolean;
  created_at: Date;
}

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getMessagesByUser(userId: number): Promise<Message[]>;
  getMessagesByChat(chatId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  getChatsByUser(userId: number): Promise<Chat[]>;
  getChat(id: number): Promise<Chat | undefined>;
  createChat(chat: InsertChat): Promise<Chat>;
  updateChatTitle(id: number, title: string): Promise<void>;
  deleteChat(id: number): Promise<void>;
  getModelSettings(): Promise<ModelSettings[]>;
  getDefaultModel(): Promise<string>;
  setDefaultModel(modelName: string): Promise<void>;
  addModel(modelName: string): Promise<ModelSettings>;
  deleteModel(modelId: number): Promise<void>;
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
      tableName: 'user_sessions' // Rename session table to avoid conflicts
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getMessagesByUser(userId: number): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.userId, userId))
      .orderBy(messages.timestamp);
  }

  async getMessagesByChat(chatId: number): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.chatId, chatId))
      .orderBy(messages.timestamp);
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values(insertMessage)
      .returning();
    return message;
  }

  async getChatsByUser(userId: number): Promise<Chat[]> {
    return await db
      .select()
      .from(chats)
      .where(eq(chats.userId, userId))
      .orderBy(chats.createdAt);
  }

  async getChat(id: number): Promise<Chat | undefined> {
    const [chat] = await db.select().from(chats).where(eq(chats.id, id));
    return chat;
  }

  async createChat(insertChat: InsertChat): Promise<Chat> {
    const [chat] = await db.insert(chats).values(insertChat).returning();
    return chat;
  }

  async updateChatTitle(id: number, title: string): Promise<void> {
    await db
      .update(chats)
      .set({ title })
      .where(eq(chats.id, id));
  }

  async deleteChat(id: number): Promise<void> {
    // 関連するメッセージを削除
    await db.delete(messages).where(eq(messages.chatId, id));
    // チャットを削除
    await db.delete(chats).where(eq(chats.id, id));
  }

  async getModelSettings(): Promise<ModelSettings[]> {
    const result = await pool.query('SELECT * FROM model_settings ORDER BY created_at DESC');
    return result.rows;
  }

  async getDefaultModel(): Promise<string> {
    const result = await pool.query('SELECT model_name FROM model_settings WHERE is_default = true LIMIT 1');
    if (result.rows.length === 0) {
      return 'llama3:latest'; // デフォルトのフォールバック
    }
    return result.rows[0].model_name;
  }

  async setDefaultModel(modelName: string): Promise<void> {
    // トランザクションを開始
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // 既存のデフォルトをリセット
      await client.query('UPDATE model_settings SET is_default = false');
      
      // 指定されたモデルをデフォルトに設定
      const existingModel = await client.query('SELECT * FROM model_settings WHERE model_name = $1', [modelName]);
      
      if (existingModel.rows.length > 0) {
        await client.query('UPDATE model_settings SET is_default = true WHERE model_name = $1', [modelName]);
      } else {
        await client.query(
          'INSERT INTO model_settings (model_name, is_default) VALUES ($1, true)',
          [modelName]
        );
      }
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async addModel(modelName: string): Promise<ModelSettings> {
    const result = await pool.query(
      'INSERT INTO model_settings (model_name, is_default) VALUES ($1, false) RETURNING *',
      [modelName]
    );
    return result.rows[0];
  }

  async deleteModel(modelId: number): Promise<void> {
    const model = await pool.query('SELECT * FROM model_settings WHERE id = $1', [modelId]);
    
    if (model.rows.length === 0) {
      throw new Error('Model not found');
    }
    
    // デフォルトモデルは削除できない
    if (model.rows[0].is_default) {
      throw new Error('Cannot delete default model');
    }
    
    await pool.query('DELETE FROM model_settings WHERE id = $1', [modelId]);
  }
}

// Electronモード用のメモリストレージ実装
export class MemoryStorage implements IStorage {
  private users: User[] = [];
  private messages: Message[] = [];
  private chats: Chat[] = [];
  private modelSettings: ModelSettings[] = [];
  private defaultModel: string = 'alibayram/medgemma';
  sessionStore: session.Store;

  constructor() {
    // Electronモード用のメモリセッションストア
    this.sessionStore = new session.MemoryStore();
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.find(u => u.id === id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.users.find(u => u.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user: User = {
      id: this.users.length + 1,
      ...insertUser,
      createdAt: new Date()
    };
    this.users.push(user);
    return user;
  }

  async getMessagesByUser(userId: number): Promise<Message[]> {
    return this.messages.filter(m => m.userId === userId);
  }

  async getMessagesByChat(chatId: number): Promise<Message[]> {
    return this.messages.filter(m => m.chatId === chatId);
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const message: Message = {
      id: this.messages.length + 1,
      ...insertMessage,
      timestamp: new Date()
    };
    this.messages.push(message);
    return message;
  }

  async getChatsByUser(userId: number): Promise<Chat[]> {
    return this.chats.filter(c => c.userId === userId);
  }

  async getChat(id: number): Promise<Chat | undefined> {
    return this.chats.find(c => c.id === id);
  }

  async createChat(insertChat: InsertChat): Promise<Chat> {
    const chat: Chat = {
      id: this.chats.length + 1,
      ...insertChat,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.chats.push(chat);
    return chat;
  }

  async updateChatTitle(id: number, title: string): Promise<void> {
    const chat = this.chats.find(c => c.id === id);
    if (chat) {
      chat.title = title;
      chat.updatedAt = new Date();
    }
  }

  async deleteChat(id: number): Promise<void> {
    this.messages = this.messages.filter(m => m.chatId !== id);
    this.chats = this.chats.filter(c => c.id !== id);
  }

  async getModelSettings(): Promise<ModelSettings[]> {
    return this.modelSettings;
  }

  async getDefaultModel(): Promise<string> {
    return this.defaultModel;
  }

  async setDefaultModel(modelName: string): Promise<void> {
    this.defaultModel = modelName;
  }

  async addModel(modelName: string): Promise<ModelSettings> {
    const model: ModelSettings = {
      id: this.modelSettings.length + 1,
      model_name: modelName,
      is_default: false,
      created_at: new Date()
    };
    this.modelSettings.push(model);
    return model;
  }

  async deleteModel(modelId: number): Promise<void> {
    this.modelSettings = this.modelSettings.filter(m => m.id !== modelId);
  }
}

// Electronモードかどうかでストレージ実装を選択
const isElectronMode = process.env.ELECTRON_MODE === 'true';
export const storage: IStorage = isElectronMode 
  ? new MemoryStorage() 
  : new DatabaseStorage();
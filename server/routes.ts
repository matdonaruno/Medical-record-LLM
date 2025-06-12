import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertMessageSchema, insertChatSchema } from "@shared/schema";
import * as llm from "./llm";
import { randomBytes } from "crypto";
import express from "express";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { z } from "zod";
import { Message } from "@shared/schema";

export async function registerRoutes(app: Express, server?: Server): Promise<Server> {
  // 既存のサーバーがあれば使用、なければ新規作成
  const httpServer = server || createServer(app);
  
  // WebSocketServerの設定
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: "/api/ws"
  });

  console.log('WebSocketサーバーを初期化しました: /api/ws');

  // WebSocket接続のデバッグエンドポイント
  app.get('/api/ws-debug', (req, res) => {
    res.json({ message: 'WebSocket endpoint is available' });
  });

  wss.on('connection', (ws, req) => {
    console.log('新しいWebSocket接続が確立されました');
    
    ws.on('error', (error) => {
      console.error('WebSocketエラー:', error);
    });

    ws.on('close', (code, reason) => {
      console.log('WebSocket接続が閉じられました:', code, reason.toString());
    });
  });

  // WebSocketブロードキャスト用のヘルパー関数
  const broadcastMessage = (message: any) => {
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(JSON.stringify(message));
        } catch (error) {
          console.error('WebSocketメッセージ送信エラー:', error);
        }
      }
    });
  };

  setupAuth(app);

  // チャット関連のエンドポイント
  app.get("/api/chats", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const chats = await storage.getChatsByUser(req.user.id);
    res.json(chats);
  });

  app.post("/api/chats", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const parsed = insertChatSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(parsed.error);
    }

    const chat = await storage.createChat(parsed.data);
    res.status(201).json(chat);
  });

  // チャットタイトルの更新エンドポイント
  app.put("/api/chats/:id/title", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const chatId = parseInt(req.params.id);
    if (isNaN(chatId)) {
      return res.status(400).json({ message: "Invalid chat ID" });
    }

    const { title } = req.body;
    if (!title || typeof title !== "string") {
      return res.status(400).json({ message: "Invalid title" });
    }

    const chat = await storage.getChat(chatId);
    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    if (chat.userId !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    await storage.updateChatTitle(chatId, title);
    res.json({ success: true });
  });

  app.delete("/api/chats/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const chatId = parseInt(req.params.id);
    if (isNaN(chatId)) {
      return res.status(400).json({ message: "Invalid chat ID" });
    }

    const chat = await storage.getChat(chatId);
    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    if (chat.userId !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    await storage.deleteChat(chatId);
    res.sendStatus(204);
  });

  // システムプロンプトを設定するエンドポイント
  app.post("/api/system-prompt", (req, res) => {
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ message: "Content is required" });
    }
    
    llm.setSystemPrompt(content);
    res.json({ success: true });
  });

  // 現在のモデルを取得するエンドポイント
  app.get("/api/current-model", (req, res) => {
    const model = llm.getCurrentModel();
    res.json({ model });
  });

  // モデルを変更するエンドポイント
  app.post("/api/model", async (req, res) => {
    const { model } = req.body;
    if (!model) {
      return res.status(400).json({ message: "Model is required" });
    }
    
    await llm.setCurrentModel(model);
    res.json({ success: true });
  });

  // モデル設定関連のエンドポイント
  app.get("/api/models", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const models = await storage.getModelSettings();
      const currentModel = llm.getCurrentModel();
      
      res.json({
        models,
        currentModel
      });
    } catch (error) {
      console.error("モデル設定の取得エラー:", error);
      res.status(500).json({ message: "モデル設定の取得に失敗しました" });
    }
  });

  app.post("/api/models", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const { modelName } = req.body;
    if (!modelName || typeof modelName !== "string") {
      return res.status(400).json({ message: "モデル名が無効です" });
    }
    
    try {
      const model = await storage.addModel(modelName);
      res.status(201).json(model);
    } catch (error) {
      console.error("モデル追加エラー:", error);
      res.status(500).json({ message: "モデルの追加に失敗しました" });
    }
  });

  app.post("/api/models/default", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const { modelName } = req.body;
    if (!modelName || typeof modelName !== "string") {
      return res.status(400).json({ message: "モデル名が無効です" });
    }
    
    try {
      await llm.setCurrentModel(modelName);
      res.json({ success: true, currentModel: modelName });
    } catch (error) {
      console.error("デフォルトモデル設定エラー:", error);
      res.status(500).json({ message: "デフォルトモデルの設定に失敗しました" });
    }
  });

  app.delete("/api/models/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const modelId = parseInt(req.params.id);
    if (isNaN(modelId)) {
      return res.status(400).json({ message: "無効なモデルIDです" });
    }
    
    try {
      await storage.deleteModel(modelId);
      res.sendStatus(204);
    } catch (error) {
      console.error("モデル削除エラー:", error);
      if (error instanceof Error && error.message === "Cannot delete default model") {
        return res.status(400).json({ message: "デフォルトモデルは削除できません" });
      }
      res.status(500).json({ message: "モデルの削除に失敗しました" });
    }
  });

  // メッセージ関連のエンドポイント
  app.get("/api/messages", async (req, res) => {
    if (!req.isAuthenticated()) {
      console.log("未認証ユーザーがメッセージを取得しようとしました");
      return res.sendStatus(401);
    }
    
    const chatId = req.query.chatId ? parseInt(req.query.chatId as string) : null;
    console.log(`メッセージ取得リクエスト: chatId=${chatId}, userId=${req.user.id}`);
    
    if (chatId) {
      const chat = await storage.getChat(chatId);
      if (!chat) {
        console.log(`チャットID ${chatId} が見つかりません`);
        return res.status(404).json({ message: "Chat not found" });
      }
      
      if (chat.userId !== req.user.id) {
        console.log(`ユーザーID ${req.user.id} はチャットID ${chatId} にアクセスする権限がありません（所有者: ${chat.userId}）`);
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const messages = await storage.getMessagesByChat(chatId);
      console.log(`チャットID ${chatId} のメッセージ: ${messages.length}件`);
      res.json(messages);
    } else {
      const messages = await storage.getMessagesByUser(req.user.id);
      console.log(`ユーザーID ${req.user.id} のメッセージ: ${messages.length}件`);
      res.json(messages);
    }
  });

  app.post("/api/messages", async (req, res) => {
    if (!req.isAuthenticated()) {
      console.log("未認証ユーザーがメッセージを送信しようとしました");
      return res.sendStatus(401);
    }

    const parsed = insertMessageSchema.safeParse(req.body);
    if (!parsed.success) {
      console.log("無効なメッセージデータ:", parsed.error);
      return res.status(400).json(parsed.error);
    }

    // ユーザーIDが一致するか確認
    if (parsed.data.userId !== req.user.id) {
      console.log(`ユーザーIDの不一致: リクエスト=${parsed.data.userId}, セッション=${req.user.id}`);
      return res.status(403).json({ message: "Unauthorized: User ID mismatch" });
    }

    // チャットIDが指定されている場合、そのチャットの所有者か確認
    if (parsed.data.chatId) {
      const chat = await storage.getChat(parsed.data.chatId);
      if (!chat) {
        console.log(`チャットID ${parsed.data.chatId} が見つかりません`);
        return res.status(404).json({ message: "Chat not found" });
      }
      
      if (chat.userId !== req.user.id) {
        console.log(`ユーザーID ${req.user.id} はチャットID ${parsed.data.chatId} にメッセージを送信する権限がありません（所有者: ${chat.userId}）`);
        return res.status(403).json({ message: "Unauthorized: Not chat owner" });
      }
    }

    console.log(`メッセージ送信リクエスト: chatId=${parsed.data.chatId}, userId=${req.user.id}`);

    // Save user message
    const userMessage = await storage.createMessage(parsed.data);

    // Get chat history
    let messages: Message[] = [];
    if (parsed.data.chatId) {
      messages = await storage.getMessagesByChat(parsed.data.chatId);
    } else {
      messages = await storage.getMessagesByUser(req.user.id);
    }

    try {
      // Get current model from storage
      const currentModel = await storage.getDefaultModel();
      console.log(`LLMリクエスト: ${messages.length}件のメッセージ履歴を含む`);
      console.log(`使用モデル: ${currentModel}`);

      // Generate response
      const assistantContent = await llm.generateResponse(messages, currentModel);
      
      // Save assistant message
      const assistantMessage = await storage.createMessage({
        content: assistantContent,
        role: "assistant",
        userId: req.user.id,
        chatId: parsed.data.chatId
      });
      
      console.log(`アシスタントメッセージを保存: chatId=${parsed.data.chatId}, messageId=${assistantMessage.id}`);

      // If this is the first message in a chat, update the chat title
      if (parsed.data.chatId && messages.length <= 3) {
        const userContent = parsed.data.content;
        const truncatedContent = userContent.length > 20 
          ? userContent.substring(0, 20) + "..." 
          : userContent;
        const newTitle = `${truncatedContent} (${currentModel})`;
        
        await storage.updateChatTitle(parsed.data.chatId, newTitle);
        console.log(`チャットタイトルを自動生成: "${newTitle}"`);
      }

      // WebSocketで通知
      if (assistantMessage) {
        broadcastMessage({
          type: "new_message",
          data: assistantMessage
        });
      }

      res.status(201).json([userMessage, assistantMessage]);
    } catch (error) {
      console.error("Error generating response:", error);
      
      const errorMessage = await storage.createMessage({
        content: "申し訳ありませんが、エラーが発生しました。後でもう一度お試しください。",
        role: "assistant",
        userId: req.user.id,
        chatId: parsed.data.chatId
      });
      
      // WebSocketで通知
      broadcastMessage({
        type: "new_message",
        data: errorMessage
      });
      
      res.status(201).json([userMessage, errorMessage]);
    }
  });

  // パスワードリセット用エンドポイント
  app.post("/api/reset-password", async (req, res) => {
    const { username } = req.body;
    
    if (!username) {
      return res.status(400).json({ message: "職員IDを入力してください" });
    }
    
    try {
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(404).json({ message: "指定された職員IDは登録されていません" });
      }
      
      // 実際のアプリケーションでは、ここでメール送信などの処理を行う
      // 今回はシンプルに新しいパスワードを生成して保存する
      const newPassword = randomBytes(4).toString('hex');
      
      // パスワードをハッシュ化して保存する処理は auth.ts にあるため、
      // 管理者がリセットする想定で成功メッセージを返す
      console.log(`ユーザー ${username} のパスワードリセットが要求されました。新しいパスワード: ${newPassword}`);
      
      res.json({ message: "パスワードリセットの要求を受け付けました" });
    } catch (err) {
      console.error("パスワードリセットエラー:", err);
      res.status(500).json({ message: "パスワードリセット処理中にエラーが発生しました" });
    }
  });

  return httpServer;
}
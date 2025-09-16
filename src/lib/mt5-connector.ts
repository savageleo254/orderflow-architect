import WebSocket from 'ws';
import { logger } from './logger';

interface MT5Price {
  symbol: string;
  bid: number;
  ask: number;
  time: number;
  volume?: number;
}

interface MT5Trade {
  ticket: number;
  symbol: string;
  type: number;
  volume: number;
  price: number;
  sl: number;
  tp: number;
  profit: number;
  swap: number;
  commission: number;
  comment: string;
}

export class MT5Connector {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 5000;
  private isConnected = false;
  private subscriptions = new Set<string>();

  constructor(private wsUrl: string) {}

  async connect(): Promise<boolean> {
    try {
      this.ws = new WebSocket(this.wsUrl);

      this.ws.on('open', () => {
        logger.info('MT5 WebSocket connected', { url: this.wsUrl });
        this.isConnected = true;
        this.reconnectAttempts = 0;
        
        // Resubscribe to symbols after reconnection
        this.resubscribeAll();
      });

      this.ws.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(message);
        } catch (error) {
          logger.error('Failed to parse MT5 message', { error, data: data.toString() });
        }
      });

      this.ws.on('close', () => {
        logger.warn('MT5 WebSocket connection closed');
        this.isConnected = false;
        this.scheduleReconnect();
      });

      this.ws.on('error', (error) => {
        logger.error('MT5 WebSocket error', { error });
        this.isConnected = false;
      });

      return new Promise((resolve) => {
        setTimeout(() => resolve(this.isConnected), 2000);
      });
    } catch (error) {
      logger.error('Failed to connect to MT5', { error });
      return false;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      logger.info('Scheduling MT5 reconnect', { 
        attempt: this.reconnectAttempts, 
        delay: this.reconnectDelay 
      });
      
      setTimeout(() => {
        this.connect();
      }, this.reconnectDelay);
    } else {
      logger.error('Max reconnection attempts reached for MT5');
    }
  }

  private resubscribeAll(): void {
    for (const symbol of this.subscriptions) {
      this.subscribeToSymbol(symbol);
    }
  }

  private handleMessage(message: any): void {
    logger.info('MT5 message received', { type: message.type, symbol: message.symbol });
    
    switch (message.type) {
      case 'price':
        this.handlePriceUpdate(message.data);
        break;
      case 'market_data':
        // Handle new format from Python bridge
        this.handleMarketDataUpdate(message);
        break;
      case 'trade':
        this.handleTradeUpdate(message.data);
        break;
      case 'account':
        this.handleAccountUpdate(message.data);
        break;
      case 'connected':
        logger.info('MT5 bridge connection confirmed', { data: message.data });
        break;
      case 'error':
        logger.error('MT5 error message', { error: message.data });
        break;
      default:
        logger.debug('Unknown MT5 message type', { type: message.type, message });
    }
  }

  private handlePriceUpdate(price: MT5Price): void {
    // Emit to Socket.IO clients
    const marketData = this.formatMarketData(price);
    this.emit('market_data', marketData);
  }

  private handleMarketDataUpdate(message: any): void {
    // Handle market data from Python MT5 bridge
    logger.info('Processing market data update', { symbol: message.symbol, bid: message.bid, ask: message.ask });
    this.emit('market_data', message);
  }

  private handleTradeUpdate(trade: MT5Trade): void {
    logger.info('MT5 trade update', { ticket: trade.ticket, symbol: trade.symbol });
    this.emit('trade_update', trade);
  }

  private handleAccountUpdate(account: any): void {
    logger.info('MT5 account update', { balance: account.balance });
    this.emit('account_update', account);
  }

  private formatMarketData(price: MT5Price) {
    const midPrice = (price.bid + price.ask) / 2;
    const spread = price.ask - price.bid;
    
    return {
      symbol: price.symbol,
      timestamp: new Date(price.time * 1000).toISOString(),
      bid: price.bid,
      ask: price.ask,
      close: midPrice,
      open: midPrice, // In real-time, we'd track this properly
      high: midPrice + (spread * 0.1),
      low: midPrice - (spread * 0.1),
      volume: price.volume || 0,
      spread: spread,
      change24h: 0, // Calculate based on historical data
      changePercent24h: 0
    };
  }

  subscribeToSymbol(symbol: string): void {
    if (!this.isConnected) {
      this.subscriptions.add(symbol);
      return;
    }

    const subscribeMessage = {
      action: 'subscribe',
      symbol: symbol,
      type: 'price'
    };

    this.send(subscribeMessage);
    this.subscriptions.add(symbol);
    logger.debug('Subscribed to MT5 symbol', { symbol });
  }

  unsubscribeFromSymbol(symbol: string): void {
    if (!this.isConnected) return;

    const unsubscribeMessage = {
      action: 'unsubscribe',
      symbol: symbol,
      type: 'price'
    };

    this.send(unsubscribeMessage);
    this.subscriptions.delete(symbol);
    logger.debug('Unsubscribed from MT5 symbol', { symbol });
  }

  // Trading operations
  async placeTrade(order: {
    symbol: string;
    type: 'buy' | 'sell';
    volume: number;
    price?: number;
    sl?: number;
    tp?: number;
    comment?: string;
  }): Promise<any> {
    const tradeMessage = {
      action: 'trade',
      ...order
    };

    return new Promise((resolve, reject) => {
      this.send(tradeMessage);
      // In a real implementation, you'd wait for a response
      // For now, we'll just resolve immediately
      setTimeout(() => resolve({ success: true }), 1000);
    });
  }

  async closeTrade(ticket: number): Promise<any> {
    const closeMessage = {
      action: 'close',
      ticket: ticket
    };

    return new Promise((resolve, reject) => {
      this.send(closeMessage);
      setTimeout(() => resolve({ success: true }), 1000);
    });
  }

  private send(message: any): void {
    if (this.ws && this.isConnected) {
      this.ws.send(JSON.stringify(message));
    } else {
      logger.warn('Cannot send message - MT5 not connected', { message });
    }
  }

  private eventListeners: { [event: string]: Function[] } = {};

  on(event: string, callback: Function): void {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);
  }

  private emit(event: string, data: any): void {
    if (this.eventListeners[event]) {
      this.eventListeners[event].forEach(callback => callback(data));
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.subscriptions.clear();
    logger.info('MT5 WebSocket disconnected');
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

// Singleton instance
export const mt5Connector = new MT5Connector(
  process.env.MT5_WEBSOCKET_URL || 'ws://localhost:8000/ws'
);

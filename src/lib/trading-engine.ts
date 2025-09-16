import { mt5Connector } from './mt5-connector';
import { logger } from './logger';
import { db } from './db';

export class MT5TradingEngine {
  private isLiveMode: boolean;

  constructor() {
    this.isLiveMode = process.env.TRADING_MODE === 'live';
  }

  async initialize(): Promise<boolean> {
    if (!this.isLiveMode) {
      logger.info('Trading engine initialized in simulation mode');
      return true;
    }

    logger.info('Initializing MT5 live trading engine');
    const connected = await mt5Connector.connect();
    
    if (!connected) {
      logger.error('Failed to initialize MT5 trading engine');
      return false;
    }

    // Set up MT5 event listeners
    this.setupMT5EventListeners();
    
    logger.info('MT5 live trading engine initialized successfully');
    return true;
  }

  private setupMT5EventListeners(): void {
    mt5Connector.on('trade_update', async (trade: any) => {
      await this.handleTradeUpdate(trade);
    });

    mt5Connector.on('account_update', async (account: any) => {
      await this.handleAccountUpdate(account);
    });
  }

  async placeTrade(order: {
    userId: string;
    symbol: string;
    type: 'buy' | 'sell';
    volume: number;
    price?: number;
    stopLoss?: number;
    takeProfit?: number;
    comment?: string;
  }): Promise<any> {
    
    if (!this.isLiveMode) {
      return this.simulateTrade(order);
    }

    try {
      logger.info('Placing MT5 live trade', { 
        symbol: order.symbol, 
        type: order.type, 
        volume: order.volume 
      });

      // Create order record in database
      const dbOrder = await db.order.create({
        data: {
          userId: order.userId,
          assetId: await this.getOrCreateAsset(order.symbol),
          type: 'MARKET',
          side: order.type === 'buy' ? 'BUY' : 'SELL',
          quantity: order.volume,
          price: order.price,
          stopPrice: order.stopLoss,
          status: 'PENDING',
          timeInForce: 'DAY'
        }
      });

      // Send to MT5
      const mt5Result = await mt5Connector.placeTrade({
        symbol: order.symbol,
        type: order.type,
        volume: order.volume,
        price: order.price,
        sl: order.stopLoss,
        tp: order.takeProfit,
        comment: order.comment || `Order #${dbOrder.id}`
      });

      // Update order status
      await db.order.update({
        where: { id: dbOrder.id },
        data: { 
          status: mt5Result.success ? 'FILLED' : 'REJECTED',
          filledQuantity: mt5Result.success ? order.volume : 0
        }
      });

      return {
        orderId: dbOrder.id,
        mt5Result,
        success: mt5Result.success
      };

    } catch (error) {
      logger.error('Failed to place MT5 trade', { error, order });
      throw error;
    }
  }

  async closeTrade(userId: string, positionId: string): Promise<any> {
    if (!this.isLiveMode) {
      return this.simulateClosePosition(userId, positionId);
    }

    try {
      // Get position from database
      const position = await db.position.findFirst({
        where: { id: positionId, userId },
        include: { asset: true }
      });

      if (!position) {
        throw new Error('Position not found');
      }

      logger.info('Closing MT5 position', { 
        positionId, 
        symbol: position.asset.symbol 
      });

      // Close on MT5 (requires ticket number - would need to store this)
      // For now, we'll simulate the close
      const mt5Result = { success: true, ticket: 12345 };

      // Update position in database
      await db.position.update({
        where: { id: positionId },
        data: { quantity: 0 }
      });

      return mt5Result;

    } catch (error) {
      logger.error('Failed to close MT5 position', { error, positionId });
      throw error;
    }
  }

  private async simulateTrade(order: any): Promise<any> {
    logger.info('Simulating trade execution', { order });
    
    // Simulate successful trade
    return {
      success: true,
      ticket: Math.floor(Math.random() * 1000000),
      executedPrice: order.price || 1.0500,
      executedVolume: order.volume
    };
  }

  private async simulateClosePosition(userId: string, positionId: string): Promise<any> {
    logger.info('Simulating position close', { userId, positionId });
    
    return {
      success: true,
      closedAt: new Date().toISOString(),
      pnl: Math.random() * 100 - 50 // Random P&L
    };
  }

  private async handleTradeUpdate(trade: any): Promise<void> {
    logger.info('Processing MT5 trade update', { ticket: trade.ticket });
    
    // Update database records based on MT5 trade update
    try {
      await db.trade.create({
        data: {
          orderId: trade.orderId || 'unknown',
          userId: trade.userId || 'unknown',
          assetId: await this.getOrCreateAsset(trade.symbol),
          quantity: trade.volume,
          price: trade.price,
          side: trade.type === 0 ? 'BUY' : 'SELL',
          commission: trade.commission || 0
        }
      });
    } catch (error) {
      logger.error('Failed to record MT5 trade', { error, trade });
    }
  }

  private async handleAccountUpdate(account: any): Promise<void> {
    logger.info('Processing MT5 account update', { 
      balance: account.balance,
      equity: account.equity 
    });
    
    // Update user account information
    // This would require mapping MT5 account to user ID
  }

  private async getOrCreateAsset(symbol: string): Promise<string> {
    let asset = await db.asset.findUnique({
      where: { symbol }
    });

    if (!asset) {
      asset = await db.asset.create({
        data: {
          symbol,
          name: symbol,
          type: 'forex',
          currency: 'USD'
        }
      });
    }

    return asset.id;
  }

  async getAccountInfo(): Promise<any> {
    if (!this.isLiveMode) {
      return {
        balance: 10000,
        equity: 10000,
        margin: 0,
        freeMargin: 10000,
        currency: 'USD'
      };
    }

    // Get real account info from MT5
    // This would require implementing account info request in MT5 connector
    return {
      balance: 0,
      equity: 0,
      margin: 0,
      freeMargin: 0,
      currency: 'USD'
    };
  }

  isConnected(): boolean {
    return this.isLiveMode ? mt5Connector.getConnectionStatus() : true;
  }
}

export const tradingEngine = new MT5TradingEngine();

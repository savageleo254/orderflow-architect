import { Server } from 'socket.io';
import { db } from './db';
import { logger } from './logger';
import { mt5Connector } from './mt5-connector';

// MT5 Live Market Data Manager
class MT5MarketDataManager {
  private symbols = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF', 'NZDUSD', 'XAUUSD'];
  private isLiveMode: boolean;

  constructor() {
    this.isLiveMode = process.env.TRADING_MODE === 'live';
  }

  async start(io: Server) {
    if (this.isLiveMode) {
      logger.info('Starting MT5 live market data feed', { symbols: this.symbols });
      
      // Connect to MT5 WebSocket
      const connected = await mt5Connector.connect();
      if (!connected) {
        logger.error('Failed to connect to MT5 - falling back to simulation mode');
        this.startSimulationMode(io);
        return;
      }

      // Subscribe to MT5 market data
      mt5Connector.on('market_data', (marketData: any) => {
        io.emit('market_data', marketData);
        this.storeMarketData(marketData);
      });

      // Subscribe to symbols
      this.symbols.forEach(symbol => {
        mt5Connector.subscribeToSymbol(symbol);
      });
    } else {
      this.startSimulationMode(io);
    }
  }

  startSimulationMode(io: Server) {
    logger.warn('Running in simulation mode - using mock data');
    // Keep original simulation logic as fallback
  }

  stop() {
    if (this.isLiveMode) {
      logger.info('Stopping MT5 market data feed');
      mt5Connector.disconnect();
    } else {
      logger.info('Stopping simulation market data generator');
    }
  }

  private async generateMarketData(symbol: string) {
    // Get last price or generate base price
    const lastData = await db.marketData.findFirst({
      where: { assetId: symbol },
      orderBy: { timestamp: 'desc' }
    });

    const basePrice = lastData?.close || Math.random() * 1000 + 100;
    const change = (Math.random() - 0.5) * 10;
    const newPrice = Math.max(0.01, basePrice + change);

    return {
      symbol,
      timestamp: new Date().toISOString(),
      open: newPrice * (1 + (Math.random() - 0.5) * 0.01),
      high: newPrice * (1 + Math.random() * 0.02),
      low: newPrice * (1 - Math.random() * 0.02),
      close: newPrice,
      volume: Math.floor(Math.random() * 1000000),
      bid: newPrice * 0.999,
      ask: newPrice * 1.001,
      bidSize: Math.floor(Math.random() * 10000),
      askSize: Math.floor(Math.random() * 10000),
      change24h: change,
      changePercent24h: (change / basePrice) * 100
    };
  }

  private async storeMarketData(data: any) {
    try {
      // Ensure asset exists
      let asset = await db.asset.findUnique({
        where: { symbol: data.symbol }
      });

      if (!asset) {
        asset = await db.asset.create({
          data: {
            symbol: data.symbol,
            name: data.symbol,
            type: 'stock',
            price: data.close,
            change24h: data.change24h,
            volume24h: data.volume
          }
        });
      }

      // Store market data
      await db.marketData.create({
        data: {
          assetId: asset.id,
          timestamp: new Date(data.timestamp),
          open: data.open,
          high: data.high,
          low: data.low,
          close: data.close,
          volume: data.volume,
          bid: data.bid,
          ask: data.ask,
          bidSize: data.bidSize,
          askSize: data.askSize
        }
      });

      // Update asset price
      await db.asset.update({
        where: { id: asset.id },
        data: {
          price: data.close,
          change24h: data.change24h,
          volume24h: data.volume
        }
      });
    } catch (error) {
      logger.error('Error storing market data', { symbol: data.symbol, error });
    }
  }
}

const mt5DataManager = new MT5MarketDataManager();

export const setupSocket = (io: Server) => {
  io.on('connection', (socket) => {
    const clientId = socket.id;
    logger.info('Client connected', { clientId });

    // Handle market data subscription
    socket.on('subscribe_market_data', (symbols: string[]) => {
      logger.debug('Client subscribed to market data', { clientId, symbols });
      socket.join(`market_data_${symbols.join(',')}`);
    });

    // Handle market data unsubscription
    socket.on('unsubscribe_market_data', (symbols: string[]) => {
      logger.debug('Client unsubscribed from market data', { clientId, symbols });
      socket.leave(`market_data_${symbols.join(',')}`);
    });

    // Handle order updates subscription
    socket.on('subscribe_orders', (userId: string) => {
      logger.debug('Client subscribed to orders', { clientId, userId });
      socket.join(`orders_${userId}`);
    });

    // Handle position updates subscription
    socket.on('subscribe_positions', (userId: string) => {
      logger.debug('Client subscribed to positions', { clientId, userId });
      socket.join(`positions_${userId}`);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      logger.info('Client disconnected', { clientId });
    });

    // Send initial connection message
    socket.emit('connected', {
      message: 'Connected to trading platform',
      timestamp: new Date().toISOString()
    });
  });

  // Start MT5 market data feed
  mt5DataManager.start(io);

  // Cleanup on server shutdown
  process.on('SIGTERM', () => {
    logger.info('Received SIGTERM, shutting down gracefully');
    mt5DataManager.stop();
  });

  process.on('SIGINT', () => {
    logger.info('Received SIGINT, shutting down gracefully');
    mt5DataManager.stop();
  });
};

// Helper functions to emit updates
export const emitOrderUpdate = (io: Server, userId: string, order: any) => {
  logger.debug('Emitting order update', { userId, orderId: order.id });
  io.to(`orders_${userId}`).emit('order_update', order);
};

export const emitPositionUpdate = (io: Server, userId: string, position: any) => {
  logger.debug('Emitting position update', { userId, positionId: position.id });
  io.to(`positions_${userId}`).emit('position_update', position);
};

export const emitTradeUpdate = (io: Server, userId: string, trade: any) => {
  logger.debug('Emitting trade update', { userId, tradeId: trade.id });
  io.to(`orders_${userId}`).emit('trade_update', trade);
};
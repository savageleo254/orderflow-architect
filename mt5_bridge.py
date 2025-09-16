#!/usr/bin/env python3
"""
ARIA V3 Elite - Pure Python MT5 API Bridge
Institutional-grade MT5 WebSocket server with live trading capabilities
NO MQL5 REQUIRED - Direct Python MetaTrader5 API integration
"""

import asyncio
import websockets
import json
import logging
import MetaTrader5 as mt5
import pandas as pd
from datetime import datetime, timedelta
import threading
import time
from typing import Dict, List, Optional
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('mt5_bridge.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class MT5Bridge:
    def __init__(self):
        self.connected_clients = set()
        self.mt5_connected = False
        self.subscribed_symbols = set()
        self.price_thread = None
        self.running = False
        
        # MT5 Configuration
        self.mt5_login = int(os.getenv('MT5_LOGIN', '103936248'))
        self.mt5_password = os.getenv('MT5_PASSWORD', '>Lyl2E_/')
        self.mt5_server = os.getenv('MT5_SERVER', 'FBS-Demo')
        self.websocket_port = int(os.getenv('MT5_WEBSOCKET_PORT', '8000'))
        
        logger.info(f"MT5 Bridge initialized - Server: {self.mt5_server}, Login: {self.mt5_login}")

    async def initialize_mt5(self) -> bool:
        """Initialize MT5 connection"""
        try:
            # Initialize MT5
            if not mt5.initialize():
                logger.error(f"MT5 initialize() failed: {mt5.last_error()}")
                return False
            
            # Login to MT5
            if not mt5.login(self.mt5_login, password=self.mt5_password, server=self.mt5_server):
                logger.error(f"MT5 login failed: {mt5.last_error()}")
                mt5.shutdown()
                return False
            
            # Get account info
            account_info = mt5.account_info()
            if account_info is None:
                logger.error("Failed to get account info")
                return False
            
            logger.info(f"MT5 Connected - Account: {account_info.login}, Balance: {account_info.balance}, Server: {account_info.server}")
            self.mt5_connected = True
            return True
            
        except Exception as e:
            logger.error(f"MT5 initialization error: {e}")
            return False

    def get_symbol_info(self, symbol: str) -> Optional[Dict]:
        """Get symbol information"""
        try:
            symbol_info = mt5.symbol_info(symbol)
            if symbol_info is None:
                return None
            
            return {
                'symbol': symbol,
                'bid': symbol_info.bid,
                'ask': symbol_info.ask,
                'spread': symbol_info.spread,
                'digits': symbol_info.digits,
                'point': symbol_info.point,
                'volume_min': symbol_info.volume_min,
                'volume_max': symbol_info.volume_max,
                'time': int(time.time())
            }
        except Exception as e:
            logger.error(f"Error getting symbol info for {symbol}: {e}")
            return None

    def get_current_prices(self, symbols: List[str]) -> List[Dict]:
        """Get current prices for symbols"""
        prices = []
        for symbol in symbols:
            symbol_info = self.get_symbol_info(symbol)
            if symbol_info:
                prices.append({
                    'type': 'price',
                    'data': symbol_info
                })
        return prices

    async def price_feed_worker(self):
        """Background worker for price updates"""
        logger.info("Starting price feed worker")
        
        while self.running and self.mt5_connected:
            try:
                if self.subscribed_symbols and self.connected_clients:
                    prices = self.get_current_prices(list(self.subscribed_symbols))
                    
                    for price_data in prices:
                        # Format data for frontend compatibility
                        formatted_data = {
                            'type': 'market_data',
                            'symbol': price_data['data']['symbol'],
                            'timestamp': datetime.now().isoformat(),
                            'open': price_data['data']['bid'],
                            'high': price_data['data']['ask'],
                            'low': price_data['data']['bid'],
                            'close': price_data['data']['bid'],
                            'volume': 1000,
                            'bid': price_data['data']['bid'],
                            'ask': price_data['data']['ask'],
                            'bidSize': 1000,
                            'askSize': 1000,
                            'change24h': 0.0,
                            'changePercent24h': 0.0
                        }
                        
                        message = json.dumps(formatted_data)
                        logger.info(f"Sending price data for {formatted_data['symbol']}: bid={formatted_data['bid']}, ask={formatted_data['ask']}")
                        
                        # Send to all connected clients
                        disconnected_clients = set()
                        for client in self.connected_clients.copy():
                            try:
                                await client.send(message)
                            except websockets.exceptions.ConnectionClosed:
                                disconnected_clients.add(client)
                            except Exception as e:
                                logger.error(f"Error sending price data: {e}")
                                disconnected_clients.add(client)
                        
                        # Remove disconnected clients
                        self.connected_clients -= disconnected_clients
                
                await asyncio.sleep(1.0)  # Update every 1 second
                
            except Exception as e:
                logger.error(f"Price feed worker error: {e}")
                await asyncio.sleep(1)

    async def handle_client_message(self, websocket, message: str):
        """Handle incoming client messages"""
        try:
            data = json.loads(message)
            action = data.get('action')
            
            if action == 'subscribe':
                symbol = data.get('symbol')
                if symbol:
                    self.subscribed_symbols.add(symbol)
                    logger.info(f"Client subscribed to {symbol}")
                    
                    # Send immediate price update
                    symbol_info = self.get_symbol_info(symbol)
                    if symbol_info:
                        response = {
                            'type': 'price',
                            'data': symbol_info
                        }
                        await websocket.send(json.dumps(response))
            
            elif action == 'unsubscribe':
                symbol = data.get('symbol')
                if symbol in self.subscribed_symbols:
                    self.subscribed_symbols.remove(symbol)
                    logger.info(f"Client unsubscribed from {symbol}")
            
            elif action == 'trade':
                result = await self.execute_trade(data)
                await websocket.send(json.dumps({
                    'type': 'trade_result',
                    'data': result
                }))
            
            elif action == 'close':
                result = await self.close_position(data.get('ticket'))
                await websocket.send(json.dumps({
                    'type': 'close_result',
                    'data': result
                }))
            
            elif action == 'account_info':
                account_info = self.get_account_info()
                await websocket.send(json.dumps({
                    'type': 'account',
                    'data': account_info
                }))
                
        except json.JSONDecodeError:
            logger.error(f"Invalid JSON received: {message}")
        except Exception as e:
            logger.error(f"Error handling client message: {e}")

    async def execute_trade(self, trade_data: Dict) -> Dict:
        """Execute trade on MT5"""
        try:
            symbol = trade_data.get('symbol')
            trade_type = trade_data.get('type')  # 'buy' or 'sell'
            volume = float(trade_data.get('volume', 0.01))
            price = trade_data.get('price')
            sl = trade_data.get('sl', 0.0)
            tp = trade_data.get('tp', 0.0)
            comment = trade_data.get('comment', 'ARIA V3 Elite Trade')
            
            # Convert trade type
            order_type = mt5.ORDER_TYPE_BUY if trade_type == 'buy' else mt5.ORDER_TYPE_SELL
            
            # Get current price if not provided
            if not price:
                symbol_info = mt5.symbol_info(symbol)
                price = symbol_info.ask if trade_type == 'buy' else symbol_info.bid
            
            # Prepare trade request
            request = {
                "action": mt5.TRADE_ACTION_DEAL,
                "symbol": symbol,
                "volume": volume,
                "type": order_type,
                "price": price,
                "sl": sl,
                "tp": tp,
                "comment": comment,
                "type_time": mt5.ORDER_TIME_GTC,
                "type_filling": mt5.ORDER_FILLING_IOC
            }
            
            # Send trade request
            result = mt5.order_send(request)
            
            if result.retcode != mt5.TRADE_RETCODE_DONE:
                logger.error(f"Trade failed: {result.retcode} - {result.comment}")
                return {
                    'success': False,
                    'error': f"Trade failed: {result.comment}",
                    'retcode': result.retcode
                }
            
            logger.info(f"Trade executed successfully - Ticket: {result.order}, Volume: {volume}, Price: {result.price}")
            
            return {
                'success': True,
                'ticket': result.order,
                'volume': volume,
                'price': result.price,
                'symbol': symbol,
                'type': trade_type
            }
            
        except Exception as e:
            logger.error(f"Trade execution error: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    async def close_position(self, ticket: int) -> Dict:
        """Close position by ticket"""
        try:
            positions = mt5.positions_get(ticket=ticket)
            if not positions:
                return {'success': False, 'error': 'Position not found'}
            
            position = positions[0]
            
            # Prepare close request
            close_type = mt5.ORDER_TYPE_SELL if position.type == mt5.ORDER_TYPE_BUY else mt5.ORDER_TYPE_BUY
            
            request = {
                "action": mt5.TRADE_ACTION_DEAL,
                "symbol": position.symbol,
                "volume": position.volume,
                "type": close_type,
                "position": ticket,
                "comment": "ARIA V3 Elite Close",
                "type_time": mt5.ORDER_TIME_GTC,
                "type_filling": mt5.ORDER_FILLING_IOC
            }
            
            result = mt5.order_send(request)
            
            if result.retcode != mt5.TRADE_RETCODE_DONE:
                return {
                    'success': False,
                    'error': f"Close failed: {result.comment}",
                    'retcode': result.retcode
                }
            
            logger.info(f"Position closed successfully - Ticket: {ticket}")
            
            return {
                'success': True,
                'ticket': ticket,
                'close_price': result.price
            }
            
        except Exception as e:
            logger.error(f"Position close error: {e}")
            return {'success': False, 'error': str(e)}

    def get_account_info(self) -> Dict:
        """Get account information"""
        try:
            account_info = mt5.account_info()
            if account_info is None:
                return {}
            
            return {
                'login': account_info.login,
                'balance': account_info.balance,
                'equity': account_info.equity,
                'margin': account_info.margin,
                'free_margin': account_info.margin_free,
                'margin_level': account_info.margin_level,
                'currency': account_info.currency,
                'server': account_info.server,
                'leverage': account_info.leverage
            }
        except Exception as e:
            logger.error(f"Error getting account info: {e}")
            return {}

    async def handle_client(self, websocket, path):
        """Handle WebSocket client connection"""
        logger.info(f"New client connected from {websocket.remote_address}")
        self.connected_clients.add(websocket)
        
        try:
            # Send connection confirmation
            await websocket.send(json.dumps({
                'type': 'connected',
                'data': {
                    'message': 'Connected to ARIA MT5 Bridge',
                    'mt5_connected': self.mt5_connected,
                    'account': self.get_account_info() if self.mt5_connected else {}
                }
            }))
            
            async for message in websocket:
                await self.handle_client_message(websocket, message)
                
        except websockets.exceptions.ConnectionClosed:
            logger.info("Client disconnected")
        except Exception as e:
            logger.error(f"Client handler error: {e}")
        finally:
            self.connected_clients.discard(websocket)

    async def start_server(self):
        """Start WebSocket server"""
        logger.info(f"Starting ARIA MT5 Bridge WebSocket server on port {self.websocket_port}")
        
        # Initialize MT5
        if not await self.initialize_mt5():
            logger.error("Failed to initialize MT5 - exiting")
            return
        
        self.running = True
        
        # Start price feed worker
        asyncio.create_task(self.price_feed_worker())
        
        # Start WebSocket server
        server = await websockets.serve(
            self.handle_client,
            "localhost",
            self.websocket_port
        )
        
        logger.info(f"MT5 Bridge server running on ws://localhost:{self.websocket_port}")
        
        try:
            await server.wait_closed()
        except KeyboardInterrupt:
            logger.info("Shutting down MT5 Bridge...")
        finally:
            self.running = False
            mt5.shutdown()

async def main():
    """Main entry point"""
    bridge = MT5Bridge()
    await bridge.start_server()

if __name__ == "__main__":
    asyncio.run(main())

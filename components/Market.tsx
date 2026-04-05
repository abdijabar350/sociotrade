import React, { useState, useEffect, useRef } from 'react';
import { TrendingUp, TrendingDown, RefreshCw, Newspaper, BarChart2, Wallet, Trophy, X, ArrowUp, ArrowDown, ShoppingCart, MinusCircle, CheckCircle, AlertCircle, Link, Settings, Eye, EyeOff, Zap, Star, Activity } from 'lucide-react';
import { marketAssets, newsItems, formatPrice, formatNumber } from '../utils/mockData';
import { Leaderboard } from './Leaderboard';
import type { MarketAsset } from '../types';

declare const Chart: any;

type MarketTab = 'watchlist' | 'news' | 'portfolio' | 'leaderboard';
type AssetFilter = 'all' | 'crypto' | 'stock' | 'forex' | 'starred';
type TradingMode = 'demo' | 'live';

const STARTING_BALANCE = 10000;

// ─── CoinGecko ID map ─────────────────────────────────────────────────────────

const COINGECKO_IDS: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  BNB: 'binancecoin',
  ADA: 'cardano',
  XRP: 'ripple',
  DOGE: 'dogecoin',
  DOT: 'polkadot',
  LINK: 'chainlink',
  AVAX: 'avalanche-2',
  MATIC: 'matic-network',
  UNI: 'uniswap',
  ATOM: 'cosmos',
  LTC: 'litecoin',
  BCH: 'bitcoin-cash',
};

async function fetchLivePrices(assets: MarketAsset[]): Promise<Partial<Record<string, { price: number; change24h: number; high24h: number; low24h: number; vol: number; mcap: number }>>> {
  const cryptoAssets = assets.filter(a => a.type === 'crypto' && COINGECKO_IDS[a.symbol]);
  if (cryptoAssets.length === 0) return {};

  const ids = cryptoAssets.map(a => COINGECKO_IDS[a.symbol]).join(',');
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true&include_24hr_high_low=true`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return {};
    const data = await res.json();
    const result: any = {};
    cryptoAssets.forEach(a => {
      const id = COINGECKO_IDS[a.symbol];
      if (data[id]) {
        result[a.symbol] = {
          price: data[id].usd,
          change24h: data[id].usd_24h_change || 0,
          high24h: data[id].usd_24h_high || 0,
          low24h: data[id].usd_24h_low || 0,
          vol: data[id].usd_24h_vol || 0,
          mcap: data[id].usd_market_cap || 0,
        };
      }
    });
    return result;
  } catch {
    return {};
  }
}

function fmtVol(n: number) {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toFixed(0)}`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Holding {
  symbol: string;
  name: string;
  icon: string;
  quantity: number;
  avgCost: number;
}

interface PortfolioState {
  cash: number;
  holdings: Holding[];
  trades: TradeTx[];
  snapshots?: { date: string; value: number }[];
}

interface TradeTx {
  id: string;
  symbol: string;
  type: 'buy' | 'sell';
  quantity: number;
  price: number;
  total: number;
  timestamp: string;
  mode: 'demo' | 'live';
}

interface ExchangeConfig {
  exchange: string;
  apiKey: string;
  apiSecret: string;
  passphrase?: string;
  testnet?: boolean;
}

interface RealBalance {
  [asset: string]: number;
}

// ─── Portfolio helpers ────────────────────────────────────────────────────────

function loadPortfolio(userId: string): PortfolioState {
  try {
    const raw = localStorage.getItem(`portfolio_${userId}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { cash: STARTING_BALANCE, holdings: [], trades: [], snapshots: [] };
}

function savePortfolio(userId: string, state: PortfolioState) {
  localStorage.setItem(`portfolio_${userId}`, JSON.stringify(state));
}

function loadExchangeConfig(): ExchangeConfig | null {
  try {
    const raw = localStorage.getItem('exchange_config');
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function saveExchangeConfig(config: ExchangeConfig) {
  localStorage.setItem('exchange_config', JSON.stringify(config));
}

function clearExchangeConfig() {
  localStorage.removeItem('exchange_config');
}

function loadPinned(): Set<string> {
  try {
    const raw = localStorage.getItem('st_pinned_assets');
    if (raw) return new Set(JSON.parse(raw));
  } catch {}
  return new Set();
}

function savePinned(pins: Set<string>) {
  localStorage.setItem('st_pinned_assets', JSON.stringify([...pins]));
}

// ─── Crypto helpers ───────────────────────────────────────────────────────────

async function hmacSha256(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

const PROXY = 'https://corsproxy.io/?';

// ─── Exchange API calls ───────────────────────────────────────────────────────

async function fetchRealBalance(cfg: ExchangeConfig): Promise<{ ok: boolean; balance: RealBalance; msg: string }> {
  try {
    if (cfg.exchange === 'alpaca') {
      const base = cfg.testnet ? 'https://paper-api.alpaca.markets' : 'https://api.alpaca.markets';
      const res = await fetch(`${base}/v2/account`, {
        headers: { 'APCA-API-KEY-ID': cfg.apiKey, 'APCA-API-SECRET-KEY': cfg.apiSecret }
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      return { ok: true, balance: { USD: parseFloat(data.cash), PORTFOLIO: parseFloat(data.portfolio_value) }, msg: '' };
    }
    if (cfg.exchange === 'binance') {
      const ts = Date.now();
      const qs = `timestamp=${ts}`;
      const sig = await hmacSha256(cfg.apiSecret, qs);
      const url = `https://api.binance.com/api/v3/account?${qs}&signature=${sig}`;
      const res = await fetch(PROXY + encodeURIComponent(url), { headers: { 'X-MBX-APIKEY': cfg.apiKey } });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const bal: RealBalance = {};
      (data.balances || []).forEach((b: any) => { const free = parseFloat(b.free); if (free > 0) bal[b.asset] = free; });
      return { ok: true, balance: bal, msg: '' };
    }
    if (cfg.exchange === 'bybit') {
      const ts = Date.now().toString();
      const qs = `accountType=UNIFIED`;
      const toSign = ts + cfg.apiKey + '5000' + qs;
      const sig = await hmacSha256(cfg.apiSecret, toSign);
      const url = `https://api.bybit.com/v5/account/wallet-balance?${qs}`;
      const res = await fetch(PROXY + encodeURIComponent(url), { headers: { 'X-BAPI-API-KEY': cfg.apiKey, 'X-BAPI-TIMESTAMP': ts, 'X-BAPI-SIGN': sig, 'X-BAPI-RECV-WINDOW': '5000' } });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const coins = data?.result?.list?.[0]?.coin || [];
      const bal: RealBalance = {};
      coins.forEach((c: any) => { const v = parseFloat(c.walletBalance); if (v > 0) bal[c.coin] = v; });
      return { ok: true, balance: bal, msg: '' };
    }
    if (cfg.exchange === 'kucoin') {
      const ts = Date.now().toString();
      const path = '/api/v1/accounts';
      const toSign = ts + 'GET' + path;
      const sig = await hmacSha256(cfg.apiSecret, toSign);
      const ppSig = await hmacSha256(cfg.apiSecret, cfg.passphrase || '');
      const url = `https://api.kucoin.com${path}`;
      const res = await fetch(PROXY + encodeURIComponent(url), { headers: { 'KC-API-KEY': cfg.apiKey, 'KC-API-SIGN': btoa(sig), 'KC-API-TIMESTAMP': ts, 'KC-API-PASSPHRASE': btoa(ppSig), 'KC-API-KEY-VERSION': '2' } });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const bal: RealBalance = {};
      (data.data || []).forEach((a: any) => { if (a.type === 'trade') { const v = parseFloat(a.available); if (v > 0) bal[a.currency] = v; } });
      return { ok: true, balance: bal, msg: '' };
    }
    if (cfg.exchange === 'coinbase') {
      const ts = Math.floor(Date.now() / 1000).toString();
      const path = '/api/v3/brokerage/accounts';
      const toSign = ts + 'GET' + path;
      const sig = await hmacSha256(cfg.apiSecret, toSign);
      const url = `https://api.coinbase.com${path}`;
      const res = await fetch(PROXY + encodeURIComponent(url), { headers: { 'CB-ACCESS-KEY': cfg.apiKey, 'CB-ACCESS-SIGN': sig, 'CB-ACCESS-TIMESTAMP': ts } });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const bal: RealBalance = {};
      (data.accounts || []).forEach((a: any) => { const v = parseFloat(a.available_balance?.value || 0); if (v > 0) bal[a.currency] = v; });
      return { ok: true, balance: bal, msg: '' };
    }
    return { ok: false, balance: {}, msg: 'Unknown exchange' };
  } catch (e: any) {
    return { ok: false, balance: {}, msg: e.message || 'Connection failed' };
  }
}

async function placeRealOrder(cfg: ExchangeConfig, symbol: string, side: 'buy' | 'sell', quantity: number, price: number): Promise<{ ok: boolean; msg: string }> {
  try {
    if (cfg.exchange === 'alpaca') {
      const base = cfg.testnet ? 'https://paper-api.alpaca.markets' : 'https://api.alpaca.markets';
      const res = await fetch(`${base}/v2/orders`, { method: 'POST', headers: { 'APCA-API-KEY-ID': cfg.apiKey, 'APCA-API-SECRET-KEY': cfg.apiSecret, 'Content-Type': 'application/json' }, body: JSON.stringify({ symbol, qty: quantity, side, type: 'market', time_in_force: 'gtc' }) });
      const data = await res.json();
      if (!res.ok) return { ok: false, msg: data.message || 'Order failed' };
      return { ok: true, msg: `✅ ${side.toUpperCase()} order placed! ID: ${data.id?.slice(0, 8)}` };
    }
    if (cfg.exchange === 'binance') {
      const ts = Date.now();
      const pair = symbol.replace('/', '') + 'USDT';
      const body = `symbol=${pair}&side=${side.toUpperCase()}&type=MARKET&quantity=${quantity}&timestamp=${ts}`;
      const sig = await hmacSha256(cfg.apiSecret, body);
      const url = `https://api.binance.com/api/v3/order`;
      const res = await fetch(PROXY + encodeURIComponent(url), { method: 'POST', headers: { 'X-MBX-APIKEY': cfg.apiKey, 'Content-Type': 'application/x-www-form-urlencoded' }, body: body + `&signature=${sig}` });
      const data = await res.json();
      if (!res.ok) return { ok: false, msg: data.msg || 'Order failed' };
      return { ok: true, msg: `✅ ${side.toUpperCase()} order filled! OrderId: ${data.orderId}` };
    }
    if (cfg.exchange === 'bybit') {
      const ts = Date.now().toString();
      const bodyObj = { category: 'spot', symbol: symbol + 'USDT', side: side === 'buy' ? 'Buy' : 'Sell', orderType: 'Market', qty: quantity.toString() };
      const bodyStr = JSON.stringify(bodyObj);
      const toSign = ts + cfg.apiKey + '5000' + bodyStr;
      const sig = await hmacSha256(cfg.apiSecret, toSign);
      const url = `https://api.bybit.com/v5/order/create`;
      const res = await fetch(PROXY + encodeURIComponent(url), { method: 'POST', headers: { 'X-BAPI-API-KEY': cfg.apiKey, 'X-BAPI-TIMESTAMP': ts, 'X-BAPI-SIGN': sig, 'X-BAPI-RECV-WINDOW': '5000', 'Content-Type': 'application/json' }, body: bodyStr });
      const data = await res.json();
      if (data.retCode !== 0) return { ok: false, msg: data.retMsg || 'Order failed' };
      return { ok: true, msg: `✅ ${side.toUpperCase()} order placed! ID: ${data.result?.orderId?.slice(0, 8)}` };
    }
    return { ok: false, msg: 'Order placement not available for this exchange yet.' };
  } catch (e: any) {
    return { ok: false, msg: e.message || 'Order failed' };
  }
}

// ─── Exchange info ────────────────────────────────────────────────────────────

const EXCHANGES = [
  { id: 'binance', name: 'Binance', logo: '🟡', type: 'crypto', hasTestnet: false, keyLabel: 'API Key', secretLabel: 'API Secret', note: 'Create a key at Binance → Account → API Management' },
  { id: 'bybit', name: 'Bybit', logo: '🟠', type: 'crypto', hasTestnet: false, keyLabel: 'API Key', secretLabel: 'API Secret', note: 'Create a key at Bybit → Account → API' },
  { id: 'kucoin', name: 'KuCoin', logo: '🟢', type: 'crypto', hasTestnet: false, keyLabel: 'API Key', secretLabel: 'API Secret', hasPassphrase: true, note: 'Create a key at KuCoin → Account → API Management' },
  { id: 'coinbase', name: 'Coinbase', logo: '🔵', type: 'crypto', hasTestnet: false, keyLabel: 'API Key', secretLabel: 'API Secret', note: 'Create a key at Coinbase Advanced → Settings → API' },
  { id: 'alpaca', name: 'Alpaca', logo: '🦙', type: 'stocks', hasTestnet: true, keyLabel: 'API Key ID', secretLabel: 'API Secret Key', note: 'Free at alpaca.markets — supports stocks & crypto' },
];

// ─── Connect Exchange Modal ───────────────────────────────────────────────────

const ConnectExchangeModal: React.FC<{ onClose: () => void; onConnected: (cfg: ExchangeConfig) => void }> = ({ onClose, onConnected }) => {
  const [step, setStep] = useState<'pick' | 'form'>('pick');
  const [selected, setSelected] = useState<typeof EXCHANGES[0] | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [testnet, setTestnet] = useState(true);
  const [showSecret, setShowSecret] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleConnect = async () => {
    if (!selected || !apiKey || !apiSecret) { setError('Please fill all required fields'); return; }
    setLoading(true); setError('');
    const cfg: ExchangeConfig = { exchange: selected.id, apiKey, apiSecret, passphrase, testnet };
    const result = await fetchRealBalance(cfg);
    setLoading(false);
    if (!result.ok) { setError(`Connection failed: ${result.msg}`); return; }
    saveExchangeConfig(cfg);
    onConnected(cfg);
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'flex-end' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ width: '100%', maxWidth: 430, margin: '0 auto', background: '#0f0f1a', borderRadius: '28px 28px 0 0', padding: '24px 20px 40px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ width: 40, height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 2, margin: '0 auto 20px' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h2 style={{ color: '#fff', fontWeight: 800, fontSize: 20, margin: 0 }}>{step === 'pick' ? '🔗 Connect Exchange' : `${selected?.logo} ${selected?.name}`}</h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: '4px 0 0' }}>{step === 'pick' ? 'Choose your exchange to trade with real money' : selected?.note}</p>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: 36, height: 36, color: '#fff', fontSize: 20, cursor: 'pointer' }}>×</button>
        </div>
        {step === 'pick' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {EXCHANGES.map(ex => (
              <button key={ex.id} onClick={() => { setSelected(ex); setStep('form'); }} style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '14px 16px', cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ fontSize: 28, width: 44, height: 44, background: 'rgba(255,255,255,0.06)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{ex.logo}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>{ex.name}</div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{ex.type === 'stocks' ? '📈 Stocks + Crypto' : '₿ Crypto'}</div>
                </div>
                <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 18 }}>›</div>
              </button>
            ))}
            <div style={{ marginTop: 8, padding: '12px 14px', background: 'rgba(234,179,8,0.1)', borderRadius: 12, border: '1px solid rgba(234,179,8,0.2)' }}>
              <p style={{ color: 'rgba(255,220,100,0.8)', fontSize: 12, margin: 0 }}>⚠️ Your API keys are stored locally on your device only and never sent to our servers.</p>
            </div>
          </div>
        )}
        {step === 'form' && selected && (
          <div>
            <button onClick={() => setStep('pick')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 13, cursor: 'pointer', marginBottom: 16, padding: 0 }}>← Back</button>
            {selected.hasTestnet && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: '10px 14px', marginBottom: 16 }}>
                <span style={{ color: '#fff', fontSize: 13, flex: 1 }}>Use Paper Trading (Testnet)</span>
                <button onClick={() => setTestnet(t => !t)} style={{ width: 44, height: 24, borderRadius: 12, background: testnet ? '#22c55e' : 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: 2, left: testnet ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                </button>
              </div>
            )}
            {[
              { label: selected.keyLabel, val: apiKey, set: setApiKey, placeholder: 'Paste your API key here' },
              { label: selected.secretLabel, val: apiSecret, set: setApiSecret, placeholder: 'Paste your API secret here', secret: true },
              ...(selected.hasPassphrase ? [{ label: 'API Passphrase', val: passphrase, set: setPassphrase, placeholder: 'Your KuCoin passphrase' }] : []),
            ].map(field => (
              <div key={field.label} style={{ marginBottom: 14 }}>
                <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, letterSpacing: 1, display: 'block', marginBottom: 6 }}>{field.label.toUpperCase()}</label>
                <div style={{ position: 'relative' }}>
                  <input type={(field as any).secret && !showSecret ? 'password' : 'text'} value={field.val} onChange={e => field.set(e.target.value)} placeholder={field.placeholder}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '12px 44px 12px 14px', color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                  {(field as any).secret && (
                    <button onClick={() => setShowSecret(s => !s)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>
                      {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  )}
                </div>
              </div>
            ))}
            {error && (
              <div style={{ background: 'rgba(239,68,68,0.15)', borderRadius: 10, padding: '10px 14px', marginBottom: 14, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <AlertCircle size={15} color="#ef4444" style={{ marginTop: 1, flexShrink: 0 }} />
                <span style={{ color: '#ef4444', fontSize: 12 }}>{error}</span>
              </div>
            )}
            <button onClick={handleConnect} disabled={loading} style={{ width: '100%', padding: '15px', borderRadius: 16, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', background: loading ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #7c3aed, #4f46e5)', color: '#fff', fontWeight: 800, fontSize: 16 }}>
              {loading ? '⏳ Connecting...' : `🔗 Connect ${selected.name}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Sparkline ───────────────────────────────────────────────────────────────

const MiniSparkline: React.FC<{ data: number[]; positive: boolean }> = ({ data, positive }) => {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 64; const h = 28;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline points={pts} fill="none" stroke={positive ? '#22c55e' : '#ef4444'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

// ─── Trade Modal ──────────────────────────────────────────────────────────────

const TradeModal: React.FC<{
  asset: MarketAsset; mode: 'buy' | 'sell'; tradingMode: TradingMode;
  portfolio: PortfolioState; exchangeCfg: ExchangeConfig | null; realBalance: RealBalance;
  onClose: () => void; onTrade: (updated: PortfolioState) => void;
}> = ({ asset, mode, tradingMode, portfolio, exchangeCfg, realBalance, onClose, onTrade }) => {
  const [qty, setQty] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  const holding = portfolio.holdings.find(h => h.symbol === asset.symbol);
  const maxBuy = tradingMode === 'demo' ? portfolio.cash / asset.price : (realBalance['USDT'] || realBalance['USD'] || 0) / asset.price;
  const maxSell = tradingMode === 'demo' ? (holding?.quantity || 0) : (realBalance[asset.symbol] || 0);
  const total = parseFloat(qty || '0') * asset.price;

  const handleTrade = async () => {
    const amount = parseFloat(qty);
    if (!amount || amount <= 0) { setStatus('error'); setMsg('Enter a valid quantity'); return; }
    setStatus('loading'); setMsg('');

    if (tradingMode === 'live' && exchangeCfg) {
      const result = await placeRealOrder(exchangeCfg, asset.symbol, mode, amount, asset.price);
      if (!result.ok) { setStatus('error'); setMsg(result.msg); return; }
      setStatus('success'); setMsg(result.msg);
      setTimeout(onClose, 2000);
      return;
    }

    let updated = { ...portfolio, holdings: [...portfolio.holdings], trades: [...portfolio.trades] };
    if (mode === 'buy') {
      if (total > portfolio.cash) { setStatus('error'); setMsg('Insufficient funds'); return; }
      updated.cash = portfolio.cash - total;
      const idx = updated.holdings.findIndex(h => h.symbol === asset.symbol);
      if (idx >= 0) {
        const h = updated.holdings[idx];
        const newQty = h.quantity + amount;
        updated.holdings[idx] = { ...h, quantity: newQty, avgCost: (h.avgCost * h.quantity + total) / newQty };
      } else {
        updated.holdings.push({ symbol: asset.symbol, name: asset.name, icon: asset.icon, quantity: amount, avgCost: asset.price });
      }
    } else {
      if (amount > maxSell) { setStatus('error'); setMsg(`You only have ${maxSell.toFixed(4)} ${asset.symbol}`); return; }
      updated.cash = portfolio.cash + total;
      const idx = updated.holdings.findIndex(h => h.symbol === asset.symbol);
      if (idx >= 0) {
        const newQty = updated.holdings[idx].quantity - amount;
        if (newQty <= 0.0001) updated.holdings.splice(idx, 1);
        else updated.holdings[idx] = { ...updated.holdings[idx], quantity: newQty };
      }
    }

    // Add snapshot
    const holdingsValue = updated.holdings.reduce((s, h) => s + h.quantity * h.avgCost, 0);
    const snap = { date: new Date().toLocaleDateString(), value: parseFloat((updated.cash + holdingsValue).toFixed(2)) };
    const snaps = [...(updated.snapshots || [])];
    // Keep last 30
    if (snaps.length > 0 && snaps[snaps.length - 1].date === snap.date) snaps[snaps.length - 1] = snap;
    else snaps.push(snap);
    updated.snapshots = snaps.slice(-30);

    updated.trades.unshift({ id: Math.random().toString(36).slice(2), symbol: asset.symbol, type: mode, quantity: amount, price: asset.price, total, timestamp: new Date().toISOString(), mode: 'demo' });
    setStatus('success');
    setMsg(`${mode === 'buy' ? 'Bought' : 'Sold'} ${amount} ${asset.symbol} for $${total.toFixed(2)}`);
    onTrade(updated);
    setTimeout(onClose, 1500);
  };

  const presets = mode === 'buy'
    ? [0.25, 0.5, 0.75, 1].map(f => ({ label: `${f * 100}%`, val: (maxBuy * f).toFixed(4) }))
    : [0.25, 0.5, 0.75, 1].map(f => ({ label: `${f * 100}%`, val: (maxSell * f).toFixed(4) }));
  const isLive = tradingMode === 'live';

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'flex-end' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ width: '100%', maxWidth: 430, margin: '0 auto', background: '#12121f', borderRadius: '28px 28px 0 0', padding: '24px 20px 40px' }}>
        <div style={{ width: 40, height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 2, margin: '0 auto 20px' }} />
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, padding: '4px 12px', borderRadius: 20, background: isLive ? 'rgba(239,68,68,0.2)' : 'rgba(100,100,255,0.2)', color: isLive ? '#ef4444' : '#818cf8', border: `1px solid ${isLive ? 'rgba(239,68,68,0.3)' : 'rgba(129,140,248,0.3)'}` }}>
            {isLive ? '🔴 LIVE TRADE' : '📊 DEMO TRADE'}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 28 }}>{asset.icon}</div>
            <div>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: 18 }}>{mode === 'buy' ? '🟢 Buy' : '🔴 Sell'} {asset.symbol}</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>${asset.price.toLocaleString(undefined, { maximumFractionDigits: 4 })}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: 36, height: 36, color: '#fff', fontSize: 20, cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 14, padding: '12px 16px', marginBottom: 16 }}>
          {mode === 'buy' ? (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>Available {isLive ? (realBalance['USDT'] ? 'USDT' : 'USD') : 'Cash'}</span>
              <span style={{ color: '#22c55e', fontWeight: 700 }}>{isLive ? `$${(realBalance['USDT'] || realBalance['USD'] || 0).toFixed(2)}` : `$${portfolio.cash.toFixed(2)}`}</span>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>Your {asset.symbol}</span>
              <span style={{ color: '#ef4444', fontWeight: 700 }}>{maxSell.toFixed(4)} units</span>
            </div>
          )}
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 6, display: 'block' }}>QUANTITY ({asset.symbol})</label>
          <input type="number" value={qty} onChange={e => setQty(e.target.value)} placeholder="0.0000"
            style={{ width: '100%', background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '14px 16px', color: '#fff', fontSize: 20, fontWeight: 700, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {presets.map(p => (
            <button key={p.label} onClick={() => setQty(p.val)} style={{ flex: 1, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 4px', color: '#fff', fontSize: 12, cursor: 'pointer' }}>{p.label}</button>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, padding: '12px 16px', background: 'rgba(255,255,255,0.04)', borderRadius: 12 }}>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Total Value</span>
          <span style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>${total.toFixed(2)}</span>
        </div>
        {status === 'error' && <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(239,68,68,0.15)', borderRadius: 10, padding: '10px 14px', marginBottom: 14 }}><AlertCircle size={16} color="#ef4444" /><span style={{ color: '#ef4444', fontSize: 13 }}>{msg}</span></div>}
        {status === 'success' && <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(34,197,94,0.15)', borderRadius: 10, padding: '10px 14px', marginBottom: 14 }}><CheckCircle size={16} color="#22c55e" /><span style={{ color: '#22c55e', fontSize: 13 }}>{msg}</span></div>}
        {status === 'loading' && <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(99,102,241,0.15)', borderRadius: 10, padding: '10px 14px', marginBottom: 14 }}><Zap size={16} color="#818cf8" /><span style={{ color: '#818cf8', fontSize: 13 }}>Placing {isLive ? 'live' : 'demo'} order...</span></div>}
        <button onClick={handleTrade} disabled={status === 'loading'} style={{ width: '100%', padding: '16px', borderRadius: 16, border: 'none', cursor: status === 'loading' ? 'not-allowed' : 'pointer', background: mode === 'buy' ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'linear-gradient(135deg, #ef4444, #b91c1c)', color: '#fff', fontWeight: 800, fontSize: 17 }}>
          {isLive ? `⚡ Place Live ${mode === 'buy' ? 'Buy' : 'Sell'} Order` : `${mode === 'buy' ? '🟢 Confirm Demo Buy' : '🔴 Confirm Demo Sell'}`}
        </button>
        {isLive && <p style={{ textAlign: 'center', color: 'rgba(239,68,68,0.6)', fontSize: 11, marginTop: 8 }}>⚠️ This will execute a REAL order with REAL money</p>}
      </div>
    </div>
  );
};

// ─── Price Chart Modal ────────────────────────────────────────────────────────

const PriceChartModal: React.FC<{
  asset: MarketAsset; portfolio: PortfolioState; tradingMode: TradingMode;
  exchangeCfg: ExchangeConfig | null; realBalance: RealBalance;
  onClose: () => void; onTrade: (updated: PortfolioState) => void;
}> = ({ asset, portfolio, tradingMode, exchangeCfg, realBalance, onClose, onTrade }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<any>(null);
  const [period, setPeriod] = useState<'1H' | '4H' | '1D' | '1W'>('1D');
  const [tradeMode, setTradeMode] = useState<'buy' | 'sell' | null>(null);

  const genHistory = (base: number, points: number, vol: number) => {
    const labels: string[] = [], prices: number[] = [];
    let price = base * (0.85 + Math.random() * 0.1);
    const now = Date.now();
    const step = period === '1H' ? 2*60000 : period === '4H' ? 5*60000 : period === '1D' ? 15*60000 : 3600000;
    for (let i = points; i >= 0; i--) {
      const ts = new Date(now - i * step);
      labels.push(period === '1W' ? ts.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ts.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }));
      prices.push(parseFloat(price.toFixed(base < 1 ? 6 : 2)));
      price += (Math.random() - 0.47) * base * vol;
      if (price < 0) price = base * 0.5;
    }
    return { labels, prices };
  };

  useEffect(() => {
    if (!canvasRef.current) return;
    const points = period === '1H' ? 30 : period === '4H' ? 48 : period === '1D' ? 96 : 168;
    const vol = period === '1H' ? 0.003 : period === '4H' ? 0.006 : period === '1D' ? 0.012 : 0.02;
    const { labels, prices } = genHistory(asset.price, points, vol);
    const pos = asset.changePercent >= 0;
    if (chartRef.current) chartRef.current.destroy();
    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: { labels, datasets: [{ data: prices, borderColor: pos ? '#22c55e' : '#ef4444', backgroundColor: pos ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', fill: true, tension: 0.3, pointRadius: 0, borderWidth: 2 }] },
      options: {
        responsive: true, maintainAspectRatio: false, animation: { duration: 400 },
        interaction: { intersect: false, mode: 'index' },
        scales: {
          x: { type: 'category', grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.3)', maxTicksLimit: 6, font: { size: 10 }, maxRotation: 0 } },
          y: { position: 'right', grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.3)', font: { size: 10 }, callback: (v: any) => asset.price < 1 ? Number(v).toFixed(4) : '$' + Number(v).toLocaleString() } },
        },
        plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(20,20,30,0.95)', titleColor: 'rgba(255,255,255,0.6)', bodyColor: '#fff', callbacks: { label: (ctx: any) => ` $${Number(ctx.raw).toLocaleString()}` } } },
      },
    });
    return () => { if (chartRef.current) chartRef.current.destroy(); };
  }, [period, asset]);

  const pos = asset.changePercent >= 0;
  const holding = portfolio.holdings.find(h => h.symbol === asset.symbol);
  const isLive = tradingMode === 'live';

  return (
    <div className="fixed inset-0 z-[90] bg-base-100 flex flex-col max-w-md mx-auto">
      <div className="flex items-center gap-3 px-4 py-3 bg-base-200 border-b border-base-300 flex-shrink-0">
        <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle"><X size={18} /></button>
        <div className="w-9 h-9 bg-base-300 rounded-full flex items-center justify-center text-lg">{asset.icon}</div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-bold">{asset.symbol}</span>
            <span className={`badge badge-xs ${asset.type === 'crypto' ? 'badge-warning' : asset.type === 'stock' ? 'badge-info' : 'badge-success'}`}>{asset.type}</span>
            {isLive && <span className="badge badge-xs badge-error animate-pulse">LIVE</span>}
          </div>
          <p className="text-xs text-base-content/50">{asset.name}</p>
        </div>
        <div className="text-right">
          <p className="font-black text-lg">{formatPrice(asset.price, asset.symbol)}</p>
          <div className={`flex items-center gap-0.5 justify-end text-xs font-semibold ${pos ? 'text-success' : 'text-error'}`}>
            {pos ? <ArrowUp size={11} /> : <ArrowDown size={11} />}{pos ? '+' : ''}{asset.changePercent.toFixed(2)}%
          </div>
        </div>
      </div>
      <div className="flex justify-around px-4 py-2 bg-base-200 border-b border-base-300 text-center flex-shrink-0">
        <div><p className="text-[10px] text-base-content/40">24H High</p><p className="text-xs font-bold text-success">{formatPrice(asset.high24h, asset.symbol)}</p></div>
        <div><p className="text-[10px] text-base-content/40">24H Low</p><p className="text-xs font-bold text-error">{formatPrice(asset.low24h, asset.symbol)}</p></div>
        <div><p className="text-[10px] text-base-content/40">Volume</p><p className="text-xs font-bold">{asset.volume}</p></div>
        <div><p className="text-[10px] text-base-content/40">Mkt Cap</p><p className="text-xs font-bold">{asset.marketCap}</p></div>
      </div>
      {holding && (
        <div className="px-4 py-2 bg-base-200 border-b border-base-300 flex items-center gap-3 flex-shrink-0">
          <Wallet size={14} className="text-primary" />
          <span className="text-xs text-base-content/60">You hold <strong>{holding.quantity.toFixed(4)} {asset.symbol}</strong></span>
          <span className={`ml-auto text-xs font-bold ${asset.price >= holding.avgCost ? 'text-success' : 'text-error'}`}>
            {asset.price >= holding.avgCost ? '▲' : '▼'} {(((asset.price - holding.avgCost) / holding.avgCost) * 100).toFixed(2)}%
          </span>
        </div>
      )}
      <div className="flex gap-1 px-4 py-2 bg-base-100 flex-shrink-0">
        {(['1H', '4H', '1D', '1W'] as const).map(p => (
          <button key={p} onClick={() => setPeriod(p)} className={`btn btn-xs flex-1 ${period === p ? 'btn-primary' : 'btn-ghost opacity-50'}`}>{p}</button>
        ))}
      </div>
      <div className="flex-1 px-2 py-2"><canvas ref={canvasRef} className="w-full h-full" /></div>
      <div className="flex gap-2 px-4 py-3 border-t border-base-300 flex-shrink-0">
        <button onClick={() => setTradeMode('buy')} className={`btn flex-1 gap-1 ${isLive ? 'btn-error' : 'btn-success'}`}>
          <ShoppingCart size={15} /> {isLive ? '⚡ Live Buy' : 'Demo Buy'} {asset.symbol}
        </button>
        <button onClick={() => setTradeMode('sell')} className={`btn btn-outline flex-1 gap-1 ${isLive ? 'btn-warning' : 'btn-error'}`} disabled={!holding && tradingMode === 'demo'}>
          <MinusCircle size={15} /> {isLive ? '⚡ Live Sell' : 'Demo Sell'}
        </button>
      </div>
      {tradeMode && (
        <TradeModal asset={asset} mode={tradeMode} tradingMode={tradingMode} portfolio={portfolio} exchangeCfg={exchangeCfg} realBalance={realBalance} onClose={() => setTradeMode(null)} onTrade={(updated) => { onTrade(updated); setTradeMode(null); }} />
      )}
    </div>
  );
};

// ─── Asset Row ────────────────────────────────────────────────────────────────

const AssetRow: React.FC<{ asset: MarketAsset; onClick: () => void; pinned: boolean; onPin: () => void; isLive: boolean }> = ({ asset, onClick, pinned, onPin, isLive }) => {
  const pos = asset.changePercent >= 0;
  return (
    <div className="w-full flex items-center gap-3 py-3 border-b border-base-300 last:border-0">
      <button onClick={onPin} style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', flexShrink: 0 }}>
        <Star size={16} color={pinned ? '#f59e0b' : 'rgba(255,255,255,0.2)'} fill={pinned ? '#f59e0b' : 'none'} />
      </button>
      <button onClick={onClick} className="flex items-center gap-3 flex-1 text-left hover:bg-base-200/50 transition-colors rounded-lg" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
        <div className="w-10 h-10 rounded-full bg-base-200 flex items-center justify-center text-base font-bold flex-shrink-0">{asset.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="font-bold text-sm">{asset.symbol}</span>
            <span className={`badge badge-xs ${asset.type === 'crypto' ? 'badge-warning' : asset.type === 'stock' ? 'badge-info' : 'badge-success'} border-0`}>{asset.type}</span>
            {isLive && COINGECKO_IDS[asset.symbol] && <span style={{ fontSize: 8, color: '#22c55e', fontWeight: 700 }}>● LIVE</span>}
          </div>
          <span className="text-xs text-base-content/50">{asset.name}</span>
        </div>
        <div className="flex-shrink-0"><MiniSparkline data={asset.sparkline} positive={pos} /></div>
        <div className="text-right flex-shrink-0">
          <div className="font-bold text-sm">{formatPrice(asset.price, asset.symbol)}</div>
          <div className={`text-xs font-medium ${pos ? 'text-success' : 'text-error'}`}>{pos ? '+' : ''}{asset.changePercent.toFixed(2)}%</div>
        </div>
      </button>
    </div>
  );
};

// ─── Portfolio Analytics ──────────────────────────────────────────────────────

const AnalyticsPanel: React.FC<{ portfolio: PortfolioState; assets: MarketAsset[] }> = ({ portfolio, assets }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<any>(null);

  const holdingsValue = portfolio.holdings.reduce((s, h) => {
    const a = assets.find(x => x.symbol === h.symbol);
    return s + h.quantity * (a?.price || h.avgCost);
  }, 0);
  const totalValue = portfolio.cash + holdingsValue;
  const allTimePnL = totalValue - STARTING_BALANCE;
  const allTimePct = (allTimePnL / STARTING_BALANCE) * 100;

  const trades = portfolio.trades || [];
  const wins = trades.filter(t => {
    if (t.type === 'sell') {
      const buy = trades.find(b => b.symbol === t.symbol && b.type === 'buy' && new Date(b.timestamp) < new Date(t.timestamp));
      return buy ? t.price > buy.price : false;
    }
    return false;
  }).length;
  const sells = trades.filter(t => t.type === 'sell').length;
  const winRate = sells > 0 ? Math.round((wins / sells) * 100) : 0;

  const bestTrade = [...trades].filter(t => t.type === 'sell').sort((a, b) => b.total - a.total)[0];
  const worstTrade = [...trades].filter(t => t.type === 'sell').sort((a, b) => a.total - b.total)[0];

  // Build snapshot data for chart
  const snapshots = portfolio.snapshots || [];
  const chartData = snapshots.length > 1 ? snapshots : [
    { date: '7d ago', value: STARTING_BALANCE },
    { date: '6d ago', value: STARTING_BALANCE * (1 + (Math.random() - 0.5) * 0.02) },
    { date: '5d ago', value: STARTING_BALANCE * (1 + (Math.random() - 0.5) * 0.03) },
    { date: '4d ago', value: STARTING_BALANCE * (1 + (Math.random() - 0.5) * 0.02) },
    { date: '3d ago', value: STARTING_BALANCE * (1 + (Math.random() - 0.5) * 0.04) },
    { date: '2d ago', value: STARTING_BALANCE * (1 + (Math.random() - 0.5) * 0.03) },
    { date: 'Today', value: totalValue },
  ];

  useEffect(() => {
    if (!canvasRef.current) return;
    const pos = chartData[chartData.length - 1].value >= chartData[0].value;
    if (chartRef.current) chartRef.current.destroy();
    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels: chartData.map(s => s.date),
        datasets: [{
          data: chartData.map(s => s.value),
          borderColor: pos ? '#22c55e' : '#ef4444',
          backgroundColor: pos ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
          fill: true, tension: 0.4, pointRadius: 3, borderWidth: 2,
          pointBackgroundColor: pos ? '#22c55e' : '#ef4444',
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, animation: { duration: 600 },
        scales: {
          x: { type: 'category', grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: 'rgba(255,255,255,0.3)', font: { size: 10 } } },
          y: { position: 'right', grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: 'rgba(255,255,255,0.3)', font: { size: 10 }, callback: (v: any) => '$' + Number(v).toLocaleString() } },
        },
        plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(15,15,26,0.95)', bodyColor: '#fff', callbacks: { label: (ctx: any) => ` $${Number(ctx.raw).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` } } },
      },
    });
    return () => { if (chartRef.current) chartRef.current.destroy(); };
  }, [portfolio]);

  const stats = [
    { label: 'Total Value', value: `$${totalValue.toFixed(2)}`, color: '#fff' },
    { label: 'All-Time P&L', value: `${allTimePnL >= 0 ? '+' : ''}$${allTimePnL.toFixed(2)}`, color: allTimePnL >= 0 ? '#22c55e' : '#ef4444' },
    { label: 'Return %', value: `${allTimePct >= 0 ? '+' : ''}${allTimePct.toFixed(2)}%`, color: allTimePct >= 0 ? '#22c55e' : '#ef4444' },
    { label: 'Total Trades', value: `${trades.length}`, color: '#818cf8' },
    { label: 'Win Rate', value: sells > 0 ? `${winRate}%` : 'N/A', color: winRate >= 50 ? '#22c55e' : '#f59e0b' },
    { label: 'Holdings', value: `${portfolio.holdings.length}`, color: '#a78bfa' },
  ];

  return (
    <div className="p-4 space-y-4">
      <h3 className="font-bold text-base flex items-center gap-2"><Activity size={16} className="text-primary" /> Portfolio Analytics</h3>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        {stats.map(s => (
          <div key={s.label} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '12px 14px' }}>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', marginBottom: '4px' }}>{s.label}</div>
            <div style={{ color: s.color, fontSize: '16px', fontWeight: '800' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '16px' }}>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginBottom: '12px', fontWeight: '600' }}>PORTFOLIO VALUE OVER TIME</div>
        <div style={{ height: '160px' }}>
          <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
        </div>
      </div>

      {/* Best / Worst trades */}
      {(bestTrade || worstTrade) && (
        <div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '700', letterSpacing: 1, marginBottom: '10px' }}>NOTABLE TRADES</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {bestTrade && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '12px', padding: '12px 14px' }}>
                <span style={{ fontSize: '20px' }}>🏆</span>
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#fff', fontWeight: '600', fontSize: '13px' }}>Best: {bestTrade.symbol} SELL</div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>{bestTrade.quantity.toFixed(4)} @ ${bestTrade.price.toFixed(2)}</div>
                </div>
                <div style={{ color: '#22c55e', fontWeight: '700' }}>${bestTrade.total.toFixed(2)}</div>
              </div>
            )}
            {worstTrade && worstTrade.id !== bestTrade?.id && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', padding: '12px 14px' }}>
                <span style={{ fontSize: '20px' }}>📉</span>
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#fff', fontWeight: '600', fontSize: '13px' }}>Smallest: {worstTrade.symbol} SELL</div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>{worstTrade.quantity.toFixed(4)} @ ${worstTrade.price.toFixed(2)}</div>
                </div>
                <div style={{ color: '#ef4444', fontWeight: '700' }}>${worstTrade.total.toFixed(2)}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {trades.length === 0 && (
        <div style={{ textAlign: 'center', padding: '20px', color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>
          No trades yet — make your first trade to see analytics! 📊
        </div>
      )}
    </div>
  );
};

// ─── Portfolio Panel ──────────────────────────────────────────────────────────

const PortfolioPanel: React.FC<{
  portfolio: PortfolioState; assets: MarketAsset[]; userId: string;
  tradingMode: TradingMode; realBalance: RealBalance; exchangeCfg: ExchangeConfig | null;
}> = ({ portfolio, assets, tradingMode, realBalance, exchangeCfg }) => {
  const [view, setView] = useState<'holdings' | 'analytics'>('holdings');
  const isLive = tradingMode === 'live';

  const holdingsWithValue = portfolio.holdings.map(h => {
    const asset = assets.find(a => a.symbol === h.symbol);
    const currentPrice = asset?.price || h.avgCost;
    const currentValue = h.quantity * currentPrice;
    const costBasis = h.quantity * h.avgCost;
    const pnl = currentValue - costBasis;
    const pnlPct = (pnl / costBasis) * 100;
    return { ...h, currentPrice, currentValue, costBasis, pnl, pnlPct, icon: asset?.icon || h.icon };
  });

  const portfolioValue = holdingsWithValue.reduce((s, h) => s + h.currentValue, 0);
  const totalValue = portfolio.cash + portfolioValue;
  const totalPnL = totalValue - STARTING_BALANCE;
  const totalPnLPct = (totalPnL / STARTING_BALANCE) * 100;

  if (isLive && exchangeCfg) {
    const liveTotal = Object.values(realBalance).reduce((s, v) => s + v, 0);
    return (
      <div className="p-4 space-y-4">
        <div style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(124,58,237,0.1))', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 16, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />
            <span style={{ color: '#ef4444', fontWeight: 700, fontSize: 13 }}>LIVE ACCOUNT — {EXCHANGES.find(e => e.id === exchangeCfg.exchange)?.logo} {EXCHANGES.find(e => e.id === exchangeCfg.exchange)?.name}</span>
          </div>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 4 }}>Total Balance (approx USD)</div>
          <div style={{ color: '#fff', fontSize: 28, fontWeight: 900 }}>${liveTotal.toFixed(2)}</div>
        </div>
        <div>
          <h3 className="font-bold text-sm text-base-content/70 mb-2">REAL BALANCES</h3>
          <div className="space-y-2">
            {Object.entries(realBalance).length === 0 ? (
              <p className="text-center text-base-content/40 text-sm py-6">No balance data yet</p>
            ) : Object.entries(realBalance).map(([asset, amount]) => (
              <div key={asset} className="flex items-center gap-3 bg-base-200 rounded-xl p-3">
                <div className="w-9 h-9 rounded-full bg-base-300 flex items-center justify-center font-bold text-sm">{asset.slice(0, 2)}</div>
                <div className="flex-1"><div className="font-semibold text-sm">{asset}</div></div>
                <div className="font-bold text-sm">{amount.toFixed(4)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '0 16px' }}>
        {[{ id: 'holdings', label: '💼 Holdings' }, { id: 'analytics', label: '📊 Analytics' }].map(t => (
          <button key={t.id} onClick={() => setView(t.id as any)} style={{ flex: 1, background: 'none', border: 'none', borderBottom: view === t.id ? '2px solid #667eea' : '2px solid transparent', padding: '12px 8px', color: view === t.id ? '#667eea' : 'rgba(255,255,255,0.4)', fontWeight: view === t.id ? '700' : '500', fontSize: '13px', cursor: 'pointer' }}>
            {t.label}
          </button>
        ))}
      </div>

      {view === 'analytics' ? (
        <AnalyticsPanel portfolio={portfolio} assets={assets} />
      ) : (
        <div className="p-4 space-y-4">
          <div className="card bg-gradient-to-br from-primary/20 to-secondary/10 border border-primary/20">
            <div className="card-body p-4">
              <div className="text-sm text-base-content/60">Total Portfolio Value <span className="badge badge-xs badge-outline ml-1">DEMO</span></div>
              <div className="text-3xl font-black">${formatNumber(totalValue)}</div>
              <div className={`flex items-center gap-1 text-sm font-medium ${totalPnL >= 0 ? 'text-success' : 'text-error'}`}>
                {totalPnL >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {totalPnL >= 0 ? '+' : ''}{totalPnLPct.toFixed(2)}% (${totalPnL >= 0 ? '+' : ''}{totalPnL.toFixed(2)}) all time
              </div>
              <div className="flex gap-4 mt-2 text-sm">
                <div><span className="text-base-content/50">Cash: </span><span className="font-bold">${portfolio.cash.toFixed(2)}</span></div>
                <div><span className="text-base-content/50">Invested: </span><span className="font-bold">${portfolioValue.toFixed(2)}</span></div>
              </div>
            </div>
          </div>

          {holdingsWithValue.length === 0 ? (
            <div className="text-center py-10">
              <div className="text-4xl mb-3">📊</div>
              <p className="font-bold text-base-content/70">No demo holdings yet</p>
              <p className="text-sm text-base-content/40 mt-1">Tap any asset on Watchlist and buy!</p>
            </div>
          ) : (
            <>
              <div>
                <h3 className="font-bold text-sm text-base-content/70 mb-2">HOLDINGS</h3>
                <div className="space-y-2">
                  {holdingsWithValue.map(h => (
                    <div key={h.symbol} className="flex items-center gap-3 bg-base-200 rounded-xl p-3">
                      <div className="w-9 h-9 rounded-full bg-base-300 flex items-center justify-center text-base">{h.icon}</div>
                      <div className="flex-1">
                        <div className="font-semibold text-sm">{h.symbol}</div>
                        <div className="text-xs text-base-content/50">{h.quantity.toFixed(4)} @ avg ${h.avgCost.toFixed(2)}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-sm">${h.currentValue.toFixed(2)}</div>
                        <div className={`text-xs font-medium ${h.pnl >= 0 ? 'text-success' : 'text-error'}`}>{h.pnl >= 0 ? '+' : ''}{h.pnlPct.toFixed(2)}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {portfolio.trades.length > 0 && (
                <div>
                  <h3 className="font-bold text-sm text-base-content/70 mb-2">RECENT TRADES</h3>
                  <div className="space-y-1.5">
                    {portfolio.trades.slice(0, 10).map(t => (
                      <div key={t.id} className="flex items-center gap-2 text-sm bg-base-200 rounded-lg px-3 py-2">
                        <span className={t.type === 'buy' ? 'text-success font-bold' : 'text-error font-bold'}>{t.type === 'buy' ? '▲' : '▼'}</span>
                        <span className="font-semibold">{t.symbol}</span>
                        <span className="text-base-content/50 text-xs">{t.quantity.toFixed(4)} @ ${t.price.toFixed(2)}</span>
                        <span className={`badge badge-xs ml-1 ${t.mode === 'live' ? 'badge-error' : 'badge-ghost'}`}>{t.mode || 'demo'}</span>
                        <span className="ml-auto font-bold">${t.total.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

// ─── News ─────────────────────────────────────────────────────────────────────

const sentimentBadge: Record<string, string> = { bullish: 'badge-success', bearish: 'badge-error', neutral: 'badge-warning' };

// ─── Main Market Component ────────────────────────────────────────────────────

interface MarketProps { currentUser?: any }

export const Market: React.FC<MarketProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<MarketTab>('watchlist');
  const [filter, setFilter] = useState<AssetFilter>('all');
  const [assets, setAssets] = useState(marketAssets);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [ticking, setTicking] = useState(true);
  const [chartAsset, setChartAsset] = useState<MarketAsset | null>(null);
  const [tradingMode, setTradingMode] = useState<TradingMode>('demo');
  const [showConnect, setShowConnect] = useState(false);
  const [exchangeCfg, setExchangeCfg] = useState<ExchangeConfig | null>(loadExchangeConfig);
  const [realBalance, setRealBalance] = useState<RealBalance>({});
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [pinned, setPinned] = useState<Set<string>>(loadPinned);
  const [liveStatus, setLiveStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');

  const userId = currentUser?.id || 'guest';
  const [portfolio, setPortfolio] = useState<PortfolioState>(() => loadPortfolio(userId));

  useEffect(() => { setPortfolio(loadPortfolio(userId)); }, [userId]);

  const handleTrade = (updated: PortfolioState) => {
    setPortfolio(updated);
    savePortfolio(userId, updated);
  };

  const togglePin = (symbol: string) => {
    setPinned(prev => {
      const next = new Set(prev);
      if (next.has(symbol)) next.delete(symbol);
      else next.add(symbol);
      savePinned(next);
      return next;
    });
  };

  // Fetch live CoinGecko prices
  const refreshLivePrices = async () => {
    setLiveStatus('loading');
    const prices = await fetchLivePrices(assets);
    if (Object.keys(prices).length > 0) {
      setAssets(prev => prev.map(a => {
        const live = prices[a.symbol];
        if (!live) return a;
        return {
          ...a,
          price: live.price,
          changePercent: live.change24h,
          change: live.price * (live.change24h / 100),
          high24h: live.high24h || a.high24h,
          low24h: live.low24h || a.low24h,
          volume: live.vol > 0 ? fmtVol(live.vol) : a.volume,
          marketCap: live.mcap > 0 ? fmtVol(live.mcap) : a.marketCap,
          sparkline: [...a.sparkline.slice(1), live.price],
        };
      }));
      setLastUpdated(new Date());
      setLiveStatus('ok');
    } else {
      setLiveStatus('error');
    }
  };

  useEffect(() => {
    refreshLivePrices();
    const interval = setInterval(refreshLivePrices, 60000);
    return () => clearInterval(interval);
  }, []);

  // Real exchange balance
  useEffect(() => {
    if (tradingMode === 'live' && exchangeCfg) {
      setBalanceLoading(true);
      fetchRealBalance(exchangeCfg).then(res => {
        setBalanceLoading(false);
        if (res.ok) setRealBalance(res.balance);
      });
    }
  }, [tradingMode, exchangeCfg]);

  // Price ticking (for non-CoinGecko assets)
  useEffect(() => {
    if (!ticking) return;
    const interval = setInterval(() => {
      setAssets(prev => prev.map(a => {
        if (COINGECKO_IDS[a.symbol]) return a; // skip live assets
        const delta = (Math.random() - 0.48) * a.price * 0.001;
        const newPrice = Math.max(0.001, a.price + delta);
        const newChange = a.change + delta;
        return { ...a, price: newPrice, change: newChange, changePercent: (newChange / (newPrice - newChange)) * 100 };
      }));
    }, 3000);
    return () => clearInterval(interval);
  }, [ticking]);

  const filtered = (() => {
    if (filter === 'starred') return assets.filter(a => pinned.has(a.symbol));
    if (filter === 'all') return assets;
    return assets.filter(a => a.type === filter);
  })();

  const isLive = tradingMode === 'live';

  const portfolioTotal = portfolio.cash + portfolio.holdings.reduce((s, h) => {
    const a = assets.find(a => a.symbol === h.symbol);
    return s + h.quantity * (a?.price || h.avgCost);
  }, 0);
  const pnlPct = ((portfolioTotal - STARTING_BALANCE) / STARTING_BALANCE) * 100;

  const handleSwitchToLive = () => {
    if (!exchangeCfg) { setShowConnect(true); return; }
    setTradingMode('live');
  };

  const handleDisconnect = () => {
    clearExchangeConfig();
    setExchangeCfg(null);
    setRealBalance({});
    setTradingMode('demo');
  };

  const tabs = [
    { id: 'watchlist' as MarketTab, label: 'Watch', icon: <BarChart2 size={13} /> },
    { id: 'news' as MarketTab, label: 'News', icon: <Newspaper size={13} /> },
    { id: 'portfolio' as MarketTab, label: 'Portfolio', icon: <Wallet size={13} /> },
    { id: 'leaderboard' as MarketTab, label: 'Leaders', icon: <Trophy size={13} /> },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 bg-base-100 border-b border-base-300 sticky top-0 z-10 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold">Market Hub</h2>
          <div className="flex items-center gap-2">
            {liveStatus === 'ok' && <span style={{ fontSize: 10, color: '#22c55e', fontWeight: 700 }}>● LIVE</span>}
            {liveStatus === 'loading' && <span style={{ fontSize: 10, color: '#f59e0b' }}>● Fetching...</span>}
            {liveStatus === 'error' && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>● Simulated</span>}
            <span className="text-[10px] text-base-content/40">{lastUpdated.toLocaleTimeString()}</span>
            <button onClick={refreshLivePrices} className={`btn btn-ghost btn-xs btn-circle text-success`}>
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {/* Demo / Live toggle */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 10, background: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 4 }}>
          <button onClick={() => setTradingMode('demo')} style={{ flex: 1, padding: '8px 0', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, transition: 'all 0.2s', background: !isLive ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'transparent', color: !isLive ? '#fff' : 'rgba(255,255,255,0.4)' }}>📊 Demo</button>
          <button onClick={handleSwitchToLive} style={{ flex: 1, padding: '8px 0', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, transition: 'all 0.2s', background: isLive ? 'linear-gradient(135deg, #ef4444, #b91c1c)' : 'transparent', color: isLive ? '#fff' : 'rgba(255,255,255,0.4)' }}>
            {isLive ? '🔴 Live' : '⚡ Go Live'}
          </button>
        </div>

        {isLive && exchangeCfg && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '6px 12px', marginBottom: 8 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444' }} />
            <span style={{ color: '#ef4444', fontWeight: 700, fontSize: 12 }}>{EXCHANGES.find(e => e.id === exchangeCfg.exchange)?.logo} {EXCHANGES.find(e => e.id === exchangeCfg.exchange)?.name}{exchangeCfg.testnet ? ' (Paper)' : ' (Real)'}</span>
            {balanceLoading && <span style={{ color: 'rgba(239,68,68,0.6)', fontSize: 11 }}>Loading balance...</span>}
            <button onClick={handleDisconnect} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 11, cursor: 'pointer', textDecoration: 'underline' }}>Disconnect</button>
          </div>
        )}

        {!isLive && (
          <div className="flex gap-2 mb-2">
            <div className={`flex-1 rounded-lg p-2 text-center ${pnlPct >= 0 ? 'bg-success/10' : 'bg-error/10'}`}>
              <div className="text-xs text-base-content/50">Demo Portfolio</div>
              <div className={`font-bold text-sm flex items-center justify-center gap-1 ${pnlPct >= 0 ? 'text-success' : 'text-error'}`}>
                {pnlPct >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}${portfolioTotal.toFixed(0)}
              </div>
            </div>
            <div className="flex-1 bg-base-200 rounded-lg p-2 text-center">
              <div className="text-xs text-base-content/50">Cash</div>
              <div className="text-info font-bold text-sm">${portfolio.cash.toFixed(0)}</div>
            </div>
            <button onClick={() => setShowConnect(true)} style={{ flex: 1, background: 'linear-gradient(135deg, rgba(239,68,68,0.2), rgba(124,58,237,0.1))', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, cursor: 'pointer' }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>Connect</div>
              <div style={{ fontSize: 11, color: '#ef4444', fontWeight: 700 }}>⚡ Real</div>
            </button>
          </div>
        )}

        <div className="tabs tabs-boxed bg-base-200 rounded-lg p-0.5">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`tab flex-1 gap-1 text-xs px-1 ${activeTab === tab.id ? 'tab-active' : ''}`}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-20">
        {activeTab === 'watchlist' && (
          <div className="px-4">
            <div className="flex gap-2 py-3 overflow-x-auto">
              {(['all', 'crypto', 'stock', 'forex', 'starred'] as AssetFilter[]).map(f => (
                <button key={f} onClick={() => setFilter(f)} className={`btn btn-xs rounded-full flex-shrink-0 ${filter === f ? 'btn-primary' : 'btn-ghost border border-base-content/20'}`}>
                  {f === 'starred' ? `⭐ Starred${pinned.size > 0 ? ` (${pinned.size})` : ''}` : f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
            {filter === 'starred' && pinned.size === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>⭐</div>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>Tap ☆ next to any asset to star it!</p>
              </div>
            ) : (
              filtered.map(asset => (
                <AssetRow key={asset.id} asset={asset} onClick={() => setChartAsset(asset)} pinned={pinned.has(asset.symbol)} onPin={() => togglePin(asset.symbol)} isLive={liveStatus === 'ok'} />
              ))
            )}
            <p className="text-center text-xs text-base-content/30 py-3">
              {isLive ? '⚡ Live mode — orders go to your real exchange' : '📊 Demo mode — tap any asset to trade with $10k virtual'}
            </p>
          </div>
        )}

        {activeTab === 'news' && (
          <div className="p-4 space-y-3">
            {newsItems.map(item => (
              <div key={item.id} className="bg-base-200 rounded-xl p-3">
                <p className="text-sm font-medium leading-snug">{item.title}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-base-content/50">{item.source}</span>
                  <span className="text-xs text-base-content/40">·</span>
                  <span className="text-xs text-base-content/40">{item.time}</span>
                  <span className={`badge badge-xs ml-auto ${sentimentBadge[item.sentiment]} border-0 capitalize`}>{item.sentiment}</span>
                </div>
                <div className="flex gap-1 mt-2 flex-wrap">
                  {item.relatedAssets.map(a => <span key={a} className="badge badge-xs badge-outline">{a}</span>)}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'portfolio' && (
          <PortfolioPanel portfolio={portfolio} assets={assets} userId={userId} tradingMode={tradingMode} realBalance={realBalance} exchangeCfg={exchangeCfg} />
        )}
        {activeTab === 'leaderboard' && <Leaderboard />}
      </div>

      {chartAsset && (
        <PriceChartModal asset={chartAsset} portfolio={portfolio} tradingMode={tradingMode} exchangeCfg={exchangeCfg} realBalance={realBalance} onClose={() => setChartAsset(null)} onTrade={(updated) => { handleTrade(updated); }} />
      )}

      {showConnect && (
        <ConnectExchangeModal onClose={() => setShowConnect(false)} onConnected={(cfg) => { setExchangeCfg(cfg); setTradingMode('live'); }} />
      )}
    </div>
  );
};

export default Market;

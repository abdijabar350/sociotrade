import React, { useState, useEffect, useRef } from 'react';
import { TrendingUp, TrendingDown, RefreshCw, Newspaper, BarChart2, Wallet, Trophy, X, ArrowUp, ArrowDown, ShoppingCart, MinusCircle, CheckCircle, AlertCircle } from 'lucide-react';
import { marketAssets, newsItems, formatPrice, formatNumber } from '../utils/mockData';
import { Leaderboard } from './Leaderboard';
import type { MarketAsset } from '../types';

declare const Chart: any;

type MarketTab = 'watchlist' | 'news' | 'portfolio' | 'leaderboard';
type AssetFilter = 'all' | 'crypto' | 'stock' | 'forex';

const STARTING_BALANCE = 10000;

// ─── Portfolio helpers (localStorage) ───────────────────────────────────────

interface Holding {
  symbol: string;
  name: string;
  icon: string;
  quantity: number;
  avgCost: number; // per unit cost
}

interface PortfolioState {
  cash: number;
  holdings: Holding[];
  trades: TradeTx[];
}

interface TradeTx {
  id: string;
  symbol: string;
  type: 'buy' | 'sell';
  quantity: number;
  price: number;
  total: number;
  timestamp: string;
}

function loadPortfolio(userId: string): PortfolioState {
  try {
    const raw = localStorage.getItem(`portfolio_${userId}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { cash: STARTING_BALANCE, holdings: [], trades: [] };
}

function savePortfolio(userId: string, state: PortfolioState) {
  localStorage.setItem(`portfolio_${userId}`, JSON.stringify(state));
}

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
  asset: MarketAsset;
  mode: 'buy' | 'sell';
  portfolio: PortfolioState;
  onClose: () => void;
  onTrade: (updated: PortfolioState) => void;
}> = ({ asset, mode, portfolio, onClose, onTrade }) => {
  const [qty, setQty] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  const holding = portfolio.holdings.find(h => h.symbol === asset.symbol);
  const maxBuy = portfolio.cash / asset.price;
  const maxSell = holding?.quantity || 0;
  const total = parseFloat(qty || '0') * asset.price;

  const handleTrade = () => {
    const amount = parseFloat(qty);
    if (!amount || amount <= 0) { setStatus('error'); setMsg('Enter a valid quantity'); return; }

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
        if (newQty <= 0.0001) {
          updated.holdings.splice(idx, 1);
        } else {
          updated.holdings[idx] = { ...updated.holdings[idx], quantity: newQty };
        }
      }
    }

    updated.trades.unshift({
      id: Math.random().toString(36).slice(2),
      symbol: asset.symbol,
      type: mode,
      quantity: amount,
      price: asset.price,
      total,
      timestamp: new Date().toISOString(),
    });

    setStatus('success');
    setMsg(`${mode === 'buy' ? 'Bought' : 'Sold'} ${amount} ${asset.symbol} for $${total.toFixed(2)}`);
    onTrade(updated);
    setTimeout(onClose, 1500);
  };

  const presets = mode === 'buy'
    ? [0.25, 0.5, 0.75, 1].map(f => ({ label: `${f * 100}%`, val: (maxBuy * f).toFixed(4) }))
    : [0.25, 0.5, 0.75, 1].map(f => ({ label: `${f * 100}%`, val: (maxSell * f).toFixed(4) }));

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'flex-end' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ width: '100%', maxWidth: 430, margin: '0 auto', background: '#12121f', borderRadius: '28px 28px 0 0', padding: '24px 20px 40px' }}>
        <div style={{ width: 40, height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 2, margin: '0 auto 20px' }} />

        {/* Header */}
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

        {/* Balance info */}
        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 14, padding: '12px 16px', marginBottom: 16 }}>
          {mode === 'buy' ? (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>Available cash</span>
              <span style={{ color: '#22c55e', fontWeight: 700 }}>${portfolio.cash.toFixed(2)}</span>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>Your {asset.symbol}</span>
              <span style={{ color: '#ef4444', fontWeight: 700 }}>{maxSell.toFixed(4)} units</span>
            </div>
          )}
        </div>

        {/* Quantity input */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 6, display: 'block' }}>QUANTITY ({asset.symbol})</label>
          <input
            type="number"
            value={qty}
            onChange={e => setQty(e.target.value)}
            placeholder={`0.0000`}
            style={{
              width: '100%', background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,255,255,0.12)',
              borderRadius: 12, padding: '14px 16px', color: '#fff', fontSize: 20, fontWeight: 700,
              outline: 'none', boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Presets */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {presets.map(p => (
            <button key={p.label} onClick={() => setQty(p.val)} style={{
              flex: 1, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10, padding: '8px 4px', color: '#fff', fontSize: 12, cursor: 'pointer'
            }}>{p.label}</button>
          ))}
        </div>

        {/* Total */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, padding: '12px 16px', background: 'rgba(255,255,255,0.04)', borderRadius: 12 }}>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Total Value</span>
          <span style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>${total.toFixed(2)}</span>
        </div>

        {/* Status */}
        {status === 'error' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(239,68,68,0.15)', borderRadius: 10, padding: '10px 14px', marginBottom: 14 }}>
            <AlertCircle size={16} color="#ef4444" />
            <span style={{ color: '#ef4444', fontSize: 13 }}>{msg}</span>
          </div>
        )}
        {status === 'success' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(34,197,94,0.15)', borderRadius: 10, padding: '10px 14px', marginBottom: 14 }}>
            <CheckCircle size={16} color="#22c55e" />
            <span style={{ color: '#22c55e', fontSize: 13 }}>{msg}</span>
          </div>
        )}

        {/* CTA */}
        <button onClick={handleTrade} style={{
          width: '100%', padding: '16px', borderRadius: 16, border: 'none', cursor: 'pointer',
          background: mode === 'buy' ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'linear-gradient(135deg, #ef4444, #b91c1c)',
          color: '#fff', fontWeight: 800, fontSize: 17,
        }}>
          {mode === 'buy' ? '🟢 Confirm Buy' : '🔴 Confirm Sell'}
        </button>
      </div>
    </div>
  );
};

// ─── Price Chart Modal (with trading buttons) ─────────────────────────────────

const PriceChartModal: React.FC<{
  asset: MarketAsset;
  portfolio: PortfolioState;
  onClose: () => void;
  onTrade: (updated: PortfolioState) => void;
}> = ({ asset, portfolio, onClose, onTrade }) => {
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
      labels.push(period === '1W'
        ? ts.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
        : ts.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }));
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

  return (
    <div className="fixed inset-0 z-[90] bg-base-100 flex flex-col max-w-md mx-auto">
      <div className="flex items-center gap-3 px-4 py-3 bg-base-200 border-b border-base-300 flex-shrink-0">
        <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle"><X size={18} /></button>
        <div className="w-9 h-9 bg-base-300 rounded-full flex items-center justify-center text-lg">{asset.icon}</div>
        <div className="flex-1">
          <div className="flex items-center gap-2"><span className="font-bold">{asset.symbol}</span><span className={`badge badge-xs ${asset.type === 'crypto' ? 'badge-warning' : asset.type === 'stock' ? 'badge-info' : 'badge-success'}`}>{asset.type}</span></div>
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
        <button onClick={() => setTradeMode('buy')} className="btn btn-success flex-1 gap-1">
          <ShoppingCart size={15} /> Buy {asset.symbol}
        </button>
        <button onClick={() => setTradeMode('sell')} className="btn btn-error btn-outline flex-1 gap-1" disabled={!holding}>
          <MinusCircle size={15} /> Sell
        </button>
      </div>

      {tradeMode && (
        <TradeModal
          asset={asset}
          mode={tradeMode}
          portfolio={portfolio}
          onClose={() => setTradeMode(null)}
          onTrade={(updated) => { onTrade(updated); setTradeMode(null); }}
        />
      )}
    </div>
  );
};

// ─── Asset Row ────────────────────────────────────────────────────────────────

const AssetRow: React.FC<{ asset: MarketAsset; onClick: () => void }> = ({ asset, onClick }) => {
  const pos = asset.changePercent >= 0;
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 py-3 border-b border-base-300 last:border-0 hover:bg-base-200/50 transition-colors text-left px-1 rounded-lg">
      <div className="w-10 h-10 rounded-full bg-base-200 flex items-center justify-center text-base font-bold flex-shrink-0">{asset.icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="font-bold text-sm">{asset.symbol}</span>
          <span className={`badge badge-xs ${asset.type === 'crypto' ? 'badge-warning' : asset.type === 'stock' ? 'badge-info' : 'badge-success'} border-0`}>{asset.type}</span>
        </div>
        <span className="text-xs text-base-content/50">{asset.name}</span>
      </div>
      <div className="flex-shrink-0"><MiniSparkline data={asset.sparkline} positive={pos} /></div>
      <div className="text-right flex-shrink-0">
        <div className="font-bold text-sm">{formatPrice(asset.price, asset.symbol)}</div>
        <div className={`text-xs font-medium ${pos ? 'text-success' : 'text-error'}`}>{pos ? '+' : ''}{asset.changePercent.toFixed(2)}%</div>
      </div>
    </button>
  );
};

// ─── Portfolio Panel ──────────────────────────────────────────────────────────

const PortfolioPanel: React.FC<{ portfolio: PortfolioState; assets: MarketAsset[]; userId: string }> = ({ portfolio, assets, userId }) => {
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
  const startingValue = STARTING_BALANCE;
  const totalPnL = totalValue - startingValue;
  const totalPnLPct = (totalPnL / startingValue) * 100;

  return (
    <div className="p-4 space-y-4">
      {/* Summary card */}
      <div className="card bg-gradient-to-br from-primary/20 to-secondary/10 border border-primary/20">
        <div className="card-body p-4">
          <div className="text-sm text-base-content/60">Total Portfolio Value</div>
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
          <p className="font-bold text-base-content/70">No holdings yet</p>
          <p className="text-sm text-base-content/40 mt-1">Go to the Watchlist tab and buy your first asset!</p>
          <p className="text-xs text-base-content/30 mt-2">Starting balance: $10,000</p>
        </div>
      ) : (
        <>
          {/* Allocation bar */}
          <div>
            <h3 className="font-bold text-sm text-base-content/70 mb-2">ALLOCATION</h3>
            <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
              <div className="bg-base-300 rounded-full" style={{ width: `${(portfolio.cash / totalValue) * 100}%` }} title="Cash" />
              {holdingsWithValue.map((h, i) => (
                <div key={h.symbol} style={{ width: `${(h.currentValue / totalValue) * 100}%`, background: `hsl(${(i * 67) % 360}, 65%, 55%)` }} />
              ))}
            </div>
            <div className="flex gap-3 mt-2 flex-wrap">
              <div className="flex items-center gap-1 text-xs"><div className="w-2 h-2 rounded-full bg-base-300" /><span className="text-base-content/60">Cash</span></div>
              {holdingsWithValue.map((h, i) => (
                <div key={h.symbol} className="flex items-center gap-1 text-xs">
                  <div className="w-2 h-2 rounded-full" style={{ background: `hsl(${(i * 67) % 360}, 65%, 55%)` }} />
                  <span className="text-base-content/60">{h.symbol} {((h.currentValue / totalValue) * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Holdings list */}
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
                    <div className={`text-xs font-medium ${h.pnl >= 0 ? 'text-success' : 'text-error'}`}>
                      {h.pnl >= 0 ? '+' : ''}{h.pnlPct.toFixed(2)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent trades */}
          {portfolio.trades.length > 0 && (
            <div>
              <h3 className="font-bold text-sm text-base-content/70 mb-2">RECENT TRADES</h3>
              <div className="space-y-1.5">
                {portfolio.trades.slice(0, 10).map(t => (
                  <div key={t.id} className="flex items-center gap-2 text-sm bg-base-200 rounded-lg px-3 py-2">
                    <span className={t.type === 'buy' ? 'text-success font-bold' : 'text-error font-bold'}>{t.type === 'buy' ? '▲' : '▼'}</span>
                    <span className="font-semibold">{t.symbol}</span>
                    <span className="text-base-content/50 text-xs">{t.quantity.toFixed(4)} @ ${t.price.toFixed(2)}</span>
                    <span className="ml-auto font-bold">${t.total.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ─── News ─────────────────────────────────────────────────────────────────────

const sentimentBadge: Record<string, string> = { bullish: 'badge-success', bearish: 'badge-error', neutral: 'badge-warning' };

// ─── Main Market ──────────────────────────────────────────────────────────────

interface MarketProps { currentUser?: any }

export const Market: React.FC<MarketProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<MarketTab>('watchlist');
  const [filter, setFilter] = useState<AssetFilter>('all');
  const [assets, setAssets] = useState(marketAssets);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [ticking, setTicking] = useState(true);
  const [chartAsset, setChartAsset] = useState<MarketAsset | null>(null);

  const userId = currentUser?.id || 'guest';
  const [portfolio, setPortfolio] = useState<PortfolioState>(() => loadPortfolio(userId));

  useEffect(() => {
    setPortfolio(loadPortfolio(userId));
  }, [userId]);

  const handleTrade = (updated: PortfolioState) => {
    setPortfolio(updated);
    savePortfolio(userId, updated);
  };

  useEffect(() => {
    if (!ticking) return;
    const interval = setInterval(() => {
      setAssets(prev => prev.map(a => {
        const delta = (Math.random() - 0.48) * a.price * 0.001;
        const newPrice = Math.max(0.001, a.price + delta);
        const newChange = a.change + delta;
        const newChangePct = (newChange / (newPrice - newChange)) * 100;
        return { ...a, price: newPrice, change: newChange, changePercent: newChangePct };
      }));
      setLastUpdated(new Date());
    }, 3000);
    return () => clearInterval(interval);
  }, [ticking]);

  const filtered = filter === 'all' ? assets : assets.filter(a => a.type === filter);

  const tabs = [
    { id: 'watchlist' as MarketTab, label: 'Watch', icon: <BarChart2 size={13} /> },
    { id: 'news' as MarketTab, label: 'News', icon: <Newspaper size={13} /> },
    { id: 'portfolio' as MarketTab, label: 'Portfolio', icon: <Wallet size={13} /> },
    { id: 'leaderboard' as MarketTab, label: 'Leaders', icon: <Trophy size={13} /> },
  ];

  const portfolioTotal = portfolio.cash + portfolio.holdings.reduce((s, h) => {
    const a = assets.find(a => a.symbol === h.symbol);
    return s + h.quantity * (a?.price || h.avgCost);
  }, 0);
  const pnlPct = ((portfolioTotal - STARTING_BALANCE) / STARTING_BALANCE) * 100;

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 bg-base-100 border-b border-base-300 sticky top-0 z-10 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold">Market Hub</h2>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-base-content/40">{lastUpdated.toLocaleTimeString()}</span>
            <button onClick={() => setTicking(t => !t)} className={`btn btn-ghost btn-xs btn-circle ${ticking ? 'text-success' : 'opacity-40'}`}>
              <RefreshCw size={14} className={ticking ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Portfolio quick stats */}
        <div className="flex gap-2 mb-2">
          <div className={`flex-1 rounded-lg p-2 text-center ${pnlPct >= 0 ? 'bg-success/10' : 'bg-error/10'}`}>
            <div className="text-xs text-base-content/50">My Portfolio</div>
            <div className={`font-bold text-sm flex items-center justify-center gap-1 ${pnlPct >= 0 ? 'text-success' : 'text-error'}`}>
              {pnlPct >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}${portfolioTotal.toFixed(0)}
            </div>
          </div>
          <div className="flex-1 bg-success/10 rounded-lg p-2 text-center">
            <div className="text-xs text-base-content/50">Crypto</div>
            <div className="text-success font-bold text-sm flex items-center justify-center gap-1"><TrendingUp size={12} />+2.4%</div>
          </div>
          <div className="flex-1 bg-error/10 rounded-lg p-2 text-center">
            <div className="text-xs text-base-content/50">Cash</div>
            <div className="text-info font-bold text-sm">${portfolio.cash.toFixed(0)}</div>
          </div>
        </div>

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
            <div className="flex gap-2 py-3">
              {(['all', 'crypto', 'stock', 'forex'] as AssetFilter[]).map(f => (
                <button key={f} onClick={() => setFilter(f)} className={`btn btn-xs rounded-full ${filter === f ? 'btn-primary' : 'btn-ghost border border-base-content/20'}`}>
                  {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
            {filtered.map(asset => <AssetRow key={asset.id} asset={asset} onClick={() => setChartAsset(asset)} />)}
            <p className="text-center text-xs text-base-content/30 py-3">Tap any asset → view chart → Buy or Sell 📈</p>
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

        {activeTab === 'portfolio' && <PortfolioPanel portfolio={portfolio} assets={assets} userId={userId} />}
        {activeTab === 'leaderboard' && <Leaderboard />}
      </div>

      {chartAsset && (
        <PriceChartModal
          asset={chartAsset}
          portfolio={portfolio}
          onClose={() => setChartAsset(null)}
          onTrade={(updated) => { handleTrade(updated); }}
        />
      )}
    </div>
  );
};

export default Market;

import React, { useState } from 'react';
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, CheckCircle, TrendingUp, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import type { Post } from '../types';
import { formatNumber } from '../utils/mockData';
import { isVerified } from '../utils/verified';

const avatarColors: Record<string, string> = {
  AJ: 'bg-primary text-primary-content',
  KN: 'bg-warning text-warning-content',
  LR: 'bg-secondary text-secondary-content',
  AC: 'bg-info text-info-content',
  MT: 'bg-success text-success-content',
  DO: 'bg-accent text-accent-content',
};

interface PostCardProps {
  post: Post;
  onUpdate: (post: Post) => void;
}

export const PostCard: React.FC<PostCardProps> = ({ post, onUpdate }) => {
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [showFullCaption, setShowFullCaption] = useState(false);

  const handleLike = () => {
    onUpdate({ ...post, isLiked: !post.isLiked, likes: post.isLiked ? post.likes - 1 : post.likes + 1 });
  };

  const handleBookmark = () => {
    onUpdate({ ...post, isBookmarked: !post.isBookmarked });
  };

  const signalColor = (action: string) => {
    if (action === 'BUY') return 'text-success bg-success/10 border-success/30';
    if (action === 'SELL') return 'text-error bg-error/10 border-error/30';
    return 'text-warning bg-warning/10 border-warning/30';
  };

  const signalIcon = (action: string) => {
    if (action === 'BUY') return <ArrowUpRight size={14} />;
    if (action === 'SELL') return <ArrowDownRight size={14} />;
    return <Minus size={14} />;
  };

  return (
    <div className="bg-base-100 border-b border-base-300">
      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-3">
        <div className="relative">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${avatarColors[post.avatar] || 'bg-base-300'}`}>
            {post.avatar}
          </div>
          {post.isTrader && (
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-warning rounded-full flex items-center justify-center">
              <TrendingUp size={8} className="text-warning-content" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="font-semibold text-sm">{post.username}</span>
            {(() => {
              const isOwner = post.username === 'abdijabar350' || post.username === 'abdijabar'
              const verified = post.isVerified || isOwner || isVerified({ username: post.username, followers: (post as any).followers })
              if (!verified) return null
              return isOwner
                ? <span title="Owner — Verified" style={{ fontSize: '13px' }}>🏅</span>
                : <CheckCircle size={13} className="text-info" />
            })()}
          </div>
          <span className="text-xs text-base-content/50">{post.time}</span>
        </div>
        <button className="opacity-50 hover:opacity-80">
          <MoreHorizontal size={20} />
        </button>
      </div>

      {/* Image */}
      {post.imageGradient && (
        <div className={`w-full aspect-square bg-gradient-to-br ${post.imageGradient} relative flex items-end`}>
          {post.type === 'market-signal' && post.tradeSignal && (
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <div className="bg-base-100/90 backdrop-blur-sm rounded-2xl p-4 w-full max-w-xs">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold text-lg">{post.tradeSignal.asset}</span>
                  <span className={`badge border font-bold text-xs flex items-center gap-1 ${signalColor(post.tradeSignal.action)}`}>
                    {signalIcon(post.tradeSignal.action)} {post.tradeSignal.action}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-base-200 rounded-lg p-2">
                    <div className="text-base-content/50">Entry</div>
                    <div className="font-bold text-sm">{post.tradeSignal.entry.toLocaleString()}</div>
                  </div>
                  <div className="bg-success/10 rounded-lg p-2">
                    <div className="text-success/80">Target</div>
                    <div className="font-bold text-sm text-success">{post.tradeSignal.target.toLocaleString()}</div>
                  </div>
                  <div className="bg-error/10 rounded-lg p-2">
                    <div className="text-error/80">Stop</div>
                    <div className="font-bold text-sm text-error">{post.tradeSignal.stopLoss.toLocaleString()}</div>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-base-content/60">Confidence</span>
                    <span className="font-bold text-primary">{post.tradeSignal.confidence}%</span>
                  </div>
                  <progress className="progress progress-primary w-full h-1.5" value={post.tradeSignal.confidence} max={100} />
                </div>
                <div className="mt-2 text-xs text-base-content/50 text-center">Timeframe: {post.tradeSignal.timeframe}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="px-3 pt-2 pb-1">
        <div className="flex items-center gap-3">
          <button onClick={handleLike} className={`transition-all ${post.isLiked ? 'text-error scale-110' : 'opacity-70 hover:opacity-100'}`}>
            <Heart size={24} fill={post.isLiked ? 'currentColor' : 'none'} />
          </button>
          <button onClick={() => setShowComments(!showComments)} className="opacity-70 hover:opacity-100">
            <MessageCircle size={24} />
          </button>
          <button className="opacity-70 hover:opacity-100">
            <Send size={24} />
          </button>
          <button onClick={handleBookmark} className={`ml-auto transition-all ${post.isBookmarked ? 'text-primary' : 'opacity-70 hover:opacity-100'}`}>
            <Bookmark size={24} fill={post.isBookmarked ? 'currentColor' : 'none'} />
          </button>
        </div>
        <div className="mt-1 text-sm font-semibold">{formatNumber(post.likes)} likes</div>
      </div>

      {/* Caption */}
      <div className="px-3 pb-2 text-sm">
        <span className="font-semibold mr-1">{post.username}</span>
        <span className={showFullCaption ? '' : 'line-clamp-2'}>
          {post.caption}
        </span>
        {post.caption.length > 80 && !showFullCaption && (
          <button onClick={() => setShowFullCaption(true)} className="text-base-content/50 ml-1 hover:text-base-content/80">
            more
          </button>
        )}
        <div className="mt-1 flex flex-wrap gap-1">
          {post.tags.map(tag => (
            <span key={tag} className="text-primary text-xs">#{tag}</span>
          ))}
        </div>
      </div>

      {/* Comments toggle */}
      {post.comments.length > 0 && (
        <button onClick={() => setShowComments(!showComments)} className="px-3 pb-1 text-xs text-base-content/50 hover:text-base-content/70">
          {showComments ? 'Hide comments' : `View all ${post.comments.length} comments`}
        </button>
      )}

      {/* Comments */}
      {showComments && (
        <div className="px-3 pb-2 space-y-2">
          {post.comments.map(c => (
            <div key={c.id} className="flex gap-2 text-sm">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${avatarColors[c.avatar] || 'bg-base-300'}`}>
                {c.avatar}
              </div>
              <div className="flex-1">
                <span className="font-semibold text-xs">{c.username} </span>
                <span className="text-xs">{c.text}</span>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-[10px] text-base-content/40">{c.time}</span>
                  <span className="text-[10px] text-base-content/40">{c.likes} likes</span>
                </div>
              </div>
            </div>
          ))}
          <div className="flex gap-2 items-center mt-2">
            <div className="w-7 h-7 rounded-full bg-primary text-primary-content flex items-center justify-center text-[10px] font-bold flex-shrink-0">AJ</div>
            <input
              className="input input-bordered input-xs flex-1"
              placeholder="Add a comment..."
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && newComment.trim()) setNewComment(''); }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

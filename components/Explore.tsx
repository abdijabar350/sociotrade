import React, { useState } from 'react';
import { Search, CheckCircle, TrendingUp, UserPlus } from 'lucide-react';
import { exploreCreators, trendingTags, posts, formatNumber } from '../utils/mockData';

const avatarColors: Record<string, string> = {
  AJ: 'bg-primary text-primary-content',
  KN: 'bg-warning text-warning-content',
  LR: 'bg-secondary text-secondary-content',
  AC: 'bg-info text-info-content',
  MT: 'bg-success text-success-content',
  DO: 'bg-accent text-accent-content',
};

const gradients = [
  'from-orange-500 to-yellow-400',
  'from-purple-600 to-blue-500',
  'from-pink-500 to-red-400',
  'from-green-500 to-teal-400',
  'from-blue-600 to-indigo-500',
  'from-rose-500 to-orange-400',
];

interface ExploreProps {
  onUserClick?: (username: string) => void
}

export const Explore: React.FC<ExploreProps> = ({ onUserClick }) => {
  const [query, setQuery] = useState('');
  const [following, setFollowing] = useState<Set<string>>(new Set());

  const toggleFollow = (id: string) => {
    setFollowing(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filteredCreators = exploreCreators.filter(u =>
    !query || u.username.includes(query.toLowerCase()) || u.displayName.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 bg-base-100 border-b border-base-300 sticky top-0 z-10">
        <h2 className="text-lg font-bold mb-2">Explore</h2>
        <label className="input input-bordered flex items-center gap-2 input-sm">
          <Search className="h-[1em] opacity-50" />
          <input
            type="search"
            className="grow"
            placeholder="Search creators, tags, assets..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </label>
      </div>

      <div className="flex-1 overflow-y-auto pb-20">
        {/* Grid of posts */}
        {!query && (
          <>
            <div className="p-3">
              <h3 className="text-sm font-bold mb-2 text-base-content/70">TRENDING POSTS</h3>
              <div className="grid grid-cols-3 gap-1">
                {posts.map((post, i) => (
                  <div
                    key={post.id}
                    className={`aspect-square rounded-lg bg-gradient-to-br ${post.imageGradient || gradients[i % gradients.length]} relative overflow-hidden cursor-pointer`}
                  >
                    <div className="absolute inset-0 flex items-end p-1">
                      <div className="text-[9px] text-white/90 font-medium bg-base-900/50 rounded px-1 line-clamp-1">
                        {post.username}
                      </div>
                    </div>
                    {post.type === 'market-signal' && (
                      <div className="absolute top-1 right-1">
                        <span className="badge badge-xs bg-success border-0 text-success-content">SIGNAL</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Trending Tags */}
            <div className="px-3 pb-3">
              <h3 className="text-sm font-bold mb-2 text-base-content/70">TRENDING TAGS</h3>
              <div className="flex flex-wrap gap-2">
                {trendingTags.map(tag => (
                  <button key={tag} className="btn btn-outline btn-xs rounded-full">
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Creators to follow */}
        <div className="px-3 pb-3">
          <h3 className="text-sm font-bold mb-2 text-base-content/70">
            {query ? 'RESULTS' : 'SUGGESTED CREATORS'}
          </h3>
          <div className="space-y-3">
            {filteredCreators.map(creator => (
              <div key={creator.id} className="flex items-center gap-3 bg-base-200 rounded-xl p-3">
                <div className="relative" style={{ cursor: onUserClick ? 'pointer' : 'default' }} onClick={() => onUserClick && onUserClick(creator.username)}>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold ${avatarColors[creator.avatar] || 'bg-base-300'}`}>
                    {creator.avatar}
                  </div>
                  {creator.isTrader && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-warning rounded-full flex items-center justify-center">
                      <TrendingUp size={10} className="text-warning-content" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-sm truncate">{creator.username}</span>
                    {creator.isVerified && <CheckCircle size={12} className="text-info flex-shrink-0" />}
                  </div>
                  <p className="text-xs text-base-content/60 truncate">{creator.bio}</p>
                  <div className="flex gap-3 mt-1 text-xs text-base-content/50">
                    <span><strong>{formatNumber(creator.followers)}</strong> followers</span>
                    {creator.isTrader && creator.portfolioGain && (
                      <span className="text-success">+{creator.portfolioGain}% portfolio</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => toggleFollow(creator.id)}
                  className={`btn btn-sm ${following.has(creator.id) ? 'btn-ghost border border-base-content/20' : 'btn-primary'} gap-1`}
                >
                  {following.has(creator.id) ? 'Following' : <><UserPlus size={13} /> Follow</>}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
export default Explore;

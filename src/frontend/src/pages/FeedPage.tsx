import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles } from "lucide-react";
import React, { useState } from "react";
import PostCard from "../components/PostCard";
import StoriesRow from "../components/StoriesRow";
import TrendingProfilesSection from "../components/TrendingProfilesSection";
import {
  type Post,
  useGetFeedPosts,
  useGetLikedPosts,
} from "../hooks/useQueries";

const PAGE_SIZE = 20;

function PostCardSkeleton() {
  return (
    <div className="bg-surface-1 border border-border rounded-2xl overflow-hidden shadow-card">
      <div className="flex items-center gap-3 px-4 py-3">
        <Skeleton className="w-9 h-9 rounded-full" />
        <div className="space-y-1.5 flex-1">
          <Skeleton className="w-28 h-4 rounded" />
          <Skeleton className="w-16 h-3 rounded" />
        </div>
      </div>
      <Skeleton className="w-full h-56" />
      <div className="px-4 py-2">
        <Skeleton className="w-3/4 h-4 rounded" />
      </div>
      <div className="flex gap-2 px-4 py-2 border-t border-border/50">
        <Skeleton className="w-16 h-8 rounded-xl" />
        <Skeleton className="w-10 h-8 rounded-xl" />
        <Skeleton className="w-10 h-8 rounded-xl" />
      </div>
    </div>
  );
}

export default function FeedPage() {
  const { data: posts = [], isLoading: postsLoading } = useGetFeedPosts();
  const { data: likedPosts = [] } = useGetLikedPosts();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const likedPostIds = new Set(likedPosts.map((p: Post) => p.id.toString()));

  const sortedPosts = [...posts].sort(
    (a, b) => Number(b.timestamp) - Number(a.timestamp),
  );

  // Slice to the current page — prevents loading all posts into DOM at once
  const visiblePosts = sortedPosts.slice(0, visibleCount);
  const hasMore = visibleCount < sortedPosts.length;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Hero accent */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-gold-500/5 to-transparent pointer-events-none" />
        <div className="relative px-4 pt-4 pb-2">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-gold-400" />
            <h1 className="text-foreground font-display font-bold text-lg tracking-tight">
              Your Feed
            </h1>
          </div>
          <p className="text-muted-foreground text-xs">
            Posts from creators across Smileup
          </p>
        </div>
      </div>

      {/* Stories */}
      <StoriesRow />

      {/* Trending Profiles */}
      <TrendingProfilesSection />

      {/* Divider */}
      <div className="mx-4 my-3 border-t border-border/50" />

      {/* Posts */}
      <div className="px-4 space-y-4">
        {postsLoading ? (
          Array.from({ length: 3 }, (_, i) => `feed-skeleton-${i}`).map(
            (k, i) => (
              <div
                key={k}
                className="animate-fade-in"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <PostCardSkeleton />
              </div>
            ),
          )
        ) : sortedPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Sparkles className="w-12 h-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground text-sm font-medium">
              Your feed is empty
            </p>
            <p className="text-muted-foreground/60 text-xs mt-1">
              Shadow some creators to see their posts here
            </p>
          </div>
        ) : (
          <>
            {visiblePosts.map((post: Post, i) => (
              <div
                key={post.id.toString()}
                className="animate-fade-in"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <PostCard
                  post={post}
                  isLiked={likedPostIds.has(post.id.toString())}
                />
              </div>
            ))}
            {hasMore && (
              <div className="py-4 flex justify-center">
                <button
                  type="button"
                  data-ocid="feed.load_more_button"
                  onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                  className="px-6 py-2.5 rounded-full text-sm font-medium border border-border text-muted-foreground hover:text-foreground hover:border-gold-500/50 transition-colors"
                >
                  Load more posts
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

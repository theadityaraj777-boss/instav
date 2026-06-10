import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "@tanstack/react-router";
import { Grid, Hash, Image, Search, Users, Video } from "lucide-react";
import React, { useRef, useState } from "react";
import type { UserProfile } from "../backend";
import AvatarPlaceholder from "../components/AvatarPlaceholder";
import {
  type Post,
  useGetFeedPosts,
  useGetShortSportPosts,
  useGetSuggestedHashtags,
  useSearchByHashtag,
  useSearchUsers,
} from "../hooks/useQueries";

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/** Render a caption string with tappable #hashtag spans */
function CaptionWithHashtags({
  caption,
  onHashtagClick,
}: {
  caption: string;
  onHashtagClick: (tag: string) => void;
}) {
  const parts = caption.split(/(#\w+)/g);
  return (
    <span>
      {parts.map((part, i) => {
        if (/^#\w+$/.test(part)) {
          return (
            <button
              // biome-ignore lint/suspicious/noArrayIndexKey: static split segments
              key={i}
              type="button"
              className="text-amber-400 hover:text-amber-300 font-semibold transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onHashtagClick(part);
              }}
            >
              {part}
            </button>
          );
        }
        // biome-ignore lint/suspicious/noArrayIndexKey: static split segments
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </span>
  );
}

interface PostThumbnailProps {
  post: Post;
  onHashtagClick: (tag: string) => void;
}

function PostThumbnail({ post, onHashtagClick }: PostThumbnailProps) {
  const mediaUrl = post.media?.getDirectURL();
  const isVideo = post.mediaType?.startsWith("video");

  return (
    <div className="relative aspect-square bg-surface-2 rounded-lg overflow-hidden group cursor-pointer">
      {mediaUrl ? (
        isVideo ? (
          <video
            src={mediaUrl}
            className="w-full h-full object-cover"
            muted
            playsInline
            preload="metadata"
          />
        ) : (
          <img
            src={mediaUrl}
            alt={post.caption}
            className="w-full h-full object-cover"
          />
        )
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-surface-2 p-2">
          <span className="text-muted-foreground text-xs text-center line-clamp-3">
            <CaptionWithHashtags
              caption={post.caption}
              onHashtagClick={onHashtagClick}
            />
          </span>
        </div>
      )}
      {isVideo && (
        <div className="absolute top-1.5 right-1.5 bg-black/60 rounded p-0.5">
          <Video className="w-3 h-3 text-white" />
        </div>
      )}
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <span className="text-white text-xs font-semibold">
          ❤️ {Number(post.likeCount)}
        </span>
      </div>
    </div>
  );
}

interface UserResultCardProps {
  user: UserProfile;
}

function UserResultCard({ user }: UserResultCardProps) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      className="flex items-center gap-3 p-3 bg-surface-1 border border-border rounded-2xl cursor-pointer hover:bg-surface-2 transition-colors w-full text-left"
      onClick={() =>
        navigate({ to: "/user/$principal", params: { principal: user.handle } })
      }
    >
      <AvatarPlaceholder
        name={user.name}
        profilePicture={user.profilePhoto}
        size="md"
      />
      <div className="flex-1 min-w-0">
        <p className="text-foreground font-semibold text-sm truncate">
          {user.name}
        </p>
        {user.handle && (
          <p className="text-muted-foreground text-xs truncate">
            @{user.handle}
          </p>
        )}
        {user.bio && (
          <p className="text-muted-foreground/70 text-xs truncate mt-0.5">
            {user.bio}
          </p>
        )}
      </div>
      <Users className="w-4 h-4 text-muted-foreground flex-shrink-0" />
    </button>
  );
}

export default function ExplorePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"posts" | "users" | "hashtags">(
    "posts",
  );
  const [committedHashtag, setCommittedHashtag] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(searchQuery, 400);

  const isHashtagSearch =
    debouncedQuery.startsWith("#") && debouncedQuery.length > 1;

  const { data: userResults = [], isLoading: usersLoading } =
    useSearchUsers(debouncedQuery);

  // Hashtag suggestions (while typing)
  const { data: suggestions = [] } = useGetSuggestedHashtags(
    isHashtagSearch ? debouncedQuery : null,
  );

  // Hashtag results (after committing)
  const { data: hashtagPosts = [], isLoading: hashtagLoading } =
    useSearchByHashtag(committedHashtag);

  // All posts from all users — merged backend + local
  const { data: feedPosts = [], isLoading: feedLoading } = useGetFeedPosts();
  const { data: shortPosts = [], isLoading: shortLoading } =
    useGetShortSportPosts();
  const posts: Post[] = [...feedPosts, ...shortPosts].sort(
    (a, b) => Number(b.timestamp) - Number(a.timestamp),
  );
  const postsLoading = feedLoading || shortLoading;

  function commitHashtag(tag: string) {
    const normalised = tag.startsWith("#") ? tag : `#${tag}`;
    setSearchQuery(normalised);
    setCommittedHashtag(normalised.replace(/^#/, "").toLowerCase());
    setActiveTab("hashtags");
    setShowSuggestions(false);
    inputRef.current?.blur();
  }

  function handleHashtagClick(tag: string) {
    commitHashtag(tag);
  }

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setSearchQuery(val);
    if (val.startsWith("#")) {
      setShowSuggestions(true);
      if (activeTab !== "hashtags") setActiveTab("hashtags");
    } else {
      setShowSuggestions(false);
      setCommittedHashtag(null);
      if (activeTab === "hashtags") setActiveTab("posts");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && searchQuery.startsWith("#")) {
      commitHashtag(searchQuery);
    }
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            ref={inputRef}
            value={searchQuery}
            onChange={handleSearchChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (searchQuery.startsWith("#") && searchQuery.length > 1)
                setShowSuggestions(true);
            }}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            placeholder="Search users, or #hashtag…"
            data-ocid="explore.search_input"
            className="w-full bg-surface-2 border border-border rounded-full pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold-500/40"
          />

          {/* Hashtag suggestions dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-card border border-amber-500/30 rounded-2xl shadow-lg overflow-hidden z-20">
              {suggestions.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()} // prevent blur before click
                  onClick={() => commitHashtag(tag)}
                  className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm hover:bg-amber-500/10 transition-colors text-left"
                  data-ocid="explore.hashtag_suggestion"
                >
                  <Hash className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  <span className="text-amber-400 font-medium">#{tag}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-3">
          <button
            type="button"
            onClick={() => {
              setActiveTab("posts");
              setSearchQuery("");
              setCommittedHashtag(null);
            }}
            data-ocid="explore.posts.tab"
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeTab === "posts"
                ? "bg-gold-500/20 text-gold-400 border border-gold-500/40"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            Posts
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("users");
              if (searchQuery.startsWith("#")) setSearchQuery("");
            }}
            data-ocid="explore.users.tab"
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeTab === "users"
                ? "bg-gold-500/20 text-gold-400 border border-gold-500/40"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Users
          </button>
          {(activeTab === "hashtags" || committedHashtag) && (
            <button
              type="button"
              onClick={() => setActiveTab("hashtags")}
              data-ocid="explore.hashtags.tab"
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeTab === "hashtags"
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Hash className="w-3.5 h-3.5" />#{committedHashtag ?? "…"}
            </button>
          )}
        </div>
      </div>

      <div className="px-4 py-4">
        {/* ── Posts tab ── */}
        {activeTab === "posts" && (
          <div>
            {postsLoading ? (
              <div className="grid grid-cols-3 gap-1">
                {Array.from({ length: 9 }, (_, i) => `post-skeleton-${i}`).map(
                  (k) => (
                    <Skeleton key={k} className="aspect-square rounded-lg" />
                  ),
                )}
              </div>
            ) : posts.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center py-20 text-center"
                data-ocid="explore.posts.empty_state"
              >
                <Image className="w-12 h-12 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground text-sm">
                  No posts to explore yet
                </p>
                <p className="text-muted-foreground/60 text-xs mt-1">
                  Be the first to share something!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1">
                {posts.map((post) => (
                  <PostThumbnail
                    key={post.id.toString()}
                    post={post}
                    onHashtagClick={handleHashtagClick}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Users tab ── */}
        {activeTab === "users" && (
          <div>
            {usersLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }, (_, i) => `user-skeleton-${i}`).map(
                  (k) => (
                    <div
                      key={k}
                      className="flex items-center gap-3 p-3 bg-surface-1 border border-border rounded-2xl"
                    >
                      <Skeleton className="w-10 h-10 rounded-full" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="w-28 h-4 rounded" />
                        <Skeleton className="w-20 h-3 rounded" />
                      </div>
                    </div>
                  ),
                )}
              </div>
            ) : debouncedQuery && userResults.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center py-20 text-center"
                data-ocid="explore.users.empty_state"
              >
                <Users className="w-12 h-12 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground text-sm">No users found</p>
                <p className="text-muted-foreground/60 text-xs mt-1">
                  Try searching by name or handle
                </p>
              </div>
            ) : !debouncedQuery ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Search className="w-12 h-12 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground text-sm">
                  Search for users
                </p>
                <p className="text-muted-foreground/60 text-xs mt-1">
                  Enter a name or handle to find people
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {userResults.map((user: UserProfile) => (
                  <UserResultCard key={user.handle} user={user} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Hashtags tab ── */}
        {activeTab === "hashtags" && (
          <div>
            {committedHashtag && (
              <div className="flex items-center gap-2 mb-4">
                <Hash className="w-4 h-4 text-amber-400" />
                <h2 className="text-foreground font-semibold text-sm">
                  Posts tagged{" "}
                  <span className="text-amber-400">#{committedHashtag}</span>
                </h2>
              </div>
            )}

            {!committedHashtag ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Hash className="w-12 h-12 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground text-sm">
                  Type a hashtag to search
                </p>
                <p className="text-muted-foreground/60 text-xs mt-1">
                  e.g. #sports, #funny, #music
                </p>
              </div>
            ) : hashtagLoading ? (
              <div className="grid grid-cols-3 gap-1">
                {Array.from(
                  { length: 6 },
                  (_, i) => `hashtag-skeleton-${i}`,
                ).map((k) => (
                  <Skeleton key={k} className="aspect-square rounded-lg" />
                ))}
              </div>
            ) : hashtagPosts.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center py-20 text-center"
                data-ocid="explore.hashtags.empty_state"
              >
                <Hash className="w-12 h-12 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground text-sm">
                  No posts with #{committedHashtag} yet
                </p>
                <p className="text-muted-foreground/60 text-xs mt-1">
                  Be the first to post with this hashtag!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1">
                {hashtagPosts.map((post) => (
                  <PostThumbnail
                    key={post.id.toString()}
                    post={post}
                    onHashtagClick={handleHashtagClick}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

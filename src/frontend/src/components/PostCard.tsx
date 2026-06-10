import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import type { Post } from "../hooks/useQueries";
import {
  useGetCallerUserProfile,
  useLikePost,
  useRecordView,
  useUnlikePost,
} from "../hooks/useQueries";
import AuthPromptModal from "./AuthPromptModal";
import AvatarPlaceholder from "./AvatarPlaceholder";
import CommentsSheet from "./CommentsSheet";
import ShareModal from "./ShareModal";
import VideoDetailModal from "./VideoDetailModal";

const GLOBAL_MUTED_KEY = "smileup_global_muted";
function getGlobalMuted(): boolean {
  try {
    return localStorage.getItem(GLOBAL_MUTED_KEY) !== "false";
  } catch {
    return true;
  }
}
function setGlobalMuted(m: boolean) {
  try {
    localStorage.setItem(GLOBAL_MUTED_KEY, m ? "true" : "false");
  } catch {
    /* noop */
  }
}

interface PostCardProps {
  post: Post;
  isLiked?: boolean;
}

function timeAgo(timestamp: bigint): string {
  const now = Date.now();
  const ts = Number(timestamp) / 1_000_000;
  const diff = Math.floor((now - ts) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ─── Minimal Video Player ────────────────────────────────────────────────────
function CleanVideoPlayer({
  src,
  posterUrl,
  onOpenDetail,
}: { src: string; posterUrl?: string; onOpenDetail: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [muted, setMuted] = useState(getGlobalMuted);

  useEffect(() => {
    const sync = () => {
      const val = getGlobalMuted();
      setMuted(val);
      if (videoRef.current) videoRef.current.muted = val;
    };
    sync();
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            video.muted = getGlobalMuted();
            video.play().catch(() => {});
          } else {
            video.pause();
          }
        }
      },
      { threshold: 0.5 },
    );
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const toggleMute = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setMuted((prev) => {
      const next = !prev;
      if (videoRef.current) videoRef.current.muted = next;
      setGlobalMuted(next);
      return next;
    });
  }, []);

  // Use provided thumbnail as poster, else default to frame seek
  const poster = posterUrl ?? `${src}#t=0.1`;

  return (
    <div
      ref={containerRef}
      className="relative bg-black w-full aspect-video overflow-hidden"
    >
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: video tap opens detail */}
      <div
        className="absolute inset-0 cursor-pointer"
        onClick={onOpenDetail}
        role="presentation"
        aria-hidden="true"
      />
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className="w-full h-full object-contain"
        muted={muted}
        loop={false}
        playsInline
        preload="metadata"
      />
      <button
        type="button"
        aria-label={muted ? "Unmute video" : "Mute video"}
        onClick={toggleMute}
        className="absolute bottom-3 right-3 flex items-center justify-center w-8 h-8 rounded-full transition-opacity hover:opacity-90 z-10"
        style={{
          background: "oklch(0 0 0 / 55%)",
          backdropFilter: "blur(8px)",
          border: "1px solid oklch(1 0 0 / 15%)",
        }}
      >
        {muted ? (
          <VolumeX className="w-4 h-4 text-white" />
        ) : (
          <Volume2 className="w-4 h-4 text-white" />
        )}
      </button>
    </div>
  );
}

// ─── Image Carousel ──────────────────────────────────────────────────────────
function ImageCarousel({ slides, alt }: { slides: string[]; alt: string }) {
  const [current, setCurrent] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const touchDeltaX = useRef<number>(0);

  const total = slides.length;

  const prev = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setCurrent((c) => (c - 1 + total) % total);
    },
    [total],
  );

  const next = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setCurrent((c) => (c + 1) % total);
    },
    [total],
  );

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
  };

  const handleTouchEnd = () => {
    if (Math.abs(touchDeltaX.current) > 40) {
      if (touchDeltaX.current < 0) {
        setCurrent((c) => (c + 1) % total);
      } else {
        setCurrent((c) => (c - 1 + total) % total);
      }
    }
    touchStartX.current = null;
    touchDeltaX.current = 0;
  };

  return (
    <div
      className="relative bg-black w-full select-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      data-ocid="post.carousel"
    >
      <img
        src={slides[current]}
        alt={alt}
        className="w-full max-h-96 object-cover"
        loading="lazy"
        draggable={false}
      />

      {/* Left arrow */}
      {total > 1 && (
        <button
          type="button"
          aria-label="Previous image"
          onClick={prev}
          className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center justify-center w-7 h-7 rounded-full transition-opacity hover:opacity-90"
          style={{
            background: "oklch(0 0 0 / 55%)",
            backdropFilter: "blur(8px)",
            border: "1px solid oklch(1 0 0 / 15%)",
          }}
          data-ocid="post.carousel_prev"
        >
          <ChevronLeft className="w-4 h-4 text-white" />
        </button>
      )}

      {/* Right arrow */}
      {total > 1 && (
        <button
          type="button"
          aria-label="Next image"
          onClick={next}
          className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center w-7 h-7 rounded-full transition-opacity hover:opacity-90"
          style={{
            background: "oklch(0 0 0 / 55%)",
            backdropFilter: "blur(8px)",
            border: "1px solid oklch(1 0 0 / 15%)",
          }}
          data-ocid="post.carousel_next"
        >
          <ChevronRight className="w-4 h-4 text-white" />
        </button>
      )}

      {/* Dot indicators */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1">
        {slides.map((_slide, i) => (
          <button
            // biome-ignore lint/suspicious/noArrayIndexKey: dot indicators are positional, not identity-based
            key={i}
            type="button"
            aria-label={`Go to image ${i + 1}`}
            onClick={(e) => {
              e.stopPropagation();
              setCurrent(i);
            }}
            className="rounded-full transition-all"
            style={{
              width: i === current ? "16px" : "6px",
              height: "6px",
              background:
                i === current ? "oklch(0.78 0.18 78)" : "oklch(1 0 0 / 50%)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── PostCard ────────────────────────────────────────────────────────────────
export default function PostCard({ post, isLiked = false }: PostCardProps) {
  const { identity } = useInternetIdentity();
  const isAuthenticated = !!identity;

  const [liked, setLiked] = useState(isLiked);
  const [likeCount, setLikeCount] = useState(Number(post.likeCount));
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  const [videoDetailOpen, setVideoDetailOpen] = useState(false);
  const [globalMutedState, setGlobalMutedState] = useState(getGlobalMuted);

  const likePost = useLikePost();
  const unlikePost = useUnlikePost();
  const recordView = useRecordView();

  useGetCallerUserProfile();

  const mediaUrl =
    post.media?.getDirectURL() ||
    (post as unknown as Record<string, string>).mediaUrl ||
    (post as unknown as Record<string, string>).objectStorageUrl ||
    null;
  const isVideo = post.mediaType?.startsWith("video");

  const requireAuth = (action: () => void) => {
    if (!isAuthenticated) {
      setAuthPromptOpen(true);
      return;
    }
    action();
  };

  const handleLike = async () => {
    if (!isAuthenticated) {
      setAuthPromptOpen(true);
      return;
    }
    if (liked) {
      setLiked(false);
      setLikeCount((c) => c - 1);
      await unlikePost.mutateAsync(post.id.toString()).catch(() => {
        setLiked(true);
        setLikeCount((c) => c + 1);
      });
    } else {
      setLiked(true);
      setLikeCount((c) => c + 1);
      await likePost.mutateAsync(post.id.toString()).catch(() => {
        setLiked(false);
        setLikeCount((c) => c - 1);
      });
    }
  };

  const handleView = () => {
    recordView.mutate(post.id.toString());
  };

  return (
    <>
      <article
        className="overflow-hidden rounded-2xl mb-3 transition-shadow duration-200 hover:shadow-card-hover"
        style={{
          background: "oklch(0.11 0.009 265 / 85%)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid oklch(1 0 0 / 7%)",
          boxShadow:
            "0 4px 24px -4px oklch(0 0 0 / 0.5), inset 0 1px 0 oklch(1 0 0 / 0.05)",
        }}
      >
        {/* Author header */}
        <div className="flex items-center gap-3 px-4 py-3">
          <AvatarPlaceholder name={post.authorName} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-foreground font-semibold text-sm truncate">
              {post.authorName}
            </p>
            <p className="text-muted-foreground text-xs">
              {timeAgo(post.timestamp)}
            </p>
          </div>
        </div>

        {/* Media */}
        {(mediaUrl || (post.mediaType && post.mediaType !== "text")) && (
          // biome-ignore lint/a11y/useKeyWithClickEvents: presentation wrapper
          <div role="presentation" onClick={handleView}>
            {isVideo ? (
              mediaUrl ? (
                <CleanVideoPlayer
                  src={mediaUrl}
                  posterUrl={post.thumbnailUrl}
                  onOpenDetail={() => setVideoDetailOpen(true)}
                />
              ) : (
                <div className="w-full aspect-video bg-muted/30 flex items-center justify-center">
                  <span className="text-muted-foreground text-xs">
                    Video loading…
                  </span>
                </div>
              )
            ) : mediaUrl ? (
              <ImageCarousel
                slides={[mediaUrl]}
                alt={post.caption ?? "Post image"}
              />
            ) : (
              <div className="w-full h-48 bg-muted/30 flex items-center justify-center">
                <span className="text-muted-foreground text-xs">
                  Image loading…
                </span>
              </div>
            )}
          </div>
        )}

        {/* Caption */}
        {post.caption && (
          <div className="px-4 py-2">
            <p className="text-foreground/85 text-sm leading-relaxed">
              {post.caption}
            </p>
          </div>
        )}

        {/* Actions */}
        <div
          className="flex items-center gap-1 px-3 py-2"
          style={{ borderTop: "1px solid oklch(1 0 0 / 6%)" }}
        >
          <button
            type="button"
            onClick={handleLike}
            data-ocid="post.like_button"
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
              liked
                ? "text-coral-400 bg-coral-500/10"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            }`}
          >
            <Heart className={`w-4 h-4 ${liked ? "fill-coral-400" : ""}`} />
            <span>{likeCount}</span>
          </button>

          <button
            type="button"
            onClick={() => requireAuth(() => setCommentsOpen(true))}
            data-ocid="post.comment_button"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setShareOpen(true)}
            data-ocid="post.share_button"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
          >
            <Share2 className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1.5 px-3 py-2 text-sm text-muted-foreground/60">
            <Eye className="w-3.5 h-3.5" />
            <span>{Number(post.viewCount)}</span>
          </div>

          <div className="flex-1" />

          <button
            type="button"
            onClick={() => requireAuth(() => setBookmarked((b) => !b))}
            data-ocid="post.bookmark_button"
            className={`p-2 rounded-xl transition-colors ${
              bookmarked
                ? "text-gold-400 bg-gold-500/10"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            }`}
          >
            <Bookmark
              className={`w-4 h-4 ${bookmarked ? "fill-gold-400" : ""}`}
            />
          </button>
        </div>

        <CommentsSheet
          post={post}
          open={commentsOpen}
          onOpenChange={setCommentsOpen}
        />

        <ShareModal post={post} open={shareOpen} onOpenChange={setShareOpen} />

        <AuthPromptModal
          open={authPromptOpen}
          onClose={() => setAuthPromptOpen(false)}
        />
      </article>

      {/* Video Detail Modal */}
      {isVideo && mediaUrl && videoDetailOpen && (
        <VideoDetailModal
          post={post}
          isLiked={liked}
          muted={globalMutedState}
          onMutedChange={(next) => {
            setGlobalMuted(next);
            setGlobalMutedState(next);
          }}
          aspectRatio="16/9"
          onClose={() => setVideoDetailOpen(false)}
        />
      )}
    </>
  );
}

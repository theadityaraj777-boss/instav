import { useSearch } from "@tanstack/react-router";
import {
  Heart,
  MessageCircle,
  PauseCircle,
  PlayCircle,
  Share2,
  UserCheck,
  UserPlus,
  UserRoundPlus,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import AuthPromptModal from "../components/AuthPromptModal";
import CommentsSheet from "../components/CommentsSheet";
import VideoDetailModal from "../components/VideoDetailModal";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  type Post,
  useFollowUser,
  useGetFollowerCount,
  useGetLikedPosts,
  useGetShortSportPosts,
  useIsFollowing,
  useLikePost,
  useUnfollowUser,
  useUnlikePost,
} from "../hooks/useQueries";

// ── Gesture overlay CSS ─────────────────────────────────────────────────────
const GESTURE_STYLES = `
@keyframes gesture-burst {
  0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.4); }
  30%  { opacity: 1; transform: translate(-50%, -50%) scale(1.25); }
  70%  { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  100% { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
}
.gesture-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  pointer-events: none;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 4rem;
  filter: drop-shadow(0 0 16px rgba(255,255,255,0.6));
  animation: gesture-burst 800ms ease-out forwards;
}
@media (prefers-reduced-motion: reduce) {
  .gesture-overlay { animation: none; opacity: 0; }
}
`;

const GLOBAL_MUTED_KEY = "smileup_global_muted";

const getGlobalMuted = (): boolean => {
  try {
    return localStorage.getItem(GLOBAL_MUTED_KEY) !== "false";
  } catch {
    return true;
  }
};

const setGlobalMuted = (muted: boolean): void => {
  try {
    localStorage.setItem(GLOBAL_MUTED_KEY, muted ? "true" : "false");
  } catch {
    /* noop */
  }
};

interface FollowButtonProps {
  authorPrincipalStr: string;
  onRequireAuth: () => void;
}

function FollowButton({
  authorPrincipalStr,
  onRequireAuth,
}: FollowButtonProps) {
  const { identity } = useInternetIdentity();
  const isAuthenticated = !!identity;
  const { data: isFollowing } = useIsFollowing(authorPrincipalStr);
  const followMutation = useFollowUser();
  const unfollowMutation = useUnfollowUser();

  const handleToggle = () => {
    if (!isAuthenticated) {
      onRequireAuth();
      return;
    }
    if (isFollowing) {
      unfollowMutation.mutate(authorPrincipalStr);
    } else {
      followMutation.mutate(authorPrincipalStr);
    }
  };

  const isPending = followMutation.isPending || unfollowMutation.isPending;

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isPending}
      className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all disabled:opacity-50 border ${
        isFollowing
          ? "bg-white/10 border-white/20 text-white/70"
          : "bg-gradient-to-r from-yellow-500 to-amber-400 border-transparent text-black shadow-lg shadow-yellow-500/30"
      }`}
    >
      {isPending ? (
        <span className="w-2.5 h-2.5 border border-current/40 border-t-current rounded-full animate-spin" />
      ) : isFollowing ? (
        <UserCheck className="w-2.5 h-2.5" />
      ) : (
        <UserPlus className="w-2.5 h-2.5" />
      )}
      {isFollowing ? "Shadowing" : "Shadow"}
    </button>
  );
}

function ShadowCount({ principalStr }: { principalStr: string }) {
  const { data: count } = useGetFollowerCount(principalStr);
  const n = Number(count ?? 0);
  const formatted =
    n >= 1_000_000
      ? `${(n / 1_000_000).toFixed(1)}M`
      : n >= 1000
        ? `${(n / 1000).toFixed(1)}k`
        : String(n);
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
      style={{
        background: "rgba(212,175,55,0.15)",
        border: "1px solid rgba(212,175,55,0.35)",
        color: "#D4AF37",
      }}
    >
      <Zap className="w-2.5 h-2.5" />
      {formatted} shadows
    </span>
  );
}

interface ReelCardProps {
  post: Post;
  isActive: boolean;
  isLiked: boolean;
  autoScroll: boolean;
  muted: boolean;
  onToggleMuted: () => void;
  onLikeToggle: () => void;
  onCommentOpen: () => void;
  onShare: () => void;
  onVideoEnd: () => void;
  onRequireAuth: () => void;
  onOpenDetail: () => void;
}

function AuthorAvatar({ name }: { name: string }) {
  const initials =
    name
      .split(" ")
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";
  return (
    <div
      className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-black"
      style={{
        background:
          "linear-gradient(135deg, #D4AF37 0%, #F59E0B 50%, #EF4444 100%)",
        boxShadow:
          "0 0 0 2px rgba(212,175,55,0.6), 0 0 12px rgba(212,175,55,0.3)",
      }}
    >
      {initials}
    </div>
  );
}

function ReelCard({
  post,
  isActive,
  isLiked,
  autoScroll,
  muted,
  onToggleMuted,
  onLikeToggle,
  onCommentOpen,
  onShare,
  onVideoEnd,
  onRequireAuth,
  onOpenDetail,
}: ReelCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [localLiked, setLocalLiked] = useState(isLiked);
  const [localLikeCount, setLocalLikeCount] = useState(Number(post.likeCount));

  const mediaUrl = post.media?.getDirectURL();
  const isVideo = post.mediaType?.startsWith("video");
  const poster = mediaUrl && isVideo ? `${mediaUrl}#t=0.1` : undefined;

  useEffect(() => {
    if (!videoRef.current) return;
    if (isActive) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, [isActive]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !autoScroll) return;
    const handleEnded = () => onVideoEnd();
    video.addEventListener("ended", handleEnded);
    return () => video.removeEventListener("ended", handleEnded);
  }, [autoScroll, onVideoEnd]);

  const handleLike = () => {
    setLocalLiked((l) => !l);
    setLocalLikeCount((c) => (localLiked ? c - 1 : c + 1));
    onLikeToggle();
  };

  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden">
      {/* Media */}
      {mediaUrl && isVideo ? (
        // biome-ignore lint/a11y/useKeyWithClickEvents: video tap opens detail
        <div
          className="absolute inset-0 flex items-center justify-center cursor-pointer"
          onClick={onOpenDetail}
          role="presentation"
          aria-hidden="true"
        >
          <video
            ref={videoRef}
            src={mediaUrl}
            poster={poster}
            className="w-full h-full object-cover"
            muted={muted}
            autoPlay
            playsInline
            preload="auto"
          />
        </div>
      ) : (
        // biome-ignore lint/a11y/useKeyWithClickEvents: visual-only fallback, aria-hidden suppresses keyboard requirement
        <div
          className="w-full h-full flex items-center justify-center cursor-pointer"
          onClick={onOpenDetail}
          role="presentation"
          aria-hidden="true"
          style={{
            background:
              "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
          }}
        >
          <p className="text-white/60 text-center px-8 text-sm">
            {post.caption}
          </p>
        </div>
      )}

      {/* Top vignette */}
      <div
        className="absolute top-0 left-0 right-0 h-28 pointer-events-none"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 100%)",
        }}
      />

      {/* Bottom gradient overlay — premium multi-stop */}
      <div
        className="absolute bottom-0 left-0 right-0 h-56 pointer-events-none"
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.75) 30%, rgba(0,0,0,0.4) 60%, transparent 100%)",
        }}
      />

      {/* Author info — bottom left */}
      <div className="absolute bottom-20 left-4 right-16 z-10 space-y-2">
        {/* Author row */}
        <div className="flex items-center gap-2.5">
          <AuthorAvatar name={post.authorName} />
          <div className="flex flex-col gap-0.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="text-white font-bold text-sm tracking-tight drop-shadow-lg truncate max-w-[140px]"
                style={{ textShadow: "0 1px 8px rgba(0,0,0,0.8)" }}
              >
                {post.authorName}
              </span>
              <FollowButton
                authorPrincipalStr={post.authorPrincipal.toString()}
                onRequireAuth={onRequireAuth}
              />
            </div>
            <ShadowCount principalStr={post.authorPrincipal.toString()} />
          </div>
        </div>

        {/* Caption */}
        {post.caption && (
          <p
            className="text-white/85 text-xs leading-relaxed line-clamp-2"
            style={{ textShadow: "0 1px 6px rgba(0,0,0,0.9)" }}
          >
            {post.caption}
          </p>
        )}
      </div>

      {/* Right-side action buttons */}
      <div className="absolute right-3 bottom-24 flex flex-col items-center gap-5 z-10">
        {/* Like */}
        <button
          type="button"
          onClick={handleLike}
          className="flex flex-col items-center gap-1"
          data-ocid="shortsport.like_button"
        >
          <div
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all border ${
              localLiked
                ? "bg-rose-500/30 border-rose-400/50 shadow-lg shadow-rose-500/20"
                : "border-white/20"
            }`}
            style={
              !localLiked
                ? {
                    background: "rgba(255,255,255,0.08)",
                    backdropFilter: "blur(8px)",
                  }
                : undefined
            }
          >
            <Heart
              className={`w-5 h-5 transition-all ${
                localLiked
                  ? "fill-rose-400 text-rose-400 scale-110"
                  : "text-white"
              }`}
            />
          </div>
          <span className="text-white text-[11px] font-semibold drop-shadow">
            {localLikeCount}
          </span>
        </button>

        {/* Comment */}
        <button
          type="button"
          onClick={onCommentOpen}
          className="flex flex-col items-center gap-1"
          data-ocid="shortsport.comment_button"
        >
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center border border-white/20"
            style={{
              background: "rgba(255,255,255,0.08)",
              backdropFilter: "blur(8px)",
            }}
          >
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <span className="text-white/70 text-[11px]">Comment</span>
        </button>

        {/* Share */}
        <button
          type="button"
          onClick={onShare}
          className="flex flex-col items-center gap-1"
          data-ocid="shortsport.share_button"
        >
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center border border-white/20"
            style={{
              background: "rgba(255,255,255,0.08)",
              backdropFilter: "blur(8px)",
            }}
          >
            <Share2 className="w-5 h-5 text-white" />
          </div>
          <span className="text-white/70 text-[11px]">Share</span>
        </button>

        {/* Mute (video only) */}
        {isVideo && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleMuted();
            }}
            className="flex flex-col items-center gap-1"
            data-ocid="shortsport.sound_toggle"
          >
            <div
              className={`w-11 h-11 rounded-full flex items-center justify-center border transition-all ${
                !muted
                  ? "border-yellow-400/50 shadow-lg shadow-yellow-500/20"
                  : "border-white/20"
              }`}
              style={{
                background: !muted
                  ? "rgba(212,175,55,0.2)"
                  : "rgba(255,255,255,0.08)",
                backdropFilter: "blur(8px)",
              }}
            >
              {muted ? (
                <VolumeX className="w-5 h-5 text-white/70" />
              ) : (
                <Volume2 className="w-5 h-5 text-yellow-400" />
              )}
            </div>
            <span
              className={`text-[11px] ${!muted ? "text-yellow-400" : "text-white/60"}`}
            >
              {muted ? "Muted" : "Sound"}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

// ── Gesture types ───────────────────────────────────────────────────────────
type GestureOverlay = "like" | "share" | "shadow" | null;

export default function ShortSportPage() {
  const { identity } = useInternetIdentity();
  const isAuthenticated = !!identity;
  const search = useSearch({ from: "/shortsport" });
  const initialPostId = (search as { postId?: string }).postId;

  const { data: allPosts = [], isLoading } = useGetShortSportPosts();
  const { data: likedPosts = [] } = useGetLikedPosts();
  const likePost = useLikePost();
  const unlikePost = useUnlikePost();
  const followUser = useFollowUser();

  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  const [detailPost, setDetailPost] = useState<Post | null>(null);

  // Global muted state — synced to localStorage so home feed videos follow
  const [muted, setMuted] = useState(getGlobalMuted);

  const handleToggleMuted = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      setGlobalMuted(next);
      return next;
    });
  }, []);

  // Video-only filter — no photos or GIFs
  // Limit to 20 most recent to prevent memory overload on mobile devices
  const MAX_VIDEOS = 20;
  const videoPosts = allPosts
    .filter((p: Post) => p.media && p.mediaType?.startsWith("video"))
    .slice(0, MAX_VIDEOS);

  const [currentIndex, setCurrentIndex] = useState(() => {
    if (initialPostId) {
      const idx = videoPosts.findIndex(
        (p: Post) => p.id.toString() === initialPostId,
      );
      return idx >= 0 ? idx : 0;
    }
    return 0;
  });

  const [commentsPostId, setCommentsPostId] = useState<bigint | undefined>(
    undefined,
  );
  const [autoScroll, setAutoScroll] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Swipe / drag state
  const swipeStartX = useRef<number | null>(null);
  const isDragging = useRef(false);
  const [isGrabbing, setIsGrabbing] = useState(false);

  const SWIPE_THRESHOLD = 50;

  // ── Gesture state ──────────────────────────────────────────────────────────
  // Multi-tap detection
  const tapTimestamps = useRef<number[]>([]);
  const tapPositions = useRef<{ x: number; y: number }[]>([]);
  const tapResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Triple-tap guard: prevents double-tap from firing when triple-tap fires
  const tripleTapFired = useRef(false);

  // Circle / path detection
  const touchPath = useRef<{ x: number; y: number }[]>([]);

  // Overlay display
  const [gestureOverlay, setGestureOverlay] = useState<GestureOverlay>(null);
  const overlayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showGestureOverlay = useCallback((kind: GestureOverlay) => {
    setGestureOverlay(kind);
    if (overlayTimer.current) clearTimeout(overlayTimer.current);
    overlayTimer.current = setTimeout(() => setGestureOverlay(null), 850);
  }, []);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (tapResetTimer.current) clearTimeout(tapResetTimer.current);
      if (overlayTimer.current) clearTimeout(overlayTimer.current);
    };
  }, []);

  // Pinch-to-zoom (fullscreen) refs
  const pinchStartDist = useRef<number>(0);
  const isPinching = useRef<boolean>(false);

  // ── handleTap: called on touchstart for single-finger taps ────────────────
  const handleTap = useCallback(
    (x: number, y: number) => {
      const now = Date.now();
      // Trim stale taps older than 600ms
      while (
        tapTimestamps.current.length > 0 &&
        now - tapTimestamps.current[0] > 600
      ) {
        tapTimestamps.current.shift();
        tapPositions.current.shift();
      }
      // Proximity check — only count tap if within 60px of previous
      const last = tapPositions.current[tapPositions.current.length - 1];
      if (last && Math.hypot(x - last.x, y - last.y) > 60) {
        tapTimestamps.current = [];
        tapPositions.current = [];
      }
      tapTimestamps.current.push(now);
      tapPositions.current.push({ x, y });
      const count = tapTimestamps.current.length;

      if (count >= 3) {
        // TRIPLE TAP → open share panel
        tripleTapFired.current = true;
        if (tapResetTimer.current) clearTimeout(tapResetTimer.current);
        tapTimestamps.current = [];
        tapPositions.current = [];
        const post = videoPosts[currentIndex];
        if (post) {
          showGestureOverlay("share");
          if (navigator.share) {
            navigator.share({
              url: `${window.location.origin}/shortsport?postId=${post.id}`,
            });
          }
        }
      } else if (count === 2) {
        // Schedule DOUBLE TAP — fires only if no triple tap arrives within 300ms
        tripleTapFired.current = false;
        if (tapResetTimer.current) clearTimeout(tapResetTimer.current);
        tapResetTimer.current = setTimeout(() => {
          if (!tripleTapFired.current) {
            tapTimestamps.current = [];
            tapPositions.current = [];
            const post = videoPosts[currentIndex];
            if (post) {
              showGestureOverlay("like");
              if (!isAuthenticated) {
                setAuthPromptOpen(true);
              } else {
                const likedIds = new Set(
                  likedPosts.map((p: Post) => p.id.toString()),
                );
                if (likedIds.has(post.id.toString())) {
                  unlikePost.mutate(post.id.toString());
                } else {
                  likePost.mutate(post.id.toString());
                }
              }
            }
          }
        }, 300);
      }
    },
    [
      currentIndex,
      videoPosts,
      isAuthenticated,
      likedPosts,
      likePost,
      unlikePost,
      showGestureOverlay,
    ],
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      // Two-finger pinch start
      if (e.touches.length === 2) {
        const t = e.touches;
        pinchStartDist.current = Math.hypot(
          t[1].clientX - t[0].clientX,
          t[1].clientY - t[0].clientY,
        );
        isPinching.current = true;
        touchPath.current = [];
        return;
      }

      // Single-finger start
      isPinching.current = false;
      const touch = e.touches[0];
      swipeStartX.current = touch.clientX;
      touchPath.current = [{ x: touch.clientX, y: touch.clientY }];

      // Fire tap counting immediately on touchstart for responsiveness
      handleTap(touch.clientX, touch.clientY);
    },
    [handleTap],
  );

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    // Two-finger pinch: detect zoom-in → fullscreen
    if (e.touches.length === 2 && isPinching.current) {
      const t = e.touches;
      const currentDist = Math.hypot(
        t[1].clientX - t[0].clientX,
        t[1].clientY - t[0].clientY,
      );
      if (
        pinchStartDist.current > 0 &&
        currentDist / pinchStartDist.current > 1.3
      ) {
        // Pinch-out (zoom-in) → request fullscreen on the active video
        const videoEl = document.querySelector(
          ".shortsport-active video",
        ) as HTMLVideoElement | null;
        videoEl?.requestFullscreen?.().catch(() => {});
        isPinching.current = false; // prevent repeated triggers
      }
      return;
    }

    // Single-finger move — accumulate path for circle detection
    if (isPinching.current) return;
    const touch = e.touches[0];
    touchPath.current.push({ x: touch.clientX, y: touch.clientY });
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      // End of pinch — clear pinch state when fewer than 2 fingers remain
      if (e.touches.length < 2) {
        if (isPinching.current) {
          isPinching.current = false;
          touchPath.current = [];
          swipeStartX.current = null;
          return;
        }
      }

      if (swipeStartX.current === null) return;
      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - swipeStartX.current;
      swipeStartX.current = null;

      // ── Horizontal swipe navigation (unchanged) ──────────────────────────
      if (Math.abs(deltaX) >= SWIPE_THRESHOLD) {
        touchPath.current = [];
        if (deltaX < 0) {
          setCurrentIndex((i) => Math.min(i + 1, videoPosts.length - 1));
        } else {
          setCurrentIndex((i) => Math.max(i - 1, 0));
        }
        return;
      }

      // ── Circle gesture detection ──────────────────────────────────────────
      const path = touchPath.current;
      touchPath.current = [];
      if (path.length >= 8) {
        const pathStart = path[0];
        const pathEnd = path[path.length - 1];
        const closeDist = Math.hypot(
          pathEnd.x - pathStart.x,
          pathEnd.y - pathStart.y,
        );
        let totalLen = 0;
        for (let i = 1; i < path.length; i++) {
          totalLen += Math.hypot(
            path[i].x - path[i - 1].x,
            path[i].y - path[i - 1].y,
          );
        }
        let totalAngle = 0;
        for (let i = 2; i < path.length; i++) {
          const dx1 = path[i - 1].x - path[i - 2].x;
          const dy1 = path[i - 1].y - path[i - 2].y;
          const dx2 = path[i].x - path[i - 1].x;
          const dy2 = path[i].y - path[i - 1].y;
          const cross = dx1 * dy2 - dy1 * dx2;
          const dot = dx1 * dx2 + dy1 * dy2;
          totalAngle += Math.atan2(cross, dot);
        }
        // Don't shadow on a horizontal swipe
        const isHorizontalSwipe = Math.abs(deltaX) >= 50;
        if (
          !isHorizontalSwipe &&
          closeDist < 80 &&
          totalLen > 150 &&
          Math.abs(totalAngle) > Math.PI
        ) {
          const post = videoPosts[currentIndex];
          if (post) {
            if (!isAuthenticated) {
              setAuthPromptOpen(true);
            } else {
              followUser.mutate(post.authorPrincipal.toString());
              showGestureOverlay("shadow");
            }
          }
          return;
        }
      }
    },
    [
      videoPosts,
      videoPosts.length,
      currentIndex,
      isAuthenticated,
      followUser,
      showGestureOverlay,
    ],
  );

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    swipeStartX.current = e.clientX;
    isDragging.current = true;
    setIsGrabbing(true);
  }, []);

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging.current || swipeStartX.current === null) return;
      const deltaX = e.clientX - swipeStartX.current;
      swipeStartX.current = null;
      isDragging.current = false;
      setIsGrabbing(false);
      if (Math.abs(deltaX) < SWIPE_THRESHOLD) return;
      if (deltaX < 0) {
        setCurrentIndex((i) => Math.min(i + 1, videoPosts.length - 1));
      } else {
        setCurrentIndex((i) => Math.max(i - 1, 0));
      }
    },
    [videoPosts.length],
  );

  const handleMouseLeave = useCallback(() => {
    isDragging.current = false;
    swipeStartX.current = null;
    setIsGrabbing(false);
  }, []);

  const handleVideoEnd = useCallback(() => {
    setCurrentIndex((i) => {
      if (i >= videoPosts.length - 1) {
        setAutoScroll(false);
        return i;
      }
      return i + 1;
    });
  }, [videoPosts.length]);

  const likedPostIds = new Set(likedPosts.map((p: Post) => p.id.toString()));

  const handleLikeToggle = useCallback(
    (post: Post) => {
      if (!isAuthenticated) {
        setAuthPromptOpen(true);
        return;
      }
      if (likedPostIds.has(post.id.toString())) {
        unlikePost.mutate(post.id.toString());
      } else {
        likePost.mutate(post.id.toString());
      }
    },
    [isAuthenticated, likedPostIds, likePost, unlikePost],
  );

  const handleCommentOpen = useCallback(
    (postId: bigint) => {
      if (!isAuthenticated) {
        setAuthPromptOpen(true);
        return;
      }
      setCommentsPostId(postId);
    },
    [isAuthenticated],
  );

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown")
        setCurrentIndex((i) => Math.min(i + 1, videoPosts.length - 1));
      if (e.key === "ArrowUp") setCurrentIndex((i) => Math.max(i - 1, 0));
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [videoPosts.length]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gold-500/40 border-t-gold-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (videoPosts.length === 0) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center text-center px-8">
        <Heart className="w-12 h-12 text-white/20 mb-4" />
        <p className="text-white/60 text-sm">No ShortSport videos yet</p>
        <p className="text-white/40 text-xs mt-1">
          Be the first to share a video!
        </p>
      </div>
    );
  }

  const currentPost = videoPosts[currentIndex];

  return (
    <>
      <div
        ref={containerRef}
        className={`fixed inset-0 bg-black overflow-hidden select-none ${
          isGrabbing ? "cursor-grabbing" : "cursor-grab"
        }`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        {/* Strict 9:16 container centred in viewport */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="relative h-full shortsport-active"
            style={{ aspectRatio: "9/16", maxWidth: "100%" }}
          >
            <ReelCard
              key={currentPost.id.toString()}
              post={currentPost}
              isActive={true}
              autoScroll={autoScroll}
              muted={muted}
              onToggleMuted={handleToggleMuted}
              isLiked={likedPostIds.has(currentPost.id.toString())}
              onLikeToggle={() => handleLikeToggle(currentPost)}
              onVideoEnd={handleVideoEnd}
              onCommentOpen={() => handleCommentOpen(currentPost.id)}
              onRequireAuth={() => setAuthPromptOpen(true)}
              onOpenDetail={() => setDetailPost(currentPost)}
              onShare={() => {
                if (navigator.share) {
                  navigator.share({
                    url: `${window.location.origin}/shortsport?postId=${currentPost.id}`,
                  });
                }
              }}
            />
          </div>
        </div>

        {/* Gesture overlay: double-tap like, triple-tap share, circle shadow */}
        {gestureOverlay && (
          <div className="gesture-overlay" aria-hidden="true">
            {gestureOverlay === "like" && "👍"}
            {gestureOverlay === "share" && (
              <Share2 className="w-16 h-16 text-white drop-shadow-2xl" />
            )}
            {gestureOverlay === "shadow" && (
              <UserRoundPlus className="w-16 h-16 text-yellow-400 drop-shadow-2xl" />
            )}
          </div>
        )}

        {/* Gesture keyframes injected once */}
        <style>{GESTURE_STYLES}</style>

        {/* Top dashboard bar */}
        <div
          className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 pt-safe pt-3 pb-3"
          style={{
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)",
          }}
        >
          {/* Progress dots — gold active */}
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            {videoPosts.slice(0, 12).map((p: Post, i: number) => (
              <div
                key={p.id.toString()}
                className="rounded-full transition-all duration-300"
                style={{
                  height: "3px",
                  width: i === currentIndex ? "20px" : "6px",
                  background:
                    i === currentIndex
                      ? "linear-gradient(90deg, #D4AF37, #F59E0B)"
                      : "rgba(255,255,255,0.3)",
                  boxShadow:
                    i === currentIndex
                      ? "0 0 6px rgba(212,175,55,0.8)"
                      : "none",
                }}
              />
            ))}
            {videoPosts.length > 12 && (
              <span className="text-white/40 text-[10px] ml-1">
                {currentIndex + 1}/{videoPosts.length}
              </span>
            )}
          </div>

          {/* Auto-scroll toggle */}
          <button
            type="button"
            onClick={() => setAutoScroll((v) => !v)}
            data-ocid="shortsport.autoscroll_toggle"
            title={
              autoScroll ? "Stop auto-scroll" : "Auto-scroll when video ends"
            }
            className="ml-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border"
            style={{
              background: autoScroll
                ? "linear-gradient(135deg, #D4AF37, #F59E0B)"
                : "rgba(255,255,255,0.1)",
              borderColor: autoScroll ? "transparent" : "rgba(255,255,255,0.2)",
              color: autoScroll ? "#000" : "#fff",
              backdropFilter: "blur(8px)",
              boxShadow: autoScroll ? "0 0 12px rgba(212,175,55,0.5)" : "none",
            }}
          >
            {autoScroll ? (
              <PauseCircle className="w-3.5 h-3.5" />
            ) : (
              <PlayCircle className="w-3.5 h-3.5" />
            )}
            {autoScroll ? "Auto ON" : "Auto"}
          </button>
        </div>

        {/* Comments sheet */}
        <CommentsSheet
          postId={commentsPostId}
          isOpen={commentsPostId !== undefined}
          onClose={() => setCommentsPostId(undefined)}
        />
      </div>

      <AuthPromptModal
        open={authPromptOpen}
        onClose={() => setAuthPromptOpen(false)}
      />

      {/* Video Detail Modal */}
      {detailPost && (
        <VideoDetailModal
          post={detailPost}
          isLiked={likedPostIds.has(detailPost.id.toString())}
          muted={muted}
          onMutedChange={(next) => {
            setGlobalMuted(next);
            setMuted(next);
          }}
          aspectRatio="9/16"
          onClose={() => setDetailPost(null)}
        />
      )}
    </>
  );
}

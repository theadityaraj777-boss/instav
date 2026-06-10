import {
  Heart,
  Maximize,
  MessageCircle,
  Share2,
  UserCheck,
  UserPlus,
  Volume2,
  VolumeX,
  X,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useFollowUser,
  useGetFollowerCount,
  useGetShortSportPosts,
  useIsFollowing,
  useLikePost,
  useUnfollowUser,
  useUnlikePost,
} from "../hooks/useQueries";
import type { Post } from "../hooks/useQueries";
import AuthPromptModal from "./AuthPromptModal";
import CommentsSheet from "./CommentsSheet";
import ShareModal from "./ShareModal";

// ── Related video thumbnail card ───────────────────────────────────────────
function RelatedCard({ post, onClick }: { post: Post; onClick: () => void }) {
  const mediaUrl = post.media?.getDirectURL();
  const isVideo = post.mediaType?.startsWith("video");
  const poster = mediaUrl && isVideo ? `${mediaUrl}#t=0.1` : undefined;
  return (
    <button
      type="button"
      onClick={onClick}
      data-ocid="video_detail.related_card"
      className="group relative flex-shrink-0 w-32 rounded-xl overflow-hidden border border-white/10 hover:border-yellow-400/40 transition-all hover:scale-[1.03]"
      style={{ aspectRatio: "9/16", background: "#111" }}
    >
      {mediaUrl && isVideo ? (
        <video
          src={mediaUrl}
          poster={poster}
          className="w-full h-full object-cover"
          muted
          preload="none"
          playsInline
        />
      ) : (
        <div
          className="w-full h-full"
          style={{
            background:
              "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
          }}
        />
      )}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.1) 60%, transparent 100%)",
        }}
      />
      <div className="absolute bottom-0 left-0 right-0 p-1.5">
        <p className="text-white text-[10px] font-semibold leading-tight line-clamp-2">
          {post.caption || post.authorName}
        </p>
        <p className="text-white/50 text-[9px] mt-0.5 truncate">
          @{post.authorName}
        </p>
      </div>
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{
            background: "rgba(212,175,55,0.8)",
            backdropFilter: "blur(4px)",
          }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-4 h-4 text-black ml-0.5"
            aria-hidden="true"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>
    </button>
  );
}

function ShadowBadge({ principalStr }: { principalStr: string }) {
  const { data: count } = useGetFollowerCount(principalStr);
  const n = Number(count ?? 0);
  const f =
    n >= 1_000_000
      ? `${(n / 1_000_000).toFixed(1)}M`
      : n >= 1000
        ? `${(n / 1000).toFixed(1)}k`
        : String(n);
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
      style={{
        background: "rgba(212,175,55,0.15)",
        border: "1px solid rgba(212,175,55,0.35)",
        color: "#D4AF37",
      }}
    >
      <Zap className="w-2.5 h-2.5" />
      {f} shadows
    </span>
  );
}

interface VideoDetailModalProps {
  post: Post;
  isLiked: boolean;
  muted: boolean;
  onMutedChange: (muted: boolean) => void;
  /** "9/16" for ShortSport, "16/9" for feed */
  aspectRatio?: "9/16" | "16/9";
  onClose: () => void;
}

export default function VideoDetailModal({
  post,
  isLiked,
  muted,
  onMutedChange,
  aspectRatio = "9/16",
  onClose,
}: VideoDetailModalProps) {
  const { identity } = useInternetIdentity();
  const isAuthenticated = !!identity;

  const videoRef = useRef<HTMLVideoElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [liked, setLiked] = useState(isLiked);
  const [likeCount, setLikeCount] = useState(Number(post.likeCount));
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  const [activePost, setActivePost] = useState<Post>(post);

  const likePost = useLikePost();
  const unlikePost = useUnlikePost();
  const followMutation = useFollowUser();
  const unfollowMutation = useUnfollowUser();
  const { data: isFollowing } = useIsFollowing(
    activePost.authorPrincipal.toString(),
  );
  const { data: allPosts = [] } = useGetShortSportPosts();

  const mediaUrl = activePost.media?.getDirectURL();
  const poster = activePost.mediaType?.startsWith("video")
    ? mediaUrl
      ? `${mediaUrl}#t=0.1`
      : undefined
    : undefined;

  // Reset like state when active post changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional trigger on post change
  useEffect(() => {
    setLiked(false);
    setLikeCount(Number(activePost.likeCount));
  }, [activePost.id, activePost.likeCount]);

  // Sync muted state into video element when it changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = muted;
    }
  }, [muted]);

  // Auto-play when activePost changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional trigger on post change
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.load();
    v.play().catch(() => {});
    return () => {
      v.pause();
    };
  }, [activePost.id]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const requireAuth = (action: () => void) => {
    if (!isAuthenticated) {
      setAuthPromptOpen(true);
      return;
    }
    action();
  };

  const handleLike = useCallback(() => {
    if (!isAuthenticated) {
      setAuthPromptOpen(true);
      return;
    }
    if (liked) {
      setLiked(false);
      setLikeCount((c) => c - 1);
      unlikePost.mutate(activePost.id.toString());
    } else {
      setLiked(true);
      setLikeCount((c) => c + 1);
      likePost.mutate(activePost.id.toString());
    }
  }, [liked, activePost.id, likePost, unlikePost, isAuthenticated]);

  const handleFollow = useCallback(() => {
    if (!isAuthenticated) {
      setAuthPromptOpen(true);
      return;
    }
    if (isFollowing) {
      unfollowMutation.mutate(activePost.authorPrincipal.toString());
    } else {
      followMutation.mutate(activePost.authorPrincipal.toString());
    }
  }, [
    isFollowing,
    activePost.authorPrincipal,
    followMutation,
    unfollowMutation,
    isAuthenticated,
  ]);

  const handleFullscreen = useCallback(() => {
    videoRef.current?.requestFullscreen?.().catch(() => {});
  }, []);

  const handleToggleMute = useCallback(() => {
    onMutedChange(!muted);
  }, [muted, onMutedChange]);

  const isPortrait = aspectRatio === "9/16";

  // Build related lists
  const videoPosts = (allPosts as Post[]).filter(
    (p) => p.media && p.mediaType?.startsWith("video"),
  );
  const sameAuthor = videoPosts
    .filter(
      (p) =>
        p.authorPrincipal.toString() ===
          activePost.authorPrincipal.toString() &&
        p.id.toString() !== activePost.id.toString(),
    )
    .slice(0, 4);
  const otherVideos = videoPosts
    .filter(
      (p) =>
        p.authorPrincipal.toString() !==
          activePost.authorPrincipal.toString() &&
        p.id.toString() !== activePost.id.toString(),
    )
    .slice(0, 4);

  const actionBtnClass =
    "flex flex-col items-center gap-1 group transition-transform hover:scale-105 active:scale-95";
  const iconWrapBase =
    "w-11 h-11 rounded-full flex items-center justify-center border border-white/15 transition-all";

  return (
    <>
      {/* Full-screen backdrop */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: backdrop dismiss */}
      <div
        className="fixed inset-0 z-50 flex items-stretch overflow-hidden"
        style={{ background: "rgba(0,0,0,0.97)" }}
        onClick={onClose}
      >
        {/* biome-ignore lint/a11y/useKeyWithClickEvents: inner container */}
        <div
          className="relative flex flex-1 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Left: scrollable video + related */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto overflow-x-hidden"
            style={{ scrollbarWidth: "none" }}
          >
            {/* Video */}
            <div
              className={`flex items-center justify-center ${isPortrait ? "min-h-screen" : "min-h-[60vh]"} py-4 px-4`}
            >
              <div
                className="relative rounded-2xl overflow-hidden shadow-2xl flex-shrink-0"
                style={{
                  aspectRatio: isPortrait ? "9/16" : "16/9",
                  height: isPortrait ? "min(85vh, 560px)" : undefined,
                  width: isPortrait ? undefined : "min(80vw, 720px)",
                  boxShadow:
                    "0 0 0 1px rgba(255,255,255,0.08), 0 32px 80px rgba(0,0,0,0.8), 0 0 60px rgba(212,175,55,0.08)",
                }}
              >
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <video
                  ref={videoRef}
                  src={mediaUrl}
                  poster={poster}
                  className="w-full h-full object-cover"
                  playsInline
                  muted={muted}
                  autoPlay
                  loop
                />
                {/* Top bar: close + info */}
                <div
                  className="absolute top-0 left-0 right-0 flex items-center gap-3 px-3 pt-3 pb-6"
                  style={{
                    background:
                      "linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)",
                  }}
                >
                  <button
                    type="button"
                    aria-label="Close"
                    onClick={onClose}
                    data-ocid="video_detail.close_button"
                    className="w-8 h-8 rounded-full flex items-center justify-center border border-white/20 text-white hover:bg-white/20 transition-colors flex-shrink-0"
                    style={{
                      background: "rgba(0,0,0,0.4)",
                      backdropFilter: "blur(8px)",
                    }}
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-sm truncate drop-shadow">
                      {activePost.authorName}
                    </p>
                    {activePost.caption && (
                      <p className="text-white/60 text-xs truncate">
                        {activePost.caption}
                      </p>
                    )}
                  </div>
                </div>
                {/* Bottom author strip */}
                <div
                  className="absolute bottom-0 left-0 right-0 px-3 pb-3 pt-10"
                  style={{
                    background:
                      "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)",
                  }}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <div
                      className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-black"
                      style={{
                        background:
                          "linear-gradient(135deg, #D4AF37 0%, #F59E0B 50%, #EF4444 100%)",
                        boxShadow: "0 0 0 2px rgba(212,175,55,0.5)",
                      }}
                    >
                      {activePost.authorName.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-white font-semibold text-xs">
                      {activePost.authorName}
                    </span>
                    <ShadowBadge
                      principalStr={activePost.authorPrincipal.toString()}
                    />
                  </div>
                  {activePost.caption && (
                    <p className="text-white/75 text-xs leading-relaxed mt-1.5 line-clamp-2">
                      {activePost.caption}
                    </p>
                  )}
                </div>
                {/* Sound toggle */}
                <button
                  type="button"
                  aria-label={muted ? "Unmute" : "Mute"}
                  onClick={handleToggleMute}
                  className="absolute right-3 bottom-16 w-9 h-9 rounded-full flex items-center justify-center transition-all"
                  style={{
                    background: !muted
                      ? "rgba(212,175,55,0.25)"
                      : "rgba(0,0,0,0.55)",
                    backdropFilter: "blur(8px)",
                    border: !muted
                      ? "1px solid rgba(212,175,55,0.5)"
                      : "1px solid rgba(255,255,255,0.15)",
                    boxShadow: !muted
                      ? "0 0 10px rgba(212,175,55,0.35)"
                      : "none",
                  }}
                >
                  {muted ? (
                    <VolumeX className="w-4 h-4 text-white/70" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-yellow-400" />
                  )}
                </button>
              </div>
            </div>

            {/* ── Related Videos section */}
            {(sameAuthor.length > 0 || otherVideos.length > 0) && (
              <div
                className="px-4 pb-8 space-y-6"
                style={{
                  maxWidth: isPortrait ? "420px" : "100%",
                  margin: "0 auto",
                }}
              >
                <div
                  className="h-px w-full"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent, rgba(212,175,55,0.3), transparent)",
                  }}
                />
                {sameAuthor.length > 0 && (
                  <div>
                    <h3
                      className="text-sm font-bold mb-3 flex items-center gap-2"
                      style={{ color: "#D4AF37" }}
                    >
                      <span
                        className="w-1 h-4 rounded-full inline-block"
                        style={{
                          background:
                            "linear-gradient(to bottom, #D4AF37, #F59E0B)",
                        }}
                      />
                      More from {activePost.authorName}
                    </h3>
                    <div
                      className="flex gap-3 overflow-x-auto pb-2"
                      style={{ scrollbarWidth: "none" }}
                    >
                      {sameAuthor.map((p) => (
                        <RelatedCard
                          key={p.id.toString()}
                          post={p}
                          onClick={() => {
                            setActivePost(p);
                            scrollRef.current?.scrollTo({
                              top: 0,
                              behavior: "smooth",
                            });
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {otherVideos.length > 0 && (
                  <div>
                    <h3
                      className="text-sm font-bold mb-3 flex items-center gap-2"
                      style={{ color: "#fff" }}
                    >
                      <span
                        className="w-1 h-4 rounded-full inline-block"
                        style={{
                          background:
                            "linear-gradient(to bottom, #6B46C1, #9333ea)",
                        }}
                      />
                      More ShortSports
                    </h3>
                    <div
                      className="flex gap-3 overflow-x-auto pb-2"
                      style={{ scrollbarWidth: "none" }}
                    >
                      {otherVideos.map((p) => (
                        <RelatedCard
                          key={p.id.toString()}
                          post={p}
                          onClick={() => {
                            setActivePost(p);
                            scrollRef.current?.scrollTo({
                              top: 0,
                              behavior: "smooth",
                            });
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Right: action buttons panel */}
          <div
            className="flex flex-col items-center justify-center gap-5 px-3 py-4 flex-shrink-0"
            style={{
              width: "72px",
              background: "rgba(0,0,0,0.6)",
              backdropFilter: "blur(20px)",
              borderLeft: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <button
              type="button"
              aria-label={liked ? "Unlike" : "Like"}
              onClick={handleLike}
              data-ocid="video_detail.like_button"
              className={actionBtnClass}
            >
              <div
                className={`${iconWrapBase} ${liked ? "bg-rose-500/25 border-rose-400/50 shadow-lg shadow-rose-500/20" : ""}`}
                style={
                  !liked ? { background: "rgba(255,255,255,0.08)" } : undefined
                }
              >
                <Heart
                  className={`w-5 h-5 transition-all ${liked ? "fill-rose-400 text-rose-400 scale-110" : "text-white"}`}
                />
              </div>
              <span className="text-white text-[10px] font-semibold">
                {likeCount}
              </span>
            </button>
            <button
              type="button"
              aria-label={isFollowing ? "Unshadow" : "Shadow"}
              onClick={handleFollow}
              data-ocid="video_detail.shadow_button"
              className={actionBtnClass}
            >
              <div
                className={`${iconWrapBase} ${isFollowing ? "border-yellow-400/50" : ""}`}
                style={{
                  background: isFollowing
                    ? "rgba(212,175,55,0.18)"
                    : "rgba(255,255,255,0.08)",
                  boxShadow: isFollowing
                    ? "0 0 10px rgba(212,175,55,0.3)"
                    : "none",
                }}
              >
                {isFollowing ? (
                  <UserCheck className="w-5 h-5 text-yellow-400" />
                ) : (
                  <UserPlus className="w-5 h-5 text-white" />
                )}
              </div>
              <span
                className="text-[10px] font-semibold"
                style={{
                  color: isFollowing ? "#D4AF37" : "rgba(255,255,255,0.7)",
                }}
              >
                {isFollowing ? "Shadowing" : "Shadow"}
              </span>
            </button>
            <button
              type="button"
              aria-label="Comment"
              onClick={() => requireAuth(() => setCommentsOpen(true))}
              data-ocid="video_detail.comment_button"
              className={actionBtnClass}
            >
              <div
                className={iconWrapBase}
                style={{ background: "rgba(255,255,255,0.08)" }}
              >
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <span className="text-white/60 text-[10px]">Comment</span>
            </button>
            <button
              type="button"
              aria-label="Share"
              onClick={() => setShareOpen(true)}
              data-ocid="video_detail.share_button"
              className={actionBtnClass}
            >
              <div
                className={iconWrapBase}
                style={{ background: "rgba(255,255,255,0.08)" }}
              >
                <Share2 className="w-5 h-5 text-white" />
              </div>
              <span className="text-white/60 text-[10px]">Share</span>
            </button>
            <button
              type="button"
              aria-label="Fullscreen"
              onClick={handleFullscreen}
              data-ocid="video_detail.fullscreen_button"
              className={actionBtnClass}
            >
              <div
                className={iconWrapBase}
                style={{ background: "rgba(255,255,255,0.08)" }}
              >
                <Maximize className="w-5 h-5 text-white" />
              </div>
              <span className="text-white/60 text-[10px]">Fullscreen</span>
            </button>
          </div>
        </div>
      </div>

      <CommentsSheet
        post={activePost}
        open={commentsOpen}
        onOpenChange={setCommentsOpen}
      />
      <ShareModal
        post={activePost}
        open={shareOpen}
        onOpenChange={setShareOpen}
      />
      <AuthPromptModal
        open={authPromptOpen}
        onClose={() => setAuthPromptOpen(false)}
      />
    </>
  );
}

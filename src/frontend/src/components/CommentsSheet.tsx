import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Heart, Image, MessageCircle, Send, X } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  type Comment,
  type Post,
  useAddComment,
  useAddCommentLike,
  useGetCallerUserProfile,
  useGetComments,
} from "../hooks/useQueries";
import AvatarPlaceholder from "./AvatarPlaceholder";

interface CommentsSheetProps {
  post?: Post | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  isOpen?: boolean;
  onClose?: () => void;
  postId?: bigint;
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

// ─── Single comment item with double-tap like ────────────────────────────────

interface CommentItemProps {
  comment: Comment;
  index: number;
  postId: bigint;
}

function CommentItem({ comment, index, postId }: CommentItemProps) {
  const addLike = useAddCommentLike();
  const [localLikes, setLocalLikes] = useState<bigint>(
    comment.likeCount ?? BigInt(0),
  );
  const [showHeart, setShowHeart] = useState(false);
  const lastTapRef = useRef<number>(0);

  // Sync likeCount from parent when comments refresh
  useEffect(() => {
    setLocalLikes(comment.likeCount ?? BigInt(0));
  }, [comment.likeCount]);

  const triggerLike = useCallback(() => {
    setLocalLikes((prev) => prev + BigInt(1));
    setShowHeart(true);
    setTimeout(() => setShowHeart(false), 800);
    addLike.mutate({ postId, commentIndex: index });
  }, [addLike, postId, index]);

  /** Desktop: double-click */
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    triggerLike();
  };

  /** Mobile: double-tap (two taps within 300 ms) */
  const handleTouchEnd = (e: React.TouchEvent) => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      e.preventDefault();
      triggerLike();
    }
    lastTapRef.current = now;
  };

  return (
    <div
      data-ocid={`comment.item.${index + 1}`}
      className="relative flex gap-3 select-none"
      onDoubleClick={handleDoubleClick}
      onTouchEnd={handleTouchEnd}
    >
      {/* Heart burst animation overlay */}
      {showHeart && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
          style={{ animation: "heartBurst 0.8s ease forwards" }}
        >
          <Heart className="w-12 h-12 text-rose-500 fill-rose-500 drop-shadow-lg" />
        </div>
      )}

      <AvatarPlaceholder name={comment.authorName} size="sm" />

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-foreground text-sm font-semibold">
            {comment.authorName}
          </span>
          <span className="text-muted-foreground text-xs">
            {timeAgo(comment.timestamp)}
          </span>
        </div>

        <p className="text-foreground/80 text-sm mt-0.5 break-words">
          {comment.text}
        </p>

        {/* Attached image/GIF */}
        {comment.mediaUrl && (
          <img
            src={comment.mediaUrl}
            alt="comment media"
            className="mt-2 rounded-lg object-contain max-h-48 max-w-full border border-border"
          />
        )}

        {/* Like count */}
        {localLikes > BigInt(0) && (
          <div className="flex items-center gap-1 mt-1">
            <Heart className="w-3 h-3 text-rose-500 fill-rose-500" />
            <span className="text-xs text-muted-foreground">
              {localLikes.toString()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main CommentsSheet ───────────────────────────────────────────────────────

export default function CommentsSheet({
  post,
  open,
  onOpenChange,
  isOpen,
  onClose,
  postId: postIdProp,
}: CommentsSheetProps) {
  const [commentText, setCommentText] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isSheetOpen = open ?? isOpen ?? false;
  const handleOpenChange = (v: boolean) => {
    onOpenChange?.(v);
    if (!v) onClose?.();
  };

  const resolvedPostId = post?.id ?? postIdProp ?? undefined;

  const { data: comments = [], isLoading } = useGetComments(resolvedPostId);
  const addComment = useAddComment();
  const { data: callerProfile } = useGetCallerUserProfile();

  // Clean up object URL on unmount or file change
  useEffect(() => {
    return () => {
      if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    };
  }, [mediaPreview]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
    // reset input so re-selecting same file triggers onChange again
    e.target.value = "";
  };

  const clearMedia = () => {
    if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    setMediaFile(null);
    setMediaPreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!commentText.trim() && !mediaFile) || resolvedPostId === undefined)
      return;

    let mediaUrl: string | null = null;
    if (mediaFile && mediaPreview) {
      // Convert to data URL for persistence (object URLs are session-only)
      mediaUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(mediaFile);
      });
    }

    await addComment.mutateAsync({
      postId: resolvedPostId,
      text: commentText.trim(),
      authorName: callerProfile?.name ?? "User",
      mediaUrl,
    });

    setCommentText("");
    clearMedia();
  };

  useEffect(() => {
    if (isSheetOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isSheetOpen]);

  return (
    <>
      {/* Heart burst keyframe — injected once */}
      <style>{`
        @keyframes heartBurst {
          0%   { opacity: 0; transform: scale(0.4); }
          40%  { opacity: 1; transform: scale(1.3); }
          70%  { opacity: 1; transform: scale(1.0); }
          100% { opacity: 0; transform: scale(1.1); }
        }
      `}</style>

      <Sheet open={isSheetOpen} onOpenChange={handleOpenChange}>
        <SheetContent
          side="bottom"
          className="bg-surface-1 border-t border-border rounded-t-2xl h-[70vh] flex flex-col p-0"
        >
          <SheetHeader className="px-4 pt-4 pb-3 border-b border-border">
            <SheetTitle className="text-foreground text-base font-semibold flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-gold-400" />
              Comments {comments.length > 0 && `(${comments.length})`}
            </SheetTitle>
          </SheetHeader>

          {/* Comments list */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-gold-500/40 border-t-gold-500 rounded-full animate-spin" />
              </div>
            ) : comments.length === 0 ? (
              <div
                data-ocid="comments.empty_state"
                className="flex flex-col items-center justify-center py-12 text-center"
              >
                <MessageCircle className="w-10 h-10 text-muted-foreground/30 mb-2" />
                <p className="text-muted-foreground text-sm">No comments yet</p>
                <p className="text-muted-foreground/60 text-xs mt-1">
                  Be the first to comment!
                </p>
              </div>
            ) : (
              comments.map((comment: Comment, idx: number) => (
                <CommentItem
                  key={comment.id.toString()}
                  comment={comment}
                  index={idx}
                  postId={resolvedPostId!}
                />
              ))
            )}
          </div>

          {/* Media preview strip */}
          {mediaPreview && (
            <div className="px-4 pb-2 flex items-center gap-2">
              <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-border flex-shrink-0">
                <img
                  src={mediaPreview}
                  alt="preview"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={clearMedia}
                  className="absolute top-0.5 right-0.5 bg-background/80 rounded-full p-0.5"
                  aria-label="Remove image"
                >
                  <X className="w-3 h-3 text-foreground" />
                </button>
              </div>
              <span className="text-xs text-muted-foreground">
                Image attached
              </span>
            </div>
          )}

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            className="px-4 py-3 border-t border-border flex items-center gap-2"
          >
            <AvatarPlaceholder
              name={callerProfile?.name ?? "Me"}
              profilePicture={callerProfile?.profilePhoto}
              size="sm"
            />

            {/* Hidden file picker */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.gif"
              className="hidden"
              onChange={handleFileChange}
            />

            {/* Image/GIF attach button */}
            <button
              type="button"
              data-ocid="comment.upload_button"
              onClick={() => fileInputRef.current?.click()}
              className="text-muted-foreground hover:text-gold-400 transition-colors flex-shrink-0"
              aria-label="Attach image or GIF"
            >
              <Image className="w-5 h-5" />
            </button>

            <input
              ref={inputRef}
              data-ocid="comment.input"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a comment…"
              className="flex-1 bg-surface-2 border border-border rounded-full px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold-500/40 min-w-0"
            />

            <Button
              type="submit"
              size="icon"
              data-ocid="comment.submit_button"
              disabled={
                (!commentText.trim() && !mediaFile) || addComment.isPending
              }
              className="bg-gold-500 hover:bg-gold-400 text-background rounded-full w-9 h-9 flex-shrink-0"
            >
              {addComment.isPending ? (
                <span className="w-4 h-4 border-2 border-background/40 border-t-background rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}

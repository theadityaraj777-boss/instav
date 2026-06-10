import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Principal } from "@dfinity/principal";
import { useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  Clapperboard,
  FileText,
  Image,
  Layers,
  Loader2,
  Pencil,
  Smile,
  Upload,
  Video,
  X,
} from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import MediaEditorTab from "../components/editor/MediaEditorTab";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useCreatePost, useGetCallerUserProfile } from "../hooks/useQueries";
import * as localPosts from "../lib/localPosts";

type PostType = "image" | "video" | "text" | "gif" | "poster" | "edit";

/** Returns true if the string looks like a principal ID (e.g. "f6tf6-qg...") */
/** Returns true if the string looks like a principal ID */
function isPrincipalFormat(s: string | null | undefined): boolean {
  if (!s) return true;
  try {
    Principal.fromText(s);
    return true;
  } catch {
    return false;
  }
}

export default function CreatePostPage() {
  const navigate = useNavigate();
  const { identity } = useInternetIdentity();
  const { data: profile } = useGetCallerUserProfile();
  const createPost = useCreatePost();

  const [postType, setPostType] = useState<PostType>("text");
  const [caption, setCaption] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [destination, setDestination] = useState<"feed" | "shortsport">("feed");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Revoke the preview blob URL when it changes or when the component unmounts
  // to prevent unbounded memory accumulation from orphaned object URLs.
  useEffect(() => {
    return () => {
      if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    };
  }, [mediaPreview]);

  const localName = identity
    ? localPosts.getUserName(identity.getPrincipal().toString())
    : null;

  const authorName =
    (profile?.name && !isPrincipalFormat(profile.name) ? profile.name : null) ||
    (profile?.handle && !isPrincipalFormat(profile.handle)
      ? profile.handle
      : null) ||
    (!isPrincipalFormat(localName) ? localName : null) ||
    profile?.name ||
    profile?.handle ||
    localName ||
    (identity
      ? `User ${identity.getPrincipal().toString().slice(0, 6)}`
      : "Anonymous");

  const clearMedia = () => {
    setMediaFile(null);
    if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    setMediaPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // ShortSport video validation
    if (postType === "video") {
      if (!file.type.startsWith("video/")) {
        toast.error("ShortSport only accepts videos (no photos or GIFs)");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      // Check duration to route: ≤3 min → ShortSport, >3 min → Feed
      const tempVideo = document.createElement("video");
      const objectUrl = URL.createObjectURL(file);
      tempVideo.src = objectUrl;
      tempVideo.onloadedmetadata = () => {
        URL.revokeObjectURL(objectUrl);
        const dest = tempVideo.duration <= 180 ? "shortsport" : "feed";
        setDestination(dest);
        // Valid video — set it
        setMediaFile(file);
        setError("");
        const previewUrl = URL.createObjectURL(file);
        setMediaPreview(previewUrl);
      };
      tempVideo.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        toast.error("Could not read video file. Please try another.");
        if (fileInputRef.current) fileInputRef.current.value = "";
      };
      return;
    }

    setDestination("feed");
    setMediaFile(file);
    setError("");
    const url = URL.createObjectURL(file);
    setMediaPreview(url);
  };

  const handleSubmit = async () => {
    if (!identity) {
      setError("You must be logged in to create a post.");
      return;
    }

    if (postType !== "text" && !mediaFile) {
      setError("Please select a media file.");
      return;
    }

    if (!caption.trim() && postType === "text") {
      setError("Please write something for your post.");
      return;
    }

    setError("");
    setIsUploading(true);

    try {
      const mediaType = mediaFile
        ? mediaFile.type ||
          (postType === "video"
            ? "video/mp4"
            : postType === "gif"
              ? "image/gif"
              : "image/jpeg")
        : "text";

      await createPost.mutateAsync({
        authorName,
        mediaFile: mediaFile ?? undefined,
        mediaType,
        caption: caption.trim(),
        destination,
      });

      toast.success("Post created successfully!");
      navigate({ to: "/" });
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to create post. Please try again.";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const canSubmit = (() => {
    if (isUploading || createPost.isPending) return false;
    if (postType === "text") return caption.trim().length > 0;
    return !!mediaFile;
  })();

  // Tab definitions (5 existing + 1 new Edit tab)
  const TABS: { type: PostType; icon: React.ElementType; label: string }[] = [
    { type: "text", icon: FileText, label: "Text" },
    { type: "image", icon: Image, label: "Photo" },
    { type: "video", icon: Video, label: "Video" },
    { type: "gif", icon: Smile, label: "GIF" },
    { type: "poster", icon: Layers, label: "Poster" },
    { type: "edit", icon: Pencil, label: "Edit" },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-display font-bold text-foreground">
            Create Post
          </h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate({ to: "/" })}
            className="text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Edit Video — always visible quick-access button at top */}
        <button
          type="button"
          data-ocid="create_post.edit_video_button"
          onClick={() => {
            setPostType("edit");
            setError("");
          }}
          className="w-full mb-4 flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-bold text-lg text-white shadow-lg transition-all duration-200 active:scale-[0.98]"
          style={{
            background:
              "linear-gradient(135deg, #f5c842 0%, #e8a020 55%, #ea580c 100%)",
            boxShadow: "0 4px 20px oklch(0.78 0.16 75 / 0.35)",
          }}
        >
          <Clapperboard className="w-5 h-5" />
          Edit Video
        </button>

        {/* Post type selector — now 6 tabs */}
        <div className="grid grid-cols-6 gap-1.5 mb-6">
          {TABS.map(({ type, icon: Icon, label }) => (
            <button
              type="button"
              key={type}
              data-ocid={`create_post.${type}_tab`}
              onClick={() => {
                setPostType(type);
                if (type !== "edit") clearMedia();
                setError("");
              }}
              className={`flex flex-col items-center gap-1 py-3 rounded-xl border transition-all duration-200 ${
                postType === type
                  ? type === "edit"
                    ? "border-cyan-400/60 bg-cyan-400/10 text-cyan-400"
                    : "border-gold-500 bg-gold-500/10 text-gold-400"
                  : "border-border bg-surface-1 text-muted-foreground hover:border-gold-500/50"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          ))}
        </div>

        {/* ── EDIT TAB ── */}
        {postType === "edit" && (
          <MediaEditorTab onNavigate={(to) => navigate({ to: to as "/" })} />
        )}

        {/* ── REGULAR TABS ── */}
        {postType !== "edit" && (
          <>
            {/* Media upload area */}
            {postType !== "text" && (
              <div className="mb-5">
                <Label className="text-sm font-medium text-foreground mb-2 block">
                  {postType === "image"
                    ? "Photo"
                    : postType === "video"
                      ? "Video (max 3 min)"
                      : postType === "gif"
                        ? "GIF"
                        : "Poster"}
                </Label>
                {mediaPreview ? (
                  <div className="relative rounded-xl overflow-hidden bg-surface-2">
                    {postType === "video" ? (
                      <video
                        src={mediaPreview}
                        className="w-full max-h-64 object-cover"
                        controls
                      >
                        <track kind="captions" />
                      </video>
                    ) : (
                      <img
                        src={mediaPreview}
                        alt="Preview"
                        className="w-full max-h-64 object-cover"
                      />
                    )}
                    <button
                      type="button"
                      onClick={clearMedia}
                      className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black/80 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    data-ocid="create_post.upload_button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center gap-3 hover:border-gold-500/50 transition-colors bg-surface-1"
                  >
                    <Upload className="w-8 h-8 text-muted-foreground" />
                    <div className="text-center">
                      <p className="text-sm font-medium text-foreground">
                        Tap to upload{" "}
                        {postType === "image"
                          ? "photo"
                          : postType === "video"
                            ? "video"
                            : postType === "gif"
                              ? "GIF"
                              : "poster"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {postType === "video"
                          ? "MP4, MOV, WebM · max 3 minutes"
                          : postType === "gif"
                            ? "GIF"
                            : "JPG, PNG, GIF, WebP"}
                      </p>
                    </div>
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={
                    postType === "video"
                      ? "video/*"
                      : postType === "gif"
                        ? "image/gif"
                        : "image/*"
                  }
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            )}

            {/* Caption */}
            <div className="mb-5">
              <Label
                htmlFor="caption"
                className="text-sm font-medium text-foreground mb-2 block"
              >
                {postType === "text" ? "What's on your mind?" : "Caption"}
              </Label>
              <Textarea
                id="caption"
                placeholder={
                  postType === "text"
                    ? "Share your thoughts..."
                    : "Write a caption..."
                }
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="resize-none min-h-[100px]"
                rows={4}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground mt-1 text-right">
                {caption.length}/500
              </p>
            </div>

            {/* Author info */}
            <div className="mb-5 p-3 bg-surface-1 rounded-xl border border-border">
              <p className="text-xs text-muted-foreground">Posting as</p>
              <p className="text-sm font-medium text-foreground">
                {authorName}
              </p>
            </div>

            {/* Error message */}
            {error && (
              <div className="mb-4 flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-xl">
                <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {/* Destination info */}
            {(postType === "video" ||
              postType === "image" ||
              postType === "gif") && (
              <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-2 border border-border/50">
                <span className="text-xs text-muted-foreground">
                  This will be posted to{" "}
                  <strong className="text-gold-400">
                    {destination === "shortsport" ? "ShortSport" : "Home Feed"}
                  </strong>
                  {destination === "shortsport"
                    ? " (video ≤ 3 min)"
                    : " (video > 3 min or photo)"}
                </span>
              </div>
            )}

            {/* Submit button */}
            <div className="pb-6 pt-2">
              <Button
                data-ocid="create_post.submit_button"
                onClick={handleSubmit}
                disabled={!canSubmit}
                size="lg"
                className="w-full text-white font-bold rounded-2xl py-4 text-base shadow-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
                style={{
                  background: canSubmit
                    ? "linear-gradient(135deg, #f5c842 0%, #e8a020 45%, #06b6d4 100%)"
                    : undefined,
                  color: canSubmit ? "oklch(0.05 0.008 265)" : undefined,
                  boxShadow: canSubmit
                    ? "0 4px 24px oklch(0.78 0.16 75 / 0.30)"
                    : undefined,
                }}
              >
                {isUploading || createPost.isPending ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Posting…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Upload className="w-5 h-5" />
                    {destination === "shortsport"
                      ? "Post to ShortSport"
                      : "Post to Feed"}
                  </span>
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

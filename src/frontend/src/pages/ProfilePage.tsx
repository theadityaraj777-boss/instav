import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Camera,
  Check,
  Edit3,
  Grid3X3,
  Heart,
  Loader2,
  MapPin,
} from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ExternalBlob } from "../backend";
import AvatarPlaceholder from "../components/AvatarPlaceholder";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  type Post,
  useGetCallerUserProfile,
  useGetFollowerCount,
  useGetFollowingList,
  useGetLikedPosts,
  useGetPostsByUser,
  useSaveCallerUserProfile,
} from "../hooks/useQueries";

interface PostGridItemProps {
  post: Post;
}

function PostGridItem({ post }: PostGridItemProps) {
  const isVideo = post.mediaType?.startsWith("video");
  const mediaUrl = post.media?.getDirectURL();

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
        <div className="w-full h-full flex items-center justify-center bg-surface-2">
          <span className="text-muted-foreground text-xs text-center px-2 line-clamp-3">
            {post.caption}
          </span>
        </div>
      )}
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
        <span className="text-white text-sm font-semibold flex items-center gap-1">
          <Heart className="w-4 h-4 fill-white" />
          {post.likeCount.toString()}
        </span>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { identity } = useInternetIdentity();
  const { data: userProfile, isLoading: profileLoading } =
    useGetCallerUserProfile();
  const saveProfile = useSaveCallerUserProfile();

  const myPrincipalStr = identity?.getPrincipal().toString();
  const { data: followerCount } = useGetFollowerCount(myPrincipalStr);
  const { data: followingList = [] } = useGetFollowingList();
  const { data: myPosts = [], isLoading: postsLoading } =
    useGetPostsByUser(myPrincipalStr);
  const { data: likedPosts = [], isLoading: likedPostsLoading } =
    useGetLikedPosts();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"posts" | "liked">("posts");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving">("idle");

  const [bannerPhoto, setBannerPhoto] = useState<ExternalBlob | undefined>(
    undefined,
  );
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const [editName, setEditName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editHandle, setEditHandle] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editProfilePhoto, setEditProfilePhoto] = useState<
    ExternalBlob | undefined
  >(undefined);
  const [editProfilePhotoPreview, setEditProfilePhotoPreview] = useState<
    string | null
  >(null);
  const profilePhotoInputRef = useRef<HTMLInputElement>(null);

  // Revoke banner preview URL on change / unmount to free memory
  useEffect(() => {
    return () => {
      if (bannerPreview) URL.revokeObjectURL(bannerPreview);
    };
  }, [bannerPreview]);

  // Revoke profile photo preview URL on change / unmount to free memory
  useEffect(() => {
    return () => {
      if (editProfilePhotoPreview) URL.revokeObjectURL(editProfilePhotoPreview);
    };
  }, [editProfilePhotoPreview]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: bannerPhoto intentionally excluded
  useEffect(() => {
    if (userProfile?.bannerImage && !bannerPhoto) {
      setBannerPhoto(userProfile.bannerImage);
    }
  }, [userProfile]);

  const openEditModal = () => {
    setEditName(userProfile?.name || "");
    setEditUsername(userProfile?.username || "");
    setEditHandle(userProfile?.handle || "");
    setEditBio(userProfile?.bio || "");
    setEditLocation(userProfile?.location || "");
    setEditProfilePhoto(userProfile?.profilePhoto);
    setEditProfilePhotoPreview(null);
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setBannerPreview(previewUrl);

    file.arrayBuffer().then(async (buf) => {
      const blob = ExternalBlob.fromBytes(new Uint8Array(buf));
      setBannerPhoto(blob);

      try {
        const currentProfile = userProfile;
        await saveProfile.mutateAsync({
          name: currentProfile?.name || "",
          username: currentProfile?.username || "",
          handle: currentProfile?.handle || "",
          bio: currentProfile?.bio || "",
          location: currentProfile?.location || "",
          profilePhoto: currentProfile?.profilePhoto,
          bannerImage: blob,
        });
        toast.success("Banner updated!");
      } catch (err) {
        const msg =
          err instanceof Error && err.message.includes("Actor not available")
            ? "Still connecting — please try again in a moment."
            : "Failed to save banner. Please try again.";
        toast.error(msg);
      }
    });
  };

  const handleProfilePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    setEditProfilePhotoPreview(previewUrl);
    file.arrayBuffer().then((buf) => {
      const blob = ExternalBlob.fromBytes(new Uint8Array(buf));
      setEditProfilePhoto(blob);
    });
  };

  const handleSaveProfile = async () => {
    setSaveStatus("saving");
    const delays = [1000, 2000, 3000, 4000, 5000];
    for (let attempt = 0; attempt <= delays.length; attempt++) {
      try {
        const currentBanner = bannerPhoto ?? userProfile?.bannerImage;
        await saveProfile.mutateAsync({
          name: editName,
          username: editUsername,
          handle: editHandle,
          bio: editBio,
          location: editLocation,
          profilePhoto: editProfilePhoto,
          bannerImage: currentBanner,
        });
        setSaveStatus("idle");
        toast.success("Profile saved!");
        setIsEditModalOpen(false);
        return;
      } catch (err) {
        const isActorError =
          err instanceof Error &&
          (err.message.includes("Actor not available") ||
            err.message.includes("isFetching"));
        if (isActorError && attempt < delays.length) {
          await new Promise((r) => setTimeout(r, delays[attempt]));
          continue;
        }
        setSaveStatus("idle");
        toast.error(
          isActorError
            ? "Profile save failed — please try again"
            : "Profile save failed — please try again",
        );
        return;
      }
    }
  };

  const displayName = userProfile?.name || "Anonymous";
  const handle = userProfile?.handle || userProfile?.username || "";
  const bio = userProfile?.bio || "";
  const location = userProfile?.location || "";

  const bannerSrc =
    bannerPreview ||
    (userProfile?.bannerImage ? userProfile.bannerImage.getDirectURL() : null);

  const shadowCount = Number(followerCount ?? 0);
  const followingCount = followingList.length;
  const postCount = myPosts.length;

  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-gold-400" />
          <p className="text-muted-foreground text-sm">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Banner */}
      <div className="relative w-full h-52 overflow-hidden">
        {bannerSrc ? (
          <img
            src={bannerSrc}
            alt="Banner"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="banner-premium w-full h-full">
            <div
              className="absolute inset-0 pointer-events-none overflow-hidden"
              aria-hidden="true"
            >
              <div
                className="absolute top-0 bottom-0 w-1/3 animate-banner-shimmer"
                style={{
                  background:
                    "linear-gradient(90deg, transparent 0%, oklch(1 0 0 / 0.04) 50%, transparent 100%)",
                }}
              />
            </div>
            <div
              className="absolute inset-0 pointer-events-none"
              aria-hidden="true"
              style={{
                backgroundImage:
                  "linear-gradient(oklch(1 0 0 / 0.03) 1px, transparent 1px), linear-gradient(90deg, oklch(1 0 0 / 0.03) 1px, transparent 1px)",
                backgroundSize: "40px 40px",
              }}
            />
          </div>
        )}

        {/* Edit Banner button */}
        <button
          type="button"
          onClick={() => bannerInputRef.current?.click()}
          className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-white/90 transition-all"
          style={{
            background: "oklch(0.10 0.01 265 / 70%)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: "1px solid oklch(1 0 0 / 12%)",
          }}
        >
          <Camera className="w-3.5 h-3.5" />
          Edit Banner
        </button>
        <input
          ref={bannerInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleBannerChange}
        />
      </div>

      {/* Profile info section */}
      <div className="relative px-4 pb-4">
        {/* Avatar — overlaps banner */}
        <div className="absolute -top-14 left-4">
          <div
            className="rounded-full p-0.5"
            style={{
              background: "linear-gradient(135deg, #f5c842, #e8a020, #ff6b6b)",
            }}
          >
            <div
              className="rounded-full p-0.5"
              style={{ background: "oklch(0.05 0.008 265)" }}
            >
              <AvatarPlaceholder
                name={displayName}
                profilePicture={userProfile?.profilePhoto}
                size="2xl"
                showGradientRing={false}
              />
            </div>
          </div>
        </div>

        {/* Edit Profile button */}
        <div className="flex justify-center pt-3 pb-2">
          <button
            type="button"
            onClick={openEditModal}
            data-ocid="profile.edit_button"
            className="flex items-center justify-center gap-2 w-full max-w-xs py-3 px-8 rounded-2xl text-lg font-bold transition-all duration-200"
            style={{
              background: "linear-gradient(135deg, #f5c842 0%, #e8a020 100%)",
              color: "oklch(0.07 0.006 265)",
              boxShadow:
                "0 4px 20px rgba(245, 200, 66, 0.45), 0 2px 8px rgba(0,0,0,0.3)",
              minWidth: 200,
            }}
          >
            <Edit3 className="w-5 h-5" />
            Edit Profile
          </button>
        </div>

        {/* Name & handle */}
        <div className="mt-10">
          <h1 className="text-xl font-bold text-foreground">{displayName}</h1>
          {handle && (
            <p className="text-muted-foreground text-sm mt-0.5">@{handle}</p>
          )}
          {bio && (
            <p className="text-foreground/80 text-sm mt-2 leading-relaxed">
              {bio}
            </p>
          )}
          {location && (
            <div className="flex items-center gap-1 mt-1.5 text-muted-foreground text-xs">
              <MapPin className="w-3.5 h-3.5" />
              <span>{location}</span>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="flex gap-4 mt-4 flex-wrap items-end">
          <div className="text-center">
            <p className="text-foreground font-bold text-lg leading-tight">
              {postsLoading ? (
                <Skeleton className="w-8 h-5 inline-block rounded" />
              ) : (
                postCount
              )}
            </p>
            <p className="text-muted-foreground text-xs">Posts</p>
          </div>

          {/* Shadows stat — gold box */}
          <div
            style={{
              background: "oklch(0.78 0.16 75 / 12%)",
              border: "1px solid oklch(0.78 0.16 75 / 40%)",
              borderRadius: "12px",
              padding: "8px 16px",
              textAlign: "center",
            }}
          >
            <p
              style={{
                color: "#f5c842",
                fontWeight: 700,
                fontSize: "1.25rem",
                lineHeight: 1.2,
              }}
            >
              {shadowCount >= 1000
                ? `${(shadowCount / 1000).toFixed(1)}k`
                : shadowCount}
            </p>
            <p
              style={{
                color: "oklch(0.78 0.16 75 / 70%)",
                fontSize: "0.75rem",
              }}
            >
              Shadows
            </p>
          </div>

          <div className="text-center">
            <p className="text-foreground font-bold text-lg leading-tight">
              {followingCount}
            </p>
            <p className="text-muted-foreground text-xs">Following</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div
        className="flex border-b mx-4 mt-2"
        style={{ borderColor: "oklch(1 0 0 / 7%)" }}
      >
        <button
          type="button"
          onClick={() => setActiveTab("posts")}
          className="flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors"
          style={
            activeTab === "posts"
              ? { borderColor: "#f5c842", color: "#f5c842" }
              : { borderColor: "transparent", color: "oklch(0.55 0.015 60)" }
          }
          data-ocid="profile.posts.tab"
        >
          <Grid3X3 className="w-4 h-4" />
          Posts
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("liked")}
          className="flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors"
          style={
            activeTab === "liked"
              ? { borderColor: "#f5c842", color: "#f5c842" }
              : { borderColor: "transparent", color: "oklch(0.55 0.015 60)" }
          }
          data-ocid="profile.liked.tab"
        >
          <Heart className="w-4 h-4" />
          Liked
        </button>
      </div>

      {/* Posts grid */}
      <div className="px-4 mt-4">
        {activeTab === "posts" &&
          (postsLoading ? (
            <div className="grid grid-cols-3 gap-1">
              {Array.from({ length: 6 }, (_, i) => `skeleton-${i}`).map((k) => (
                <Skeleton key={k} className="aspect-square rounded-lg" />
              ))}
            </div>
          ) : myPosts.length === 0 ? (
            <div
              className="py-12 text-center"
              data-ocid="profile.posts.empty_state"
            >
              <Grid3X3 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">No posts yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1">
              {myPosts.map((post) => (
                <PostGridItem key={post.id.toString()} post={post} />
              ))}
            </div>
          ))}

        {activeTab === "liked" &&
          (likedPostsLoading ? (
            <div className="grid grid-cols-3 gap-1">
              {Array.from({ length: 6 }, (_, i) => `liked-skeleton-${i}`).map(
                (k) => (
                  <Skeleton key={k} className="aspect-square rounded-lg" />
                ),
              )}
            </div>
          ) : likedPosts.length === 0 ? (
            <div
              className="py-12 text-center"
              data-ocid="profile.liked.empty_state"
            >
              <Heart className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">
                No liked posts yet
              </p>
              <p className="text-muted-foreground/60 text-xs mt-1">
                Posts you like will appear here
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1">
              {likedPosts.map((post) => (
                <PostGridItem key={post.id.toString()} post={post} />
              ))}
            </div>
          ))}
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent
          className="max-w-md mx-auto rounded-2xl border"
          style={{
            background: "oklch(0.11 0.009 265)",
            borderColor: "oklch(1 0 0 / 8%)",
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-foreground">Edit Profile</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Profile Photo */}
            <div className="flex flex-col items-center gap-3">
              <button
                type="button"
                className="rounded-full p-0.5 cursor-pointer"
                style={{
                  background:
                    "linear-gradient(135deg, #f5c842, #e8a020, #ff6b6b)",
                }}
                onClick={() => profilePhotoInputRef.current?.click()}
              >
                <div
                  className="rounded-full p-0.5"
                  style={{ background: "oklch(0.11 0.009 265)" }}
                >
                  {editProfilePhotoPreview ? (
                    <img
                      src={editProfilePhotoPreview}
                      alt="Profile preview"
                      className="w-20 h-20 rounded-full object-cover"
                    />
                  ) : (
                    <AvatarPlaceholder
                      name={editName || displayName}
                      profilePicture={editProfilePhoto}
                      size="xl"
                      showGradientRing={false}
                    />
                  )}
                </div>
              </button>
              <button
                type="button"
                onClick={() => profilePhotoInputRef.current?.click()}
                className="text-xs font-medium"
                style={{ color: "#f5c842" }}
              >
                Change Photo
              </button>
              <input
                ref={profilePhotoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleProfilePhotoChange}
              />
            </div>

            <div className="space-y-3">
              <div>
                <Label className="text-muted-foreground text-xs mb-1 block">
                  Display Name
                </Label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Your name"
                  className="bg-surface border-border/50 text-foreground"
                />
              </div>
              <div>
                <Label className="text-muted-foreground text-xs mb-1 block">
                  Username
                </Label>
                <Input
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  placeholder="username"
                  className="bg-surface border-border/50 text-foreground"
                />
              </div>
              <div>
                <Label className="text-muted-foreground text-xs mb-1 block">
                  Handle
                </Label>
                <Input
                  value={editHandle}
                  onChange={(e) => setEditHandle(e.target.value)}
                  placeholder="@handle"
                  className="bg-surface border-border/50 text-foreground"
                />
              </div>
              <div>
                <Label className="text-muted-foreground text-xs mb-1 block">
                  Bio
                </Label>
                <Textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="Tell the world about yourself…"
                  rows={3}
                  className="bg-surface border-border/50 text-foreground resize-none"
                />
              </div>
              <div>
                <Label className="text-muted-foreground text-xs mb-1 block">
                  Location
                </Label>
                <Input
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  placeholder="City, Country"
                  className="bg-surface border-border/50 text-foreground"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={closeEditModal}
              disabled={saveStatus === "saving"}
              data-ocid="profile.edit.cancel_button"
              className="flex-1 border-border/50 text-muted-foreground hover:text-foreground"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveProfile}
              disabled={saveStatus === "saving" || saveProfile.isPending}
              data-ocid="profile.edit.save_button"
              className="flex-1 font-semibold"
              style={{
                background: "linear-gradient(135deg, #f5c842, #e8a020)",
                color: "oklch(0.07 0.006 265)",
              }}
            >
              {saveStatus === "saving" ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                  Saving…
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-1" />
                  Save Profile
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

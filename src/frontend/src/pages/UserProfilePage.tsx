import { Skeleton } from "@/components/ui/skeleton";
import { Principal } from "@icp-sdk/core/principal";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import {
  Edit3,
  Grid,
  Heart,
  MapPin,
  MessageCircle,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import AvatarPlaceholder from "../components/AvatarPlaceholder";
import { getAnonActor } from "../hooks/useAnonActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  FriendshipStatusEnum,
  useFollowUser,
  useGetFollowerCount,
  useGetFollowingList,
  useGetFriendshipStatus,
  useGetLikedPosts,
  useGetPostsByUser,
  useGetTopCreators,
  useGetUserProfile,
  useIsFollowing,
  useRespondToFriendRequest,
  useSendFriendRequest,
  useUnfollowUser,
  useUnfriend,
} from "../hooks/useQueries";
import type { Post } from "../hooks/useQueries";

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

function isPrincipalId(s: string): boolean {
  try {
    Principal.fromText(s);
    return true;
  } catch {
    return false;
  }
}

export default function UserProfilePage() {
  const { principal } = useParams({ from: "/user/$principal" });
  const { identity } = useInternetIdentity();
  const myPrincipal = identity?.getPrincipal().toString();
  const navigate = useNavigate();

  // useGetUserProfile now uses getPublicUserProfile internally — works for all visitors
  const { data: profile, isLoading: profileLoading } =
    useGetUserProfile(principal);

  // Resolve the actual principal string for this profile.
  // The URL param may be a handle like "sandhya_sinha" or a real principal ID.
  // We need the real principal for rank detection and post lookup.

  const [resolvedPrincipal, setResolvedPrincipal] = useState<string | null>(
    () => (principal && isPrincipalId(principal) ? principal : null),
  );

  useEffect(() => {
    // Already resolved (looks like a real principal)
    if (principal && isPrincipalId(principal)) {
      setResolvedPrincipal(principal);
      return;
    }
    // It's a handle — look up the real principal
    let cancelled = false;
    (async () => {
      try {
        const anon = await getAnonActor();
        const result = await anon.lookupPrincipal(principal);
        if (!cancelled && result) {
          setResolvedPrincipal(result.toString());
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [principal]);

  const [activeTab, setActiveTab] = useState<"posts" | "liked">("posts");

  const { data: posts = [], isLoading: postsLoading } = useGetPostsByUser(
    resolvedPrincipal ?? principal,
  );
  const { data: likedPosts = [], isLoading: likedPostsLoading } =
    useGetLikedPosts();
  const { data: followerCount } = useGetFollowerCount(
    resolvedPrincipal ?? principal,
  );
  const { data: isFollowing } = useIsFollowing(resolvedPrincipal ?? principal);
  const { data: friendshipStatus } = useGetFriendshipStatus(
    resolvedPrincipal ?? principal,
  );
  const { data: topCreators = [] } = useGetTopCreators(10);
  const { data: followingList = [] } = useGetFollowingList();

  const followMutation = useFollowUser();
  const unfollowMutation = useUnfollowUser();
  const sendFriendRequest = useSendFriendRequest();
  const respondToFriendRequest = useRespondToFriendRequest();
  const unfriend = useUnfriend();

  // Determine rank — compare the RESOLVED principal (real canister principal)
  // against the topCreators list. The URL param may be a handle so we must
  // never use it directly for this comparison.
  const rank1Principal = topCreators[0]?.principal?.toString() ?? null;
  const rank2Principal = topCreators[1]?.principal?.toString() ?? null;
  const isRank1 = !!resolvedPrincipal && resolvedPrincipal === rank1Principal;
  const isRank2 = !!resolvedPrincipal && resolvedPrincipal === rank2Principal;

  const isOwnProfile =
    !!myPrincipal &&
    !!(resolvedPrincipal ?? principal) &&
    myPrincipal === (resolvedPrincipal ?? principal);

  // Inject CSS keyframes once
  const stylesInjectedRef = useRef(false);
  useEffect(() => {
    if (stylesInjectedRef.current) return;
    if (typeof document === "undefined") return;
    if (document.getElementById("profile-rank-styles")) return;
    stylesInjectedRef.current = true;
    const el = document.createElement("style");
    el.id = "profile-rank-styles";
    el.textContent = `
      @keyframes profileGoldRing {
        0%   { box-shadow: 0 0 0 4px #FFD700, 0 0 18px 6px rgba(255,200,0,0.55), 0 0 40px 10px rgba(255,140,0,0.25); }
        50%  { box-shadow: 0 0 0 4px #FFA500, 0 0 28px 10px rgba(255,200,0,0.70), 0 0 60px 16px rgba(255,100,0,0.35); }
        100% { box-shadow: 0 0 0 4px #FFD700, 0 0 18px 6px rgba(255,200,0,0.55), 0 0 40px 10px rgba(255,140,0,0.25); }
      }
      @keyframes profileSilverRing {
        0%   { box-shadow: 0 0 0 4px #C0C0C0, 0 0 16px 5px rgba(192,192,192,0.45), 0 0 32px 8px rgba(160,160,160,0.20); }
        50%  { box-shadow: 0 0 0 4px #E8E8E8, 0 0 26px 8px rgba(220,220,220,0.60), 0 0 50px 12px rgba(180,180,180,0.28); }
        100% { box-shadow: 0 0 0 4px #C0C0C0, 0 0 16px 5px rgba(192,192,192,0.45), 0 0 32px 8px rgba(160,160,160,0.20); }
      }
      @keyframes goldBannerGlow {
        0%, 100% { opacity: 0.55; }
        50%       { opacity: 0.80; }
      }
      @keyframes silverBannerGlow {
        0%, 100% { opacity: 0.40; }
        50%       { opacity: 0.62; }
      }
      @keyframes goldShimmerText {
        0%   { background-position: -200% center; }
        100% { background-position: 200% center; }
      }
      @keyframes crownFloat {
        0%, 100% { transform: translateY(0px) rotate(-5deg); }
        50%       { transform: translateY(-5px) rotate(5deg); }
      }
    `;
    document.head.appendChild(el);
  }, []);

  const handleFollowToggle = () => {
    if (isFollowing) {
      unfollowMutation.mutate(resolvedPrincipal ?? principal);
    } else {
      followMutation.mutate(resolvedPrincipal ?? principal);
    }
  };

  const handleFriendAction = () => {
    if (!friendshipStatus) return;
    const kind = friendshipStatus.__kind__;
    if (kind === "notConnected") {
      sendFriendRequest.mutate(resolvedPrincipal ?? principal);
    } else if (kind === "pendingIncoming") {
      respondToFriendRequest.mutate({
        senderStr: resolvedPrincipal ?? principal,
        accept: true,
      });
    } else if (kind === "friends") {
      unfriend.mutate(resolvedPrincipal ?? principal);
    }
  };

  const getFriendButtonLabel = () => {
    if (!friendshipStatus) return "Connect";
    const kind = friendshipStatus.__kind__;
    if (kind === "friends") return "Friends";
    if (kind === "pendingOutgoing") return "Requested";
    if (kind === "pendingIncoming") return "Accept";
    return "Connect";
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Skeleton className="w-full h-52" />
        <div className="px-4 pt-14 space-y-4">
          <Skeleton className="w-32 h-7 rounded-2xl" />
          <Skeleton className="w-24 h-4" />
          <div className="flex gap-3">
            <Skeleton className="w-28 h-14 rounded-2xl" />
            <Skeleton className="w-24 h-14 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">User not found</p>
        </div>
      </div>
    );
  }

  const displayName = isRank1 ? `${profile.name} ♕` : profile.name;
  const handle = profile.handle;
  const bio = profile.bio;
  const location = profile.location;
  const followerNum = followerCount !== undefined ? Number(followerCount) : 0;
  const postCount = posts.length;

  const bannerSrc = profile.bannerImage
    ? profile.bannerImage.getDirectURL()
    : null;

  // Rank-aware avatar ring style
  const avatarRingStyle: React.CSSProperties = isRank1
    ? {
        background:
          "linear-gradient(135deg, #FFEC00 0%, #FF8C00 50%, #E83030 100%)",
        animation: "profileGoldRing 2.4s ease-in-out infinite",
        borderRadius: "50%",
        padding: 3,
      }
    : isRank2
      ? {
          background:
            "linear-gradient(135deg, #E8E8E8 0%, #B0B3B8 50%, #787878 100%)",
          animation: "profileSilverRing 2.8s ease-in-out infinite",
          borderRadius: "50%",
          padding: 3,
        }
      : {
          background: "linear-gradient(135deg, #f5c842, #e8a020, #ff6b6b)",
          borderRadius: "50%",
          padding: 2,
        };

  // Shadows stat box
  const shadowsBoxStyle: React.CSSProperties = isRank1
    ? {
        background:
          "linear-gradient(135deg, rgba(255,215,0,0.22) 0%, rgba(255,140,0,0.15) 100%)",
        border: "1.5px solid rgba(255,215,0,0.60)",
        borderRadius: "14px",
        padding: "10px 20px",
        textAlign: "center",
        boxShadow: "0 4px 20px rgba(255,200,0,0.25)",
      }
    : isRank2
      ? {
          background:
            "linear-gradient(135deg, rgba(192,192,192,0.18) 0%, rgba(169,169,169,0.12) 100%)",
          border: "1.5px solid rgba(192,192,192,0.50)",
          borderRadius: "14px",
          padding: "10px 20px",
          textAlign: "center",
          boxShadow: "0 4px 16px rgba(192,192,192,0.18)",
        }
      : {
          background: "oklch(0.78 0.16 75 / 12%)",
          border: "1px solid oklch(0.78 0.16 75 / 40%)",
          borderRadius: "12px",
          padding: "8px 16px",
          textAlign: "center",
        };

  const shadowsNumColor = isRank1 ? "#FFD700" : isRank2 ? "#C8C8C8" : "#f5c842";
  const shadowsLabelColor = isRank1
    ? "rgba(255,215,0,0.75)"
    : isRank2
      ? "rgba(192,192,192,0.65)"
      : "oklch(0.78 0.16 75 / 70%)";

  return (
    <div className="relative min-h-screen bg-background pb-20">
      {/* Gold/Silver full-page background overlay */}
      {isRank1 && (
        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            inset: 0,
            background:
              "linear-gradient(160deg, rgba(255,215,0,0.08) 0%, rgba(255,165,0,0.06) 50%, rgba(218,165,32,0.04) 100%)",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />
      )}
      {isRank2 && (
        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            inset: 0,
            background:
              "linear-gradient(160deg, rgba(192,192,192,0.07) 0%, rgba(169,169,169,0.05) 50%, rgba(128,128,128,0.03) 100%)",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />
      )}

      {/* Floating crown for #1 */}
      {isRank1 && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 12,
            right: 16,
            fontSize: "2.6rem",
            animation: "crownFloat 3.2s ease-in-out infinite",
            filter: "drop-shadow(0 4px 12px rgba(255,180,0,0.7))",
            zIndex: 10,
            pointerEvents: "none",
          }}
        >
          👑
        </div>
      )}

      {/* Banner */}
      <div className="relative w-full h-52 overflow-hidden z-[1]">
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
            {/* Gold banner glow */}
            {isRank1 && (
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(135deg, rgba(255,215,0,0.30) 0%, rgba(255,140,0,0.20) 60%, rgba(218,165,32,0.15) 100%)",
                  animation: "goldBannerGlow 2.8s ease-in-out infinite",
                  pointerEvents: "none",
                }}
              />
            )}
            {/* Silver banner glow */}
            {isRank2 && (
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(135deg, rgba(192,192,192,0.22) 0%, rgba(169,169,169,0.14) 60%, rgba(128,128,128,0.10) 100%)",
                  animation: "silverBannerGlow 3.2s ease-in-out infinite",
                  pointerEvents: "none",
                }}
              />
            )}
          </div>
        )}
      </div>

      {/* Profile info */}
      <div className="relative z-[1] px-4 pb-4">
        {/* Avatar — overlaps banner */}
        <div className="absolute -top-14 left-4">
          <div style={avatarRingStyle}>
            <div
              className="rounded-full p-0.5"
              style={{ background: "oklch(0.05 0.008 265)" }}
            >
              <AvatarPlaceholder
                name={displayName}
                profilePicture={profile.profilePhoto}
                size="2xl"
                showGradientRing={false}
              />
            </div>
          </div>
        </div>

        {/* Action buttons */}
        {!isOwnProfile && (
          <div className="flex justify-end pt-3 pb-2 gap-2">
            {/* Shadow (Follow) button — gold when not shadowing */}
            <button
              type="button"
              data-ocid="user_profile.toggle"
              onClick={handleFollowToggle}
              disabled={followMutation.isPending || unfollowMutation.isPending}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all disabled:opacity-60"
              style={
                isFollowing
                  ? {
                      background: "oklch(0.15 0.011 265 / 80%)",
                      backdropFilter: "blur(12px)",
                      border: "1px solid oklch(1 0 0 / 10%)",
                      color: "oklch(0.96 0.008 60)",
                    }
                  : {
                      background: "linear-gradient(135deg, #f5c842, #e8a020)",
                      color: "oklch(0.05 0.008 265)",
                      boxShadow: "0 2px 16px oklch(0.78 0.16 75 / 0.35)",
                    }
              }
            >
              {isFollowing ? (
                <>
                  <UserCheck className="w-3.5 h-3.5" />
                  Shadowing
                </>
              ) : (
                <>
                  <UserPlus className="w-3.5 h-3.5" />
                  Shadow
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => navigate({ to: "/messages" })}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-all"
              style={{
                background: "oklch(0.15 0.011 265 / 80%)",
                backdropFilter: "blur(12px)",
                border: "1px solid oklch(1 0 0 / 10%)",
                color: "oklch(0.96 0.008 60)",
              }}
            >
              <MessageCircle className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handleFriendAction}
              disabled={
                sendFriendRequest.isPending ||
                respondToFriendRequest.isPending ||
                unfriend.isPending ||
                friendshipStatus?.__kind__ === "pendingOutgoing"
              }
              className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-all disabled:opacity-60"
              style={{
                background: "oklch(0.15 0.011 265 / 80%)",
                backdropFilter: "blur(12px)",
                border: "1px solid oklch(1 0 0 / 10%)",
                color: "oklch(0.96 0.008 60)",
              }}
            >
              {getFriendButtonLabel()}
            </button>
          </div>
        )}

        {/* Name & handle */}
        <div className="mt-10">
          {/* Rank badge */}
          {isRank1 && (
            <div
              className="inline-flex items-center gap-1.5 mb-2"
              style={{
                background:
                  "linear-gradient(135deg, rgba(255,215,0,0.25), rgba(255,140,0,0.18))",
                border: "1px solid rgba(255,215,0,0.55)",
                borderRadius: "999px",
                padding: "3px 12px",
                boxShadow: "0 2px 12px rgba(255,200,0,0.25)",
              }}
            >
              <span style={{ fontSize: "0.85rem" }}>👑</span>
              <span
                style={{
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  background:
                    "linear-gradient(90deg, #FFD700, #FFA500, #FFD700)",
                  backgroundSize: "200% auto",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  animation: "goldShimmerText 2.4s linear infinite",
                }}
              >
                Top Creator
              </span>
            </div>
          )}
          {isRank2 && (
            <div
              className="inline-flex items-center gap-1.5 mb-2"
              style={{
                background:
                  "linear-gradient(135deg, rgba(192,192,192,0.20), rgba(169,169,169,0.14))",
                border: "1px solid rgba(192,192,192,0.45)",
                borderRadius: "999px",
                padding: "3px 12px",
                boxShadow: "0 2px 10px rgba(192,192,192,0.18)",
              }}
            >
              <span style={{ fontSize: "0.85rem" }}>🥈</span>
              <span
                style={{
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "#C0C0C0",
                }}
              >
                #2 Creator
              </span>
            </div>
          )}

          <h1
            className="text-xl font-bold"
            style={{
              ...(isRank1
                ? {
                    background:
                      "linear-gradient(90deg, #FFD700 0%, #FFA500 50%, #FFD700 100%)",
                    backgroundSize: "200% auto",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    animation: "goldShimmerText 3s linear infinite",
                    fontWeight: 800,
                  }
                : isRank2
                  ? {
                      background:
                        "linear-gradient(90deg, #E8E8E8 0%, #A0A0A0 50%, #E8E8E8 100%)",
                      backgroundSize: "200% auto",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      animation: "goldShimmerText 3.5s linear infinite",
                      fontWeight: 800,
                    }
                  : { color: "oklch(0.96 0.008 60)" }),
            }}
          >
            {displayName}
          </h1>

          {handle && (
            <p
              className="text-sm mt-0.5"
              style={{
                color: isRank1
                  ? "rgba(255,215,0,0.70)"
                  : isRank2
                    ? "rgba(192,192,192,0.65)"
                    : "oklch(0.50 0.010 60)",
              }}
            >
              @{handle}
            </p>
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
        <div className="flex gap-4 mt-4 flex-wrap">
          <div className="text-center">
            <p className="text-foreground font-bold text-lg leading-tight">
              {postCount}
            </p>
            <p className="text-muted-foreground text-xs">Posts</p>
          </div>

          {/* Shadows — rank-themed box */}
          <div style={shadowsBoxStyle}>
            <p
              style={{
                color: shadowsNumColor,
                fontWeight: 700,
                fontSize: "1.25rem",
                lineHeight: 1.2,
              }}
            >
              {followerNum >= 1000
                ? `${(followerNum / 1000).toFixed(1)}k`
                : followerNum}
            </p>
            <p
              style={{
                color: shadowsLabelColor,
                fontSize: "0.75rem",
              }}
            >
              Shadows
            </p>
          </div>

          <div className="text-center">
            <p className="text-foreground font-bold text-lg leading-tight">
              {isOwnProfile ? followingList.length : 0}
            </p>
            <p className="text-muted-foreground text-xs">Following</p>
          </div>
        </div>
      </div>

      {/* Edit Profile button for own profile */}
      {isOwnProfile && (
        <div className="relative z-[1] px-4 mt-1 flex justify-end">
          <Link
            to="/profile"
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all"
            style={{
              background: "oklch(0.15 0.011 265 / 80%)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              border: "1px solid oklch(1 0 0 / 10%)",
              color: "oklch(0.96 0.008 60)",
            }}
            data-ocid="user_profile.edit_button"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Edit Profile
          </Link>
        </div>
      )}

      {/* Tabs */}
      <div
        className="relative z-[1] flex border-b mx-4 mt-3"
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
          data-ocid="user_profile.posts.tab"
        >
          <Grid className="w-4 h-4" />
          Posts
        </button>
        {isOwnProfile && (
          <button
            type="button"
            onClick={() => setActiveTab("liked")}
            className="flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors"
            style={
              activeTab === "liked"
                ? { borderColor: "#f5c842", color: "#f5c842" }
                : { borderColor: "transparent", color: "oklch(0.55 0.015 60)" }
            }
            data-ocid="user_profile.liked.tab"
          >
            <Heart className="w-4 h-4" />
            Liked
          </button>
        )}
      </div>

      {/* Posts grid */}
      <div className="relative z-[1] px-4 mt-4">
        {activeTab === "posts" &&
          (postsLoading ? (
            <div className="grid grid-cols-3 gap-1">
              {Array.from({ length: 6 }, (_, i) => `profile-skeleton-${i}`).map(
                (k) => (
                  <Skeleton key={k} className="aspect-square rounded-lg" />
                ),
              )}
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12">
              <Grid className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">No posts yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1">
              {posts.map((post) => (
                <PostGridItem key={post.id.toString()} post={post} />
              ))}
            </div>
          ))}

        {activeTab === "liked" &&
          isOwnProfile &&
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
              className="text-center py-12"
              data-ocid="user_profile.liked.empty_state"
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
    </div>
  );
}

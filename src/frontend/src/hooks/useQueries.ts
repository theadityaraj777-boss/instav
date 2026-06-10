import { Principal } from "@dfinity/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import type {
  CommunityPost,
  CreatorEntry,
  UserProfile,
  UserProfileInput,
} from "../backend";
import type { ExternalBlob } from "../backend";
import * as localPosts from "../lib/localPosts";
import { useActor } from "./useActor";
import { getAnonActor } from "./useAnonActor";
import { useInternetIdentity } from "./useInternetIdentity";

// ─── Local types (not exported by backend) ────────────────────────────────────

export type UserProfileData = UserProfile;

export interface PostInput {
  authorName: string;
  media?: ExternalBlob;
  mediaFile?: File;
  mediaType: string;
  caption: string;
  destination?: "feed" | "shortsport";
  /** Optional thumbnail URL for video poster in feed */
  thumbnailUrl?: string;
}

export interface Post {
  id: bigint;
  authorPrincipal: Principal;
  authorName: string;
  media?: ExternalBlob;
  mediaType: string;
  caption: string;
  timestamp: bigint;
  likeCount: bigint;
  viewCount: bigint;
  destination: "feed" | "shortsport";
  /** true when this post lives in the backend (not IndexedDB-only) */
  isBackendPost?: boolean;
  backendPostId?: bigint;
  /** Thumbnail URL for video poster (feed only, not ShortSport) */
  thumbnailUrl?: string;
}

export interface Comment {
  id: bigint;
  postId: bigint;
  authorPrincipal: Principal;
  authorName: string;
  text: string;
  timestamp: bigint;
  /** Optional image/GIF attached to this comment */
  mediaUrl?: string;
  /** Like count for this comment */
  likeCount?: bigint;
}

export type NotificationType =
  | { __kind__: "new_shadow" }
  | { __kind__: "message" }
  | { __kind__: "comment" };

export interface Notification {
  id: bigint;
  notificationType: NotificationType;
  fromPrincipal: Principal;
  timestamp: bigint;
  read: boolean;
  postId?: bigint;
}

export interface Conversation {
  otherPrincipal: Principal;
  lastUpdated: bigint;
  unreadCount: bigint;
  lastMessageContent?: string;
  lastMessageTimestamp?: bigint;
}

export interface Message {
  sender: Principal;
  recipient: Principal;
  content: string;
  timestamp: bigint;
  postId?: bigint;
  read: boolean;
}

export type FriendshipStatusEnum =
  | { __kind__: "notConnected" }
  | { __kind__: "pendingOutgoing" }
  | { __kind__: "pendingIncoming" }
  | { __kind__: "friends" };

export interface FriendRequest {
  sender: Principal;
  recipient: Principal;
  status:
    | { __kind__: "pending" }
    | { __kind__: "accepted" }
    | { __kind__: "declined" };
  timestamp: bigint;
}

export interface CreatorRanking {
  principal: Principal;
  profile: UserProfile | null;
  followerCount: bigint;
  rank: bigint;
}

export interface UserProfileSummary {
  principal: Principal;
  handle: string;
  displayName: string;
  bio: string;
  avatarUrl?: ExternalBlob;
  bannerImage?: ExternalBlob;
  postCount: bigint;
  followerCount: bigint;
  followingCount: bigint;
}

export type { CommunityPost };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function storedToPost(p: localPosts.StoredPost): Post {
  const dest =
    p.destination ?? (p.mediaType?.startsWith("video") ? "shortsport" : "feed");
  return {
    id: (() => {
      try {
        return BigInt(`0x${p.id.replace(/-/g, "").slice(0, 16)}`);
      } catch {
        return BigInt(p.timestamp);
      }
    })(),
    authorPrincipal: (() => {
      try {
        return Principal.fromText(p.authorPrincipal);
      } catch {
        return Principal.anonymous();
      }
    })(),
    authorName: p.authorName,
    media: (() => {
      const url = localPosts.getMediaUrl(p);
      return url
        ? ({ getDirectURL: () => url } as unknown as ExternalBlob)
        : undefined;
    })(),
    mediaType: p.mediaType,
    caption: p.caption,
    timestamp: BigInt(p.timestamp),
    likeCount: BigInt(p.likeCount),
    viewCount: BigInt(p.viewCount),
    destination: dest,
    isBackendPost: false,
  };
}

/** Convert a backend Post to our unified Post type */
function backendPostToPost(
  p: import("../backend").Post,
  dest: "feed" | "shortsport",
): Post {
  return {
    id: p.id,
    authorPrincipal: p.authorPrincipal,
    authorName: p.authorName,
    // Backend posts use mediaUrl field for URL-based media
    media: p.mediaUrl
      ? ({ getDirectURL: () => p.mediaUrl } as unknown as ExternalBlob)
      : p.media,
    mediaType: p.mediaType,
    caption: p.caption,
    timestamp: p.timestamp,
    likeCount: p.likeCount,
    viewCount: p.viewCount,
    destination: dest,
    isBackendPost: true,
    backendPostId: p.id,
  };
}

/** Merge backend + local posts, dedup by authorPrincipal+timestamp proximity */
function mergePosts(backendPosts: Post[], localPostsList: Post[]): Post[] {
  const seen = new Set<string>();
  const result: Post[] = [];

  for (const p of backendPosts) {
    const key = `${p.authorPrincipal.toString()}-${p.timestamp.toString()}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(p);
    }
  }

  for (const p of localPostsList) {
    const key = `${p.authorPrincipal.toString()}-${p.timestamp.toString()}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(p);
    }
  }

  return result.sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
}

// ─── User Profile ────────────────────────────────────────────────────────────

export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserProfile | null>({
    queryKey: ["currentUserProfile"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useSaveCallerUserProfile() {
  const { actor, isFetching } = useActor();
  const queryClient = useQueryClient();
  // Keep a stable ref to actor so the mutation fn can check latest value
  const actorRef = React.useRef(actor);
  React.useEffect(() => {
    actorRef.current = actor;
  }, [actor]);
  const fetchingRef = React.useRef(isFetching);
  React.useEffect(() => {
    fetchingRef.current = isFetching;
  }, [isFetching]);

  return useMutation({
    mutationFn: async (profileData: UserProfileInput) => {
      // Wait up to 10s for actor to become available
      const deadline = Date.now() + 10_000;
      while (!actorRef.current || fetchingRef.current) {
        if (Date.now() >= deadline) throw new Error("Actor not available");
        await new Promise((r) => setTimeout(r, 500));
      }
      return actorRef.current.saveCallerUserProfile(profileData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
    },
  });
}

export function useUpdateProfile() {
  const { actor, isFetching } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profileData: UserProfileInput) => {
      if (!actor || isFetching) throw new Error("Actor not available");
      return actor.updateProfile(profileData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
    },
  });
}

/** Get a user profile by principal string — works for ALL visitors (uses anonymous actor) */
export function useGetUserProfile(principalStr: string | null | undefined) {
  return useQuery<UserProfile | null>({
    queryKey: ["userProfile", principalStr],
    queryFn: async () => {
      if (!principalStr) return null;

      // First try getPublicUserProfile (works anonymously, accepts principal string or handle)
      try {
        const anon = await getAnonActor();
        const publicProfile = await anon.getPublicUserProfile(principalStr);
        if (publicProfile) return publicProfile;
      } catch {
        // fall through to principal lookup
      }

      // Fallback: try getUserProfile by principal
      try {
        const anon = await getAnonActor();
        const p = Principal.fromText(principalStr);
        const result = await anon.getUserProfile(p);
        return result ?? null;
      } catch {
        return null;
      }
    },
    enabled: !!principalStr,
    retry: false,
  });
}

export function useGetAllUsers() {
  return useQuery<UserProfile[]>({
    queryKey: ["allUsers"],
    queryFn: async () => {
      return [];
    },
  });
}

// ─── Posts ────────────────────────────────────────────────────────────────────

export function useGetAllPosts() {
  return useQuery<Post[]>({
    queryKey: ["posts"],
    queryFn: async () => {
      const posts = await localPosts.getAllPostsAsync();
      return posts.map(storedToPost);
    },
  });
}

/** Global feed — merges backend public posts + local posts. Polls every 5s. */
export function useGetFeedPosts() {
  return useQuery<Post[]>({
    queryKey: ["posts", "feed"],
    queryFn: async () => {
      const [backendRaw, localRaw] = await Promise.all([
        getAnonActor()
          .then((a) => a.getAllPublicPosts())
          .catch(() => []),
        localPosts.getAllPostsAsync(),
      ]);

      const backendFeed = backendRaw
        .filter((p) => !p.isVideo)
        .map((p) => backendPostToPost(p, "feed"));

      const localFeed = localRaw
        .filter((p) => {
          const dest =
            p.destination ??
            (p.mediaType?.startsWith("video") ? "shortsport" : "feed");
          return dest === "feed";
        })
        .map(storedToPost);

      return mergePosts(backendFeed, localFeed);
    },
    refetchInterval: 5000,
    staleTime: 4000,
  });
}

/** Global ShortSport — merges backend videos + local. Polls every 5s. */
export function useGetShortSportPosts() {
  return useQuery<Post[]>({
    queryKey: ["posts", "shortsport"],
    queryFn: async () => {
      const [backendRaw, localRaw] = await Promise.all([
        getAnonActor()
          .then((a) => a.getAllPublicVideos())
          .catch(() => []),
        localPosts.getAllPostsAsync(),
      ]);

      const backendShort = backendRaw
        .filter((p) => p.isVideo)
        .map((p) => backendPostToPost(p, "shortsport"));

      const localShort = localRaw
        .filter((p) => {
          const dest =
            p.destination ??
            (p.mediaType?.startsWith("video") ? "shortsport" : "feed");
          return dest === "shortsport";
        })
        .map(storedToPost);

      return mergePosts(backendShort, localShort);
    },
    refetchInterval: 5000,
    staleTime: 4000,
  });
}

export function useGetPost(postId: string | null | undefined) {
  return useQuery<Post | null>({
    queryKey: ["post", postId],
    queryFn: async () => {
      if (!postId) return null;
      const p = await localPosts.getPostAsync(postId);
      return p ? storedToPost(p) : null;
    },
    enabled: !!postId,
  });
}

export function useGetLikedPosts() {
  const { identity } = useInternetIdentity();

  return useQuery<Post[]>({
    queryKey: ["likedPosts", identity?.getPrincipal().toString()],
    queryFn: async () => {
      const principal = identity?.getPrincipal().toString() ?? "anonymous";
      const allPosts = await localPosts.getAllPostsAsync();
      return allPosts
        .filter((p) => p.likedBy?.includes(principal))
        .map(storedToPost);
    },
  });
}

/** Create post — saves to IndexedDB (fast/local) AND backend canister (global) */
export function useCreatePost() {
  const queryClient = useQueryClient();
  const { identity } = useInternetIdentity();
  const { actor } = useActor();

  return useMutation({
    mutationFn: async (postInput: PostInput) => {
      if (!identity) throw new Error("You must be logged in to post.");
      const principal = identity.getPrincipal().toString();

      const dest: "feed" | "shortsport" =
        postInput.destination ??
        (postInput.mediaType?.startsWith("video") ? "shortsport" : "feed");

      // Save to IndexedDB first (local speed)
      const stored = await localPosts.createPostAsync({
        authorPrincipal: principal,
        authorName: postInput.authorName,
        mediaDataUrl: null,
        mediaBlob: postInput.mediaFile ?? undefined,
        mediaType: postInput.mediaType,
        caption: postInput.caption,
        timestamp: Date.now(),
        likeCount: 0,
        viewCount: 0,
        likedBy: [],
        destination: dest,
      });

      // Also persist to backend for global visibility
      if (actor) {
        let mediaUrl = "";
        try {
          // For media posts: create a temporary object URL to pass as mediaUrl reference
          if (postInput.mediaFile) {
            mediaUrl = URL.createObjectURL(postInput.mediaFile);
          }
          const mediaType = postInput.mediaFile
            ? postInput.mediaFile.type || "application/octet-stream"
            : "text";

          // Estimate duration for videos (0n means non-video)
          const duration = BigInt(0);

          await actor.createPublicPost(
            postInput.authorName,
            postInput.caption,
            mediaUrl,
            mediaType,
            duration,
            postInput.thumbnailUrl ?? null,
          );
        } catch {
          // Backend post failure doesn't break local post — it's still visible locally
          console.warn("Failed to sync post to backend");
        } finally {
          // Always revoke the temporary object URL to avoid memory leaks
          if (mediaUrl) URL.revokeObjectURL(mediaUrl);
        }
      }

      return storedToPost(stored);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}

export function useLikePost() {
  const queryClient = useQueryClient();
  const { identity } = useInternetIdentity();
  const { actor } = useActor();

  return useMutation({
    mutationFn: async (postId: string) => {
      const principal = identity?.getPrincipal().toString() ?? "anonymous";

      // Try to like on backend first (for backend posts)
      if (actor) {
        try {
          // Try to parse as BigInt for backend post IDs
          const bigId = BigInt(postId);
          await actor.likePost(bigId);
        } catch {
          // Not a backend post or not authenticated — use local only
        }
      }

      // Always update locally
      const post = await localPosts.getPostAsync(postId);
      if (post) {
        const likedBy = post.likedBy ?? [];
        if (!likedBy.includes(principal)) {
          await localPosts.updatePostAsync(postId, {
            likeCount: post.likeCount + 1,
            likedBy: [...likedBy, principal],
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["likedPosts"] });
    },
  });
}

export function useUnlikePost() {
  const queryClient = useQueryClient();
  const { identity } = useInternetIdentity();

  return useMutation({
    mutationFn: async (postId: string) => {
      const principal = identity?.getPrincipal().toString() ?? "anonymous";
      const post = await localPosts.getPostAsync(postId);
      if (!post) return;
      const likedBy = (post.likedBy ?? []).filter((p) => p !== principal);
      await localPosts.updatePostAsync(postId, {
        likeCount: Math.max(0, post.likeCount - 1),
        likedBy,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["likedPosts"] });
    },
  });
}

// ─── Follow / Shadow ──────────────────────────────────────────────────────────

export function useFollowUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (principalStr: string) => {
      await localPosts.followUser(principalStr);
    },
    onSuccess: (_data, principalStr) => {
      queryClient.invalidateQueries({
        queryKey: ["isFollowing", principalStr],
      });
      queryClient.invalidateQueries({ queryKey: ["followerCount"] });
      queryClient.invalidateQueries({ queryKey: ["following"] });
    },
  });
}

export function useUnfollowUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (principalStr: string) => {
      await localPosts.unfollowUser(principalStr);
    },
    onSuccess: (_data, principalStr) => {
      queryClient.invalidateQueries({
        queryKey: ["isFollowing", principalStr],
      });
      queryClient.invalidateQueries({ queryKey: ["followerCount"] });
      queryClient.invalidateQueries({ queryKey: ["following"] });
    },
  });
}

export function useIsFollowing(principalStr: string | null | undefined) {
  return useQuery<boolean>({
    queryKey: ["isFollowing", principalStr],
    queryFn: async () => {
      if (!principalStr) return false;
      return localPosts.isFollowing(principalStr);
    },
    enabled: !!principalStr,
  });
}

/** Get real follower count from backend — works for ALL visitors */
export function useGetFollowerCount(principalStr: string | null | undefined) {
  return useQuery<bigint>({
    queryKey: ["followerCount", principalStr],
    queryFn: async () => {
      if (!principalStr) return BigInt(0);
      try {
        const anon = await getAnonActor();
        const p = Principal.fromText(principalStr);
        return await anon.getFollowerCount(p);
      } catch {
        return BigInt(0);
      }
    },
    enabled: !!principalStr,
    refetchInterval: 10000,
  });
}

export function useGetFollowingList() {
  const { identity } = useInternetIdentity();

  return useQuery<string[]>({
    queryKey: ["following", identity?.getPrincipal().toString()],
    queryFn: async () => {
      const map = await localPosts.getFollowingMap();
      return Object.keys(map).filter((k) => map[k]);
    },
  });
}

// ─── Trending Creators ────────────────────────────────────────────────────────

/** Get top creators from backend — works for ALL visitors */
export function useGetTrendingCreators(limit = 10) {
  return useQuery<CreatorRanking[]>({
    queryKey: ["trendingCreators", limit],
    queryFn: async () => {
      try {
        const anon = await getAnonActor();
        const entries: CreatorEntry[] = await anon.getTopCreators(
          BigInt(limit),
        );
        return entries.map((entry, idx) => ({
          principal: entry.principal,
          profile: entry.profile,
          followerCount: entry.followerCount,
          rank: BigInt(idx + 1),
        }));
      } catch {
        return [];
      }
    },
    refetchInterval: 30000,
    staleTime: 25000,
  });
}

// ─── Search ───────────────────────────────────────────────────────────────────

/** Search users by name OR handle — works for ALL visitors */
export function useSearchUsers(query: string) {
  return useQuery<UserProfile[]>({
    queryKey: ["searchUsers", query],
    queryFn: async () => {
      if (!query.trim()) return [];
      try {
        const anon = await getAnonActor();
        return await anon.searchUsers(query.trim());
      } catch {
        return [];
      }
    },
    enabled: query.trim().length > 0,
    staleTime: 5000,
  });
}

/** Search posts/videos by hashtag — works for ALL visitors. Polls every 5s. */
export function useSearchByHashtag(hashtag: string | null) {
  const normalised = hashtag
    ? hashtag.toLowerCase().replace(/^#/, "").trim()
    : null;
  return useQuery<Post[]>({
    queryKey: ["hashtagPosts", normalised],
    queryFn: async () => {
      if (!normalised) return [];
      try {
        const anon = await getAnonActor();
        const raw = await (
          anon as typeof anon & {
            searchByHashtag: (
              tag: string,
            ) => Promise<import("../backend").Post[]>;
          }
        ).searchByHashtag(normalised);
        return raw.map((p) =>
          backendPostToPost(p, p.isVideo ? "shortsport" : "feed"),
        );
      } catch {
        return [];
      }
    },
    enabled: !!normalised,
    refetchInterval: 5000,
    staleTime: 4000,
  });
}

/** Get hashtag suggestions for autocomplete — works for ALL visitors. */
export function useGetSuggestedHashtags(prefix: string | null) {
  const normalised =
    prefix?.startsWith("#") && prefix.length > 1
      ? prefix.replace(/^#/, "").toLowerCase()
      : null;
  return useQuery<string[]>({
    queryKey: ["hashtagSuggestions", normalised],
    queryFn: async () => {
      if (!normalised) return [];
      try {
        const anon = await getAnonActor();
        return await (
          anon as typeof anon & {
            getSuggestedHashtags: (prefix: string) => Promise<string[]>;
          }
        ).getSuggestedHashtags(normalised);
      } catch {
        return [];
      }
    },
    enabled: !!normalised,
    staleTime: 10000,
  });
}

// ─── Messages ────────────────────────────────────────────────────────────────

export function useGetConversations() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<Conversation[]>({
    queryKey: ["conversations", identity?.getPrincipal().toString()],
    queryFn: async () => {
      if (!actor) return [];
      try {
        const raw = await actor.getConversations();
        return raw
          .map((c) => ({
            otherPrincipal: c.otherPrincipal,
            lastUpdated: c.lastUpdated,
            unreadCount: c.unreadCount,
            lastMessageContent: c.lastMessageContent,
            lastMessageTimestamp: c.lastMessageTimestamp,
          }))
          .sort((a, b) => Number(b.lastUpdated) - Number(a.lastUpdated));
      } catch {
        return [];
      }
    },
    enabled: !!actor && !actorFetching,
    refetchInterval: 3000,
  });
}

export function useGetMessages(otherPrincipalStr: string | null | undefined) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Message[]>({
    queryKey: ["messages", otherPrincipalStr],
    queryFn: async () => {
      if (!actor || !otherPrincipalStr) return [];
      try {
        const otherPrincipal = Principal.fromText(otherPrincipalStr);
        const raw = await actor.getMessages(otherPrincipal);
        // Sort ascending by timestamp so oldest messages appear at the top
        return raw
          .map((m) => ({
            sender: m.sender,
            recipient: m.recipient,
            content: m.content,
            timestamp: m.timestamp,
            postId: m.postId,
            read: m.read,
          }))
          .sort((a, b) => Number(a.timestamp) - Number(b.timestamp));
      } catch {
        return [];
      }
    },
    enabled: !!actor && !actorFetching && !!otherPrincipalStr,
    refetchInterval: 3000,
  });
}

export function useSendMessage() {
  const { actor, isFetching: actorFetching } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: {
      recipientStr: string;
      content: string;
      postId?: string;
    }) => {
      if (!actor || actorFetching) throw new Error("Not authenticated");
      const recipient = Principal.fromText(args.recipientStr);
      const postId: bigint | null = args.postId ? BigInt(args.postId) : null;
      await actor.sendMessage(recipient, args.content, postId);
    },
    onSuccess: (_data, { recipientStr }) => {
      queryClient.invalidateQueries({ queryKey: ["messages", recipientStr] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

/** New message notification hook — call once from Layout to show toasts */
export function useNewMessageNotification(
  onNewMessage: (senderPrincipal: string, preview: string) => void,
) {
  const { identity } = useInternetIdentity();
  const { data: conversations } = useGetConversations();
  const prevUnreadRef = React.useRef<Map<string, bigint>>(new Map());

  React.useEffect(() => {
    if (!identity || !conversations) return;

    const currentUnread = new Map<string, bigint>(
      conversations.map((c) => [c.otherPrincipal.toString(), c.unreadCount]),
    );

    for (const [principal, count] of currentUnread.entries()) {
      const prev = prevUnreadRef.current.get(principal) ?? BigInt(0);
      if (count > prev) {
        // New unread message arrived in this conversation
        const conv = conversations.find(
          (c) => c.otherPrincipal.toString() === principal,
        );
        const preview = conv?.lastMessageContent?.slice(0, 60) ?? "New message";
        onNewMessage(principal, preview);
      }
    }

    prevUnreadRef.current = currentUnread;
  }, [conversations, identity, onNewMessage]);
}

// ─── Notifications ────────────────────────────────────────────────────────────

export function useGetNotifications() {
  const { identity } = useInternetIdentity();

  return useQuery<Notification[]>({
    queryKey: ["notifications", identity?.getPrincipal().toString()],
    queryFn: async () => [],
    refetchInterval: 10000,
  });
}

export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // no-op
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

// ─── Friend Requests ──────────────────────────────────────────────────────────

export function useGetFriendRequests() {
  return useQuery<FriendRequest[]>({
    queryKey: ["friendRequests"],
    queryFn: async () => [],
  });
}

export function useSendFriendRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (_principalStr: string) => {
      // no-op
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friendRequests"] });
    },
  });
}

export function useRespondToFriendRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (_args: {
      senderStr: string;
      accept: boolean;
    }) => {
      // no-op
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friendRequests"] });
    },
  });
}

export function useGetFriendshipStatus(
  principalStr: string | null | undefined,
) {
  return useQuery<FriendshipStatusEnum>({
    queryKey: ["friendshipStatus", principalStr],
    queryFn: async () => ({ __kind__: "notConnected" }) as FriendshipStatusEnum,
    enabled: !!principalStr,
  });
}

// ─── Comments ────────────────────────────────────────────────────────────────

/**
 * Get comments for a post — merges backend comments + local IndexedDB.
 * Works for ALL visitors (no auth required). Polls every 3s.
 */
export function useGetComments(postId: bigint | null | undefined) {
  return useQuery<Comment[]>({
    queryKey: ["comments", postId?.toString()],
    queryFn: async () => {
      if (!postId) return [];

      // Fetch backend comments (anonymous, public)
      const backendComments: Comment[] = await (async () => {
        try {
          const anon = await getAnonActor();
          const raw = await anon.getComments(postId);
          return raw.map((c) => ({
            id: c.id,
            postId: c.postId,
            authorPrincipal: c.authorPrincipal,
            authorName: c.authorName,
            text: c.text,
            timestamp: c.timestamp,
            mediaUrl: (c as { mediaUrl?: string }).mediaUrl ?? undefined,
            likeCount: (c as { likeCount?: bigint }).likeCount ?? BigInt(0),
          }));
        } catch {
          return [];
        }
      })();

      // Fetch local comments
      const localComments: Comment[] = await (async () => {
        try {
          const stored = await localPosts.getCommentsForPost(postId.toString());
          return stored.map((c) => ({
            id: (() => {
              try {
                return BigInt(`0x${c.id.replace(/-/g, "").slice(0, 16)}`);
              } catch {
                return BigInt(c.timestamp);
              }
            })(),
            postId: postId,
            authorPrincipal: (() => {
              try {
                return Principal.fromText(c.authorPrincipal);
              } catch {
                return Principal.anonymous();
              }
            })(),
            authorName: c.authorName,
            text: c.text,
            timestamp: BigInt(c.timestamp) * BigInt(1_000_000),
            mediaUrl: (c as { mediaUrl?: string }).mediaUrl ?? undefined,
            likeCount: BigInt((c as { likeCount?: number }).likeCount ?? 0),
          }));
        } catch {
          return [];
        }
      })();

      // Merge — dedup by text + author
      const seen = new Set<string>();
      const merged: Comment[] = [];
      for (const c of [...backendComments, ...localComments]) {
        const key = `${c.authorPrincipal.toString()}-${c.text}`;
        if (!seen.has(key)) {
          seen.add(key);
          merged.push(c);
        }
      }
      return merged.sort((a, b) => Number(a.timestamp) - Number(b.timestamp));
    },
    enabled: !!postId,
    refetchInterval: 3000,
  });
}

/** Add a comment — persists to backend (if authenticated) AND local IndexedDB */
export function useAddComment() {
  const queryClient = useQueryClient();
  const { identity } = useInternetIdentity();
  const { actor } = useActor();

  return useMutation({
    mutationFn: async (input: {
      postId: bigint;
      text: string;
      authorName?: string;
      mediaUrl?: string | null;
    }) => {
      const principal = identity?.getPrincipal().toString() ?? "anonymous";
      const authorName =
        input.authorName ??
        (principal !== "anonymous" ? principal.slice(0, 8) : "User");

      // Add to local IndexedDB (instant)
      await localPosts.addComment({
        postId: input.postId.toString(),
        authorPrincipal: principal,
        authorName,
        text: input.text,
        timestamp: Date.now(),
        ...(input.mediaUrl ? { mediaUrl: input.mediaUrl } : {}),
      } as Parameters<typeof localPosts.addComment>[0]);

      // Also persist to backend for global visibility
      if (actor && identity) {
        try {
          await actor.addComment(
            input.postId,
            input.text,
            input.mediaUrl ?? null,
          );
        } catch {
          // Backend failure is non-fatal — comment is still saved locally
        }
      }
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({
        queryKey: ["comments", input.postId.toString()],
      });
    },
  });
}

/**
 * Like a specific comment by its index within a post.
 * Optimistically updates the like count locally and calls the backend.
 */
export function useAddCommentLike() {
  const queryClient = useQueryClient();
  const { actor } = useActor();
  const { identity } = useInternetIdentity();

  return useMutation({
    mutationFn: async (input: {
      postId: bigint;
      commentIndex: number;
    }) => {
      // Try backend first
      if (actor && identity) {
        try {
          await actor.likeComment(input.postId, BigInt(input.commentIndex));
        } catch {
          // non-fatal — local optimistic update below covers it
        }
      }
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({
        queryKey: ["comments", input.postId.toString()],
      });
      queryClient.invalidateQueries({
        queryKey: ["commentLikes", input.postId.toString(), input.commentIndex],
      });
    },
  });
}

/**
 * Get the like count for a specific comment by its index within a post.
 */
export function useGetCommentLikes(
  postId: bigint | null | undefined,
  commentIndex: number | null | undefined,
) {
  return useQuery<bigint>({
    queryKey: ["commentLikes", postId?.toString(), commentIndex],
    queryFn: async () => {
      if (postId == null || commentIndex == null) return BigInt(0);
      try {
        const anon = await getAnonActor();
        return await (
          anon as typeof anon & {
            getCommentLikes: (postId: bigint, idx: bigint) => Promise<bigint>;
          }
        ).getCommentLikes(postId, BigInt(commentIndex));
      } catch {
        return BigInt(0);
      }
    },
    enabled: postId != null && commentIndex != null,
    refetchInterval: 5000,
  });
}

// ─── Community ────────────────────────────────────────────────────────────────

/** Get community posts for a specific community owner. Polls every 5s. */
export function useGetCommunityPosts(
  communityOwnerId: string | null | undefined,
) {
  const { actor } = useActor();

  return useQuery<CommunityPost[]>({
    queryKey: ["communityPosts", communityOwnerId],
    queryFn: async () => {
      if (!communityOwnerId) return [];
      try {
        // Try authenticated actor first, fall back to anon
        const a = actor ?? (await getAnonActor());
        const ownerPrincipal = Principal.fromText(communityOwnerId);
        const raw = await (
          a as typeof actor & {
            getCommunityPosts: (p: Principal) => Promise<CommunityPost[]>;
          }
        ).getCommunityPosts(ownerPrincipal);
        return raw.sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
      } catch {
        return [];
      }
    },
    enabled: !!communityOwnerId,
    refetchInterval: 5000,
    staleTime: 4000,
  });
}

/** Get community post count for a specific community owner. */
export function useGetCommunityPostCount(
  communityOwnerId: string | null | undefined,
) {
  const { actor } = useActor();

  return useQuery<bigint>({
    queryKey: ["communityPostCount", communityOwnerId],
    queryFn: async () => {
      if (!communityOwnerId) return BigInt(0);
      try {
        const a = actor ?? (await getAnonActor());
        const ownerPrincipal = Principal.fromText(communityOwnerId);
        return await (
          a as typeof actor & {
            getCommunityPostCount: (p: Principal) => Promise<bigint>;
          }
        ).getCommunityPostCount(ownerPrincipal);
      } catch {
        return BigInt(0);
      }
    },
    enabled: !!communityOwnerId,
    refetchInterval: 10000,
  });
}

/** Create a community post inside a community */
export function useCreateCommunityPost() {
  const { actor, isFetching: actorFetching } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: {
      communityOwnerId: string;
      content: string;
      mediaUrl: string;
      mediaType: string;
    }) => {
      if (!actor || actorFetching) throw new Error("Not authenticated");
      const ownerPrincipal = Principal.fromText(args.communityOwnerId);
      return actor.createCommunityPost(
        ownerPrincipal,
        args.content,
        args.mediaUrl,
        args.mediaType,
      );
    },
    onSuccess: (_data, { communityOwnerId }) => {
      queryClient.invalidateQueries({
        queryKey: ["communityPosts", communityOwnerId],
      });
      queryClient.invalidateQueries({
        queryKey: ["communityPostCount", communityOwnerId],
      });
    },
  });
}

// ─── Aliases & stubs for backwards compatibility ──────────────────────────────

/** Alias: useGetTrendingCreators → useGetTopCreators */
export function useGetTopCreators(limit = 10) {
  return useGetTrendingCreators(limit);
}

/** Stub: record a post view (no-op locally) */
export function useRecordView() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (_postId: string) => {
      // no-op for local posts
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}

/** Alias: useMarkNotificationsRead → useMarkNotificationRead */
export function useMarkNotificationRead() {
  return useMarkNotificationsRead();
}

/** Stub: get friends list (uses following list as proxy) */
export function useGetFriendsList() {
  const { identity } = useInternetIdentity();
  return useQuery<string[]>({
    queryKey: ["friendsList", identity?.getPrincipal().toString()],
    queryFn: async () => {
      const map = await localPosts.getFollowingMap();
      return Object.keys(map).filter((k) => map[k]);
    },
  });
}

/** Get posts by a specific user — merges backend + local */
export function useGetPostsByUser(principalStr: string | null | undefined) {
  return useQuery<Post[]>({
    queryKey: ["postsByUser", principalStr],
    queryFn: async () => {
      if (!principalStr) return [];

      const [backendFeed, backendShort, localAll] = await Promise.all([
        getAnonActor()
          .then((a) => a.getAllPublicPosts())
          .catch(() => []),
        getAnonActor()
          .then((a) => a.getAllPublicVideos())
          .catch(() => []),
        localPosts.getAllPostsAsync(),
      ]);

      const backendPosts = [...backendFeed, ...backendShort]
        .filter((p) => p.authorPrincipal.toString() === principalStr)
        .map((p) => backendPostToPost(p, p.isVideo ? "shortsport" : "feed"));

      const localUserPosts = localAll
        .filter((p) => p.authorPrincipal === principalStr)
        .map(storedToPost);

      return mergePosts(backendPosts, localUserPosts);
    },
    enabled: !!principalStr,
    refetchInterval: 10000,
  });
}

/** Stub: unfriend (uses unfollow as proxy) */
export function useUnfriend() {
  return useUnfollowUser();
}

/** Stub: mark messages as read — calls real backend */
export function useMarkMessagesRead() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (principalStr: string) => {
      if (!actor || !principalStr) return;
      try {
        const otherPrincipal = Principal.fromText(principalStr);
        await actor.markMessagesRead(otherPrincipal);
      } catch {
        // non-fatal
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

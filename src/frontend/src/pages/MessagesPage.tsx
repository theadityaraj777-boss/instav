import { Skeleton } from "@/components/ui/skeleton";
import type { Principal } from "@dfinity/principal";
import {
  ArrowLeft,
  Globe,
  Image,
  MessageCircle,
  Send,
  UserPlus,
  Users,
} from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import AvatarPlaceholder from "../components/AvatarPlaceholder";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  type CommunityPost,
  type Conversation,
  type Message,
  useCreateCommunityPost,
  useGetCallerUserProfile,
  useGetCommunityPosts,
  useGetConversations,
  useGetFollowingList,
  useGetFriendsList,
  useGetMessages,
  useGetTrendingCreators,
  useGetUserProfile,
  useMarkMessagesRead,
  useSendMessage,
} from "../hooks/useQueries";

// ─── Shadowing user list item ─────────────────────────────────────────────────

interface ShadowingUserItemProps {
  principalStr: string;
  onClick: () => void;
}

function ShadowingUserItem({ principalStr, onClick }: ShadowingUserItemProps) {
  const { data: profile } = useGetUserProfile(principalStr);

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 w-full px-4 py-3 transition-colors text-left"
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background =
          "oklch(1 0 0 / 4%)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "transparent";
      }}
    >
      <AvatarPlaceholder
        name={profile?.name ?? principalStr.slice(0, 8)}
        profilePicture={profile?.profilePhoto}
        size="md"
      />
      <div className="flex-1 min-w-0">
        <p className="text-foreground font-medium text-sm truncate">
          {profile?.name ?? `${principalStr.slice(0, 8)}…`}
        </p>
        {profile?.handle && (
          <p className="text-muted-foreground text-xs truncate">
            @{profile.handle}
          </p>
        )}
      </div>
    </button>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────────

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
}

function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  const timeStr = new Date(
    Number(message.timestamp) / 1_000_000,
  ).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-2`}>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
          isOwn ? "rounded-br-sm" : "rounded-bl-sm"
        }`}
        style={
          isOwn
            ? {
                background: "oklch(0.78 0.16 75 / 18%)",
                border: "1px solid oklch(0.78 0.16 75 / 35%)",
                color: "oklch(0.96 0.008 60)",
              }
            : {
                background: "oklch(0.15 0.011 265 / 80%)",
                border: "1px solid oklch(1 0 0 / 7%)",
                color: "oklch(0.96 0.008 60)",
              }
        }
      >
        <p className="text-sm leading-relaxed break-words">{message.content}</p>
        <p
          className="text-[10px] mt-1"
          style={{
            color: isOwn ? "oklch(0.78 0.16 75 / 65%)" : "oklch(0.55 0.015 60)",
          }}
        >
          {timeStr}
        </p>
      </div>
    </div>
  );
}

// ─── Conversation list item ───────────────────────────────────────────────────

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
}

function ConversationItem({
  conversation,
  isActive,
  onClick,
}: ConversationItemProps) {
  const otherPrincipalStr = conversation.otherPrincipal.toString();
  const { data: profile } = useGetUserProfile(otherPrincipalStr);

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 w-full px-4 py-3 transition-colors text-left"
      style={
        isActive
          ? {
              background: "oklch(0.78 0.16 75 / 8%)",
              borderRight: "2px solid oklch(0.78 0.16 75)",
            }
          : {}
      }
      onMouseEnter={(e) => {
        if (!isActive) {
          (e.currentTarget as HTMLButtonElement).style.background =
            "oklch(1 0 0 / 4%)";
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          (e.currentTarget as HTMLButtonElement).style.background =
            "transparent";
        }
      }}
    >
      <AvatarPlaceholder
        name={profile?.name ?? otherPrincipalStr.slice(0, 8)}
        profilePicture={profile?.profilePhoto}
        size="md"
      />
      <div className="flex-1 min-w-0">
        <p className="text-foreground font-medium text-sm truncate">
          {profile?.name ?? `${otherPrincipalStr.slice(0, 8)}…`}
        </p>
        {profile?.handle && (
          <p className="text-muted-foreground text-xs truncate">
            @{profile.handle}
          </p>
        )}
      </div>
      {Number(conversation.unreadCount) > 0 && (
        <span className="bg-amber-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
          {Number(conversation.unreadCount)}
        </span>
      )}
    </button>
  );
}

// ─── Community post card ──────────────────────────────────────────────────────

interface CommunityPostCardProps {
  post: CommunityPost;
}

function CommunityPostCard({ post }: CommunityPostCardProps) {
  const timeStr = new Date(Number(post.timestamp) / 1_000_000).toLocaleString(
    [],
    { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" },
  );
  const authorPrincipalStr = post.author.toString();
  const { data: profile } = useGetUserProfile(authorPrincipalStr);

  return (
    <div
      className="rounded-xl px-4 py-3 mb-3"
      style={{
        background: "oklch(0.13 0.009 265 / 70%)",
        border: "1px solid oklch(1 0 0 / 7%)",
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <AvatarPlaceholder
          name={profile?.name ?? post.authorName}
          profilePicture={profile?.profilePhoto}
          size="sm"
        />
        <div className="flex-1 min-w-0">
          <p className="text-foreground text-sm font-semibold truncate">
            {profile?.name ?? post.authorName}
          </p>
          <p className="text-muted-foreground text-xs">{timeStr}</p>
        </div>
      </div>

      {post.content && (
        <p className="text-foreground text-sm leading-relaxed break-words mb-2">
          {post.content}
        </p>
      )}

      {post.mediaUrl && post.mediaType.startsWith("image") && (
        <img
          src={post.mediaUrl}
          alt="community post media"
          className="rounded-lg max-h-64 w-full object-cover"
        />
      )}
    </div>
  );
}

// ─── Community list item ──────────────────────────────────────────────────────

interface CommunityItemProps {
  principalStr: string;
  isOwn?: boolean;
  onClick: () => void;
}

function CommunityItem({ principalStr, isOwn, onClick }: CommunityItemProps) {
  const { data: profile } = useGetUserProfile(principalStr);
  const username = profile?.username || profile?.name || profile?.handle;
  const communityName = username ? `${username}Community` : "Community";

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 w-full px-4 py-3 transition-colors text-left"
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background =
          "oklch(1 0 0 / 4%)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "transparent";
      }}
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
        style={{
          background: isOwn
            ? "linear-gradient(135deg, #f5c842, #e8a020)"
            : "oklch(0.22 0.02 265)",
          border: isOwn ? "none" : "1px solid oklch(1 0 0 / 10%)",
        }}
      >
        <Globe
          className="w-5 h-5"
          style={{ color: isOwn ? "oklch(0.07 0.006 265)" : "#f5c842" }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-foreground font-medium text-sm truncate">
          {communityName}
        </p>
        {isOwn && (
          <p className="text-xs" style={{ color: "#f5c842" }}>
            Your Community
          </p>
        )}
        {!isOwn && profile?.handle && (
          <p className="text-muted-foreground text-xs truncate">
            @{profile.handle}
          </p>
        )}
      </div>
    </button>
  );
}

// ─── Community feed view ──────────────────────────────────────────────────────

interface CommunityFeedProps {
  communityOwnerId: string;
  isOwn: boolean;
  callerProfile: { name?: string; username?: string } | null | undefined;
  onBack: () => void;
  currentUserPrincipal: string | undefined;
}

function CommunityFeed({
  communityOwnerId,
  isOwn,
  callerProfile,
  onBack,
  currentUserPrincipal,
}: CommunityFeedProps) {
  const { data: ownerProfile } = useGetUserProfile(communityOwnerId);
  const ownerUsername =
    ownerProfile?.username || ownerProfile?.name || ownerProfile?.handle;
  const communityName = ownerUsername
    ? `${ownerUsername}Community`
    : "Community";

  const { data: posts = [], isLoading } =
    useGetCommunityPosts(communityOwnerId);
  const createPost = useCreateCommunityPost();

  const [postText, setPostText] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const feedEndRef = useRef<HTMLDivElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll when posts list changes
  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [posts]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMediaFile(file);
    const url = URL.createObjectURL(file);
    setMediaPreview(url);
  };

  const handlePost = async () => {
    if (!postText.trim() && !mediaFile) return;
    if (!currentUserPrincipal) return;

    let mediaUrl = "";
    let mediaType = "text";
    if (mediaFile) {
      mediaUrl = URL.createObjectURL(mediaFile);
      mediaType = mediaFile.type || "image/jpeg";
    }

    try {
      await createPost.mutateAsync({
        communityOwnerId,
        content: postText.trim(),
        mediaUrl,
        mediaType,
      });
      setPostText("");
      setMediaFile(null);
      if (mediaPreview) {
        URL.revokeObjectURL(mediaPreview);
        setMediaPreview(null);
      }
    } catch {
      // fail silently — user stays in compose state
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && postText.trim()) {
      e.preventDefault();
      handlePost();
    }
  };

  return (
    <div className="flex flex-col flex-1 min-w-0 h-full">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
        style={{
          background: "oklch(0.10 0.008 265 / 80%)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid oklch(1 0 0 / 6%)",
        }}
      >
        <button
          type="button"
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground transition-colors"
          data-ocid="community.back_button"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #f5c842, #e8a020)" }}
        >
          <Globe
            className="w-4 h-4"
            style={{ color: "oklch(0.07 0.006 265)" }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-foreground font-semibold text-sm truncate">
            {communityName}
          </p>
          {isOwn && (
            <p className="text-xs" style={{ color: "#f5c842" }}>
              Your Community
            </p>
          )}
        </div>
      </div>

      {/* Posts feed */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div
              className="w-6 h-6 border-2 rounded-full animate-spin"
              style={{
                borderColor: "oklch(0.78 0.16 75 / 30%)",
                borderTopColor: "#f5c842",
              }}
            />
          </div>
        ) : posts.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-12 text-center"
            data-ocid="community.feed.empty_state"
          >
            <Globe className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="text-foreground font-medium text-sm mb-1">
              No posts yet
            </p>
            <p className="text-muted-foreground text-xs">
              Be the first to post in this community!
            </p>
          </div>
        ) : (
          posts.map((post, i) => (
            <div
              key={post.id.toString()}
              data-ocid={`community.post.item.${i + 1}`}
            >
              <CommunityPostCard post={post} />
            </div>
          ))
        )}
        <div ref={feedEndRef} />
      </div>

      {/* Compose box — only shown when logged in */}
      {currentUserPrincipal ? (
        <div
          className="px-4 py-3 flex-shrink-0"
          style={{
            background: "oklch(0.10 0.008 265 / 80%)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderTop: "1px solid oklch(1 0 0 / 6%)",
          }}
        >
          {mediaPreview && (
            <div className="mb-2 relative inline-block">
              <img
                src={mediaPreview}
                alt="preview"
                className="h-16 w-16 rounded-lg object-cover"
              />
              <button
                type="button"
                onClick={() => {
                  if (mediaPreview) URL.revokeObjectURL(mediaPreview);
                  setMediaPreview(null);
                  setMediaFile(null);
                }}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-xs flex items-center justify-center"
                style={{
                  background: "#f5c842",
                  color: "oklch(0.07 0.006 265)",
                }}
              >
                ×
              </button>
            </div>
          )}
          <div className="flex items-center gap-2">
            <AvatarPlaceholder name={callerProfile?.name ?? "Me"} size="sm" />
            <input
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Share something with the community…"
              className="flex-1 rounded-full px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              style={{
                background: "oklch(0.15 0.011 265 / 80%)",
                border: "1px solid oklch(1 0 0 / 8%)",
              }}
              onFocus={(e) => {
                (e.currentTarget as HTMLInputElement).style.boxShadow =
                  "0 0 0 2px oklch(0.78 0.16 75 / 35%)";
              }}
              onBlur={(e) => {
                (e.currentTarget as HTMLInputElement).style.boxShadow = "none";
              }}
              data-ocid="community.post.input"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
              style={{
                background: "oklch(0.18 0.014 265)",
                border: "1px solid oklch(1 0 0 / 10%)",
                color: "#f5c842",
              }}
              aria-label="Attach image or meme"
              data-ocid="community.post.upload_button"
            >
              <Image className="w-4 h-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={handlePost}
              disabled={
                (!postText.trim() && !mediaFile) || createPost.isPending
              }
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-50 transition-all"
              style={{
                background: "linear-gradient(135deg, #f5c842, #e8a020)",
                color: "oklch(0.07 0.006 265)",
              }}
              data-ocid="community.post.submit_button"
            >
              {createPost.isPending ? (
                <span
                  className="w-4 h-4 border-2 rounded-full animate-spin"
                  style={{
                    borderColor: "oklch(0.07 0.006 265 / 40%)",
                    borderTopColor: "oklch(0.07 0.006 265)",
                  }}
                />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      ) : (
        <div
          className="px-4 py-3 text-center flex-shrink-0"
          style={{
            background: "oklch(0.10 0.008 265 / 80%)",
            borderTop: "1px solid oklch(1 0 0 / 6%)",
          }}
        >
          <p className="text-muted-foreground text-xs">
            Sign in to post in this community
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Main MessagesPage ────────────────────────────────────────────────────────

interface MessagesPageProps {
  initialPrincipal?: string | null;
}

type ActiveTab = "inbox" | "friends" | "shadowing" | "community";

export default function MessagesPage({ initialPrincipal }: MessagesPageProps) {
  const { identity } = useInternetIdentity();
  const myPrincipal = identity?.getPrincipal().toString();

  const [activeTab, setActiveTab] = useState<ActiveTab>("inbox");
  const [activePrincipal, setActivePrincipal] = useState<string | null>(
    initialPrincipal ?? null,
  );
  // For community: which community owner's feed is open
  const [activeCommunityOwner, setActiveCommunityOwner] = useState<
    string | null
  >(null);
  const [messageText, setMessageText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversations = [], isLoading: convsLoading } =
    useGetConversations();
  const { data: messages = [], isLoading: msgsLoading } =
    useGetMessages(activePrincipal);
  const { data: friendsList = [] } = useGetFriendsList();
  const { data: followingList = [] } = useGetFollowingList();
  const { data: callerProfile } = useGetCallerUserProfile();
  const { data: activeProfile } = useGetUserProfile(activePrincipal);
  const { data: trendingCreators = [] } = useGetTrendingCreators(20);

  const sendMessage = useSendMessage();
  const markRead = useMarkMessagesRead();

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on message list change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: markRead intentionally omitted to avoid infinite loop
  useEffect(() => {
    if (activePrincipal) {
      markRead.mutate(activePrincipal);
    }
  }, [activePrincipal]);

  const handleSend = async () => {
    if (!messageText.trim() || !activePrincipal) return;
    const text = messageText.trim();
    setMessageText("");
    await sendMessage
      .mutateAsync({ recipientStr: activePrincipal, content: text })
      .catch(() => {
        setMessageText(text);
      });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const showThread = activeTab === "inbox" && !!activePrincipal;
  const showCommunityFeed = activeTab === "community" && !!activeCommunityOwner;

  // Build community list: own community first, then trending creators
  const communityList: Array<{ principalStr: string; isOwn: boolean }> = [];
  if (myPrincipal) {
    communityList.push({ principalStr: myPrincipal, isOwn: true });
  }
  for (const creator of trendingCreators) {
    const pStr = creator.principal.toString();
    if (pStr !== myPrincipal) {
      communityList.push({ principalStr: pStr, isOwn: false });
    }
  }

  const tabs: { id: ActiveTab; label: string }[] = [
    { id: "inbox", label: "Inbox" },
    { id: "friends", label: "Friends" },
    { id: "shadowing", label: "Shadowing" },
    { id: "community", label: "Community" },
  ];

  return (
    <div className="flex h-[calc(100vh-120px)] bg-background">
      {/* Sidebar */}
      <div
        className={`${showThread || showCommunityFeed ? "hidden md:flex" : "flex"} flex-col w-full md:w-80`}
        style={{
          background: "oklch(0.10 0.008 265 / 80%)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderRight: "1px solid oklch(1 0 0 / 6%)",
        }}
      >
        {/* Tabs */}
        <div
          className="flex overflow-x-auto"
          style={{ borderBottom: "1px solid oklch(1 0 0 / 6%)" }}
        >
          {tabs.map((tab) => (
            <button
              type="button"
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setActivePrincipal(null);
                setActiveCommunityOwner(null);
              }}
              className="flex-1 py-3 text-xs font-semibold uppercase tracking-wider transition-colors whitespace-nowrap px-2"
              style={
                activeTab === tab.id
                  ? {
                      color: "#f5c842",
                      borderBottom: "2px solid #f5c842",
                    }
                  : {
                      color: "oklch(0.55 0.015 60)",
                      borderBottom: "2px solid transparent",
                    }
              }
              data-ocid={`messages.${tab.id}.tab`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* ── Inbox tab ── */}
          {activeTab === "inbox" && (
            <div>
              {convsLoading ? (
                Array.from({ length: 4 }, (_, i) => `msg-skeleton-${i}`).map(
                  (k) => (
                    <div key={k} className="flex items-center gap-3 px-4 py-3">
                      <Skeleton className="w-10 h-10 rounded-full" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="w-28 h-4 rounded" />
                        <Skeleton className="w-20 h-3 rounded" />
                      </div>
                    </div>
                  ),
                )
              ) : conversations.length === 0 ? (
                <div
                  className="flex flex-col items-center justify-center py-12 text-center px-4"
                  data-ocid="inbox.empty_state"
                >
                  <MessageCircle className="w-8 h-8 text-muted-foreground/30 mb-2" />
                  <p className="text-muted-foreground text-sm">
                    No conversations yet
                  </p>
                </div>
              ) : (
                conversations.map((conv: Conversation) => (
                  <ConversationItem
                    key={conv.otherPrincipal.toString()}
                    conversation={conv}
                    isActive={
                      activePrincipal === conv.otherPrincipal.toString()
                    }
                    onClick={() =>
                      setActivePrincipal(conv.otherPrincipal.toString())
                    }
                  />
                ))
              )}
            </div>
          )}

          {/* ── Friends tab ── */}
          {activeTab === "friends" &&
            (friendsList.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center py-12 text-center px-4"
                data-ocid="friends.empty_state"
              >
                <Users className="w-8 h-8 text-muted-foreground/30 mb-2" />
                <p className="text-muted-foreground text-sm">No friends yet</p>
              </div>
            ) : (
              friendsList.map((principalStr: string) => (
                <ShadowingUserItem
                  key={principalStr}
                  principalStr={principalStr}
                  onClick={() => setActivePrincipal(principalStr)}
                />
              ))
            ))}

          {/* ── Shadowing tab ── */}
          {activeTab === "shadowing" &&
            (followingList.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center py-12 text-center px-4"
                data-ocid="shadowing.empty_state"
              >
                <UserPlus className="w-8 h-8 text-muted-foreground/30 mb-2" />
                <p className="text-muted-foreground text-sm">
                  Not shadowing anyone yet
                </p>
              </div>
            ) : (
              followingList.map((p: string) => (
                <ShadowingUserItem
                  key={p}
                  principalStr={p}
                  onClick={() => setActivePrincipal(p)}
                />
              ))
            ))}

          {/* ── Community tab ── */}
          {activeTab === "community" && (
            <div>
              {communityList.length === 0 ? (
                <div
                  className="flex flex-col items-center justify-center py-12 text-center px-4"
                  data-ocid="community.empty_state"
                >
                  <Globe className="w-8 h-8 text-muted-foreground/30 mb-2" />
                  <p className="text-muted-foreground text-sm">
                    No communities yet
                  </p>
                </div>
              ) : (
                communityList.map(({ principalStr, isOwn }) => (
                  <CommunityItem
                    key={principalStr}
                    principalStr={principalStr}
                    isOwn={isOwn}
                    onClick={() => setActiveCommunityOwner(principalStr)}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Community feed panel ── */}
      {showCommunityFeed && (
        <CommunityFeed
          communityOwnerId={activeCommunityOwner!}
          isOwn={activeCommunityOwner === myPrincipal}
          callerProfile={callerProfile}
          onBack={() => setActiveCommunityOwner(null)}
          currentUserPrincipal={myPrincipal}
        />
      )}

      {/* ── DM thread panel ── */}
      {showThread && (
        <div className="flex flex-col flex-1 min-w-0">
          {/* Thread header */}
          <div
            className="flex items-center gap-3 px-4 py-3"
            style={{
              background: "oklch(0.10 0.008 265 / 80%)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              borderBottom: "1px solid oklch(1 0 0 / 6%)",
            }}
          >
            <button
              type="button"
              onClick={() => setActivePrincipal(null)}
              className="md:hidden text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <AvatarPlaceholder
              name={activeProfile?.name ?? activePrincipal?.slice(0, 8) ?? "?"}
              profilePicture={activeProfile?.profilePhoto}
              size="sm"
            />
            <div className="flex-1 min-w-0">
              <p className="text-foreground font-semibold text-sm truncate">
                {activeProfile?.name ?? `${activePrincipal?.slice(0, 8)}…`}
              </p>
              {activeProfile?.handle && (
                <p className="text-muted-foreground text-xs">
                  @{activeProfile.handle}
                </p>
              )}
            </div>
          </div>

          {/* Messages — all sent + received, differentiated by sender field */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {msgsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div
                  className="w-6 h-6 border-2 rounded-full animate-spin"
                  style={{
                    borderColor: "oklch(0.78 0.16 75 / 30%)",
                    borderTopColor: "#f5c842",
                  }}
                />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <MessageCircle className="w-10 h-10 text-muted-foreground/30 mb-2" />
                <p className="text-muted-foreground text-sm">No messages yet</p>
                <p className="text-muted-foreground/60 text-xs mt-1">
                  Say hello!
                </p>
              </div>
            ) : (
              messages.map((msg: Message, i) => (
                <MessageBubble
                  key={`msg-${msg.sender.toString()}-${msg.timestamp.toString()}-${i}`}
                  message={msg}
                  isOwn={msg.sender.toString() === myPrincipal}
                />
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div
            className="px-4 py-3 flex items-center gap-3"
            style={{
              background: "oklch(0.10 0.008 265 / 80%)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              borderTop: "1px solid oklch(1 0 0 / 6%)",
            }}
          >
            <AvatarPlaceholder
              name={callerProfile?.name ?? "Me"}
              profilePicture={callerProfile?.profilePhoto}
              size="sm"
            />
            <input
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message…"
              className="flex-1 rounded-full px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              style={{
                background: "oklch(0.15 0.011 265 / 80%)",
                border: "1px solid oklch(1 0 0 / 8%)",
              }}
              onFocus={(e) => {
                (e.currentTarget as HTMLInputElement).style.boxShadow =
                  "0 0 0 2px oklch(0.78 0.16 75 / 35%)";
              }}
              onBlur={(e) => {
                (e.currentTarget as HTMLInputElement).style.boxShadow = "none";
              }}
              data-ocid="inbox.message.input"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!messageText.trim() || sendMessage.isPending}
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-50 transition-all"
              style={{
                background: "linear-gradient(135deg, #f5c842, #e8a020)",
                color: "oklch(0.07 0.006 265)",
              }}
              data-ocid="inbox.message.submit_button"
            >
              {sendMessage.isPending ? (
                <span
                  className="w-4 h-4 border-2 rounded-full animate-spin"
                  style={{
                    borderColor: "oklch(0.07 0.006 265 / 40%)",
                    borderTopColor: "oklch(0.07 0.006 265)",
                  }}
                />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── Placeholder when nothing is selected ── */}
      {!showThread && !showCommunityFeed && (
        <div className="hidden md:flex flex-1 items-center justify-center text-center">
          <div>
            {activeTab === "community" ? (
              <>
                <Globe className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">
                  Select a community
                </p>
              </>
            ) : (
              <>
                <MessageCircle className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">
                  Select a conversation
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

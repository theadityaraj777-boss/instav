import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export class ExternalBlob {
    getBytes(): Promise<Uint8Array<ArrayBuffer>>;
    getDirectURL(): string;
    static fromURL(url: string): ExternalBlob;
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob;
    withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob;
}
export interface Comment {
    id: bigint;
    text: string;
    authorName: string;
    mediaUrl?: string;
    timestamp: bigint;
    authorPrincipal: Principal;
    postId: bigint;
}
export type UserIdentifier = {
    __kind__: "principal";
    principal: Principal;
} | {
    __kind__: "handle";
    handle: string;
};
export interface CommunityPost {
    id: bigint;
    content: string;
    authorName: string;
    author: Principal;
    mediaUrl: string;
    timestamp: bigint;
    mediaType: string;
}
export interface ConversationInfo {
    lastMessageContent: string;
    lastMessageTimestamp: bigint;
    lastUpdated: bigint;
    unreadCount: bigint;
    otherPrincipal: Principal;
}
export interface CreatorEntry {
    principal: Principal;
    followerCount: bigint;
    profile: UserProfile;
}
export interface Post {
    id: bigint;
    media?: ExternalBlob;
    duration: bigint;
    likeCount: bigint;
    thumbnailUrl?: string;
    authorName: string;
    mediaUrl: string;
    viewCount: bigint;
    timestamp: bigint;
    caption: string;
    mediaType: string;
    isVideo: boolean;
    authorPrincipal: Principal;
}
export interface Message {
    content: string;
    read: boolean;
    recipient: Principal;
    sender: Principal;
    timestamp: bigint;
    postId?: bigint;
}
export interface UserProfileInput {
    bio: string;
    username: string;
    name: string;
    profilePhoto?: ExternalBlob;
    bannerImage?: ExternalBlob;
    handle: string;
    location: string;
}
export interface UserProfile {
    bio: string;
    username: string;
    name: string;
    profilePhoto?: ExternalBlob;
    bannerImage?: ExternalBlob;
    handle: string;
    location: string;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addComment(postId: bigint, text: string, mediaUrl: string | null): Promise<boolean>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createCommunityPost(communityOwnerId: Principal, content: string, mediaUrl: string, mediaType: string): Promise<bigint>;
    createPublicPost(authorName: string, caption: string, mediaUrl: string, mediaType: string, duration: bigint, thumbnailUrl: string | null): Promise<bigint>;
    deleteHandle(handle: string): Promise<void>;
    followUser(user: Principal): Promise<void>;
    getAllPublicPosts(): Promise<Array<Post>>;
    getAllPublicVideos(): Promise<Array<Post>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getCommentLikes(postId: bigint, commentIndex: bigint): Promise<bigint>;
    getComments(postId: bigint): Promise<Array<Comment>>;
    getCommunityPostCount(communityOwnerId: Principal): Promise<bigint>;
    getCommunityPosts(communityOwnerId: Principal): Promise<Array<CommunityPost>>;
    getConversations(): Promise<Array<ConversationInfo>>;
    getFollowerCount(user: Principal): Promise<bigint>;
    getFollowerList(): Promise<Array<Principal>>;
    getFollowingList(): Promise<Array<Principal>>;
    getLikedBy(postId: bigint): Promise<Array<Principal>>;
    getLikedPosts(principal: Principal): Promise<Array<bigint>>;
    getMessages(otherPrincipal: Principal): Promise<Array<Message>>;
    getMyProfile(): Promise<UserProfileInput>;
    getProfile(identifier: UserIdentifier): Promise<UserProfileInput | null>;
    getPublicUserProfile(identifier: string): Promise<UserProfile | null>;
    getSuggestedHashtags(prefix: string): Promise<Array<string>>;
    getTopCreators(limit: bigint): Promise<Array<CreatorEntry>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    likeComment(postId: bigint, commentIndex: bigint): Promise<boolean>;
    likePost(postId: bigint): Promise<boolean>;
    lookupHandle(principal: Principal): Promise<string | null>;
    lookupPrincipal(handle: string): Promise<Principal | null>;
    markMessagesRead(otherPrincipal: Principal): Promise<void>;
    registerHandle(handle: string): Promise<void>;
    saveCallerUserProfile(profile: UserProfileInput): Promise<void>;
    searchByHashtag(hashtag: string): Promise<Array<Post>>;
    searchUsers(searchTerm: string): Promise<Array<UserProfile>>;
    sendMessage(recipient: Principal, content: string, postId: bigint | null): Promise<void>;
    unfollowUser(user: Principal): Promise<void>;
    updateProfile(newProfileData: UserProfileInput): Promise<void>;
}

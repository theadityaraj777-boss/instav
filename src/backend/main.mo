import AccessControl "mo:caffeineai-authorization/access-control";
import MixinAuthorization "mo:caffeineai-authorization/MixinAuthorization";
import MixinObjectStorage "mo:caffeineai-object-storage/Mixin";
import Storage "mo:caffeineai-object-storage/Storage";
import Principal "mo:core/Principal";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Int "mo:core/Int";
import Runtime "mo:core/Runtime";
import Map "mo:core/Map";
import List "mo:core/List";
import Set "mo:core/Set";
import Time "mo:core/Time";
import Array "mo:core/Array";
import Timer "mo:core/Timer";
import Order "mo:core/Order";





actor {
  public type Post = {
    id : Nat;
    authorPrincipal : Principal;
    authorName : Text;
    media : ?Storage.ExternalBlob;
    mediaUrl : Text;
    mediaType : Text;
    caption : Text;
    timestamp : Int;
    likeCount : Nat;
    viewCount : Nat;
    isVideo : Bool;
    duration : Nat;
    thumbnailUrl : ?Text;
  };

  public type Comment = {
    id : Nat;
    postId : Nat;
    authorPrincipal : Principal;
    authorName : Text;
    text : Text;
    timestamp : Int;
    mediaUrl : ?Text;
  };

  public type PostInput = {
    authorName : Text;
    media : ?Storage.ExternalBlob;
    mediaType : Text;
    caption : Text;
  };

  public type UserProfileInput = {
    name : Text;
    username : Text;
    handle : Text;
    bio : Text;
    location : Text;
    profilePhoto : ?Storage.ExternalBlob;
    bannerImage : ?Storage.ExternalBlob;
  };

  public type UserProfileData = UserProfileInput;

  type UserProfile = UserProfileInput;

  public type UserIdentifier = {
    #principal : Principal;
    #handle : Text;
  };

  // ─── community types ──────────────────────────────────────────────────────

  public type CommunityPost = {
    id : Nat;
    author : Principal;
    authorName : Text;
    content : Text;
    mediaUrl : Text;
    mediaType : Text;
    timestamp : Int;
  };

  let postsMap = Map.empty<Nat, Post>();
  let commentsMap = Map.empty<Nat, Comment>();
  // per-post set of principals who liked it
  let postLikesMap = Map.empty<Nat, Set.Set<Principal>>();
  var postCounter = 0;
  var commentCounter = 0;

  // ─── hashtag index: tag (without #) → list of postIds ───────────────────
  let hashtagIndex = Map.empty<Text, List.List<Nat>>();

  // ─── hashtag helper: extract normalized hashtags from caption ────────────
  func extractHashtags(caption : Text) : [Text] {
    let results = List.empty<Text>();
    let tokens = caption.split(#char ' ');
    for (token in tokens) {
      if (token.startsWith(#char '#') and token.size() > 1) {
        // Strip the leading '#'
        let stripped = switch (token.stripStart(#char '#')) {
          case (?t) { t };
          case (null) { token };
        };
        // Strip trailing punctuation: period, comma, exclamation, question, colon, semicolon
        let clean1 = switch (stripped.stripEnd(#char '.')) { case (?t) t; case null stripped };
        let clean2 = switch (clean1.stripEnd(#char ',')) { case (?t) t; case null clean1 };
        let clean3 = switch (clean2.stripEnd(#char '!')) { case (?t) t; case null clean2 };
        let clean4 = switch (clean3.stripEnd(#char '?')) { case (?t) t; case null clean3 };
        let clean5 = switch (clean4.stripEnd(#char ':')) { case (?t) t; case null clean4 };
        let clean6 = switch (clean5.stripEnd(#char ';')) { case (?t) t; case null clean5 };
        let normalized = clean6.toLower();
        if (normalized.size() > 0) {
          results.add(normalized);
        };
      };
    };
    results.toArray();
  };

  // comment likes: key is "postId:commentIndex"
  let commentLikesMap = Map.empty<Text, Set.Set<Principal>>();

  // community posts: keyed by community owner principal
  let communityPostsMap = Map.empty<Principal, List.List<CommunityPost>>();
  var communityPostCounter = 0;

  type NotificationType = {
    #new_shadow;
    #message;
    #comment;
  };

  type Notification = {
    id : Nat;
    notificationType : NotificationType;
    fromPrincipal : Principal;
    timestamp : Int;
    read : Bool;
    postId : ?Nat;
  };

  type Conversation = {
    participants : (Principal, Principal);
    lastUpdated : Int;
  };

  type Message = {
    sender : Principal;
    recipient : Principal;
    content : Text;
    timestamp : Int;
    postId : ?Nat;
    read : Bool;
  };

  let conversations = Map.empty<Principal, Map.Map<Principal, Conversation>>();
  let conversationMessages = Map.empty<Principal, Map.Map<Principal, List.List<Message>>>();

  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);
    include MixinObjectStorage();

  let userProfiles = Map.empty<Principal, UserProfile>();
  let handleToPrincipalMap = Map.empty<Text, Principal>();
  let notifications = Map.empty<Principal, Map.Map<Nat, Notification>>();
  var notificationIdCounter = 0;

  let followingMap = Map.empty<Principal, Set.Set<Principal>>();
  let followersMap = Map.empty<Principal, Set.Set<Principal>>();

  let likedPostsMap = Map.empty<Principal, Set.Set<Nat>>();

  type UserProfileSummary = {
    principal : Principal;
    handle : Text;
    displayName : Text;
    bio : Text;
    avatarUrl : ?Storage.ExternalBlob;
    bannerImage : ?Storage.ExternalBlob;
    postCount : Nat;
    followerCount : Nat;
    followingCount : Nat;
  };

  type FriendRequestStatus = {
    #pending;
    #accepted;
    #declined;
  };

  type FriendRequest = {
    sender : Principal;
    recipient : Principal;
    status : FriendRequestStatus;
    timestamp : Int;
  };

  type FriendshipStatusEnum = {
    #notConnected;
    #pendingOutgoing;
    #pendingIncoming;
    #friends;
  };

  let friendRequests = Map.empty<Principal, List.List<FriendRequest>>();
  var friendCount = 0;

  // ─── existing profile methods ────────────────────────────────────────────

  // Required by frontend: get caller's own profile — no role check, caller controls their own data
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (caller.isAnonymous()) {
      return null;
    };
    userProfiles.get(caller);
  };

  // Required by frontend: save caller's own profile — no role check, caller controls their own data
  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfileInput) : async () {
    if (caller.isAnonymous()) {
      Runtime.trap("Must be logged in to save profile");
    };
    userProfiles.add(caller, profile);
  };

  // Required by frontend: get another user's profile — public read for any authenticated caller
  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    userProfiles.get(user);
  };

  // Update current caller's full profile data
  public shared ({ caller }) func updateProfile(newProfileData : UserProfileInput) : async () {
    if (caller.isAnonymous()) {
      Runtime.trap("Must be logged in to update profile");
    };
    userProfiles.add(caller, newProfileData);
  };

  // Get current caller's full profile data
  public query ({ caller }) func getMyProfile() : async UserProfileInput {
    if (caller.isAnonymous()) {
      Runtime.trap("Must be logged in");
    };
    switch (userProfiles.get(caller)) {
      case (?profile) { profile };
      case (null) { Runtime.trap("Profile not found") };
    };
  };

  // Retrieve a public profile by identifier (principal or handle) - public, no auth required
  public query ({ caller }) func getProfile(identifier : UserIdentifier) : async ?UserProfileInput {
    switch (identifier) {
      case (#principal principal) {
        userProfiles.get(principal);
      };
      case (#handle handle) {
        switch (handleToPrincipalMap.get(handle)) {
          case (?principal) { userProfiles.get(principal) };
          case (null) { null };
        };
      };
    };
  };

  // Set the mapping handle -> principal
  public shared ({ caller }) func registerHandle(handle : Text) : async () {
    if (caller.isAnonymous()) {
      Runtime.trap("Must be logged in to register a handle");
    };
    switch (handleToPrincipalMap.get(handle)) {
      case (?_existing) {
        Runtime.trap("Handle already in use");
      };
      case (null) {
        handleToPrincipalMap.add(handle, caller);
      };
    };
  };

  // Delete a handle
  public shared ({ caller }) func deleteHandle(handle : Text) : async () {
    if (caller.isAnonymous()) {
      Runtime.trap("Must be logged in to delete a handle");
    };
    switch (handleToPrincipalMap.get(handle)) {
      case (?principal) {
        if (principal != caller) {
          Runtime.trap("Unauthorized: Cannot delete handle you don't own");
        };
        handleToPrincipalMap.remove(handle);
      };
      case (null) {
        Runtime.trap("Handle not found");
      };
    };
  };

  // Look up principal by handle - public, no auth required
  public query ({ caller }) func lookupPrincipal(handle : Text) : async ?Principal {
    handleToPrincipalMap.get(handle);
  };

  // Look up handle by principal - public, no auth required
  public query ({ caller }) func lookupHandle(principal : Principal) : async ?Text {
    for ((handle, mappedPrincipal) in handleToPrincipalMap.entries()) {
      if (mappedPrincipal == principal) {
        return ?handle;
      };
    };
    null;
  };

  // ─── public query: all posts sorted by timestamp desc ────────────────────

  public query func getAllPublicPosts() : async [Post] {
    let all = postsMap.toArray();
    let posts = all.map(func((_, p) : (Nat, Post)) : Post { p });
    posts.sort(func(a, b) { Int.compare(b.timestamp, a.timestamp) });
  };

  // ─── public query: all short videos (≤180 s) sorted by timestamp desc ───

  public query func getAllPublicVideos() : async [Post] {
    let all = postsMap.toArray();
    let posts = all.map(func((_, p) : (Nat, Post)) : Post { p });
    let videos = posts.filter(func(p) { p.isVideo and p.duration <= 180 });
    videos.sort(func(a, b) { Int.compare(b.timestamp, a.timestamp) });
  };

  // ─── public query: search users by name or handle ────────────────────────

  public query func searchUsers(searchTerm : Text) : async [UserProfile] {
    let lower = searchTerm.toLower();
    let results = List.empty<UserProfile>();
    for ((_, profile) in userProfiles.entries()) {
      let nameMatch = profile.name.toLower().contains(#text lower);
      let handleMatch = profile.handle.toLower().contains(#text lower);
      if (nameMatch or handleMatch) {
        results.add(profile);
      };
    };
    results.toArray();
  };

  // ─── public query: top N creators by follower count ──────────────────────

  public type CreatorEntry = {
    principal : Principal;
    profile : UserProfile;
    followerCount : Nat;
  };

  public query func getTopCreators(limit : Nat) : async [CreatorEntry] {
    let entries = List.empty<CreatorEntry>();
    for ((p, profile) in userProfiles.entries()) {
      let count = switch (followersMap.get(p)) {
        case (?set) { set.size() };
        case (null) { 0 };
      };
      entries.add({ principal = p; profile; followerCount = count });
    };
    let sorted = entries.sort(func(a, b) { Nat.compare(b.followerCount, a.followerCount) });
    let arr = sorted.toArray();
    if (limit >= arr.size()) { arr } else {
      arr.sliceToArray(0, limit.toInt());
    };
  };

  // ─── public query: follower count for a principal ────────────────────────

  public query func getFollowerCount(user : Principal) : async Nat {
    switch (followersMap.get(user)) {
      case (?set) { set.size() };
      case (null) { 0 };
    };
  };

  // ─── public query: profile by handle or principal text ───────────────────

  public query func getPublicUserProfile(identifier : Text) : async ?UserProfile {
    // Try handle lookup first
    switch (handleToPrincipalMap.get(identifier)) {
      case (?p) { return userProfiles.get(p) };
      case (null) {};
    };
    // Fall back to principal text
    let p = Principal.fromText(identifier);
    userProfiles.get(p);
  };

  // ─── update: create a post and store it in postsMap ──────────────────────

  public shared ({ caller }) func createPublicPost(
    authorName : Text,
    caption : Text,
    mediaUrl : Text,
    mediaType : Text,
    duration : Nat,
    thumbnailUrl : ?Text,
  ) : async Nat {
    if (caller.isAnonymous()) {
      Runtime.trap("Must be logged in to post");
    };
    let id = postCounter;
    postCounter += 1;
    let isVideo = mediaType == "video";
    let post : Post = {
      id;
      authorPrincipal = caller;
      authorName;
      media = null;
      mediaUrl;
      mediaType;
      caption;
      timestamp = Time.now();
      likeCount = 0;
      viewCount = 0;
      isVideo;
      duration;
      thumbnailUrl;
    };
    postsMap.add(id, post);
    // ─── index hashtags from caption ────────────────────────────────────
    let tags = extractHashtags(caption);
    for (tag in tags.values()) {
      let existing = switch (hashtagIndex.get(tag)) {
        case (?l) { l };
        case (null) {
          let l = List.empty<Nat>();
          hashtagIndex.add(tag, l);
          l;
        };
      };
      existing.add(id);
    };
    id;
  };

  // ─── update: toggle like on a post ───────────────────────────────────────

  public shared ({ caller }) func likePost(postId : Nat) : async Bool {
    if (caller.isAnonymous()) {
      Runtime.trap("Must be logged in to like a post");
    };
    switch (postsMap.get(postId)) {
      case (null) { Runtime.trap("Post not found") };
      case (?post) {
        let likesSet = switch (postLikesMap.get(postId)) {
          case (?s) { s };
          case (null) {
            let s = Set.empty<Principal>();
            postLikesMap.add(postId, s);
            s;
          };
        };
        let alreadyLiked = likesSet.contains(caller);
        if (alreadyLiked) {
          likesSet.remove(caller);
          // also remove from caller's likedPostsMap
          switch (likedPostsMap.get(caller)) {
            case (?set) { set.remove(postId) };
            case (null) {};
          };
          let newLikeCount = if (post.likeCount > 0) { post.likeCount - 1 } else { 0 };
          postsMap.add(postId, { post with likeCount = newLikeCount });
          false;
        } else {
          likesSet.add(caller);
          // also add to caller's likedPostsMap
          let callerLikes = switch (likedPostsMap.get(caller)) {
            case (?s) { s };
            case (null) {
              let s = Set.empty<Nat>();
              likedPostsMap.add(caller, s);
              s;
            };
          };
          callerLikes.add(postId);
          postsMap.add(postId, { post with likeCount = post.likeCount + 1 });
          true;
        };
      };
    };
  };

  // ─── public query: who liked a post ──────────────────────────────────────

  public query func getLikedBy(postId : Nat) : async [Principal] {
    switch (postLikesMap.get(postId)) {
      case (?set) { set.toArray() };
      case (null) { [] };
    };
  };

  // ─── update: add a comment to a post (with optional media) ───────────────

  public shared ({ caller }) func addComment(postId : Nat, text : Text, mediaUrl : ?Text) : async Bool {
    if (caller.isAnonymous()) {
      Runtime.trap("Must be logged in to comment");
    };
    // Verify post exists
    switch (postsMap.get(postId)) {
      case (null) { return false };
      case (?_) {};
    };
    let authorName = switch (userProfiles.get(caller)) {
      case (?p) { p.name };
      case (null) { caller.toText() };
    };
    let id = commentCounter;
    commentCounter += 1;
    let comment : Comment = {
      id;
      postId;
      authorPrincipal = caller;
      authorName;
      text;
      timestamp = Time.now();
      mediaUrl;
    };
    commentsMap.add(id, comment);
    true;
  };

  // ─── public query: get all comments for a post ───────────────────────────

  public query func getComments(postId : Nat) : async [Comment] {
    let results = List.empty<Comment>();
    for ((_, comment) in commentsMap.entries()) {
      if (comment.postId == postId) {
        results.add(comment);
      };
    };
    let sorted = results.sort(func(a, b) { Int.compare(a.timestamp, b.timestamp) });
    sorted.toArray();
  };

  // ─── update: toggle like on a comment ────────────────────────────────────

  public shared ({ caller }) func likeComment(postId : Nat, commentIndex : Nat) : async Bool {
    if (caller.isAnonymous()) {
      Runtime.trap("Must be logged in to like a comment");
    };
    let key = postId.toText() # ":" # commentIndex.toText();
    let likesSet = switch (commentLikesMap.get(key)) {
      case (?s) { s };
      case (null) {
        let s = Set.empty<Principal>();
        commentLikesMap.add(key, s);
        s;
      };
    };
    let alreadyLiked = likesSet.contains(caller);
    if (alreadyLiked) {
      likesSet.remove(caller);
      false;
    } else {
      likesSet.add(caller);
      true;
    };
  };

  // ─── public query: like count for a comment ──────────────────────────────

  public query func getCommentLikes(postId : Nat, commentIndex : Nat) : async Nat {
    let key = postId.toText() # ":" # commentIndex.toText();
    switch (commentLikesMap.get(key)) {
      case (?set) { set.size() };
      case (null) { 0 };
    };
  };

  // ─── update: create a community post ─────────────────────────────────────

  public shared ({ caller }) func createCommunityPost(
    communityOwnerId : Principal,
    content : Text,
    mediaUrl : Text,
    mediaType : Text,
  ) : async Nat {
    if (caller.isAnonymous()) {
      Runtime.trap("Must be logged in to post in a community");
    };
    let authorName = switch (userProfiles.get(caller)) {
      case (?p) { p.name };
      case (null) { caller.toText() };
    };
    let id = communityPostCounter;
    communityPostCounter += 1;
    let post : CommunityPost = {
      id;
      author = caller;
      authorName;
      content;
      mediaUrl;
      mediaType;
      timestamp = Time.now();
    };
    let posts = switch (communityPostsMap.get(communityOwnerId)) {
      case (?l) { l };
      case (null) {
        let l = List.empty<CommunityPost>();
        communityPostsMap.add(communityOwnerId, l);
        l;
      };
    };
    posts.add(post);
    id;
  };

  // ─── public query: get all posts for a community (newest first) ──────────

  public query func getCommunityPosts(communityOwnerId : Principal) : async [CommunityPost] {
    switch (communityPostsMap.get(communityOwnerId)) {
      case (null) { [] };
      case (?posts) {
        let sorted = posts.sort(func(a, b) { Int.compare(b.timestamp, a.timestamp) });
        sorted.toArray();
      };
    };
  };

  // ─── public query: count of posts in a community ─────────────────────────

  public query func getCommunityPostCount(communityOwnerId : Principal) : async Nat {
    switch (communityPostsMap.get(communityOwnerId)) {
      case (null) { 0 };
      case (?posts) { posts.size() };
    };
  };

  // ─── messaging types ─────────────────────────────────────────────────────

  public type ConversationInfo = {
    otherPrincipal : Principal;
    lastUpdated : Int;
    unreadCount : Nat;
    lastMessageContent : Text;
    lastMessageTimestamp : Int;
  };

  // ─── messaging: send a message ───────────────────────────────────────────

  public shared ({ caller }) func sendMessage(recipient : Principal, content : Text, postId : ?Nat) : async () {
    if (caller.isAnonymous()) {
      Runtime.trap("Must be logged in to send messages");
    };
    let now = Time.now();
    let msgForRecipient : Message = {
      sender = caller;
      recipient;
      content;
      timestamp = now;
      postId;
      read = false;
    };
    let msgForSender : Message = {
      sender = caller;
      recipient;
      content;
      timestamp = now;
      postId;
      read = true;
    };

    // Store in sender's outbox: conversationMessages[caller][recipient]
    let senderConvs = switch (conversationMessages.get(caller)) {
      case (?m) { m };
      case (null) {
        let m = Map.empty<Principal, List.List<Message>>();
        conversationMessages.add(caller, m);
        m;
      };
    };
    let senderThread = switch (senderConvs.get(recipient)) {
      case (?l) { l };
      case (null) {
        let l = List.empty<Message>();
        senderConvs.add(recipient, l);
        l;
      };
    };
    senderThread.add(msgForSender);

    // Store in recipient's inbox: conversationMessages[recipient][caller]
    let recipientConvs = switch (conversationMessages.get(recipient)) {
      case (?m) { m };
      case (null) {
        let m = Map.empty<Principal, List.List<Message>>();
        conversationMessages.add(recipient, m);
        m;
      };
    };
    let recipientThread = switch (recipientConvs.get(caller)) {
      case (?l) { l };
      case (null) {
        let l = List.empty<Message>();
        recipientConvs.add(caller, l);
        l;
      };
    };
    recipientThread.add(msgForRecipient);
  };

  // ─── messaging: get messages in a conversation ───────────────────────────
  // Returns all messages in the thread — both sent and received.
  // The 'sender' field on each Message identifies direction.

  public shared query ({ caller }) func getMessages(otherPrincipal : Principal) : async [Message] {
    if (caller.isAnonymous()) {
      return [];
    };
    switch (conversationMessages.get(caller)) {
      case (null) { [] };
      case (?convs) {
        switch (convs.get(otherPrincipal)) {
          case (null) { [] };
          case (?thread) {
            let sorted = thread.sort(func(a, b) { Int.compare(a.timestamp, b.timestamp) });
            sorted.toArray();
          };
        };
      };
    };
  };

  // ─── messaging: list all conversations for caller ────────────────────────

  public shared query ({ caller }) func getConversations() : async [ConversationInfo] {
    if (caller.isAnonymous()) {
      return [];
    };
    let results = List.empty<ConversationInfo>();
    switch (conversationMessages.get(caller)) {
      case (null) {};
      case (?convs) {
        for ((otherPrincipal, thread) in convs.entries()) {
          let size = thread.size();
          if (size > 0) {
            let sorted = thread.sort(func(a, b) { Int.compare(a.timestamp, b.timestamp) });
            let lastMsg = sorted.at(size - 1);
            var unread = 0;
            thread.forEach(func(m) {
              if (m.sender == otherPrincipal and not m.read) {
                unread += 1;
              };
            });
            let chars = lastMsg.content.toArray();
            let previewChars = if (chars.size() <= 50) { chars } else { chars.sliceToArray(0, 50) };
            let preview = previewChars.foldLeft("", func(acc : Text, c : Char) : Text { acc # Text.fromChar(c) });
            results.add({
              otherPrincipal;
              lastUpdated = lastMsg.timestamp;
              unreadCount = unread;
              lastMessageContent = preview;
              lastMessageTimestamp = lastMsg.timestamp;
            });
          };
        };
      };
    };
    let sorted = results.sort(func(a, b) { Int.compare(b.lastUpdated, a.lastUpdated) });
    sorted.toArray();
  };

  // ─── messaging: mark messages from otherPrincipal as read ────────────────

  public shared ({ caller }) func markMessagesRead(otherPrincipal : Principal) : async () {
    if (caller.isAnonymous()) {
      return;
    };
    switch (conversationMessages.get(caller)) {
      case (null) {};
      case (?convs) {
        switch (convs.get(otherPrincipal)) {
          case (null) {};
          case (?thread) {
            thread.mapInPlace(func(m : Message) : Message {
              if (m.sender == otherPrincipal and not m.read) {
                { m with read = true };
              } else {
                m;
              };
            });
          };
        };
      };
    };
  };

  // ─── follow / unfollow ────────────────────────────────────────────────────

  public shared ({ caller }) func followUser(user : Principal) : async () {
    if (caller.isAnonymous()) {
      Runtime.trap("Must be logged in to follow");
    };
    let following = switch (followingMap.get(caller)) {
      case (?s) { s };
      case (null) {
        let s = Set.empty<Principal>();
        followingMap.add(caller, s);
        s;
      };
    };
    following.add(user);
    let followers = switch (followersMap.get(user)) {
      case (?s) { s };
      case (null) {
        let s = Set.empty<Principal>();
        followersMap.add(user, s);
        s;
      };
    };
    followers.add(caller);
  };

  public shared ({ caller }) func unfollowUser(user : Principal) : async () {
    if (caller.isAnonymous()) {
      Runtime.trap("Must be logged in to unfollow");
    };
    switch (followingMap.get(caller)) {
      case (?s) { s.remove(user) };
      case (null) {};
    };
    switch (followersMap.get(user)) {
      case (?s) { s.remove(caller) };
      case (null) {};
    };
  };

  public query ({ caller }) func getFollowerList() : async [Principal] {
    switch (followersMap.get(caller)) {
      case (?set) { set.toArray() };
      case (null) { [] };
    };
  };

  public query ({ caller }) func getFollowingList() : async [Principal] {
    switch (followingMap.get(caller)) {
      case (?set) { set.toArray() };
      case (null) { [] };
    };
  };

  public query ({ caller }) func getLikedPosts(principal : Principal) : async [Nat] {
    switch (likedPostsMap.get(principal)) {
      case (?set) { set.toArray() };
      case (null) { [] };
    };
  };

  // ─── public query: get posts by exact or prefix hashtag match ───────────

  public query func searchByHashtag(hashtag : Text) : async [Post] {
    // Normalize: strip leading '#' if present, lowercase
    let stripped = switch (hashtag.stripStart(#char '#')) {
      case (?t) { t };
      case (null) { hashtag };
    };
    let normalized = stripped.toLower();
    if (normalized.size() == 0) { return [] };

    let matchedIds = Set.empty<Nat>();

    // Exact match
    switch (hashtagIndex.get(normalized)) {
      case (?ids) { ids.forEach(func(id) { matchedIds.add(id) }) };
      case (null) {};
    };

    // Prefix matches (fuzzy)
    for ((tag, ids) in hashtagIndex.entries()) {
      if (tag.startsWith(#text normalized) and tag != normalized) {
        ids.forEach(func(id) { matchedIds.add(id) });
      };
    };

    let results = List.empty<Post>();
    for (id in matchedIds.values()) {
      switch (postsMap.get(id)) {
        case (?post) { results.add(post) };
        case (null) {};
      };
    };
    let sorted = results.sort(func(a, b) { Int.compare(b.timestamp, a.timestamp) });
    sorted.toArray();
  };

  // ─── public query: suggest hashtags by prefix (up to 10, most-used first) ─

  public query func getSuggestedHashtags(prefix : Text) : async [Text] {
    let stripped = switch (prefix.stripStart(#char '#')) {
      case (?t) { t };
      case (null) { prefix };
    };
    let normalized = stripped.toLower();

    let matches = List.empty<(Text, Nat)>();
    for ((tag, ids) in hashtagIndex.entries()) {
      if (normalized.size() == 0 or tag.startsWith(#text normalized)) {
        matches.add((tag, ids.size()));
      };
    };

    let sorted = matches.sort(func(a : (Text, Nat), b : (Text, Nat)) : Order.Order { Nat.compare(b.1, a.1) });
    let top = if (sorted.size() <= 10) { sorted.toArray() } else { sorted.sliceToArray(0, 10) };
    top.map(func((tag, _) : (Text, Nat)) : Text { tag });
  };

  // ─── daily timer: purge messages older than 6 months ─────────────────────

  let sixMonthsNs : Int = 6 * 30 * 24 * 3_600 * 1_000_000_000;

  func purgeOldMessages() : async () {
    let cutoff = Time.now() - sixMonthsNs;
    for ((_, convs) in conversationMessages.entries()) {
      for ((_, thread) in convs.entries()) {
        let kept = thread.filter(func(m : Message) : Bool { m.timestamp >= cutoff });
        thread.clear();
        thread.append(kept);
      };
    };
  };

  ignore Timer.recurringTimer<system>(#days 1, purgeOldMessages);
};

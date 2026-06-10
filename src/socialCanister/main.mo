import AccessControl "mo:caffeineai-authorization/access-control";
import MixinAuthorization "mo:caffeineai-authorization/MixinAuthorization";
import MixinObjectStorage "mo:caffeineai-object-storage/Mixin";
import Map "mo:core/Map";
import Set "mo:core/Set";
import List "mo:core/List";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Time "mo:core/Time";

actor SocialCanister {

  // ── Platform mixins ────────────────────────────────────────────────────────

  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);
  include MixinObjectStorage();

  // ── Types ──────────────────────────────────────────────────────────────────

  public type CommentRecord = {
    author    : Text;
    text      : Text;
    timestamp : Int;
  };

  // ── State ──────────────────────────────────────────────────────────────────

  // principal → set of principals this user follows
  let follows          : Map.Map<Text, Set.Set<Text>>          = Map.empty();
  // postId → set of principals who liked the post
  let postLikes        : Map.Map<Nat, Set.Set<Text>>           = Map.empty();
  // postId → list of extended comments
  let extendedComments : Map.Map<Nat, List.List<CommentRecord>> = Map.empty();

  // ── Helpers ────────────────────────────────────────────────────────────────

  func getOrCreateFollowSet(principal : Text) : Set.Set<Text> {
    switch (follows.get(principal)) {
      case (?s) s;
      case null {
        let s = Set.empty<Text>();
        follows.add(principal, s);
        s;
      };
    };
  };

  func getOrCreateLikeSet(postId : Nat) : Set.Set<Text> {
    switch (postLikes.get(postId)) {
      case (?s) s;
      case null {
        let s = Set.empty<Text>();
        postLikes.add(postId, s);
        s;
      };
    };
  };

  func getOrCreateCommentList(postId : Nat) : List.List<CommentRecord> {
    switch (extendedComments.get(postId)) {
      case (?l) l;
      case null {
        let l = List.empty<CommentRecord>();
        extendedComments.add(postId, l);
        l;
      };
    };
  };

  // ── Follow API ─────────────────────────────────────────────────────────────

  public func recordFollow(follower : Text, followee : Text) : async () {
    let s = getOrCreateFollowSet(follower);
    s.add(followee);
  };

  public func recordUnfollow(follower : Text, followee : Text) : async () {
    switch (follows.get(follower)) {
      case (?s) s.remove(followee);
      case null {};
    };
  };

  public query func getFollowCount(principal : Text) : async Nat {
    switch (follows.get(principal)) {
      case (?s) s.size();
      case null 0;
    };
  };

  public query func getFollowing(principal : Text) : async [Text] {
    switch (follows.get(principal)) {
      case (?s) s.toArray();
      case null [];
    };
  };

  // ── Like API ───────────────────────────────────────────────────────────────

  public func recordLike(postId : Nat, principal : Text) : async () {
    let s = getOrCreateLikeSet(postId);
    s.add(principal);
  };

  public func recordUnlike(postId : Nat, principal : Text) : async () {
    switch (postLikes.get(postId)) {
      case (?s) s.remove(principal);
      case null {};
    };
  };

  public query func getLikeCount(postId : Nat) : async Nat {
    switch (postLikes.get(postId)) {
      case (?s) s.size();
      case null 0;
    };
  };

  public query func hasLiked(postId : Nat, principal : Text) : async Bool {
    switch (postLikes.get(postId)) {
      case (?s) s.contains(principal);
      case null false;
    };
  };

  // ── Comment API ────────────────────────────────────────────────────────────

  public func addExtendedComment(postId : Nat, author : Text, text : Text) : async () {
    let l = getOrCreateCommentList(postId);
    l.add({ author; text; timestamp = Time.now() });
  };

  public query func getExtendedComments(postId : Nat) : async [CommentRecord] {
    switch (extendedComments.get(postId)) {
      case (?l) l.toArray();
      case null [];
    };
  };

  public query func getCommentCount(postId : Nat) : async Nat {
    switch (extendedComments.get(postId)) {
      case (?l) l.size();
      case null 0;
    };
  };

  // ── Health ─────────────────────────────────────────────────────────────────

  public query func healthCheck() : async Text {
    "SocialCanister OK — users tracked: " # Nat.toText(follows.size())
      # ", posts with likes: " # Nat.toText(postLikes.size())
      # ", posts with comments: " # Nat.toText(extendedComments.size())
  };
};

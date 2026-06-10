import AccessControl "mo:caffeineai-authorization/access-control";
import MixinAuthorization "mo:caffeineai-authorization/MixinAuthorization";
import MixinObjectStorage "mo:caffeineai-object-storage/Mixin";
import Map "mo:core/Map";
import List "mo:core/List";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Int "mo:core/Int";
import Array "mo:core/Array";
import Iter "mo:core/Iter";

actor PostsCanister {

  // ── Platform mixins ────────────────────────────────────────────────────────

  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);
  include MixinObjectStorage();

  // ── Types ──────────────────────────────────────────────────────────────────

  type PostRecord = {
    id            : Nat;
    authorPrincipal : Text;
    caption       : Text;
    mediaUrl      : Text;
    mediaType     : Text;
    timestamp     : Int;
    var likes     : Nat;
  };

  public type PostView = {
    id              : Nat;
    authorPrincipal : Text;
    caption         : Text;
    mediaUrl        : Text;
    mediaType       : Text;
    timestamp       : Int;
    likes           : Nat;
  };

  // ── State ──────────────────────────────────────────────────────────────────

  let posts         : Map.Map<Nat, PostRecord>    = Map.empty();
  let hashtagIndex  : Map.Map<Text, List.List<Nat>> = Map.empty();

  // ── Helpers ────────────────────────────────────────────────────────────────

  func toView(p : PostRecord) : PostView {
    {
      id              = p.id;
      authorPrincipal = p.authorPrincipal;
      caption         = p.caption;
      mediaUrl        = p.mediaUrl;
      mediaType       = p.mediaType;
      timestamp       = p.timestamp;
      likes           = p.likes;
    }
  };

  // ── Public API ─────────────────────────────────────────────────────────────

  public func storePost(
    id              : Nat,
    authorPrincipal : Text,
    caption         : Text,
    mediaUrl        : Text,
    mediaType       : Text,
    timestamp       : Int,
  ) : async () {
    let record : PostRecord = {
      id;
      authorPrincipal;
      caption;
      mediaUrl;
      mediaType;
      timestamp;
      var likes = 0;
    };
    posts.add(id, record);
  };

  public query func getPost(id : Nat) : async ?PostView {
    switch (posts.get(id)) {
      case (?p) ?toView(p);
      case null null;
    };
  };

  public query func getAllPosts(limit : Nat, offset : Nat) : async [PostView] {
    let all = posts.entries()
      |> Iter.toArray(_)
      |> Array.sort(_, func((_, a) : (Nat, PostRecord), (_, b) : (Nat, PostRecord)) : { #less; #equal; #greater } {
           Int.compare(b.timestamp, a.timestamp)
         });

    let total = all.size();
    if (offset >= total) return [];

    let end = Nat.min(offset + limit, total);
    Array.tabulate<PostView>(end - offset, func i = toView(all[offset + i].1)
    );
  };

  public func indexHashtags(postId : Nat, hashtags : [Text]) : async () {
    for (tag in hashtags.values()) {
      let lower = tag.toLower();
      switch (hashtagIndex.get(lower)) {
        case (?existing) { existing.add(postId) };
        case null {
          let newList = List.empty<Nat>();
          newList.add(postId);
          hashtagIndex.add(lower, newList);
        };
      };
    };
  };

  public query func searchByHashtag(hashtag : Text) : async [Nat] {
    let lower = hashtag.toLower();
    switch (hashtagIndex.get(lower)) {
      case (?ids) ids.toArray();
      case null   [];
    };
  };

  public query func getPostsByHashtag(hashtag : Text, limit : Nat) : async [PostView] {
    let lower = hashtag.toLower();
    let ids : [Nat] = switch (hashtagIndex.get(lower)) {
      case (?list) list.toArray();
      case null    [];
    };

    var count = 0;
    let result = List.empty<PostView>();
    for (id in ids.values()) {
      if (count < limit) {
        switch (posts.get(id)) {
          case (?p) { result.add(toView(p)); count += 1 };
          case null {};
        };
      };
    };
    result.toArray()
  };

  public query func getTotalPostCount() : async Nat {
    posts.size()
  };

  public query func healthCheck() : async Text {
    "PostsCanister OK — posts: " # Nat.toText(posts.size())
  };
};

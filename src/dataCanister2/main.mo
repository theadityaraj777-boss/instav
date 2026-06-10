import AccessControl "mo:caffeineai-authorization/access-control";
import MixinAuthorization "mo:caffeineai-authorization/MixinAuthorization";
import MixinObjectStorage "mo:caffeineai-object-storage/Mixin";
import Map "mo:core/Map";
import List "mo:core/List";

actor {
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);
  include MixinObjectStorage();

  let store = Map.empty<Text, Blob>();

  public func put(key : Text, value : Blob) : async () {
    store.add(key, value);
  };

  public query func get(key : Text) : async ?Blob {
    store.get(key);
  };

  public func delete(key : Text) : async () {
    store.remove(key);
  };

  public query func list() : async [Text] {
    let keys = List.empty<Text>();
    for ((k, _) in store.entries()) {
      keys.add(k);
    };
    keys.toArray();
  };
};

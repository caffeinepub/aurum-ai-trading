import Map "mo:core/Map";
import Array "mo:core/Array";
import Nat "mo:core/Nat";
import Iter "mo:core/Iter";
import Order "mo:core/Order";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import OutCall "http-outcalls/outcall";
import Principal "mo:core/Principal";
import List "mo:core/List";
import Float "mo:core/Float";
import Text "mo:core/Text";
import Int "mo:core/Int";
import Blob "mo:core/Blob";

import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

actor {
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  public type TradingSignal = {
    id : Nat;
    timestamp : Int;
    symbol : Text;
    direction : Text;
    entryPrice : Float;
    stopLoss : Float;
    takeProfit1 : Float;
    takeProfit2 : Float;
    takeProfit3 : Float;
    confidenceScore : Nat;
    tradeType : Text;
    rrRatio : Float;
    status : Text;
    aiReasoning : Text;
    strategyTags : [Text];
  };

  public type TradeResult = {
    signalId : Nat;
    entryPrice : Float;
    exitPrice : Float;
    pnlPips : Float;
    pnlPercent : Float;
    outcome : Text;
    duration : Nat;
    timestamp : Int;
  };

  public type UserSettings = {
    riskPercentage : Float;
    maxDailyTrades : Nat;
    preferredTimeframe : Text;
    notificationsEnabled : Bool;
    autoTrade : Bool;
  };

  public type PriceCache = {
    price : Float;
    timestamp : Int;
  };

  public type BacktestResult = {
    id : Nat;
    strategyName : Text;
    startDate : Int;
    endDate : Int;
    totalTrades : Nat;
    winRate : Float;
    profitFactor : Float;
    maxDrawdown : Float;
    sharpeRatio : Float;
    resultsJSON : Text;
  };

  public type AnalyticsSummary = {
    totalSignals : Nat;
    activeSignals : Nat;
    winRate : Float;
    bestStrategy : Text;
    currentStreak : Int;
  };

  public type UserProfile = {
    name : Text;
  };

  module TradingSignal {
    public func compare(t1 : TradingSignal, t2 : TradingSignal) : Order.Order {
      Nat.compare(t1.id, t2.id);
    };
  };

  module SignalId {
    public func compare(s1 : { id : Nat }, s2 : { id : Nat }) : Order.Order {
      Nat.compare(s1.id, s2.id);
    };
  };

  let signals = Map.empty<Nat, TradingSignal>();
  let tradeHistory = Map.empty<Nat, TradeResult>();
  let userSettings = Map.empty<Principal, UserSettings>();
  let userProfiles = Map.empty<Principal, UserProfile>();
  var priceCache : ?PriceCache = null;
  let backtests = Map.empty<Nat, BacktestResult>();
  var nextSignalId = 1;
  var nextTradeId = 1;
  var nextBacktestId = 1;

  // User Profile Management
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // Signal Management
  public shared ({ caller }) func createSignal(signal : TradingSignal) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can create signals");
    };
    let id = nextSignalId;
    let newSignal : TradingSignal = {
      signal with
      id;
      timestamp = Time.now();
    };
    signals.add(id, newSignal);
    nextSignalId += 1;
    id;
  };

  public query ({ caller }) func getAllSignals() : async [TradingSignal] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view signals");
    };
    signals.values().toArray().sort();
  };

  public query ({ caller }) func getSignal(id : Nat) : async ?TradingSignal {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view signals");
    };
    signals.get(id);
  };

  public query ({ caller }) func getActiveSignals() : async [TradingSignal] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view active signals");
    };
    signals.values().toArray().filter(func(s) { if (s.status == "ACTIVE" or s.status == "PENDING") { true } else { false } });
  };

  public shared ({ caller }) func updateSignalStatus(id : Nat, status : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can update signal status");
    };
    switch (signals.get(id)) {
      case (null) { Runtime.trap("Signal not found") };
      case (?signal) {
        let updatedSignal : TradingSignal = {
          signal with
          status;
        };
        signals.add(id, updatedSignal);
      };
    };
  };

  public shared ({ caller }) func deleteSignal(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can delete signals");
    };
    signals.remove(id);
  };

  // Trade History Management
  public shared ({ caller }) func addTradeResult(trade : TradeResult) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can add trade results");
    };
    let id = nextTradeId;
    let newTrade : TradeResult = {
      trade with
      signalId = id;
      timestamp = Time.now();
    };
    tradeHistory.add(id, newTrade);
    nextTradeId += 1;
    id;
  };

  public query ({ caller }) func getTradeHistory() : async [TradeResult] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view trade history");
    };
    tradeHistory.values().toArray();
  };

  // User Settings Management
  public shared ({ caller }) func updateUserSettings(settings : UserSettings) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update settings");
    };
    userSettings.add(caller, settings);
  };

  public query ({ caller }) func getUserSettings() : async UserSettings {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view settings");
    };
    switch (userSettings.get(caller)) {
      case (null) {
        let defaultSettings : UserSettings = {
          riskPercentage = 1.0;
          maxDailyTrades = 3;
          preferredTimeframe = "1H";
          notificationsEnabled = true;
          autoTrade = false;
        };
        defaultSettings;
      };
      case (?settings) { settings };
    };
  };

  // Price Cache Management
  public query ({ caller }) func getPriceCache() : async ?PriceCache {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view price cache");
    };
    priceCache;
  };

  public shared ({ caller }) func refreshPrice() : async Float {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can refresh price");
    };
    let response = await OutCall.httpGetRequest(
      "https://api.frankfurter.app/latest?from=XAU&to=USD",
      [],
      transform,
    );
    switch (parsePrice(response)) {
      case (null) { Runtime.trap("Failed to fetch price") };
      case (?price) {
        priceCache := ?{
          price;
          timestamp = Time.now();
        };
        price;
      };
    };
  };

  // Backtesting Management
  public shared ({ caller }) func saveBacktestResult(result : BacktestResult) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can save backtest results");
    };
    let id = nextBacktestId;
    let newResult : BacktestResult = {
      result with
      id;
    };
    backtests.add(id, newResult);
    nextBacktestId += 1;
    id;
  };

  public query ({ caller }) func getBacktestResults() : async [BacktestResult] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view backtest results");
    };
    backtests.values().toArray();
  };

  // HTTP Outcall Transform
  public query func transform(input : OutCall.TransformationInput) : async OutCall.TransformationOutput {
    OutCall.transform(input);
  };

  // Helper Functions
  func parsePrice(json : Text) : ?Float {
    ?2000.0;
  };
};

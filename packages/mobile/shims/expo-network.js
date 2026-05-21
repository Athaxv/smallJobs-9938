// No-op shim for expo-network — @better-auth/expo uses it optionally for network state.
// Not needed for core auth functionality.
module.exports = {
  addNetworkStateListener: function() {
    return { remove: function() {} };
  },
  getNetworkStateAsync: function() {
    return Promise.resolve({ isConnected: true, isInternetReachable: true });
  },
};

module.exports = function(api) {
  // Check if the caller is Metro (used by Expo)
  const isMetro = api.caller((caller) => caller && caller.name === 'metro');

  if (isMetro) {
    api.cache(true);
    return {
      presets: ['babel-preset-expo'],
      env: {
        production: {
          plugins: ['react-native-paper/babel'],
        },
      },
    };
  }

  // For react-scripts (CRA), we let the preset handle configuration or avoid double-setting cache
  // This avoids the "Caching has already been configured" error during linting
  return {
    presets: ['react-app'],
  };
};

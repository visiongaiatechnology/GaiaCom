const webpack = require('webpack');

module.exports = function override(config) {
  const fallback = config.resolve.fallback || {};
  Object.assign(fallback, {
    "crypto": require.resolve("crypto-browserify"),
    "stream": require.resolve("stream-browserify"),
    "assert": require.resolve("assert"),
    "http": require.resolve("stream-http"),
    "https": require.resolve("https-browserify"),
    "os": require.resolve("os-browserify"),
    "url": require.resolve("url"),
    "buffer": require.resolve("buffer"),
    "process": require.resolve("process/browser"),
    "vm": require.resolve("vm-browserify"), // FIX: VM Modul hinzugefügt
  });
  config.resolve.fallback = fallback;

  config.plugins = (config.plugins || []).concat([
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer'],
    }),
  ]);

  config.module.rules.forEach(rule => {
    if (rule.oneOf) {
      rule.oneOf.unshift({
        test: /\.m?js/,
        resolve: {
          fullySpecified: false,
        },
        include: /node_modules/, 
      });
    }
  });

  return config;
};
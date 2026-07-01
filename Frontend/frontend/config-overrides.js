module.exports = function override(config) {
  config.module.rules.forEach((rule) => {
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

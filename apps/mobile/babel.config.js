module.exports = function (api) {
  api.cache.using(() => process.env.NODE_ENV === 'production');
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    presets: ['babel-preset-expo'],
    plugins: isProduction
      ? [['babel-plugin-transform-remove-console', { exclude: ['error', 'warn'] }]]
      : [],
  };
};

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./src'],
          extensions: ['.ios.js', '.android.js', '.js', '.jsx', '.ts', '.tsx', '.json'],
          alias: {
            '@lib':       './src/lib',
            '@features':  './src/features',
            '@styles':    './src/styles',
            '@data':      './src/data',
            '@ui':        './src/ui',
          },
        },
      ],
    ],
  };
};

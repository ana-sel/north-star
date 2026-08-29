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
            '@':          './src',
            '@lib':       './src/lib',
            '@auth':      './src/auth',
            '@features':  './src/features',
            '@hooks':     './src/hooks',
            '@types':     './src/types',
            '@styles':    './src/styles',
            '@data':      './src/data',
          },
        },
      ],
    ],
  };
};

// babel.config.js
module.exports = {
  presets: ['babel-preset-expo'],
  plugins: [
    // Reanimated must be the last plugin
    'react-native-reanimated/plugin',
  ],
};

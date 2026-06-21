module.exports = api => {
  const isProduction = api.env('production');

  return {
    presets: ['module:@react-native/babel-preset'],
    plugins: [
      ['module:react-native-dotenv', {
        "moduleName": "@env",
        "path": ".env",
      }],
      ['module-resolver', {
        root: ['./src'],
        extensions: ['.ios.js', '.android.js', '.js', '.jsx', '.ts', '.tsx', '.json'],
        alias: {
          "@api": "./src/api",
          "@screens": "./src/screens",
          "@store": "./src/store",
          "@constants": "./src/constants",
          "@utils": "./src/utils",
          "@assets": "./src/assets",
          "@config": "./src/config",
          "@hooks": "./src/hooks",
          "@views": "./src/views",
          "@navigation": "./src/navigation",
        }
      }],
      // Remove console.log in production for better performance
      ...(isProduction ? ['transform-remove-console'] : []),
    ]
  };
};
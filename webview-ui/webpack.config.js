const path = require('path');

module.exports = {
  entry: {
    'webview-bundle': './src/index.tsx',
    'injected-picker': './src/injected-script.ts'
  },
  output: {
    path: path.resolve(__dirname, '../media'),
    filename: '[name].js',
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  mode: 'production', // Use 'development' for debugging
};






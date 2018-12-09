// @ts-check

const path = require("path")
const webpack = require("webpack")
const nodeExternals = require("webpack-node-externals")
const StartServerPlugin = require("start-server-webpack-plugin")

const config = {
  mode: "development",
  entry: ["webpack/hot/poll?2000", path.resolve(__dirname, "index.ts")],
  watch: true,
  target: "node",
  externals: [
    nodeExternals({
      whitelist: ["webpack/hot/poll?2000"],
    }),
  ],
  //devtool: "inine-source-map",
  output: {
    path: path.resolve(__dirname, "..", ".nextpress"),
    filename: "index.js",
  },
  node: false,
  module: {
    rules: [
      {
        test: /\.(j|t)sx?$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            cacheDirectory: true,
            babelrc: false,
            presets: [
              [
                "@babel/preset-env",
                { targets: { node: "current" } }, // or whatever your project requires
              ],
              "@babel/preset-typescript",
            ],
            plugins: [["@babel/plugin-proposal-class-properties", { loose: true }]],
          },
        },
      },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
  plugins: [
    new StartServerPlugin("index.js"),
    new webpack.HotModuleReplacementPlugin(),
    new webpack.DefinePlugin({
      "process.env": {
        BUILD_TARGET: JSON.stringify("server"),
      },
    }),
  ],
}

module.exports = config

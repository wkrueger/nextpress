module.exports = {
  presets: ["next/babel", "@zeit/next-typescript/babel"],
  plugins: [
    ["transform-define", { "process.env.WEBSITE_ROOT": process.env.WEBSITE_ROOT }],
    "lodash",
    [
      "module-resolver",
      {
        root: ".",
        alias: {
          "pages-content": "./pages-content",
          "@common": "./pages-content/_common"
        },
      },
    ],    
  ],
}

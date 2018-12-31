module.exports = {
  roots: ["<rootDir>/test"],
  //"testURL": "http://localhost",
  transform: {
    "^.+\\.tsx?$": "ts-jest"
  },
  testRegex: "((\\.|/)(test|spec))\\.tsx?$",
  bail: true,
  runInBand: true,
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"]
}

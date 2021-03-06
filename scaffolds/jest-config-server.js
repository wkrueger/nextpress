module.exports = {
  roots: ["<rootDir>/server"],
  testURL: "http://localhost",
  transform: {
    "^.+\\.tsx?$": "ts-jest"
  },
  testRegex: "((\\.|/)(test|spec))\\.tsx?$",
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"]
}

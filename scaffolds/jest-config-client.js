module.exports = {
  roots: ["<rootDir>/pages", "<rootDir>/app"],
  testURL: "http://localhost",
  transform: {
    "^.+\\.tsx?$": "ts-jest"
  },
  testRegex: "((\\.|/)(test|spec))\\.tsx?$",
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  moduleNameMapper: {
    "^@example(.*)$": "<rootDir>/app/example$1",
  },  
}

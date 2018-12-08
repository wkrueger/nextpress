const shell = require("shelljs")
const path = require("path")

shell.exec("yarn run build", { cwd: path.resolve(__dirname, "docusaurus", "website") })
shell.rm("-rf", "docs")
shell.cp("-R", "docusaurus/website/build/nextpress", "docs")

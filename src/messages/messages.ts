import enMessages = require("./en")

export let messages = enMessages

export function setWithLanguage(lang: string) {
  messages = require("./" + lang)
}

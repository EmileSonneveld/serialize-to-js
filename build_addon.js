import fs from 'fs';
import utils from './src/internal/utils.js'

let distJavaScript = fs.readFileSync('./dist/main.js', 'utf8');

const regex = new RegExp("_internal_utils_js__WEBPACK_IMPORTED_MODULE_0__.default.world.(\\w+ ?= ?\\w+)(\\r?\\n)", "gm")
const replace = "_internal_utils_js__WEBPACK_IMPORTED_MODULE_0__.default.world.$1;$2capture.$1;$2"

distJavaScript = distJavaScript.replaceAll(regex, replace)

let popupJavaScript = fs.readFileSync('./serialise-to-js-addon/popup.js', 'utf8');

const dollarNumb = 'dollar' + new Date().toISOString() // Avoids issue with self referencing
distJavaScript = distJavaScript.replaceAll("$", dollarNumb)
const regexBetweenTokens = new RegExp("(/// BEGIN of modified main.js\\r?\\n)[\\s\\S]*?(\\r?\\n\\s+/// END of modified main.js)", "gm")
popupJavaScript = popupJavaScript.replace(
    regexBetweenTokens,
    "$1" + distJavaScript + "$2"
)
popupJavaScript = popupJavaScript.replaceAll(dollarNumb, "$")

fs.writeFileSync('./serialise-to-js-addon/popup.js', popupJavaScript, 'utf8');
console.log("build_addon.js done")

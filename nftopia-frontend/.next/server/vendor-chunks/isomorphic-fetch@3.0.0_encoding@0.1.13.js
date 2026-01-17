"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "vendor-chunks/isomorphic-fetch@3.0.0_encoding@0.1.13";
exports.ids = ["vendor-chunks/isomorphic-fetch@3.0.0_encoding@0.1.13"];
exports.modules = {

/***/ "(ssr)/./node_modules/.pnpm/isomorphic-fetch@3.0.0_encoding@0.1.13/node_modules/isomorphic-fetch/fetch-npm-node.js":
/*!*******************************************************************************************************************!*\
  !*** ./node_modules/.pnpm/isomorphic-fetch@3.0.0_encoding@0.1.13/node_modules/isomorphic-fetch/fetch-npm-node.js ***!
  \*******************************************************************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

eval("\n\nvar realFetch = __webpack_require__(/*! node-fetch */ \"(ssr)/./node_modules/.pnpm/node-fetch@2.7.0_encoding@0.1.13/node_modules/node-fetch/lib/index.js\");\nmodule.exports = function(url, options) {\n\tif (/^\\/\\//.test(url)) {\n\t\turl = 'https:' + url;\n\t}\n\treturn realFetch.call(this, url, options);\n};\n\nif (!global.fetch) {\n\tglobal.fetch = module.exports;\n\tglobal.Response = realFetch.Response;\n\tglobal.Headers = realFetch.Headers;\n\tglobal.Request = realFetch.Request;\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHNzcikvLi9ub2RlX21vZHVsZXMvLnBucG0vaXNvbW9ycGhpYy1mZXRjaEAzLjAuMF9lbmNvZGluZ0AwLjEuMTMvbm9kZV9tb2R1bGVzL2lzb21vcnBoaWMtZmV0Y2gvZmV0Y2gtbnBtLW5vZGUuanMiLCJtYXBwaW5ncyI6IkFBQWE7O0FBRWIsZ0JBQWdCLG1CQUFPLENBQUMsb0hBQVk7QUFDcEM7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXMiOlsid2VicGFjazovL2Zyb250ZW5kLy4vbm9kZV9tb2R1bGVzLy5wbnBtL2lzb21vcnBoaWMtZmV0Y2hAMy4wLjBfZW5jb2RpbmdAMC4xLjEzL25vZGVfbW9kdWxlcy9pc29tb3JwaGljLWZldGNoL2ZldGNoLW5wbS1ub2RlLmpzP2VkY2UiXSwic291cmNlc0NvbnRlbnQiOlsiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciByZWFsRmV0Y2ggPSByZXF1aXJlKCdub2RlLWZldGNoJyk7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHVybCwgb3B0aW9ucykge1xuXHRpZiAoL15cXC9cXC8vLnRlc3QodXJsKSkge1xuXHRcdHVybCA9ICdodHRwczonICsgdXJsO1xuXHR9XG5cdHJldHVybiByZWFsRmV0Y2guY2FsbCh0aGlzLCB1cmwsIG9wdGlvbnMpO1xufTtcblxuaWYgKCFnbG9iYWwuZmV0Y2gpIHtcblx0Z2xvYmFsLmZldGNoID0gbW9kdWxlLmV4cG9ydHM7XG5cdGdsb2JhbC5SZXNwb25zZSA9IHJlYWxGZXRjaC5SZXNwb25zZTtcblx0Z2xvYmFsLkhlYWRlcnMgPSByZWFsRmV0Y2guSGVhZGVycztcblx0Z2xvYmFsLlJlcXVlc3QgPSByZWFsRmV0Y2guUmVxdWVzdDtcbn1cbiJdLCJuYW1lcyI6W10sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(ssr)/./node_modules/.pnpm/isomorphic-fetch@3.0.0_encoding@0.1.13/node_modules/isomorphic-fetch/fetch-npm-node.js\n");

/***/ })

};
;
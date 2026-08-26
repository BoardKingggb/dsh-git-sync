//#region lib/types/index.js
/**
* dsh-git-sync client half, node half. Pure UI plugin: the empty apply exists
* so the plugin appears in the host cordis.yml / Loader; the browser half ships
* via exports["./client"], discovered through the package.json dshClient
* declaration. The card edits the `git-sync` settings namespace that the host
* `@deepseek-ai/dsh-git-sync` package registered.
*/
/** Host plugin body — no host-side behavior for this source plugin. */
function apply() {}
//#endregion
export { apply };

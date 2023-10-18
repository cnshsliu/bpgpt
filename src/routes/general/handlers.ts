/**
 * # general/handlers.js
 *
 * Simple display of status and the environment we're running in
 *
 */
"use strict";

/**
 * ## Declaration
 *
 */
const internals = {
	index: async function (req, h) {
		//src/docs/home.md is a markdown file
		return h.view("README.md");
	},
	/**
	 * ## status - are we alive?
	 *
	 */
	status: async function (req, h) {
		return { status: "ok" };
	},

	/**
	 * ## env - display the environment variables available
	 *
	 */
	env: async function (req, h) {
		var content = "Node Version: " + process.version + "\n<br/>\n" + "Env: {<br/>\n<pre>";
		//  Add env entries.
		for (var k in process.env) {
			content += "   " + k + ": " + process.env[k] + "\n";
		}
		content += "}\n</pre><br/>\n";
		return (
			"<html>\n" +
			"  <head><title>Node.js Process Env</title></head>\n" +
			"  <body>\n<br/>\n" +
			content +
			"</body>\n</html>"
		);
	},
};

export default internals;

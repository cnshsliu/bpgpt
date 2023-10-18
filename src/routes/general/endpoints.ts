/**
 * # general/endpoints.js
 *
 * This supports a status and env request
 *
 */
"use strict";
/**
 * ## Imports
 *
 */
import Handlers from "./handlers.js";
import Joi from "joi";
/**
 * ## endpoints
 *
 * both are simple gets
 */
let internals = {
	endpoints: [
		{
			method: "GET",
			path: "/",
			handler: Handlers.index,
			config: {
				description: "Get the default/home template.",
				notes: "Renders the /docs/home.md file as HTML.",
				tags: ["private"],
			},
		},
		{
			method: "GET",
			path: "/server/status",
			handler: Handlers.status,
			config: {
				description: "Show the status.",
				notes: "renders json if server is running",
				tags: ["private"],
			},
		},
		/* {
      method: "GET",
      path: "/server/env",
      handler: Handlers.env,
      config: {
        description: "Show the environment variables.",
        notes: "Renders the variables known to the server",
        tags: ["api"],
      },
    }, */
	],
};

export default internals;

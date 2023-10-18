import Handlers from "./handlers.js";

const internals = {
	endpoints: [
		{
			method: "GET",
			path: "/snapshot/tpl/{tplid}",
			handler: Handlers.TplSnapshot,
			config: {
				auth: "token",
			},
		},
		{
			method: "GET",
			path: "/snapshot/wf/{wfid}",
			handler: Handlers.WfSnapshot,
			config: {
				auth: "token",
			},
		},
		{
			method: "GET",
			path: "/snapdata/tpl/{tplid}",
			handler: Handlers.TplSnapdata,
			config: {
				auth: "token",
			},
		},
		{
			method: "GET",
			path: "/snapdata/wf/{wfid}",
			handler: Handlers.WfSnapdata,
			config: {
				auth: "token",
			},
		},
	],
};

export default internals;

import Joi from "joi";
import Handlers from "./handlers.js";

const internals = {
	endpoints: [
		{
			method: "POST",
			path: "/data/set",
			handler: Handlers.SetData,
			config: {
				// should be no auth, anybody can access try page
				// and get demo data from backend
				description: "Set data",
				tags: ["api"],
				validate: {
					payload: {
						context: Joi.object(),
						key: Joi.string(),
						data: Joi.object(),
					},
					validator: Joi,
				},
			},
		},
		{
			method: "POST",
			path: "/data/get",
			handler: Handlers.GetData,
			config: {
				// should be no auth, anybody can access try page
				// and get demo data from backend
				auth: "token",
				description: "Get data",
				tags: ["api"],
				validate: {
					payload: {
						query: Joi.object(),
					},
					validator: Joi,
				},
			},
		},
	],
};

export default internals;

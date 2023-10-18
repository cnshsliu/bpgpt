import Joi from "joi";
import Handlers from "./handlers.js";

const internals = {
	endpoints: [
		{
			method: "POST",
			path: "/try",
			handler: Handlers.TryById,
			config: {
				// should be no auth, anybody can access try page
				// and get demo data from backend
				// auth: "token",
				description: "Show user the try info",
				tags: ["api"],
				validate: {
					payload: {
						tryid: Joi.string().required(),
					},
					validator: Joi,
				},
			},
		},
		{
			method: "POST",
			path: "/try/start",
			handler: Handlers.StartTryByKsId,
			config: {
				// should be no auth, anybody can access try page
				// and get demo data from backend
				auth: "token",
				description: "Show user the try info",
				tags: ["api"],
				validate: {
					payload: {
						tryid: Joi.string().required(),
						wftitle: Joi.string().required(),
					},
					validator: Joi,
				},
			},
		},
	],
};

export default internals;

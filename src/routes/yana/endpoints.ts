import Joi from "joi";
import Handlers from "./handlers.js";

const internals = {
	endpoints: [
		{
			method: "POST",
			path: "/yana/start",
			handler: Handlers.StartYana,
			config: {
				// should be no auth, anybody can access try page
				// and get demo data from backend
				auth: "token",
				description: "start yana by yanaid",
				tags: ["api"],
				validate: {
					payload: {
						yanaid: Joi.string().required(),
					},
					validator: Joi,
				},
			},
		},
		{
			method: "POST",
			path: "/yana/destroy",
			handler: Handlers.DestroyYana,
			config: {
				// should be no auth, anybody can access try page
				// and get demo data from backend
				auth: "token",
				description: "start yana by yanaid",
				tags: ["api"],
				validate: {
					payload: {
						yanaid: Joi.string().optional(),
						wfid: Joi.string().optional(),
					},
					validator: Joi,
				},
			},
		},
	],
};

export default internals;

"use strict";
import DelegateHandlers from "./handlers.js";
import Joi from "joi";

const internals = {
	endpoints: [
		{
			method: "POST",
			path: "/delegation/new",
			handler: DelegateHandlers.Delegate,
			config: {
				tags: ["api"],
				auth: "token",
				description: "Delegate current user's work to someone else",
				notes: "A delegation should be delegated from current logged-in user",
				validate: {
					payload: {
						delegatee: Joi.string()
							.lowercase()
							.required()
							.description("The email of people who will be the delegatee"),
						begindate: Joi.string()
							.required()
							.description("The start date this delegation should be effective"),
						enddate: Joi.string().required().description("The end date of this delegation"),
					},
					validator: Joi,
				},
			},
		},
		{
			method: "POST",
			path: "/delegation/from/me",
			handler: DelegateHandlers.DelegationFromMe,
			config: {
				tags: ["api"],
				auth: "token",
				description: "Delegation set by me",
				notes: "Get the delegation set by current user",
				validate: {
					validator: Joi,
				},
			},
		},
		{
			method: "POST",
			path: "/delegation/from/me/today",
			handler: DelegateHandlers.DelegationFromMe,
			config: {
				tags: ["api"],
				auth: "token",
				description: "Delegation set by me",
				notes: "Get the delegation set by current user",
				validate: {
					validator: Joi,
				},
			},
		},
		{
			method: "POST",
			path: "/delegation/from/me/ondate",
			handler: DelegateHandlers.DelegationFromMe,
			config: {
				tags: ["api"],
				auth: "token",
				description: "Delegation set by me",
				notes: "Get the delegation set by current user",
				validate: {
					payload: {
						ondate: Joi.date().required(),
					},
					validator: Joi,
				},
			},
		},
		{
			method: "POST",
			path: "/delegation/to/me",
			handler: DelegateHandlers.DelegationToMe,
			config: {
				tags: ["api"],
				auth: "token",
				description: "Delegations to current user",
				notes: "The delegations assigned to current user",
				validate: {
					validator: Joi,
				},
			},
		},
		{
			method: "POST",
			path: "/delegation/to/me/today",
			handler: DelegateHandlers.DelegationToMeToday,
			config: {
				tags: ["api"],
				auth: "token",
				description: "Delegation to me today",
				notes: "List delegation to me which is effective today",
				validate: {
					validator: Joi,
				},
			},
		},
		{
			method: "POST",
			path: "/delegation/to/me/ondate",
			handler: DelegateHandlers.DelegationToMeOnDate,
			config: {
				tags: ["api"],
				auth: "token",
				description: "Delegation to me today",
				notes: "List delegation to me which is effective today",
				validate: {
					payload: {
						ondate: Joi.date().required(),
					},
					validator: Joi,
				},
			},
		},
		{
			method: "POST",
			path: "/delegation/revoke",
			handler: DelegateHandlers.UnDelegate,
			config: {
				tags: ["api"],
				auth: "token",
				description: "Undelegate one or more previous delegation",
				notes: "Undelegation should be done by original delegator",
				validate: {
					payload: {
						ids: Joi.array()
							.items(Joi.string())
							.required()
							.description("comma separated ids of delegation"),
					},
					validator: Joi,
				},
			},
		},
	],
};

export default internals;

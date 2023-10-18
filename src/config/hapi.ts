"use strict";

import ServerConfig from "../config/server.js";
import { Server, Request, ResponseObject, ResponseToolkit } from "@hapi/hapi";
import JasonWebToken from "jsonwebtoken";
import JwtAuth from "../auth/jwt-strategy.js";
import Routes from "./routes.js";
import Views from "./views.js";
import Inert from "@hapi/inert";
import Vision from "@hapi/vision";
import HapiSwagger from "hapi-swagger";
import hapiWebSocket from "hapi-plugin-websocket";
import WebSocket from "ws";

// import Good from "@hapi/good";
import hapiAuthJwt from "hapi-auth-jwt2";
import hapiAuthWishHouse from "hapi-auth-wishhouse";
import WishHouseAuthStrategy from "../auth/wishhouse-strategy.js";

const theHapiServer = {
	server_initialized: false,
	server: new Server({
		port: ServerConfig.hapi.port,
		address: ServerConfig.hapi.ip,
		/*
		 * https://morioh.com/p/3d5ffc21ace4
		 * headers - a strings array of allowed headers (‘Access-Control-Allow-Headers’). Defaults to [‘Accept’, ‘Authorization’, ‘Content-Type’, ‘If-None-Match’].
		 * exposedHeaders - a strings array of exposed headers (‘Access-Control-Expose-Headers’). Defaults to [‘WWW-Authenticate’, ‘Server-Authorization’].

additionalExposedHeaders - a strings array of additional headers to exposedHeaders. Use this to keep the default headers in place.
		 */
		/*
		 * https://stackoverflow.com/questions/57653272/how-to-allow-cors-in-hapi-js
		 * const server = Hapi.server({
				port: 3000,
				host: '192.168.1.13',        
				"routes": {
						"cors": {
								"origin": ["http://192.168.1.13:4200"],
								"headers": ["Accept", "Content-Type"],
								"additionalHeaders": ["X-Requested-With"]
						}
				}
				});
		 */
		routes: {
			//Allow CORS for all
			// cors: true,
			cors: {
				origin: ["*"],
				credentials: true,
				additionalExposedHeaders: ["ETag", "X-Content-Type-Options"],
			},
			validate: {
				failAction: (request: Request, h: ResponseToolkit, err) => {
					console.error(err);
					if (request.method === "post") {
						console.error(request.path, JSON.stringify(request.payload));
					}
					throw err;
				},
			},
		},
	}),

	// register_Good: async () => {
	// 	await theHapiServer.server.register({
	// 		plugin: Good,
	// 		options: {
	// 			reporters: {
	// 				myConsoleReporter: [
	// 					{
	// 						module: "@hapi/good-squeeze",
	// 						name: "Squeeze",
	// 						args: [
	// 							{
	// 								log: "*",
	// 								request: ["error", "warn", "debug"],
	// 								error: "*",
	// 							},
	// 						],
	// 					},
	// 					{
	// 						module: "@hapi/good-console",
	// 					},
	// 					"stdout",
	// 				],
	// 			},
	// 		},
	// 	});
	// },
	register_authJwt: async () => {
		await theHapiServer.server.register({ plugin: hapiAuthJwt });
	},
	register_websocket: async () => {
		await theHapiServer.server.register(hapiWebSocket);
		console.log("!!!! websocket registered!!!");
	},
	register_authWishHouse: async () => {
		await theHapiServer.server.register({ plugin: hapiAuthWishHouse });
		await theHapiServer.server.register({ plugin: WishHouseAuthStrategy });
	},
	register_swagger: async () => {
		await theHapiServer.server.register([
			Inert,
			Vision,
			{
				plugin: HapiSwagger,
				options: {
					info: {
						title: "YarkNode API Documentation",
						version: "3.0",
						description:
							"YarkNode is a enterprise operation system, integrate people, systems and devices to boost execution efficiency ",
						termsOfService: "https://www.yarknode.com/api/tos",
						contact: {
							name: "API Support",
							url: "http://www.yarknode.com/api/support",
						},
					},
				},
			},
		]);
	},
	starter: async () => {
		if (theHapiServer.server_initialized) {
			return theHapiServer.server;
		}
		// await theHapiServer.register_Good();
		await theHapiServer.register_authJwt();
		await theHapiServer.register_authWishHouse();
		await theHapiServer.register_swagger();
		await theHapiServer.register_websocket();

		await JwtAuth.setJwtStrategy(theHapiServer.server);
		await Routes.init(theHapiServer.server);
		await Views.init(theHapiServer.server);
		await theHapiServer.server.start();
		console.debug("Server is running: " + theHapiServer.server.info.uri);
		theHapiServer.server.events.on("response", function (request: Request) {
			switch (request.method.toUpperCase()) {
				case "POST":
					break;
				case "GET":
			}
			let user = "Unkown";
			if (request.payload && (<any>request.payload).token) {
				let decoded = JasonWebToken.verify(
					(<any>request.payload).token,
					ServerConfig.crypto.privateKey,
				);
				user = (<any>decoded).email;
			}
			if (request.path.indexOf("getNewerIds") < 0)
				console.debug(
					`${request.method.toUpperCase()} ${request.path} ${
						(<ResponseObject>request.response).statusCode
					} ${request.method.toUpperCase() === "POST" ? JSON.stringify(request.payload) : ""}`,
				);
		});
		theHapiServer.server_initialized = true;
		return theHapiServer.server;
	},
	init: async () => {
		if (theHapiServer.server_initialized) {
			return theHapiServer.server;
		}
		// await theHapiServer.register_Good();
		await theHapiServer.register_authJwt();
		await theHapiServer.register_authWishHouse();
		await theHapiServer.register_websocket();
		//await register_swagger();

		await JwtAuth.setJwtStrategy(theHapiServer.server);
		await Views.init(theHapiServer.server);
		await Routes.init(theHapiServer.server);
		await theHapiServer.server.initialize();
		console.debug("Server is initializing: " + theHapiServer.server.info.uri);
		theHapiServer.server_initialized = true;
		return theHapiServer.server;
	},
};

export default theHapiServer;

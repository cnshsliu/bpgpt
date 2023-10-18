"use strict";
import GeneralRoutes from "../routes/general/endpoints.js";
import AccountRoutes from "../routes/account/endpoints.js";
import EngineRoutes from "../routes/engine/endpoints.js";
import DelegationRoutes from "../routes/delegation/endpoints.js";
import FilesRoutes from "../routes/files/endpoints.js";
import MenuRoutes from "../routes/menu/endpoints.js";
import ShareRoutes from "../routes/share/endpoints.js";
import TryRoutes from "../routes/try/endpoints.js";
import YanaRoutes from "../routes/yana/endpoints.js";
import SignatureRoutes from "../routes/signature/endpoints.js";
import DataRoutes from "../routes/data/endpoints.js";
import SnapshotRoutes from "../routes/snapshot/endpoints.js";
import GptRoutes from "../routes/gpt/endpoints.js";

const Routes = {
	//Concatentate the routes into one array
	//set the routes for the server
	init: async function (server: any) {
		let allRoutes = [].concat(
			GeneralRoutes.endpoints,
			AccountRoutes.endpoints,
			EngineRoutes.endpoints,
			DelegationRoutes.endpoints,
			FilesRoutes.endpoints,
			MenuRoutes.endpoints,
			ShareRoutes.endpoints,
			TryRoutes.endpoints,
			YanaRoutes.endpoints,
			SignatureRoutes.endpoints,
			DataRoutes.endpoints,
			SnapshotRoutes.endpoints,
			GptRoutes.endpoints,
		);
		await server.route(allRoutes);
	},
};

export default Routes;

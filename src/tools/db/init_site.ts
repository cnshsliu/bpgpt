import { Mongoose, dbConnect } from "../../database/mongodb.js";
import { Site, SiteType } from "../../database/models/Site.js";

dbConnect().then(async () => {
	console.log("Db connected");
	try {
		let aSite = Site.findOne({ siteid: "000" });
		if (!aSite) {
			let tmp = new Site({
				name: "HyperFlow",
				siteid: "000",
				owner: "liukehong@gmail.com",
				mode: "PUBLIC",
				password: "RANDOM",
				users: [],
				ksadmindomain: "@liuzijin.com",
				ksconfig: '{"senarios": ["AB"], "industires": ["CD"]}',
				ksenabled: true,
			});
			await tmp.save();
		}
	} catch (err) {
		console.log(err.message);
	} finally {
		await Mongoose.connection.close();
	}
});

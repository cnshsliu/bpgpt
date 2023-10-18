import { parentPort, workerData } from "worker_threads";
import Engine from "../Engine.js";
import { Mongoose, dbConnect } from "../../database/mongodb.js";
import { redisClient, redisConnect, redisDisconnect } from "../../database/redis.js";

const workerLog = (msg) => {
	parentPort.postMessage({ cmd: "worker_log", msg: msg });
};

dbConnect().then(() => {
	redisConnect().then(() => {
		Engine.yarkNode_internal(workerData).then(async (res) => {
			await redisDisconnect();
			await Mongoose.connection.close();
			parentPort.postMessage("YarkNodeWorker Worker Done.");
		});
	});
});

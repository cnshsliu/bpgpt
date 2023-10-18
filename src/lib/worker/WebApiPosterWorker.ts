import { parentPort, workerData } from "worker_threads";
import Https from "https";
import Http from "http";
import Wreck from "@hapi/wreck";

const msg = workerData;
const WreckPost = async (url, content) => {
  const wreck = Wreck.defaults({
    timeout: 5,
    headers: { "x-mtc-version": "1.0" },
    agents: {
      https: new Https.Agent({ maxSockets: 100 }),
      http: new Http.Agent({ maxSockets: 1000 }),
      httpsAllowUnauthorized: new Https.Agent({ maxSockets: 100, rejectUnauthorized: false }),
    },
  });
  //const readableStream = Wreck.toReadableStream("foo=bar");
  const options = {
    baseUrl: "https://www.example.com",
    //payload: readableStream || "foo=bar" || Buffer.from("foo=bar"),
    payload: content,
    headers: {
      /* http headers */
      "Content-Type": "application/json",
    },
    redirects: 3,
    beforeRedirect: (redirectMethod, statusCode, location, resHeaders, redirectOptions, next) =>
      next(),
    redirected: function (statusCode, location, req) {},
    timeout: 1000, // 1 second, default: unlimited
    maxBytes: 1048576 * 5, // 5 MB, default: unlimited
    rejectUnauthorized: true || false,
    agent: null, // Node Core http.Agent
    //secureProtocol: "SSLv3_method", // The SSL method to use
    //secureProtocol: "SSLv3_client_method", // The SSL method to use
    //secureProtocol: "SSLv2_client_method",
    //secureProtocol: "SSLv2_method",
    //ciphers: "DES-CBC3-SHA", // The TLS ciphers to support
  };
  /* const promise = wreck.request("POST", url, options);
  try {
    const res = await promise;
    const body = await Wreck.read(res, options);
    console.log(body.toString());
  } catch (err) {
    // Handle errors
  } */
  return wreck.request("POST", url, options).then((res) => {
    return Wreck.read(res, options).then((body) => {});
  });
};

if (msg.url && msg.data) {
  WreckPost(msg.url, msg.data).then((res) => {
    parentPort.postMessage("WebAPI POSTer Worker Done.");
  });
} else {
  throw new Error("Msg passed to WebApiPosterWorker must have url and data");
}

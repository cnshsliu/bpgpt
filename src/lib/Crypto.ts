"use strict";
import ServerConfig from "../config/server.js";
import crypto from "crypto";
const algorithm = "aes-256-ctr";
const privateKey = ServerConfig.crypto.privateKey;
const ENCRYPTION_KEY = Buffer.from(privateKey, "base64");
const IV_LENGTH = 16;

const Crypto = {
	decrypt: (text) => {
		let textParts = text.split(":");
		let iv = Buffer.from(textParts.shift(), "hex");
		let encryptedText = Buffer.from(textParts.join(":"), "hex");
		let decipher = crypto.createDecipheriv(
			algorithm,
			Buffer.from(ENCRYPTION_KEY as any, "hex"),
			iv,
		);
		let decrypted = decipher.update(encryptedText);
		decrypted = Buffer.concat([decrypted, decipher.final()]);
		return decrypted.toString();
	},

	encrypt: (text) => {
		let iv = crypto.randomBytes(IV_LENGTH);
		let cipher = crypto.createCipheriv(algorithm, Buffer.from(ENCRYPTION_KEY as any, "hex"), iv);
		let encrypted = cipher.update(text);
		encrypted = Buffer.concat([encrypted, cipher.final()]);
		return iv.toString("hex") + ":" + encrypted.toString("hex");
	},
};

export default Crypto;

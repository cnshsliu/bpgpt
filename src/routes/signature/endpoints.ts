import Joi from "joi";
import Handlers from "./handlers.js";

const internals = {
  endpoints: [
    {
      method: "POST",
      path: "/signature/save",
      handler: Handlers.SaveSignature,
      config: {
        auth: "token",
        description: "Save user signature",
        tags: ["api"],
        validate: {
          payload: {
            signature: Joi.string().required(),
            objid: Joi.string().required()
          },
          validator: Joi,
        },
      },
    },
    {
      method: "POST",
      path: "/signature/load",
      handler: Handlers.LoadSignature,
      config: {
        auth: "token",
        description: "Load user signature",
        tags: ["api"],
        validate: {
          payload: {
            objid: Joi.string().required()
          },
          validator: Joi,
        },
      },
    },
  ],
};

export default internals;

import { ZohoConnection } from "../models/zohoConnectionModel.js";
import { getValidZohoToken } from "../services/zohoTokenService.js";
import { ZohoClient } from "../services/zohoClient.js";
export const zohoMiddleware = async (req, res, next) => {
  try {
    // organizationId came from orgMiddleware
    const organizationId = req.organizationId;

    if (!organizationId) {
      return res.status(500).json({ message: "Organization context missing" });
    }

    // find zoho connection for this company
    const connection = await ZohoConnection.findOne({ organizationId });

    if (!connection) {
      return res.status(400).json({
        message: "Zoho not connected for this organization",
        code: "ZOHO_NOT_CONNECTED",
      });
    }

    if (connection.status !== "connected") {
      return res.status(400).json({
        message: "Zoho connection inactive",
        code: "ZOHO_CONNECTION_INACTIVE",
      });
    }

    // get valid token (auto refresh if expired)
    const accessToken = await getValidZohoToken(connection);

    // attach to request
    req.zoho = new ZohoClient({
      accessToken,
      organizationId: connection.zohoOrgId,
    });
    //connectionId: connection._id - this was used earlier to fetch token in service layer, but now we are directly fetching new token here, so no need to pass connectionId

    next();

  } catch (err) {
    console.error("Zoho middleware error:", err.message);

    return res.status(500).json({
      message: "Zoho authentication failed",
      code: "ZOHO_AUTH_FAILED",
    });
  }
};

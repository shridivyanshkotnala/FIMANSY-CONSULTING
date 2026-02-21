import jwt from "jsonwebtoken";

export const createZohoState = (userId, organizationId) => {
  return jwt.sign(
    { userId, organizationId, type: "zoho_oauth" },
    process.env.ZOHO_STATE_SECRET,
    { expiresIn: "10m" }
  );
};

export const verifyZohoState = (state) => {
  return jwt.verify(state, process.env.ZOHO_STATE_SECRET);
};

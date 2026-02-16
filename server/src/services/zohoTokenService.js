import { ZohoConnection } from "../models/zohoConnection.js";



export const getValidZohoToken = async (userId) => {
  const connection = await ZohoConnection.findOne({ userId });

  if (!connection) throw new Error("Zoho not connected");

  // still valid
  if (connection.tokenExpiry > new Date()) {
    return connection.accessToken;
  }

  // refresh token
  const url = new URL(`${process.env.ZOHO_ACCOUNTS_URL}/oauth/v2/token`);

  url.searchParams.set("grant_type", "refresh_token");
  url.searchParams.set("client_id", process.env.ZOHO_CLIENT_ID);
  url.searchParams.set("client_secret", process.env.ZOHO_CLIENT_SECRET);
  url.searchParams.set("refresh_token", connection.refreshToken);

  const res = await fetch(url, { method: "POST" });
  const data = await res.json();

  if (!res.ok) throw new Error("Zoho refresh failed");

  connection.accessToken = data.access_token;
  connection.tokenExpiry = new Date(Date.now() + data.expires_in * 1000);

  await connection.save();

  return connection.accessToken;
};

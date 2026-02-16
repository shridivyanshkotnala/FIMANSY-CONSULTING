import { asynchandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ZohoConnection } from "../models/zohoConnection.js";


const connectZoho = asynchandler(async (req, res) => {
  const scope = encodeURIComponent("ZohoBooks.fullaccess.all offline_access");
  const redirect = encodeURIComponent(process.env.ZOHO_CALLBACK_URL);
  
  const url =
    `${process.env.ZOHO_ACCOUNTS_URL}/oauth/v2/auth` +
    `?scope=${scope}` +
    `&client_id=${process.env.ZOHO_CLIENT_ID}` +
    `&response_type=code` +
    `&access_type=offline` +
    `&redirect_uri=${redirect}` +
    `&state=${req.user._id}`;

  res.redirect(url);
})



const zohoResponse = asynchandler(async (req, res) => {
  const text = await res.text();

  const data = JSON.parse(text);

  if (!res.ok) {
    throw new ApiError(res.status, data.error.message || "Zoho authentication failed");
  }

  return new ApiResponse(200, "Zoho authentication successful", data);
})




const zohoCallback = asynchandler(async (req, res) => {

  const { code, state } = req.query;

  if (!code || !state) {
    throw new ApiError(400, "Invalid Zoho authorization");
  }

  // exchange code
  const tokenURL = new URL(`${process.env.ZOHO_ACCOUNTS_URL}/oauth/v2/token`);

  tokenURL.searchParams.set("grant_type", "authorization_code");
  tokenURL.searchParams.set("client_id", process.env.ZOHO_CLIENT_ID);
  tokenURL.searchParams.set("client_secret", process.env.ZOHO_CLIENT_SECRET);
  tokenURL.searchParams.set("redirect_uri", process.env.ZOHO_CALLBACK_URL);
  tokenURL.searchParams.set("code", code);

  const tokenRes = await fetch(tokenURL, { method: "POST" });
  const tokenData = await tokenRes.json();
  if (!tokenRes.ok) {
  throw new ApiError(400, "Zoho token exchange failed");
}

  const { access_token, refresh_token, expires_in } = tokenData;

  // get org
  const orgRes = await fetch("https://www.zohoapis.in/books/v3/organizations", {
    headers: { Authorization: `Zoho-oauthtoken ${access_token}` }
  });

  const orgData = await orgRes.json();
  const orgId = orgData.organizations?.[0]?.organization_id;

  await ZohoConnection.findOneAndUpdate(
    { userId: state },
    {
      userId: state,
      zohoOrgId: orgId,
      accessToken: access_token,
      refreshToken: refresh_token,
      tokenExpiry: new Date(Date.now() + expires_in * 1000),
      status: "connected",
    },
    { upsert: true }
  );

  // redirect back to frontend
  return res.redirect(`${process.env.CLIENT_URL}/dashboard?zoho=connected`);
});



const getZohoStatus = asynchandler(async (req, res) => {
  const connection = await ZohoConnection.findOne({ userId: req.user._id }).lean();
  
  if (!connection) {
    return res.json({
      connected: false,
      organizationId: null,
      expiresAt: null,
      provider: "zoho",
    });
  }

  return res.json({
    connected: true,
    organizationId: connection.zohoOrgId,
    expiresAt: connection.tokenExpiry,
    provider: "zoho",
  });
});




export { connectZoho, zohoResponse, zohoCallback, getZohoStatus };
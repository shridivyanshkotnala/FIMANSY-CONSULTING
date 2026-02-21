import { asynchandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ZohoConnection } from "../models/zohoConnectionModel.js";
import { createZohoState } from "../utils/zohoState.js";
import { verifyZohoState } from "../utils/zohoState.js";
import { initializeSyncJobs } from "../services/syncJobInitializer.js";


const connectZoho = asynchandler(async (req, res) => {

  // Determine organization context. Prefer middleware-set value, fall back to query param.
  const organizationId = req.organizationId || req.query.org;

  if (!organizationId) {
    throw new ApiError(400, "Organization context missing");
  }
  //req.organizationId is set by orgMiddleware, so this route must be protected by both auth and org middleware. This ensures req.organizationId is always available and valid, so we can safely use it to create the Zoho state and initiate the OAuth flow.
  const state = createZohoState(req.user._id, organizationId);

  const scope = encodeURIComponent("ZohoBooks.fullaccess.all offline_access");
  const redirect = encodeURIComponent(process.env.ZOHO_CALLBACK_URL);

  const url =
    `${process.env.ZOHO_ACCOUNTS_URL}/oauth/v2/auth` +
    `?scope=${scope}` +
    `&client_id=${process.env.ZOHO_CLIENT_ID}` +
    `&response_type=code` +
    `&access_type=offline` +
    `&redirect_uri=${redirect}` +
    `&state=${state}`;

  res.redirect(url);
});




const zohoCallback = asynchandler(async (req, res) => {

  const { code, state } = req.query;
  if (!code || !state) throw new ApiError(400, "Invalid Zoho authorization");

  // 🔐 verify signed state
  let payload;
  try {
    payload = verifyZohoState(state);
  } catch {
    throw new ApiError(400, "Invalid or expired OAuth state");
  }

  const { organizationId } = payload;

  // Step 1 — exchange code for tokens
  const tokenURL = new URL(`${process.env.ZOHO_ACCOUNTS_URL}/oauth/v2/token`);

  tokenURL.searchParams.set("grant_type", "authorization_code");
  tokenURL.searchParams.set("client_id", process.env.ZOHO_CLIENT_ID);
  tokenURL.searchParams.set("client_secret", process.env.ZOHO_CLIENT_SECRET);
  tokenURL.searchParams.set("redirect_uri", process.env.ZOHO_CALLBACK_URL);
  tokenURL.searchParams.set("code", code);

  const tokenRes = await fetch(tokenURL, { method: "POST" });
  const tokenData = await tokenRes.json();

  if (!tokenRes.ok) throw new ApiError(400, "Zoho token exchange failed");

  const { access_token, refresh_token, expires_in } = tokenData;

  // Step 2 — fetch Zoho organization
  const orgRes = await fetch("https://www.zohoapis.in/books/v3/organizations", {
    headers: { Authorization: `Zoho-oauthtoken ${access_token}` }
  });

  const orgData = await orgRes.json();
  // const zohoOrgId = orgData.organizations?.[0]?.organization_id;


  const defaultOrg = orgData.organizations?.find(o => o.is_default_org);

  if (!defaultOrg) {
    throw new ApiError(400, "No default Zoho organization found");
  }

  const zohoOrgId = defaultOrg.organization_id;

  console.log(JSON.stringify(orgData, null, 2));
  if (!zohoOrgId) throw new ApiError(400, "Zoho organization not found");

  // Step 3 — save connection AT ORGANIZATION LEVEL
  const connection = await ZohoConnection.findOneAndUpdate(
    { organizationId },
    {
      organizationId,
      zohoOrgId,
      accessToken: access_token,
      refreshToken: refresh_token,
      tokenExpiry: new Date(Date.now() + expires_in * 1000),
      status: "connected",
    },
    { upsert: true, new: true }
  );

  if (!connection) throw new ApiError(500, "Failed to save Zoho connection");

  // Step 4 - initialize sync jobs for this connection

  const syncedJobs = await initializeSyncJobs(connection);

  if (!syncedJobs) {
    throw new ApiError(500, "Failed to initialize sync jobs for Zoho connection");
  }


  /*
What Now Happens In System (Very Important)

User clicks connect →

OAuth success →

Connection stored →

Two jobs created →

Scheduler (later) will automatically start pulling data

User doesn’t need to open dashboard.

This is how real SaaS integrations behave.
  */

  return res.redirect(`${process.env.CLIENT_URL}/dashboard?zoho=connected`);
});




const getZohoStatus = asynchandler(async (req, res) => {
  const connection = await ZohoConnection
    .findOne({ organizationId: req.organizationId })
    .lean();

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




export { connectZoho, zohoCallback, getZohoStatus };
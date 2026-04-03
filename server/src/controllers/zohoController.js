import { asynchandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ZohoConnection } from "../models/zohoConnectionModel.js";
import { ZohoOauthSession } from "../models/zohoOauthSessionModel.js";
import { createZohoState } from "../utils/zohoState.js";
import { verifyZohoState } from "../utils/zohoState.js";
import { initializeSyncJobs } from "../services/syncJobInitializer.js";

const connectZohoOrganization = async ({
  organizationId,
  zohoOrgId,
  accessToken,
  refreshToken,
  expiresIn,
}) => {
  const connection = await ZohoConnection.findOneAndUpdate(
    { organizationId },
    {
      organizationId,
      zohoOrgId,
      accessToken,
      refreshToken,
      tokenExpiry: new Date(Date.now() + Number(expiresIn || 0) * 1000),
      status: "connected",
    },
    { upsert: true, returnDocument: "after" }
  );

  if (!connection) throw new ApiError(500, "Failed to save Zoho connection");

  const syncedJobs = await initializeSyncJobs(connection);
  if (!syncedJobs) {
    throw new ApiError(500, "Failed to initialize sync jobs for Zoho connection");
  }

  return connection;
};


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

  if (req.query?.returnUrl === "1") {
    return res.status(200).json({ url });
  }

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

  const { userId, organizationId } = payload;

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
  if (!access_token || !refresh_token) {
    throw new ApiError(400, "Zoho token exchange returned incomplete tokens");
  }

  // Step 2 — fetch Zoho organization
  const orgRes = await fetch("https://www.zohoapis.in/books/v3/organizations", {
    headers: { Authorization: `Zoho-oauthtoken ${access_token}` }
  });

  const orgData = await orgRes.json();
  const organizations = Array.isArray(orgData?.organizations)
    ? orgData.organizations
        .map((o) => ({
          organization_id: o?.organization_id,
          name: o?.name || null,
          is_default_org: Boolean(o?.is_default_org),
        }))
        .filter((o) => o.organization_id)
    : [];

  if (!organizations.length) {
    throw new ApiError(400, "No Zoho Books organizations found for this account");
  }

  const defaultOrg = organizations.find((o) => o.is_default_org) || organizations[0];

  if (organizations.length === 1) {
    await connectZohoOrganization({
      organizationId,
      zohoOrgId: defaultOrg.organization_id,
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresIn: expires_in,
    });

    return res.redirect(`${process.env.CLIENT_URL}/oauth/zoho/success?zoho=connected`);
  }

  const pendingSession = await ZohoOauthSession.create({
    userId,
    organizationId,
    accessToken: access_token,
    refreshToken: refresh_token,
    tokenExpiry: new Date(Date.now() + Number(expires_in || 0) * 1000),
    organizations,
    consumed: false,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });

  return res.redirect(
    `${process.env.CLIENT_URL}/oauth/zoho/success?zoho=select_org&session=${encodeURIComponent(
      String(pendingSession._id)
    )}`
  );


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



  const getZohoOauthOrganizations = asynchandler(async (req, res) => {
    const { sessionId } = req.params;
    if (!sessionId) throw new ApiError(400, "sessionId is required");

    const session = await ZohoOauthSession.findById(sessionId).lean();
    if (!session || session.consumed) {
      throw new ApiError(404, "OAuth session not found or already used");
    }

    if (String(session.userId) !== String(req.user?._id)) {
      throw new ApiError(403, "Not allowed to access this OAuth session");
    }

    if (new Date(session.expiresAt).getTime() <= Date.now()) {
      throw new ApiError(410, "OAuth session expired. Please reconnect Zoho");
    }

    return res.status(200).json(
      new ApiResponse(200, {
        sessionId: String(session._id),
        organizations: session.organizations,
      }, "Zoho organizations fetched")
    );
  });


  const selectZohoOrganization = asynchandler(async (req, res) => {
    const { sessionId, zohoOrgId } = req.body || {};

    if (!sessionId || !zohoOrgId) {
      throw new ApiError(400, "sessionId and zohoOrgId are required");
    }

    const session = await ZohoOauthSession.findById(sessionId);
    if (!session || session.consumed) {
      throw new ApiError(404, "OAuth session not found or already used");
    }

    if (String(session.userId) !== String(req.user?._id)) {
      throw new ApiError(403, "Not allowed to use this OAuth session");
    }

    if (new Date(session.expiresAt).getTime() <= Date.now()) {
      throw new ApiError(410, "OAuth session expired. Please reconnect Zoho");
    }

    const match = session.organizations.find((org) => String(org.organization_id) === String(zohoOrgId));
    if (!match) {
      throw new ApiError(400, "Selected Zoho organization is invalid");
    }

    await connectZohoOrganization({
      organizationId: session.organizationId,
      zohoOrgId: match.organization_id,
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      expiresIn: Math.max(1, Math.floor((new Date(session.tokenExpiry).getTime() - Date.now()) / 1000)),
    });

    session.consumed = true;
    await session.save();

    return res.status(200).json(new ApiResponse(200, { connected: true }, "Zoho connected"));
  });


export { connectZoho, zohoCallback, getZohoStatus, getZohoOauthOrganizations, selectZohoOrganization };
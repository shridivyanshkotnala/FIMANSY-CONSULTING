export const getValidZohoToken = async (connection) => {

  if (connection.tokenExpiry > new Date()) {
    return connection.accessToken;
  }

  const url = new URL(`${process.env.ZOHO_ACCOUNTS_URL}/oauth/v2/token`);

  url.searchParams.set("grant_type", "refresh_token");
  url.searchParams.set("client_id", process.env.ZOHO_CLIENT_ID);
  url.searchParams.set("client_secret", process.env.ZOHO_CLIENT_SECRET);
  url.searchParams.set("refresh_token", connection.refreshToken);

  const res = await fetch(url, { method: "POST" });
  const raw = await res.text();

  let data = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = null;
  }

  if (!res.ok) {
    const message = data?.error || data?.message || raw || "Zoho refresh failed";
    throw new Error(`Zoho refresh failed (${res.status}): ${String(message).slice(0, 300)}`);
  }

  if (!data?.access_token || !data?.expires_in) {
    throw new Error("Zoho refresh response missing token fields");
  }

  connection.accessToken = data.access_token;
  connection.tokenExpiry = new Date(Date.now() + data.expires_in * 1000);

  await connection.save();

  return connection.accessToken;
};

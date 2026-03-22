import { useCallback } from "react";
import { uploadFileToSignedUrl } from "@/lib/r2Upload";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

const getToken = () => {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("accessToken");
};

const getOrgId = () => {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("activeOrgId");
};

function buildHeaders({ isJson = true, includeOrg = true } = {}) {
  const headers = {};
  if (isJson) headers["Content-Type"] = "application/json";

  const token = getToken();
  const orgId = getOrgId();

  if (token) headers.authorization = `Bearer ${token}`;
  if (includeOrg && orgId) headers["x-organization-id"] = orgId;

  return headers;
}

async function request(path, { method = "GET", body, includeOrg = true, unwrapData = true } = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: "include",
    headers: buildHeaders({ includeOrg, isJson: body !== undefined }),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.message || `Request failed (${response.status})`);
  }

  return unwrapData ? (payload?.data ?? payload) : payload;
}

export function useQueryHub({ isAccountant = false } = {}) {
  const statsPath = isAccountant ? "/accountant/queries/stats" : "/query-hub/stats";
  const listPath = isAccountant ? "/accountant/queries" : "/query-hub/tickets";
  const ticketPath = (ticketId) => (isAccountant ? `/accountant/queries/${ticketId}` : `/query-hub/tickets/${ticketId}`);

  const getStats = useCallback(() => {
    return request(statsPath, { includeOrg: !isAccountant });
  }, [statsPath, isAccountant]);

  const getTickets = useCallback(({ status = "open", page = 1, limit = 8 } = {}) => {
    return request(`${listPath}?status=${status}&page=${page}&limit=${limit}`, {
      includeOrg: !isAccountant,
      unwrapData: false,
    });
  }, [listPath, isAccountant]);

  const createTicket = useCallback(async ({ message, file }) => {
    const ticket = await request(listPath, {
      method: "POST",
      includeOrg: !isAccountant,
      body: { message },
    });

    if (file && ticket?._id) {
      const signed = await request(`${ticketPath(ticket._id)}/documents/init-upload`, {
        method: "POST",
        includeOrg: !isAccountant,
        body: {
          fileName: file.name,
          contentType: file.type || "application/octet-stream",
          fileSize: file.size || 0,
        },
      });

      await uploadFileToSignedUrl(file, signed.uploadUrl);

      await request(`${ticketPath(ticket._id)}/documents/complete-upload`, {
        method: "POST",
        includeOrg: !isAccountant,
        body: {
          key: signed.key,
          fileName: file.name,
          contentType: file.type || "application/octet-stream",
          fileSize: file.size || 0,
          message: `Supporting document uploaded: ${file.name}`,
        },
      });
    }

    return ticket;
  }, [listPath, ticketPath, isAccountant]);

  const getTicketDetail = useCallback((ticketId) => {
    return request(ticketPath(ticketId), { includeOrg: !isAccountant });
  }, [ticketPath, isAccountant]);

  const getComments = useCallback((ticketId) => {
    return request(`${ticketPath(ticketId)}/comments`, { includeOrg: !isAccountant });
  }, [ticketPath, isAccountant]);

  const addComment = useCallback((ticketId, message) => {
    return request(`${ticketPath(ticketId)}/comments`, {
      method: "POST",
      includeOrg: !isAccountant,
      body: { message },
    });
  }, [ticketPath, isAccountant]);

  const getDocuments = useCallback((ticketId) => {
    return request(`${ticketPath(ticketId)}/documents`, { includeOrg: !isAccountant });
  }, [ticketPath, isAccountant]);

  const uploadDocument = useCallback(async (ticketId, file, message) => {
    const signed = await request(`${ticketPath(ticketId)}/documents/init-upload`, {
      method: "POST",
      includeOrg: !isAccountant,
      body: {
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
        fileSize: file.size || 0,
      },
    });

    await uploadFileToSignedUrl(file, signed.uploadUrl);

    return request(`${ticketPath(ticketId)}/documents/complete-upload`, {
      method: "POST",
      includeOrg: !isAccountant,
      body: {
        key: signed.key,
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
        fileSize: file.size || 0,
        message,
      },
    });
  }, [ticketPath, isAccountant]);

  const updateStatus = useCallback((ticketId, status) => {
    if (!isAccountant) throw new Error("Only accountant can update status");
    return request(`${ticketPath(ticketId)}/status`, {
      method: "PATCH",
      includeOrg: false,
      body: { status },
    });
  }, [ticketPath, isAccountant]);

  const getOrganizationCompany = useCallback((organizationId) => {
    if (!isAccountant) throw new Error("Only accountant can fetch organization company profile");
    return request(`/accountant/organizations/${organizationId}/company`, {
      includeOrg: false,
      unwrapData: true,
    });
  }, [isAccountant]);

  return {
    getStats,
    getTickets,
    createTicket,
    getTicketDetail,
    getComments,
    addComment,
    getDocuments,
    uploadDocument,
    updateStatus,
    getOrganizationCompany,
  };
}

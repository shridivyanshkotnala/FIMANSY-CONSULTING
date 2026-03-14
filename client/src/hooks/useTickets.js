import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8800/api";

/*
=====================================
Reusable API Fetch
=====================================
*/
async function apiFetch(endpoint, options = {}) {
  try {
    const method = (options.method || "GET").toUpperCase();
    const shouldSendJsonHeader = method !== "GET" && method !== "HEAD";

    const res = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        ...(shouldSendJsonHeader ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {}),
      },
      credentials: "include",
      ...options,
    });

    const text = await res.text();
    let data = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (!res.ok) {
      console.error("API ERROR:", res.status, data);
      throw new Error(data?.message || `API ${res.status}`);
    }

    return { data, error: null };
  } catch (err) {
    console.warn(`[useTickets] API call failed: ${endpoint}`, err.message);
    return { data: null, error: err };
  }
}

export function useTickets() {
  const { organization } = useAuth();

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /*
  =====================================
  Fetch All Tickets
  =====================================
  */
  const fetchTickets = async () => {
    if (!organization?.id) return;

    setLoading(true);
    setError(null);

    const { data, error } = await apiFetch(
      `/compliance/tickets?organization_id=${organization.id}`
    );

    if (!error) {
      setTickets(Array.isArray(data) ? data : data?.data || []);
    } else {
      setError(error);
    }

    setLoading(false);
  };

  /*
  =====================================
  Get Single Ticket
  =====================================
  */
  const getTicket = async (id) => {
    return await apiFetch(`/compliance/tickets/${id}`);
  };

  /*
  =====================================
  Create Ticket
  =====================================
  */
  const createTicket = async (payload) => {
    const insertData = {
      obligation_id: payload.obligation_id,
      comment: payload.comment || "",
      attachments: payload.attachments || [],
    };

    const { data, error } = await apiFetch("/compliance/tickets", {
      method: "POST",
      body: JSON.stringify(insertData),
    });

    if (!error) {
      await fetchTickets();
    }

    return { data, error };
  };

  /*
  =====================================
  Update Ticket Status
  =====================================
  */
  const updateTicketStatus = async (id, payload) => {
    const { data, error } = await apiFetch(
      `/compliance/tickets/${id}/status`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      }
    );

    if (!error) {
      await fetchTickets();
    }

    return { data, error };
  };

  /*
  =====================================
  Get Ticket Comments
  =====================================
  */
  const getTicketComments = async (ticketId) => {
    const { data, error } = await apiFetch(
      `/compliance/tickets/${ticketId}/comments`
    );

    return {
      data: Array.isArray(data) ? data : data?.data || [],
      error,
    };
  };

  /*
  =====================================
  Add Ticket Comment
  =====================================
  */
  const addTicketComment = async (ticketId, payload) => {
    const insertData = {
      message: payload.message,
      attachments: payload.attachments || [],
    };

    return await apiFetch(`/compliance/tickets/${ticketId}/comments`, {
      method: "POST",
      body: JSON.stringify(insertData),
    });
  };

  /*
  =====================================
  Load Tickets
  =====================================
  */
  useEffect(() => {
    fetchTickets();
  }, [organization?.id]);

  return {
    tickets,
    loading,
    error,
    refetchTickets: fetchTickets,
    getTicket,
    createTicket,
    updateTicketStatus,
    getTicketComments,
    addTicketComment,
  };
}
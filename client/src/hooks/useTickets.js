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
    const res = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
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
      console.error("❌ API ERROR:", res.status, data);
      throw new Error(data?.message || `API ${res.status}`);
    }

    return { data, error: null };
  } catch (err) {
    console.warn(`⚠️ [useTickets] API call failed: ${endpoint}`, err.message);
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
  Helper: Headers
  =====================================
  */
  const getHeaders = () => {
    const headers = {
      "Content-Type": "application/json",
    };

    if (organization?.id) {
      headers["x-organization-id"] = organization.id;
    }

    return headers;
  };

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
      `/compliance/tickets?organization_id=${organization.id}`,
      { headers: getHeaders() }
    );

    if (!error) {
      const extracted = Array.isArray(data) ? data : data?.data || [];
      setTickets(extracted);
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
    return await apiFetch(`/compliance/tickets/${id}`, {
      headers: getHeaders(),
    });
  };

  /*
  =====================================
  Create Ticket (Normal)
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
      headers: getHeaders(),
      body: JSON.stringify(insertData),
    });

    if (!error) {
      await fetchTickets();
    }

    return { data, error };
  };

  /*
  =====================================
  Create Conditional Ticket
  =====================================
  */
  const createConditionalTicket = async (payload) => {
  const insertData = {
    template_id: payload.template_id,
    comment: payload.comment || "",
    attachments: payload.attachments || [],
  };

  console.log("🔵 Creating conditional ticket:", insertData);

  const { data, error } = await apiFetch(
    "/compliance/conditional/ticket",
    {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(insertData),
    }
  );

  if (!error) {
    // 🎯 Return the ticket data directly, not just fetch tickets
    console.log("✅ Ticket created successfully:", data);
    
    // Try to extract the ticket from different response formats
    let ticketData = null;
    
    if (data && data._id) {
      ticketData = data; // Direct ticket
    } else if (data && data.data && data.data._id) {
      ticketData = data.data; // Nested in data.data
    } else if (data && data.ticket && data.ticket._id) {
      ticketData = data.ticket; // Nested in data.ticket
    }
    
    // Refresh tickets in background
    fetchTickets();
    
    return { data: ticketData, error: null };
  } else {
    console.error("🔴 Error creating conditional ticket:", error);
    return { data: null, error };
  }
};

  /*
  =====================================
  ✅ UPDATE TICKET STATUS (FIXED)
  =====================================
  */
  const updateTicketStatus = async (id, payload) => {
    const { data, error } = await apiFetch(
      `/compliance/tickets/${id}/status`,
      {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify(payload),
      }
    );

    // 🔍 FULL DEBUG
    console.log("🔍 RAW API Response:", JSON.stringify(data, null, 2));
    console.log("🔍 updateTicketStatus raw:", { data, error });

    if (error || !data) {
      return { data: null, error };
    }

    let ticket = null;

    // ✅ Case 1: { success: true, data: ticket }
    if (data.data) {
      if (data.data._id || data.data.id) {
        ticket = data.data;
      } else if (data.data.ticket) {
        ticket = data.data.ticket;
      }
    }

    // ✅ Case 2: ticket directly returned
    if (!ticket && (data._id || data.id)) {
      ticket = data;
    }

    // ❌ Fallback
    if (!ticket) {
      console.warn("⚠️ Could not extract ticket from response");
      return { data, error };
    }

    // 🔥 IMPORTANT DEBUG FOR YOUR ISSUE
    console.log("🧠 Final extracted ticket:", ticket);
    console.log("📜 status_history:", ticket.status_history);

    return { data: ticket, error };
  };

  /*
  =====================================
  Get Ticket Comments
  =====================================
  */
  const getTicketComments = async (ticketId) => {
  console.log("🔍 Fetching comments for ticket:", ticketId);
  
  const { data, error } = await apiFetch(
    `/compliance/tickets/${ticketId}/comments?_=${Date.now()}`,
    { headers: getHeaders() }
  );

  console.log("📦 Raw API response:", data);
  console.log("❌ Error:", error);

  let comments = [];

  if (data) {
    // Case 1: Direct array
    if (Array.isArray(data)) {
      comments = data;
      console.log("✅ Case 1: Direct array with", comments.length, "comments");
    }
    // Case 2: { success: true, data: [...] }
    else if (data.data && Array.isArray(data.data)) {
      comments = data.data;
      console.log("✅ Case 2: data.data array with", comments.length, "comments");
    }
    // Case 3: Something else
    else {
      console.log("⚠️ Unexpected response format:", data);
    }
  }

  console.log("🎯 Final comments array:", comments);
  
  return { data: comments, error };
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
      headers: getHeaders(),
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
    createConditionalTicket,
    updateTicketStatus, // ✅ FIXED
    getTicketComments,
    addTicketComment,
  };
}
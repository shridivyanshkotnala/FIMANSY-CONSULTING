import { useState, useEffect } from 'react';

// ⚠️ CONTEXT API SHIM — MARKED FOR REMOVAL
// 🔄 FUTURE: Replace this entire hook with Redux RTK Query endpoints
import { useAuth } from '@/hooks/useAuth';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8800/api';

/**
 * useCompliance Hook
 * --------------------------------------------------
 * Central data access layer for compliance module.
 */

async function apiFetch(endpoint, options = {}) {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      credentials: 'include',
      ...options,
    });

    if (endpoint.includes('/profile') && res.status === 404) {
      return { data: null, error: null };
    }

    if (!res.ok) throw new Error(`API ${res.status}`);
    return { data: await res.json(), error: null };
  } catch (err) {
    console.warn(`[useCompliance] API call failed: ${endpoint}`, err.message);
    return { data: null, error: err };
  }
}

export function useCompliance() {
  const { organization } = useAuth();

  const [complianceProfile, setComplianceProfile] = useState(null);
  const [directors, setDirectors] = useState([]);
  const [obligations, setObligations] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /* ============================================================
     FETCH ALL DATA
  ============================================================ */
  const fetchAll = async () => {
    if (!organization?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [profileRes, dirsRes, obsRes, evtsRes] = await Promise.all([
        apiFetch(`/compliance/profile?organization_id=${organization.id}`),
        apiFetch(`/compliance/directors?organization_id=${organization.id}`),
        apiFetch(`/compliance/obligations?organization_id=${organization.id}`),
        apiFetch(`/compliance/events?organization_id=${organization.id}`),
      ]);

      // Handle profile response
      if (profileRes.data?.data) {
        setComplianceProfile(profileRes.data.data);
      } else if (profileRes.data) {
        setComplianceProfile(profileRes.data);
      }

      // Handle directors response
      if (dirsRes.data) {
        setDirectors(Array.isArray(dirsRes.data) ? dirsRes.data : dirsRes.data?.data || []);
      }

      // Handle obligations response - using new field names
      if (obsRes.data) {
        const obligationsData = Array.isArray(obsRes.data) ? obsRes.data : obsRes.data?.data || [];
        setObligations(obligationsData);
      }

      // Handle events response
      if (evtsRes.data) {
        setEvents(Array.isArray(evtsRes.data) ? evtsRes.data : evtsRes.data?.data || []);
      }

      // Handle directors response
      if (dirsRes.data) {
        setDirectors(Array.isArray(dirsRes.data) ? dirsRes.data : dirsRes.data?.data || []);
      }

      // Handle obligations response
      if (obsRes.data) {
        setObligations(Array.isArray(obsRes.data) ? obsRes.data : obsRes.data?.data || []);
      }

      // Handle events response
      if (evtsRes.data) {
        setEvents(Array.isArray(evtsRes.data) ? evtsRes.data : evtsRes.data?.data || []);
      }

      if (dirsRes.data)
        setDirectors(Array.isArray(dirsRes.data) ? dirsRes.data : dirsRes.data?.data || []);

      if (obsRes.data)
        setObligations(Array.isArray(obsRes.data) ? obsRes.data : obsRes.data?.data || []);

      if (evtsRes.data)
        setEvents(Array.isArray(evtsRes.data) ? evtsRes.data : evtsRes.data?.data || []);
    } catch (err) {
      setError('Failed to fetch compliance data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [organization?.id]);

  /* ============================================================
     PROFILE UPSERT
  ============================================================ */
  const saveComplianceProfile = async (data) => {
    if (!organization?.id) return { error: new Error('No organization') };

    const profileData = { ...data, organization_id: organization.id };
    
    const method = complianceProfile?._id ? 'PATCH' : 'POST';
    const url = complianceProfile?._id
      ? `/compliance/profile/${complianceProfile._id}`
      : '/compliance/profile';

    console.log(`📡 Saving profile with ${method} to ${url}`);
    console.log('📦 Profile data:', profileData);

    const { error } = await apiFetch(url, {
      method,
      body: JSON.stringify(profileData),
    });

    if (!error) {
      console.log('✅ Profile saved successfully, refetching...');
      await fetchAll();
    }
    
    return { error };
  };

  /* ============================================================
     DIRECTORS
  ============================================================ */
  const addDirector = async (data) => {
    if (!organization?.id) return { error: new Error('No organization') };

    const insertData = {
      din: data.din || '',
      name: data.name || '',
      designation: data.designation,
      date_of_appointment: data.date_of_appointment,
      date_of_cessation: data.date_of_cessation,
      dsc_expiry_date: data.dsc_expiry_date,
      dsc_holder_name: data.dsc_holder_name,
      email: data.email,
      phone: data.phone,
      is_active: data.is_active ?? true,
      organization_id: organization.id,
    };

    const { error } = await apiFetch('/compliance/directors', {
      method: 'POST',
      body: JSON.stringify(insertData),
    });
    if (!error) await fetchAll();
    return { error };
  };

  const updateDirector = async (id, data) => {
    const { error } = await apiFetch(`/compliance/directors/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    if (!error) await fetchAll();
    return { error };
  };

  const deleteDirector = async (id) => {
    const { error } = await apiFetch(`/compliance/directors/${id}`, {
      method: 'DELETE',
    });
    if (!error) await fetchAll();
    return { error };
  };

  /* ============================================================
     COMPLIANCE OBLIGATIONS - UPDATED WITH NEW FIELD NAMES
  ============================================================ */
  const createObligation = async (data) => {
    if (!organization?.id) return { error: new Error('No organization') };

    // Updated to match new schema field names
    const insertData = {
      // New field names
      compliance_category: data.compliance_category || data.compliance_type,
      compliance_subtype: data.compliance_subtype || data.subtag,
      compliance_description: data.compliance_description || data.description,
      
      // Keep old fields for backward compatibility
      compliance_type: data.compliance_type || 'mca_annual',
      form_name: data.form_name || '',
      form_description: data.form_description,
      
      // Core fields
      due_date: data.due_date || new Date().toISOString().split('T')[0],
      filing_date: data.filing_date,
      status: data.status || 'not_started',
      financial_year: data.financial_year,
      
      // Engine fields
      is_recurring: data.is_recurring || false,
      recurrence_type: data.recurrence_type,
      recurrence_config: data.recurrence_config,
      
      // Additional fields
      assessment_year: data.assessment_year,
      trigger_event: data.trigger_event,
      trigger_date: data.trigger_date,
      filing_fee: data.filing_fee ?? 0,
      late_fee: data.late_fee ?? 0,
      srn_number: data.srn_number,
      acknowledgement_number: data.acknowledgement_number,
      notes: data.notes,
      documents: data.documents || [],
      priority: data.priority ?? 5,
      organization_id: organization.id,
    };

    const { error } = await apiFetch('/compliance/obligations', {
      method: 'POST',
      body: JSON.stringify(insertData),
    });
    if (!error) await fetchAll();
    return { error };
  };

  const updateObligationStatus = async (id, status, filingData = {}) => {
    const updateData = { 
      status,
      ...filingData  // Can include notes, srn_number, acknowledgement_number, filing_date
    };

    const { error } = await apiFetch(`/compliance/obligations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updateData),
    });
    if (!error) await fetchAll();
    return { error };
  };

  const deleteObligation = async (id) => {
    const { error } = await apiFetch(`/compliance/obligations/${id}`, {
      method: 'DELETE',
    });
    if (!error) await fetchAll();
    return { error };
  };

  /* ============================================================
     EVENTS
  ============================================================ */
  const acknowledgeEvent = async (id) => {
    const { error } = await apiFetch(`/compliance/events/${id}/acknowledge`, {
      method: 'PATCH',
      body: JSON.stringify({ is_acknowledged: true }),
    });
    if (!error) await fetchAll();
    return { error };
  };

  const createEvent = async (data) => {
    if (!organization?.id) return { error: new Error('No organization') };

    const { error } = await apiFetch('/compliance/events', {
      method: 'POST',
      body: JSON.stringify({ ...data, organization_id: organization.id }),
    });
    if (!error) await fetchAll();
    return { error };
  };

  // =========================
  // Return Hook API
  // =========================
  return {
    complianceProfile,
    directors,
    obligations,
    events,
    loading,
    error,
    refetch: fetchAll,
    saveComplianceProfile,
    addDirector,
    updateDirector,
    deleteDirector,
    createObligation,
    updateObligationStatus,
    deleteObligation,
    acknowledgeEvent,
    createEvent,
  };
}
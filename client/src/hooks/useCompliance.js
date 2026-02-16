import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * useCompliance Hook
 * --------------------------------------------------
 * Central data access layer for compliance module.
 *
 * All Supabase code removed — calls Node.js backend API.
 * Until backend endpoints are wired, functions return empty data gracefully.
 */

async function apiFetch(endpoint, options = {}) {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      credentials: 'include',
      ...options,
    });
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
  const [advanceTax, setAdvanceTax] = useState([]);
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
      const [profileRes, dirsRes, obsRes, taxRes, evtsRes] = await Promise.all([
        apiFetch(`/compliance/profile?organization_id=${organization.id}`),
        apiFetch(`/compliance/directors?organization_id=${organization.id}`),
        apiFetch(`/compliance/obligations?organization_id=${organization.id}`),
        apiFetch(`/compliance/advance-tax?organization_id=${organization.id}`),
        apiFetch(`/compliance/events?organization_id=${organization.id}`),
      ]);

      if (profileRes.data) setComplianceProfile(profileRes.data);
      if (dirsRes.data) setDirectors(Array.isArray(dirsRes.data) ? dirsRes.data : dirsRes.data?.data || []);
      if (obsRes.data) setObligations(Array.isArray(obsRes.data) ? obsRes.data : obsRes.data?.data || []);
      if (taxRes.data) setAdvanceTax(Array.isArray(taxRes.data) ? taxRes.data : taxRes.data?.data || []);
      if (evtsRes.data) setEvents(Array.isArray(evtsRes.data) ? evtsRes.data : evtsRes.data?.data || []);

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
    const method = complianceProfile?.id ? 'PATCH' : 'POST';
    const url = complianceProfile?.id
      ? `/compliance/profile/${complianceProfile.id}`
      : '/compliance/profile';

    const { error } = await apiFetch(url, {
      method,
      body: JSON.stringify(profileData),
    });

    if (!error) await fetchAll();
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


  /* ============================================================
     COMPLIANCE OBLIGATIONS
  ============================================================ */

  const createObligation = async (data) => {
    if (!organization?.id) return { error: new Error('No organization') };

    const insertData = {
      compliance_type: data.compliance_type || 'mca_annual',
      form_name: data.form_name || '',
      form_description: data.form_description,
      due_date: data.due_date || new Date().toISOString().split('T')[0],
      filing_date: data.filing_date,
      status: data.status || 'not_started',
      financial_year: data.financial_year,
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

  const updateObligationStatus = async (id, status, filingDate) => {
    const updateData = { status };
    if (filingDate) updateData.filing_date = filingDate;

    const { error } = await apiFetch(`/compliance/obligations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updateData),
    });

    if (!error) await fetchAll();
    return { error };
  };


  /* ============================================================
     ADVANCE TAX
  ============================================================ */

  const saveAdvanceTax = async (data) => {
    if (!organization?.id) return { error: new Error('No organization') };

    const insertData = {
      financial_year: data.financial_year || '',
      quarter: data.quarter || 1,
      due_date: data.due_date || new Date().toISOString().split('T')[0],
      estimated_annual_income: data.estimated_annual_income ?? 0,
      estimated_tax_liability: data.estimated_tax_liability ?? 0,
      cumulative_percentage: data.cumulative_percentage || 0,
      tax_payable_this_quarter: data.tax_payable_this_quarter ?? 0,
      tax_paid_till_date: data.tax_paid_till_date ?? 0,
      shortfall: data.shortfall ?? 0,
      interest_234b: data.interest_234b ?? 0,
      interest_234c: data.interest_234c ?? 0,
      payment_status: data.payment_status || 'not_started',
      payment_date: data.payment_date,
      challan_number: data.challan_number,
      notes: data.notes,
      organization_id: organization.id,
    };

    const { error } = await apiFetch('/compliance/advance-tax', {
      method: 'POST',
      body: JSON.stringify(insertData),
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


  return {
    complianceProfile,
    directors,
    obligations,
    advanceTax,
    events,
    loading,
    error,
    refetch: fetchAll,
    saveComplianceProfile,
    addDirector,
    updateDirector,
    createObligation,
    updateObligationStatus,
    saveAdvanceTax,
    acknowledgeEvent,
  };
}

import { useState, useEffect, useCallback } from 'react';
// import { useAuth } from '@/hooks/useAuth';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * usePayroll
 * --------------------------------------------------
 * Handles HR + payroll data layer.
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
    console.warn(`[usePayroll] API call failed: ${endpoint}`, err.message);
    return { data: null, error: err };
  }
}

export function usePayroll() {
  const { organization } = useAuth();

  const [employees, setEmployees] = useState([]);
  const [salaryStructures, setSalaryStructures] = useState([]);
  const [payrollRuns, setPayrollRuns] = useState([]);
  const [ptRules, setPtRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);


  /* ============================================================
     FETCHERS — call Node backend
  ============================================================ */

  const fetchEmployees = useCallback(async () => {
    if (!organization?.id) return;
    const { data, error } = await apiFetch(`/payroll/employees?organization_id=${organization.id}`);
    if (!error && data) setEmployees(Array.isArray(data) ? data : data.data || []);
  }, [organization?.id]);

  const fetchSalaryStructures = useCallback(async () => {
    if (!organization?.id) return;
    const { data, error } = await apiFetch(`/payroll/salary-structures?organization_id=${organization.id}`);
    if (!error && data) setSalaryStructures(Array.isArray(data) ? data : data.data || []);
  }, [organization?.id]);

  const fetchPayrollRuns = useCallback(async () => {
    if (!organization?.id) return;
    const { data, error } = await apiFetch(`/payroll/runs?organization_id=${organization.id}&limit=12`);
    if (!error && data) setPayrollRuns(Array.isArray(data) ? data : data.data || []);
  }, [organization?.id]);

  const fetchPTRules = useCallback(async () => {
    const { data, error } = await apiFetch('/payroll/pt-rules');
    if (!error && data) setPtRules(Array.isArray(data) ? data : data.data || []);
  }, []);


  const fetchAll = useCallback(async () => {
    if (!organization?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await Promise.all([
        fetchEmployees(),
        fetchSalaryStructures(),
        fetchPayrollRuns(),
        fetchPTRules(),
      ]);
    } catch (err) {
      setError('Failed to fetch payroll data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [organization?.id, fetchEmployees, fetchSalaryStructures, fetchPayrollRuns, fetchPTRules]);


  useEffect(() => {
    fetchAll();
  }, [fetchAll]);


  /* ============================================================
     EMPLOYEE CRUD
  ============================================================ */

  const addEmployee = async (data) => {
    if (!organization?.id) return { error: new Error('No organization') };

    const insertData = {
      organization_id: organization.id,
      employee_code: data.employee_code || '',
      first_name: data.first_name || '',
      last_name: data.last_name || '',
      email: data.email || '',
      phone: data.phone,
      date_of_birth: data.date_of_birth,
      gender: data.gender,
      employment_type: data.employment_type || 'full_time',
      department: data.department,
      designation: data.designation,
      date_of_joining: data.date_of_joining || new Date().toISOString().split('T')[0],
      bank_name: data.bank_name,
      bank_account_number: data.bank_account_number,
      bank_ifsc_code: data.bank_ifsc_code,
      pan: data.pan,
      uan: data.uan,
      esic_number: data.esic_number,
      preferred_tax_regime: data.preferred_tax_regime || 'new',
      is_active: true,
    };

    const { data: result, error } = await apiFetch('/payroll/employees', {
      method: 'POST',
      body: JSON.stringify(insertData),
    });

    if (!error) await fetchEmployees();
    return { data: result || null, error };
  };

  const updateEmployee = async (id, data) => {
    const { error } = await apiFetch(`/payroll/employees/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    if (!error) await fetchEmployees();
    return { error };
  };

  const deleteEmployee = async (id) => {
    const { error } = await apiFetch(`/payroll/employees/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        is_active: false,
        date_of_exit: new Date().toISOString().split('T')[0],
      }),
    });
    if (!error) await fetchEmployees();
    return { error };
  };


  /* ============================================================
     SALARY STRUCTURE
  ============================================================ */

  const saveSalaryStructure = async (employeeId, data) => {
    if (!organization?.id) return { error: new Error('No organization') };

    const insertData = {
      organization_id: organization.id,
      employee_id: employeeId,
      effective_from: data.effective_from || new Date().toISOString().split('T')[0],
      ctc_annual: data.ctc_annual || 0,
      basic_annual: data.basic_annual || 0,
      hra_annual: data.hra_annual || 0,
      special_allowance_annual: data.special_allowance_annual || 0,
      conveyance_annual: data.conveyance_annual || 0,
      medical_allowance_annual: data.medical_allowance_annual || 0,
      other_allowances_annual: data.other_allowances_annual || 0,
      bonus_annual: data.bonus_annual || 0,
      lta_annual: data.lta_annual || 0,
      employer_epf_annual: data.employer_epf_annual || 0,
      employer_esi_annual: data.employer_esi_annual || 0,
      employer_gratuity_annual: data.employer_gratuity_annual || 0,
      is_current: true,
    };

    const { data: result, error } = await apiFetch('/payroll/salary-structures', {
      method: 'POST',
      body: JSON.stringify(insertData),
    });

    if (!error) await fetchSalaryStructures();
    return { data: result || null, error };
  };


  /* ============================================================
     PAYROLL RUN
  ============================================================ */

  const createPayrollRun = async (data) => {
    if (!organization?.id) return { error: new Error('No organization') };

    const start = new Date(data.payPeriodStart);
    const runNumber = `PR-${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;

    const insertData = {
      organization_id: organization.id,
      pay_period_start: data.payPeriodStart,
      pay_period_end: data.payPeriodEnd,
      payment_date: data.paymentDate,
      run_number: runNumber,
      status: 'draft',
      frequency: 'monthly',
    };

    const { data: result, error } = await apiFetch('/payroll/runs', {
      method: 'POST',
      body: JSON.stringify(insertData),
    });

    if (!error) await fetchPayrollRuns();
    return { data: result || null, error };
  };

  const updatePayrollRunStatus = async (id, status) => {
    const updateData = { status };
    if (status === 'approved') updateData.approved_at = new Date().toISOString();

    const { error } = await apiFetch(`/payroll/runs/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updateData),
    });
    if (!error) await fetchPayrollRuns();
    return { error };
  };

  const getPayrollItems = async (payrollRunId) => {
    const { data, error } = await apiFetch(`/payroll/runs/${payrollRunId}/items`);
    if (error) throw error;
    return Array.isArray(data) ? data : data?.data || [];
  };

  const savePayrollItem = async (data) => {
    if (!organization?.id) return { error: new Error('No organization') };

    const insertData = { organization_id: organization.id, ...data };

    const { data: result, error } = await apiFetch('/payroll/items', {
      method: 'POST',
      body: JSON.stringify(insertData),
    });

    return { data: result || null, error };
  };


  /* ============================================================
     TAX DECLARATIONS
  ============================================================ */

  const getTaxDeclaration = async (employeeId, financialYear) => {
    const { data, error } = await apiFetch(
      `/payroll/tax-declarations?employee_id=${employeeId}&financial_year=${financialYear}`
    );
    if (error) throw error;
    return data || null;
  };

  const saveTaxDeclaration = async (data) => {
    if (!organization?.id) return { error: new Error('No organization') };

    const insertData = { organization_id: organization.id, ...data };

    const { data: result, error } = await apiFetch('/payroll/tax-declarations', {
      method: 'POST',
      body: JSON.stringify(insertData),
    });

    return { data: result || null, error };
  };


  /* ============================================================
     CHALLANS
  ============================================================ */

  const getChallans = async (payrollRunId) => {
    let url = `/payroll/challans?organization_id=${organization?.id}`;
    if (payrollRunId) url += `&payroll_run_id=${payrollRunId}`;

    const { data, error } = await apiFetch(url);
    if (error) throw error;
    return Array.isArray(data) ? data : data?.data || [];
  };

  const createChallan = async (data) => {
    if (!organization?.id) return { error: new Error('No organization') };

    const { data: result, error } = await apiFetch('/payroll/challans', {
      method: 'POST',
      body: JSON.stringify({ organization_id: organization.id, status: 'pending', ...data }),
    });

    return { data: result || null, error };
  };

  const updateChallanStatus = async (id, status, paymentDetails) => {
    const updateData = { status, ...paymentDetails };
    const { error } = await apiFetch(`/payroll/challans/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updateData),
    });
    return { error };
  };


  return {
    employees,
    salaryStructures,
    payrollRuns,
    ptRules,
    loading,
    error,
    refetch: fetchAll,

    addEmployee,
    updateEmployee,
    deleteEmployee,
    saveSalaryStructure,
    createPayrollRun,
    updatePayrollRunStatus,
    getPayrollItems,
    savePayrollItem,
    getTaxDeclaration,
    saveTaxDeclaration,
    getChallans,
    createChallan,
    updateChallanStatus,
  };
}

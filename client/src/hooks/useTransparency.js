import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * useTransparency
 * --------------------------------------------------
 * Handles operational visibility layer:
 * - WIP tracking
 * - Queries
 * - Audit logs
 * - Productivity metrics
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
    console.warn(`[useTransparency] API call failed: ${endpoint}`, err.message);
    return { data: null, error: err };
  }
}

export function useTransparency() {
  const { organization, user } = useAuth();

  const [wipItems, setWipItems] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [queries, setQueries] = useState([]);
  const [productivityMetrics, setProductivityMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);


  /* ============================================================
     FETCHERS
  ============================================================ */

  const fetchWipItems = useCallback(async () => {
    if (!organization?.id) return;
    const { data, error } = await apiFetch(`/transparency/wip-items?organization_id=${organization.id}`);
    if (!error && data) setWipItems(Array.isArray(data) ? data : data.data || []);
    else if (error) console.error('Error fetching WIP items:', error);
  }, [organization?.id]);

  const fetchAuditLogs = useCallback(async (limit = 100) => {
    if (!organization?.id) return;
    const { data, error } = await apiFetch(`/transparency/audit-logs?organization_id=${organization.id}&limit=${limit}`);
    if (!error && data) setAuditLogs(Array.isArray(data) ? data : data.data || []);
    else if (error) console.error('Error fetching audit logs:', error);
  }, [organization?.id]);

  const fetchQueries = useCallback(async () => {
    if (!organization?.id) return;
    const { data, error } = await apiFetch(`/transparency/queries?organization_id=${organization.id}`);
    if (!error && data) setQueries(Array.isArray(data) ? data : data.data || []);
    else if (error) console.error('Error fetching queries:', error);
  }, [organization?.id]);

  const fetchProductivityMetrics = useCallback(async (days = 30) => {
    if (!organization?.id) return;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const { data, error } = await apiFetch(
      `/transparency/productivity-metrics?organization_id=${organization.id}&from=${startDate.toISOString().split('T')[0]}`
    );
    if (!error && data) setProductivityMetrics(Array.isArray(data) ? data : data.data || []);
    else if (error) console.error('Error fetching productivity metrics:', error);
  }, [organization?.id]);


  /* ============================================================
     WIP ITEMS
  ============================================================ */

  const createWipItem = useCallback(async (item) => {
    if (!organization?.id || !user?.id) return null;

    const { data, error } = await apiFetch('/transparency/wip-items', {
      method: 'POST',
      body: JSON.stringify({
        organization_id: organization.id,
        created_by: user.id,
        title: item.title,
        description: item.description,
        status: item.status || 'pending',
        priority: item.priority || 'medium',
        category: item.category,
        assigned_to: item.assigned_to,
        due_date: item.due_date,
        estimated_hours: item.estimated_hours,
        tags: item.tags,
        notes: item.notes,
        related_entity_type: item.related_entity_type,
        related_entity_id: item.related_entity_id,
      }),
    });

    if (error) throw error;

    await fetchWipItems();
    await logAudit('create', 'wip_item', data?.id, item.title);
    return data;
  }, [organization?.id, user?.id, fetchWipItems]);

  const updateWipItem = useCallback(async (id, updates) => {
    if (!organization?.id) return;

    const updateData = { ...updates };
    if (updates.status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }

    const { error } = await apiFetch(`/transparency/wip-items/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updateData),
    });

    if (error) throw error;

    await fetchWipItems();
    await logAudit('update', 'wip_item', id, updates.title || 'WIP Item');
  }, [organization?.id, fetchWipItems]);

  const deleteWipItem = useCallback(async (id) => {
    if (!organization?.id) return;

    const { error } = await apiFetch(`/transparency/wip-items/${id}`, {
      method: 'DELETE',
    });

    if (error) throw error;

    await fetchWipItems();
    await logAudit('delete', 'wip_item', id);
  }, [organization?.id, fetchWipItems]);


  /* ============================================================
     QUERIES
  ============================================================ */

  const createQuery = useCallback(async (query) => {
    if (!organization?.id || !user?.id) return null;

    const { data, error } = await apiFetch('/transparency/queries', {
      method: 'POST',
      body: JSON.stringify({
        organization_id: organization.id,
        raised_by: user.id,
        query_number: '',
        subject: query.subject,
        description: query.description,
        status: query.status || 'open',
        priority: query.priority || 'medium',
        category: query.category,
        assigned_to: query.assigned_to,
        due_date: query.due_date,
        related_entity_type: query.related_entity_type,
        related_entity_id: query.related_entity_id,
      }),
    });

    if (error) throw error;

    await fetchQueries();
    await logAudit('create', 'query', data?.id, query.subject);
    return data;
  }, [organization?.id, user?.id, fetchQueries]);

  const updateQuery = useCallback(async (id, updates) => {
    if (!organization?.id || !user?.id) return;

    const updateData = { ...updates };
    if (updates.status === 'resolved') {
      updateData.resolved_at = new Date().toISOString();
      updateData.resolved_by = user.id;
    }

    const { error } = await apiFetch(`/transparency/queries/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updateData),
    });

    if (error) throw error;

    await fetchQueries();
    await logAudit('update', 'query', id, updates.subject || 'Query');
  }, [organization?.id, user?.id, fetchQueries]);

  const addQueryComment = useCallback(async (queryId, content, isInternal = false) => {
    if (!organization?.id || !user?.id) return null;

    const { data, error } = await apiFetch(`/transparency/queries/${queryId}/comments`, {
      method: 'POST',
      body: JSON.stringify({
        query_id: queryId,
        organization_id: organization.id,
        user_id: user.id,
        content,
        is_internal: isInternal,
      }),
    });

    if (error) throw error;
    return data;
  }, [organization?.id, user?.id]);

  const fetchQueryComments = useCallback(async (queryId) => {
    if (!organization?.id) return [];

    const { data, error } = await apiFetch(
      `/transparency/queries/${queryId}/comments?organization_id=${organization.id}`
    );

    if (error) return [];
    return Array.isArray(data) ? data : data?.data || [];
  }, [organization?.id]);


  /* ============================================================
     AUDIT
  ============================================================ */

  const logAudit = useCallback(async (action, entityType, entityId, entityName, changes, metadata) => {
    if (!organization?.id || !user?.id) return;

    try {
      await apiFetch('/transparency/audit-logs', {
        method: 'POST',
        body: JSON.stringify({
          organization_id: organization.id,
          user_id: user.id,
          user_email: user.email,
          action,
          entity_type: entityType,
          entity_id: entityId,
          entity_name: entityName,
          changes,
          metadata,
        }),
      });
    } catch (err) {
      console.error('Error logging audit:', err);
    }
  }, [organization?.id, user?.id, user?.email]);


  /* ============================================================
     PRODUCTIVITY SCORE (Pure business logic — keep here)
  ============================================================ */

  const calculateProductivityScore = useCallback((metrics) => {
    let score = 0;

    score += Math.min(25, (metrics.documents_processed || 0) * 2);
    score += Math.min(20, (metrics.invoices_verified || 0) * 2);
    score += Math.min(20, (metrics.queries_resolved || 0) * 5);
    score += Math.min(20, (metrics.compliance_tasks_done || 0) * 4);

    const errorPenalty = ((metrics.error_count || 0) + (metrics.revision_count || 0)) * 3;
    score += Math.max(0, 15 - errorPenalty);

    return Math.min(100, Math.round(score));
  }, []);


  /* ============================================================
     INITIAL LOAD
  ============================================================ */

  useEffect(() => {
    if (!organization?.id) {
      setLoading(false);
      return;
    }

    const fetchAll = async () => {
      setLoading(true);
      setError(null);

      try {
        await Promise.all([
          fetchWipItems(),
          fetchAuditLogs(),
          fetchQueries(),
          fetchProductivityMetrics(),
        ]);
      } catch (err) {
        setError('Failed to load transparency data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [organization?.id, fetchWipItems, fetchAuditLogs, fetchQueries, fetchProductivityMetrics]);


  const refetch = useCallback(async () => {
    await Promise.all([
      fetchWipItems(),
      fetchAuditLogs(),
      fetchQueries(),
      fetchProductivityMetrics(),
    ]);
  }, [fetchWipItems, fetchAuditLogs, fetchQueries, fetchProductivityMetrics]);


  return {
    wipItems,
    auditLogs,
    queries,
    productivityMetrics,
    loading,
    error,
    refetch,
    createWipItem,
    updateWipItem,
    deleteWipItem,
    createQuery,
    updateQuery,
    addQueryComment,
    fetchQueryComments,
    logAudit,
    calculateProductivityScore,
  };
}

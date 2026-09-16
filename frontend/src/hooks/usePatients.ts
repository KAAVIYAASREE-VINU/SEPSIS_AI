/**
 * usePatients.ts — React hook that loads patients from the backend API
 * and exposes loading/error state alongside the mapped Patient[] array.
 *
 * Falls back to empty array (never to mock data) while loading or on error.
 * Errors are surfaced via the `error` field so the UI can display them.
 */

import { useState, useEffect, useCallback, Dispatch, SetStateAction } from 'react';
import { Patient } from '../types';
import { getActivePatients, getPatientHistory } from '../services/api';
import { mapBackendPatient } from '../services/mappers';

export interface UsePatientsResult {
  patients: Patient[];
  setPatients: Dispatch<SetStateAction<Patient[]>>;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function usePatients(): UsePatientsResult {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch all active patients (enriched with latest assessment)
      const backendPatients = await getActivePatients();

      // 2. For each patient fetch their history (parallelised)
      const patientsWithHistory = await Promise.all(
        backendPatients.map(async (bp) => {
          try {
            const history = await getPatientHistory(bp.patient_id);
            return mapBackendPatient(bp, history);
          } catch {
            // If history fails, still render the patient without time-series
            return mapBackendPatient(bp, []);
          }
        })
      );

      setPatients(patientsWithHistory);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load patients from backend';
      setError(msg);
      console.error('[usePatients] Failed to load:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { patients, setPatients, loading, error, reload: load };
}

import { useEffect, useState } from 'react';
import { supabase } from './supabase';

/**
 * 로그인된 사용자가 환자면 본인 user_id, 보호자면 같은 patient_group의 환자 user_id 반환.
 */
export function usePatientId() {
  const [patientId, setPatientId] = useState<string | null>(null);
  const [patientName, setPatientName] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id ?? null;
      if (!uid) { setPatientId(null); setLoading(false); return; }
      const { data: row } = await supabase
        .from('users')
        .select('name, role, patient_group_id')
        .eq('id', uid)
        .maybeSingle();
      if (row?.role === 'caregiver' && row?.patient_group_id) {
        const { data: patientRow } = await supabase
          .from('patient_group_members')
          .select('user_id, users:user_id(name)')
          .eq('group_id', row.patient_group_id)
          .eq('role', 'patient')
          .maybeSingle();
        const pid = (patientRow as any)?.user_id;
        const pname = (patientRow as any)?.users?.name;
        if (pid) {
          setPatientId(pid);
          if (pname) setPatientName(pname);
          setLoading(false);
          return;
        }
      }
      setPatientId(uid);
      if (row?.name) setPatientName(row.name);
      setLoading(false);
    })();
  }, []);

  return { patientId, patientName, loading };
}

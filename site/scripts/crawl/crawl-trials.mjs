#!/usr/bin/env node
/*
 * ClinicalTrials.gov 매일 크롤 — 신규·갱신분을 Supabase(clinical_trials 등)에 upsert.
 * 깃허브 액션에서 매일 돈다(`.github/workflows/crawl-content.yml`).
 *
 * 오염 제거·필드 대응은 `site/src/lib/clinicalTrials.ts`(빌드 타임 조회 쪽)와 같은 원칙을
 * 쓴다 — 자세한 이유는 그 파일 상단 주석 참고:
 *   1) "PD" 약어 충돌(PD-1/PD-L1 면역치료) — conditions 배열에 실제로 "parkinson"이 있는지
 *      직접 검사해서 걸러낸다. `query.locn` 국가 필터도 안 믿는다(표기가 실제 데이터와 다름).
 *
 * upsert 라 매일 다시 돌려도 안전하다(모집 상태·최근 갱신일이 바뀐 시험은 갱신됨).
 * 이 사이트 앱과 같은 Supabase 프로젝트를 쓴다(오너 확인 2026-08-08, 테스트 전용 DB).
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY env vars');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const API_BASE = 'https://clinicaltrials.gov/api/v2/studies';
const FIELDS = [
  'NCTId', 'BriefTitle', 'OverallStatus', 'Phase', 'LeadSponsorName', 'Condition',
  'LocationFacility', 'LocationCity', 'LocationCountry',
  'CentralContactName', 'CentralContactPhone', 'CentralContactEMail',
  'LastUpdatePostDate', 'StartDate', 'StartDateType', 'CompletionDate', 'CompletionDateType',
].join(',');

function isRealParkinsons(conditions) {
  return (conditions ?? []).some((c) => c.toLowerCase().includes('parkinson'));
}

async function fetchAll() {
  const trials = [];
  let pageToken;
  do {
    const params = new URLSearchParams({
      'query.cond': 'Parkinson Disease',
      'filter.overallStatus': 'RECRUITING',
      pageSize: '100',
      fields: FIELDS,
    });
    if (pageToken) params.set('pageToken', pageToken);
    const res = await fetch(`${API_BASE}?${params}`);
    if (!res.ok) throw new Error(`ClinicalTrials.gov request failed: ${res.status}`);
    const data = await res.json();
    for (const raw of data.studies) {
      const p = raw.protocolSection;
      if (!isRealParkinsons(p.conditionsModule?.conditions)) continue;
      const nctId = p.identificationModule.nctId;
      trials.push({
        nctId,
        title: p.identificationModule.briefTitle,
        phaseKey: p.designModule?.phases?.[0] ?? null,
        sponsor: p.sponsorCollaboratorsModule?.leadSponsor?.name ?? '',
        contacts: (p.contactsLocationsModule?.centralContacts ?? []).map((c) => ({ name: c.name, phone: c.phone, email: c.email })),
        allLocations: (p.contactsLocationsModule?.locations ?? [])
          .filter((l) => l.facility && l.country)
          .map((l) => ({ facility: l.facility, city: l.city ?? '', country: l.country })),
        lastUpdate: p.statusModule?.lastUpdatePostDateStruct?.date ?? null,
        startDate: p.statusModule?.startDateStruct?.date ?? null,
        startDateEstimated: p.statusModule?.startDateStruct?.type === 'ESTIMATED',
        completionDate: p.statusModule?.completionDateStruct?.date ?? null,
        completionDateEstimated: p.statusModule?.completionDateStruct?.type === 'ESTIMATED',
        url: `https://clinicaltrials.gov/study/${nctId}`,
      });
    }
    pageToken = data.nextPageToken;
  } while (pageToken);
  return trials;
}

/** ClinicalTrials.gov 날짜가 "2027-08"처럼 일(day)이 없을 수 있다 — 1일로 채운다. */
function fullDate(d) {
  if (!d) return null;
  const parts = d.split('-');
  if (parts.length === 2) return `${d}-01`;
  if (parts.length === 1) return `${d}-01-01`;
  return d;
}

async function main() {
  console.log('Fetching recruiting trials from ClinicalTrials.gov...');
  const trials = await fetchAll();
  console.log(`Fetched ${trials.length} trials (decontaminated).`);

  const { error: upsertError } = await supabase.from('clinical_trials').upsert(
    trials.map((t) => ({
      nct_id: t.nctId,
      title_en: t.title,
      phase_key: t.phaseKey,
      sponsor: t.sponsor,
      start_date: fullDate(t.startDate),
      start_date_estimated: t.startDateEstimated,
      completion_date: fullDate(t.completionDate),
      completion_date_estimated: t.completionDateEstimated,
      status: 'RECRUITING',
      last_update: t.lastUpdate,
      url: t.url,
      updated_at: new Date().toISOString(),
    })),
    { onConflict: 'nct_id' }
  );
  if (upsertError) throw new Error(`clinical_trials upsert failed: ${upsertError.message}`);

  const nctIds = trials.map((t) => t.nctId);

  /*
   * upsert는 "오늘도 모집 중인 시험"만 갱신한다 — 더 이상 모집 중이 아니게 된 시험은 오늘
   * 목록에서 그냥 빠질 뿐, status가 안 바뀌었다. 그래서 실제로는 모집이 끝난 시험이 사이트에
   * "모집 중" 배지를 단 채로 계속 남아 있었다(2026-08-16 오너가 발견).
   *
   * ⚠️ 처음엔 이 행들을 지우려고 했었는데 오너가 반려했다 — "모집중이 있으면 모집종료도
   * 있을거라는게 기본 상식이잖아! 모집 종료도 계속 쌓아야 의미 있는거지!" 지우지 않고,
   * ClinicalTrials.gov에 그 시험들의 실제 현재 상태를 다시 물어서 status만 정확하게
   * 갱신한다. `filter.ids`로 여러 NCT ID를 한 번에 조회할 수 있다(실측 확인).
   */
  const { data: existingRows, error: existingError } = await supabase.from('clinical_trials').select('nct_id');
  if (existingError) throw new Error(`clinical_trials fetch failed: ${existingError.message}`);
  const currentSet = new Set(nctIds);
  const staleIds = (existingRows ?? []).map((r) => r.nct_id).filter((id) => !currentSet.has(id));

  let statusUpdated = 0;
  for (let i = 0; i < staleIds.length; i += 150) {
    const chunk = staleIds.slice(i, i + 150);
    const params = new URLSearchParams({
      'filter.ids': chunk.join(','),
      fields: 'NCTId,OverallStatus,LastUpdatePostDate',
      pageSize: '150',
    });
    const res = await fetch(`${API_BASE}?${params}`);
    if (!res.ok) {
      console.warn(`상태 재조회 실패(건너뜀): ${res.status}`);
      continue;
    }
    const data = await res.json();
    for (const raw of data.studies ?? []) {
      const s = raw.protocolSection.statusModule;
      const nctId = raw.protocolSection.identificationModule.nctId;
      const { error } = await supabase
        .from('clinical_trials')
        .update({ status: s.overallStatus, last_update: s.lastUpdatePostDateStruct?.date ?? null, updated_at: new Date().toISOString() })
        .eq('nct_id', nctId);
      if (error) console.warn(`${nctId} 상태 갱신 실패: ${error.message}`);
      else statusUpdated += 1;
    }
  }
  console.log(`Re-checked ${staleIds.length} no-longer-recruiting trials, updated status for ${statusUpdated}.`);

  // 위치·연락처는 매번 전부 지우고 다시 넣는다(간단하고, 시험당 몇 개 안 되는 행이라 부담 없음).
  await supabase.from('trial_locations').delete().in('nct_id', nctIds);
  await supabase.from('trial_contacts').delete().in('nct_id', nctIds);

  const locations = trials.flatMap((t) => t.allLocations.map((l) => ({ nct_id: t.nctId, facility: l.facility, city: l.city, country: l.country })));
  const contacts = trials.flatMap((t) => t.contacts.filter((c) => c.name || c.phone || c.email).map((c) => ({ nct_id: t.nctId, name: c.name, phone: c.phone, email: c.email })));

  for (let i = 0; i < locations.length; i += 1000) {
    const { error } = await supabase.from('trial_locations').insert(locations.slice(i, i + 1000));
    if (error) throw new Error(`trial_locations insert failed: ${error.message}`);
  }
  for (let i = 0; i < contacts.length; i += 1000) {
    const { error } = await supabase.from('trial_contacts').insert(contacts.slice(i, i + 1000));
    if (error) throw new Error(`trial_contacts insert failed: ${error.message}`);
  }

  console.log(`Done. ${trials.length} trials, ${locations.length} locations, ${contacts.length} contacts upserted.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

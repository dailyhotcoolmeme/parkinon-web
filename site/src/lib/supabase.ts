/*
 * parkinon 앱과 같은 Supabase 프로젝트(테스트 전용 DB, 오너 확인 2026-08-08 "앱이랑 합쳐도
 * 큰문제 없으면 같이 넣자"). 임상시험·연구 콘텐츠 전용 테이블만 쓴다(clinical_trials 등) —
 * 사용자 데이터 테이블은 이 파일에서 건드리지 않는다.
 *
 * 이 클라이언트는 **빌드 타임에만** 쓴다(Astro SSG, 방문 중 런타임 호출 없음).
 * anon 키만 쓴다 — 전부 공개 참고자료라 RLS가 이미 공개 읽기를 허용한다.
 */
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.SUPABASE_URL ?? process.env.SUPABASE_URL;
const anonKey = import.meta.env.SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error('Missing SUPABASE_URL / SUPABASE_ANON_KEY — check site/.env');
}

export const supabase = createClient(url, anonKey);

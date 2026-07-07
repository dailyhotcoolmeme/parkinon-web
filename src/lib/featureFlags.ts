// 출시 전/후로 기능 노출을 제어하는 피처 플래그.
// 앱(parkinon-app)의 동일 플래그와 짝을 맞춰 둘 다 숨김 처리.

/**
 * 컨디션 측정(손가락 두드리기·반응속도) 노출 여부.
 * 출시 시점엔 숨김(false). 웹에서는 몸 상태 상세의 측정 차트 섹션,
 * PDF 내보내기의 "컨디션 측정" 항목을 가린다.
 */
export const MEASUREMENT_FEATURE_ENABLED = false;

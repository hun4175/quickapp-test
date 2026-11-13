/**
 * 2.4.2 E2/E4 비교 미리보기 재생성 안내.
 * Indexed PNG는 내장 디코더 대신 Pillow 사용 (docs/preview-2.4.2-*.png).
 * 재생성: `python3 scripts/gen-preview-2.4.2.py` (동일 디렉터리에 둠)
 */
import { animNodeCountReport } from '../src/common/ring.js'
console.log(JSON.stringify({ version: '2.4.2', anim: animNodeCountReport(1) }, null, 2))
console.log('Previews: docs/preview-2.4.2-e2.png, preview-2.4.2-e2-mid.png, preview-2.4.2-e4.png')

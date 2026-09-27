/** What the companion is actually doing while a turn is in flight. */
export type ThinkingPhase = 'remembering' | 'seeing' | 'thinking' | 'retrying';

const LABELS: Record<ThinkingPhase, string> = {
	remembering: 'Recordando…',
	seeing: 'Mirando tu foto…',
	thinking: 'Pensando…',
	retrying: 'Reconectando…'
};

export function phaseLabel(phase: ThinkingPhase): string {
	return LABELS[phase];
}

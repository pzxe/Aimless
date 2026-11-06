import { roundLabel, type BracketSide, type Tournament } from '@/core/tournament'
import type { TFunction } from '@/i18n'

export function roundName(t: TFunction, tournament: Tournament, side: BracketSide, round: number): string {
  const l = roundLabel(tournament, side, round)
  return l.custom ?? t(`tournament.round.${l.key}`, { n: l.n })
}

export function participantName(tournament: Tournament, id: string | null | undefined): string | null {
  if (!id) return null
  return tournament.participants.find((p) => p.id === id)?.name ?? null
}

export function seedOf(tournament: Tournament, id: string): number {
  return tournament.participants.findIndex((p) => p.id === id) + 1
}

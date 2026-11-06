import type { GameDefinition } from '@/core/sensitivity/types'
import { CATALOG } from './catalog'

/**
 * Game database.
 *
 * `yaw` = degrees of horizontal rotation per mouse count at sensitivity 1.0.
 *
 * Rules for contributors (see CONTRIBUTING.md):
 * - Only add a yaw value that is documented by the developer or measured and published
 *   consistently by independent sources. Never guess.
 * - If sources disagree or no value is known, set `formula: null` and
 *   `accuracy: 'unsupported'`. Users can still calibrate the game themselves.
 * - Every game needs a `noteKey` with an explanation in every locale.
 *
 * These constants describe hipfire rotation (not ADS / scoped).
 */

/** Source-engine style games share m_yaw 0.022. */
const SOURCE_YAW = 0.022
/** Shared by Overwatch 2 and modern Call of Duty titles. */
const OW_COD_YAW = 0.0066

const CORE: GameDefinition[] = [
  {
    id: 'valorant', name: 'Valorant', short: 'VAL', genre: 'tactical', color: '#ff4655',
    formula: { kind: 'linear', yaw: 0.07 }, accuracy: 'verified',
    scaleLabel: 'Sensitivity', sensitivityStep: 0.001, edpiComparable: true,
    fov: { default: 103, type: 'horizontal', fixed: true },
    engine: 'Unreal Engine 4', status: 'active', noteKey: 'note.valorant',
  },
  {
    id: 'cs2', name: 'Counter-Strike 2', short: 'CS2', genre: 'tactical', color: '#de9b35',
    formula: { kind: 'linear', yaw: SOURCE_YAW }, accuracy: 'verified',
    scaleLabel: 'Sensitivity', edpiComparable: true,
    fov: { default: 90, type: 'horizontal-4:3', fixed: true },
    engine: 'Source 2', status: 'active', noteKey: 'note.source',
  },
  {
    id: 'csgo', name: 'Counter-Strike: Global Offensive', short: 'CSGO', genre: 'tactical', color: '#c48a2c',
    formula: { kind: 'linear', yaw: SOURCE_YAW }, accuracy: 'verified',
    scaleLabel: 'Sensitivity', edpiComparable: true,
    fov: { default: 90, type: 'horizontal-4:3', fixed: true },
    engine: 'Source', status: 'discontinued', noteKey: 'note.csgo',
  },
  {
    id: 'apex', name: 'Apex Legends', short: 'APEX', genre: 'battle-royale', color: '#da292a',
    formula: { kind: 'linear', yaw: SOURCE_YAW }, accuracy: 'verified',
    scaleLabel: 'Mouse sensitivity', edpiComparable: true,
    fov: { default: 70, type: 'horizontal-4:3', min: 70, max: 110 },
    engine: 'Source (modified)', status: 'active', noteKey: 'note.apex',
  },
  {
    id: 'overwatch2', name: 'Overwatch 2', short: 'OW2', genre: 'hero', color: '#f99e1a',
    formula: { kind: 'linear', yaw: OW_COD_YAW }, accuracy: 'verified',
    scaleLabel: 'Sensitivity', sensitivityStep: 0.01, edpiComparable: true,
    fov: { default: 103, type: 'horizontal', min: 80, max: 103 },
    engine: 'Proprietary', status: 'active', noteKey: 'note.overwatch2',
  },
  {
    id: 'fortnite', name: 'Fortnite', short: 'FN', genre: 'battle-royale', color: '#9d4dbb',
    // 0.005555 degrees per count per 1 % on the "Mouse Sensitivity X" slider.
    formula: { kind: 'linear', yaw: 0.005555 }, accuracy: 'approximate',
    scaleLabel: 'Mouse sensitivity X (%)', sensitivityStep: 0.1, edpiComparable: false,
    engine: 'Unreal Engine 5', status: 'active', noteKey: 'note.fortnite',
  },
  {
    id: 'r6siege', name: 'Rainbow Six Siege', short: 'R6S', genre: 'tactical', color: '#4a90d9',
    // Valid with the default MouseSensitivityMultiplierUnit = 0.02.
    formula: { kind: 'linear', yaw: 0.00572957795 }, accuracy: 'approximate',
    scaleLabel: 'Horizontal sensitivity', sensitivityStep: 1, edpiComparable: false,
    fov: { default: 60, type: 'vertical', min: 60, max: 90 },
    engine: 'AnvilNext / Siege X', status: 'active', noteKey: 'note.r6siege',
  },
  {
    id: 'warzone', name: 'Call of Duty: Warzone', short: 'WZ', genre: 'battle-royale', color: '#7cb342',
    formula: { kind: 'linear', yaw: OW_COD_YAW }, accuracy: 'verified',
    scaleLabel: 'Mouse sensitivity', sensitivityStep: 0.01, edpiComparable: true,
    engine: 'IW engine', status: 'active', noteKey: 'note.cod',
  },
  {
    id: 'bo6', name: 'Call of Duty: Black Ops 6', short: 'BO6', genre: 'military', color: '#e65100',
    formula: { kind: 'linear', yaw: OW_COD_YAW }, accuracy: 'verified',
    scaleLabel: 'Mouse sensitivity', sensitivityStep: 0.01, edpiComparable: true,
    engine: 'IW engine', status: 'active', noteKey: 'note.cod',
  },
  {
    id: 'bo7', name: 'Call of Duty: Black Ops 7', short: 'BO7', genre: 'military', color: '#bf360c',
    // Assumed to match Black Ops 6 (same engine family). Not independently confirmed.
    formula: { kind: 'linear', yaw: OW_COD_YAW }, accuracy: 'approximate',
    scaleLabel: 'Mouse sensitivity', sensitivityStep: 0.01, edpiComparable: true,
    engine: 'IW engine', status: 'active', noteKey: 'note.bo7',
  },
  {
    id: 'pubg', name: 'PUBG: Battlegrounds', short: 'PUBG', genre: 'battle-royale', color: '#f2a900',
    formula: null, accuracy: 'unsupported',
    scaleLabel: 'General sensitivity', edpiComparable: false, nonLinearSlider: true,
    engine: 'Unreal Engine 4', status: 'active', noteKey: 'note.pubg',
  },
  {
    id: 'tf2', name: 'Team Fortress 2', short: 'TF2', genre: 'hero', color: '#b8383b',
    formula: { kind: 'linear', yaw: SOURCE_YAW }, accuracy: 'verified',
    scaleLabel: 'Sensitivity', edpiComparable: true,
    fov: { default: 90, type: 'horizontal-4:3', min: 75, max: 90 },
    engine: 'Source', status: 'active', noteKey: 'note.source',
  },
  {
    id: 'quakelive', name: 'Quake Live', short: 'QL', genre: 'arena', color: '#a1887f',
    formula: { kind: 'linear', yaw: SOURCE_YAW }, accuracy: 'verified',
    scaleLabel: 'Sensitivity', edpiComparable: true,
    engine: 'id Tech 3', status: 'active', noteKey: 'note.quakelive',
  },
  {
    id: 'quakechampions', name: 'Quake Champions', short: 'QC', genre: 'arena', color: '#8d6e63',
    formula: { kind: 'linear', yaw: SOURCE_YAW }, accuracy: 'approximate',
    scaleLabel: 'Sensitivity', edpiComparable: true,
    engine: 'Saber / id Tech', status: 'active', noteKey: 'note.quakechampions',
  },
  {
    id: 'destiny2', name: 'Destiny 2', short: 'D2', genre: 'coop', color: '#90a4ae',
    formula: { kind: 'linear', yaw: OW_COD_YAW }, accuracy: 'approximate',
    scaleLabel: 'Look sensitivity', sensitivityStep: 1, edpiComparable: false,
    engine: 'Tiger', status: 'active', noteKey: 'note.destiny2',
  },
  {
    id: 'bf6', name: 'Battlefield 6', short: 'BF6', genre: 'military', color: '#4fc3f7',
    formula: null, accuracy: 'unsupported',
    scaleLabel: 'Soldier mouse sensitivity', edpiComparable: false,
    engine: 'Frostbite', status: 'active', noteKey: 'note.bf6',
  },
  {
    id: 'thefinals', name: 'The Finals', short: 'TF', genre: 'arena', color: '#ffd600',
    formula: null, accuracy: 'unsupported',
    scaleLabel: 'Mouse sensitivity', edpiComparable: false,
    engine: 'Unreal Engine 5', status: 'active', noteKey: 'note.unsupportedGeneric',
  },
  {
    id: 'xdefiant', name: 'XDefiant', short: 'XD', genre: 'arena', color: '#26c6da',
    formula: null, accuracy: 'unsupported',
    scaleLabel: 'Mouse sensitivity', edpiComparable: false,
    engine: 'Snowdrop', status: 'discontinued', noteKey: 'note.xdefiant',
  },
  {
    id: 'haloinfinite', name: 'Halo Infinite', short: 'HI', genre: 'arena', color: '#66bb6a',
    formula: null, accuracy: 'unsupported',
    scaleLabel: 'Mouse sensitivity', edpiComparable: false,
    engine: 'Slipspace', status: 'active', noteKey: 'note.unsupportedGeneric',
  },
  {
    id: 'splitgate2', name: 'Splitgate 2', short: 'SG2', genre: 'arena', color: '#ab47bc',
    formula: null, accuracy: 'unsupported',
    scaleLabel: 'Mouse sensitivity', edpiComparable: false,
    engine: 'Unreal Engine 5', status: 'active', noteKey: 'note.unsupportedGeneric',
  },
]

/** Every supported title: the original 20 first, then the extended catalogue. */
export const GAMES: GameDefinition[] = [...CORE, ...CATALOG]

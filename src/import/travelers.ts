/**
 * Resolving "who is this for?" text into travelers.
 *
 * A traveler column holds anything from "A" to "Alice & Bob" to "both" to "shared".
 * The registry is seeded from the Overview sheet when it declares travelers, then
 * learns from the itinerary and booking sheets, so a workbook that only ever writes
 * names still produces a correct roster.
 */
import type { Traveler, TravelerScope } from '../domain/types';
import { cleanText, normalizeKey } from './normalize';

const SHARED_TOKENS = new Set([
  'shared', 'both', 'all', 'together', 'group', 'everyone', 'us', 'joint', 'ab', 'aandb',
  'a+b', 'ab', 'team', 'bersama', 'chung', 'semua',
]);

const SLOTS: Traveler['slot'][] = ['a', 'b', 'c', 'd'];

/** Split "Alice & Bob", "A, B", "A + B", "A/B", "A and B" into raw tokens. */
export function splitTravelerTokens(text: string): string[] {
  const cleaned = cleanText(text);
  if (!cleaned) return [];
  return cleaned
    .split(/\s*(?:[,;&+/]|\band\b|\bdan\b|\bva\b)\s*/i)
    .map((part) => cleanText(part))
    .filter(Boolean);
}

export function isSharedToken(token: string): boolean {
  return SHARED_TOKENS.has(normalizeKey(token));
}

export class TravelerRegistry {
  private readonly travelers: Traveler[] = [];
  /** Normalized alias -> traveler id. */
  private readonly aliases = new Map<string, string>();

  /**
   * Register a traveler the Overview sheet named explicitly.
   *
   * `generated` marks a placeholder we invented from a "Traveler A" style label rather
   * than a real name, so the UI can render it in the reader's language.
   */
  declare(name: string, departureCity?: string, generated = false): Traveler | null {
    const cleaned = cleanText(name);
    if (!cleaned) return null;
    const existing = this.resolveOne(cleaned);
    if (existing) {
      if (departureCity && !existing.departureCity) existing.departureCity = departureCity;
      return existing;
    }
    return this.create(cleaned, departureCity, generated);
  }

  /** Create N placeholder travelers when the workbook gives only a count. */
  ensureCount(count: number): void {
    for (let i = this.travelers.length; i < Math.min(count, SLOTS.length); i += 1) {
      this.create(`Traveler ${SLOTS[i]!.toUpperCase()}`, undefined, true);
    }
  }

  private create(name: string, departureCity?: string, generated = false): Traveler {
    const slot = SLOTS[Math.min(this.travelers.length, SLOTS.length - 1)]!;
    const id = `traveler-${this.travelers.length + 1}`;
    const traveler: Traveler = {
      id,
      name,
      initials: initialsFor(name, this.travelers.length),
      slot,
      generatedName: generated,
    };
    if (departureCity) traveler.departureCity = departureCity;
    this.travelers.push(traveler);

    this.addAlias(name, id);
    this.addAlias(traveler.initials, id);
    // "Traveler A" style workbooks refer to the same person as "A".
    const letter = /(?:traveler|traveller)\s*([a-z0-9])/i.exec(name)?.[1];
    if (letter) this.addAlias(letter, id);
    const firstName = name.split(/\s+/)[0];
    if (firstName) this.addAlias(firstName, id);
    return traveler;
  }

  private addAlias(alias: string, id: string): void {
    const key = normalizeKey(alias);
    if (!key || SHARED_TOKENS.has(key)) return;
    if (!this.aliases.has(key)) this.aliases.set(key, id);
  }

  /** Find a traveler for one token, creating them if the token is new and plausible. */
  private resolveOne(token: string): Traveler | undefined {
    const key = normalizeKey(token);
    if (!key) return undefined;
    const id = this.aliases.get(key);
    if (id) return this.travelers.find((t) => t.id === id);

    // "Traveler A" / "Traveler 1" when only "A" was seen before, and vice versa.
    const letter = /^(?:traveler|traveller|pax|person)?([a-z0-9])$/i.exec(key)?.[1];
    if (letter) {
      const viaLetter = this.aliases.get(normalizeKey(letter));
      if (viaLetter) return this.travelers.find((t) => t.id === viaLetter);
    }
    return undefined;
  }

  /**
   * Resolve a traveler cell into a scope.
   *
   * Blank stays blank — an unassigned item is reported as an issue, never quietly
   * turned into a shared one.
   */
  resolve(text: string, options: { create?: boolean } = {}): TravelerScope {
    const create = options.create ?? true;
    const tokens = splitTravelerTokens(text);
    if (tokens.length === 0) return { travelerIds: [], kind: 'unassigned' };

    if (tokens.length === 1 && isSharedToken(tokens[0]!)) {
      return { travelerIds: this.travelers.map((t) => t.id), kind: 'shared' };
    }

    const ids: string[] = [];
    let sawShared = false;
    for (const token of tokens) {
      if (isSharedToken(token)) {
        sawShared = true;
        continue;
      }
      const found = this.resolveOne(token);
      if (found) {
        if (!ids.includes(found.id)) ids.push(found.id);
      } else if (create && this.travelers.length < SLOTS.length && looksLikePersonToken(token)) {
        const made = this.create(token);
        // A token from a traveler column is the author's own wording, not a placeholder.
        ids.push(made.id);
      }
    }

    if (sawShared && ids.length === 0) {
      return { travelerIds: this.travelers.map((t) => t.id), kind: 'shared' };
    }
    if (ids.length === 0) return { travelerIds: [], kind: 'unassigned' };
    const everyone = this.travelers.length > 1 && ids.length === this.travelers.length;
    return { travelerIds: ids, kind: everyone ? 'shared' : 'individual' };
  }

  list(): Traveler[] {
    return this.travelers;
  }

  /**
   * Re-resolve scopes captured before the roster was complete.
   *
   * A "shared" row read while only one traveler was known would otherwise be pinned
   * to that single traveler forever.
   */
  expandShared(scope: TravelerScope): TravelerScope {
    if (scope.kind !== 'shared') return scope;
    return { travelerIds: this.travelers.map((t) => t.id), kind: 'shared' };
  }
}

/** Reject obvious non-names so a stray "TBD" does not become a third traveler. */
function looksLikePersonToken(token: string): boolean {
  const cleaned = cleanText(token);
  if (cleaned.length === 0 || cleaned.length > 40) return false;
  if (/^(tbd|tba|n\/?a|none|unknown|\?|-|—)$/i.test(cleaned)) return false;
  return /[a-z0-9]/i.test(cleaned);
}

function initialsFor(name: string, index: number): string {
  const words = cleanText(name)
    .split(/\s+/)
    .filter((w) => /[a-z0-9]/i.test(w));

  // "Traveler A" should read as "A", not "TA".
  const generic = /^(?:traveler|traveller)$/i;
  const meaningful = words.filter((w) => !generic.test(w));
  if (meaningful.length === 0) return SLOTS[Math.min(index, SLOTS.length - 1)]!.toUpperCase();
  if (meaningful.length === 1) {
    const word = meaningful[0]!;
    return (word.length <= 2 ? word : word.slice(0, 1)).toUpperCase();
  }
  return (meaningful[0]!.charAt(0) + meaningful[1]!.charAt(0)).toUpperCase();
}

/** Avatar initials for a scope: shared shows the group, individual shows the person. */
export function scopeInitials(scope: TravelerScope, travelers: readonly Traveler[]): string {
  if (scope.kind === 'unassigned') return '?';
  const members = travelers.filter((t) => scope.travelerIds.includes(t.id));
  if (members.length === 0) return '?';
  if (members.length === 1) return members[0]!.initials;
  return members
    .slice(0, 2)
    .map((t) => t.initials.charAt(0))
    .join('');
}

/** The traveler color slot a scope should use: shared items get the shared teal. */
export function scopeSlot(
  scope: TravelerScope,
  travelers: readonly Traveler[],
): 'a' | 'b' | 'c' | 'd' | 'shared' | 'none' {
  if (scope.kind === 'unassigned') return 'none';
  if (scope.kind === 'shared') return 'shared';
  const first = travelers.find((t) => t.id === scope.travelerIds[0]);
  return first?.slot ?? 'none';
}

/**
 * The phrases a scope or traveler label needs, taken from the active catalogue.
 *
 * Passing them in keeps this module free of UI copy while still letting the labels it
 * builds come out in the reader's language.
 */
export interface TravelerLabels {
  unassigned: string;
  both: string;
  placeholder: (slot: string) => string;
}

/**
 * What to call a traveler.
 *
 * A name the workbook actually wrote is shown verbatim, in whatever language it was
 * written in. A placeholder we invented — because the workbook gave a head count, or a
 * bare "A" — is ours to word, so it comes from the catalogue instead. The stored `name`
 * stays put either way: the parser matches aliases against it.
 */
export function travelerName(traveler: Traveler, labels: TravelerLabels): string {
  return traveler.generatedName ? labels.placeholder(traveler.slot) : traveler.name;
}

/** Human label for a scope, used in headings and screen-reader text. */
export function scopeLabel(scope: TravelerScope, travelers: readonly Traveler[], labels: TravelerLabels): string {
  if (scope.kind === 'unassigned') return labels.unassigned;
  const members = travelers.filter((t) => scope.travelerIds.includes(t.id));
  if (members.length === 0) return labels.unassigned;
  if (scope.kind === 'shared') return members.length > 1 ? labels.both : travelerName(members[0]!, labels);
  return members.map((t) => travelerName(t, labels)).join(' & ');
}

/*
 * The four shapes an empty state needs that no card already owns.
 *
 * Every other empty state draws its own card's icon — `NAV_GLYPH` or
 * `OVERVIEW_GLYPH` — because the tile is that card saying it has nothing, not a
 * decoration. These four have no card behind them:
 *
 *   plug    a source with no credentials. The same shape on every source
 *   search  a filter matched nothing, which is not the same as having nothing
 *   link    a person's links, which the sidebar has no icon for
 *   rise    a planned pay rise, likewise
 *
 * Geometry only, like the two glyph sets it sits beside: `EmptyState` draws it,
 * and the tile it sits in decides the colour.
 */
export const EMPTY_GLYPH = {
  plug: (
    <>
      <path d="M9 3v6M15 3v6" />
      <path d="M6 9h12v3a6 6 0 01-12 0z" />
      <path d="M12 18v3" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4 4" />
    </>
  ),
  link: (
    <>
      <path d="M10 13a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1" />
      <path d="M14 11a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1" />
    </>
  ),
  rise: (
    <>
      <path d="M4 16l5-5 3.5 3.5L20 8" />
      <path d="M15 8h5v5" />
    </>
  ),
} as const;

// Single source of truth for the app's chrome dimensions.
//
// These numbers were previously duplicated: NowPlayingBar hardcoded the sidebar
// widths to compute its left offset, and every page hardcoded a `pb` value to
// avoid being covered by the playbar. That worked until it didn't — the
// Dashboard's guess was too small and the Super Admin card got clipped.
//
// One definition, imported by everyone who needs it.
export const SIDEBAR_RAIL_WIDTH = 72;   // collapsed icon-only rail
export const SIDEBAR_FULL_WIDTH = 240;  // expanded with labels
export const PLAYBAR_HEIGHT = 88;       // NowPlayingBar's rendered height
export const HEADER_HEIGHT = 64;        // Header's fixed AppBar/Toolbar height

// Breathing room between the last element on a page and the playbar's top edge.
export const CONTENT_BOTTOM_GAP = 24;
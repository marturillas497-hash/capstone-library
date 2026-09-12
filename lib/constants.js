// Shared enumerated value lists for student_metadata.year_level and
// student_metadata.section. These are fixed dropdown values, not free
// text, so any UI that reads or filters on them (currently /profile and
// /admin/users) must import from here rather than defining a local copy.
//
// Keeping one source of truth prevents drift between the write side
// (/profile, where a student sets these) and the read/filter side
// (/admin/users, where the admin filters on the exact stored string).
// A mismatched local copy on either side would silently produce filters
// that can never match anything, since student_metadata.year_level and
// student_metadata.section are matched with strict equality, not ILIKE.

export const YEAR_LEVELS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
export const SECTIONS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
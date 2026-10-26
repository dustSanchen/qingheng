package cn.qingheng.health.store;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Pure numeric helpers over stored records.
 *
 * No Android types, no Context, no state: everything here takes JSON and returns JSON or numbers, so
 * the aggregation rules live in one testable place instead of being re-implemented per caller (the
 * push payload, the chat context and the advice payload all need the same sums).
 *
 * The rule that matters: a field that no row carries is reported as null, never as 0. "Not recorded"
 * and "zero" must not look the same to the model or to the user.
 */
public final class RecordMath {
    private RecordMath() { }

    /** Reads a finite, non-negative number from a record, or null when it is absent or unusable. */
    public static Double finite(JSONObject row, String key) {
        if (row == null || key == null) return null;
        Object raw = row.opt(key);
        if (raw == null || raw == JSONObject.NULL || raw instanceof Boolean) return null;
        double value;
        if (raw instanceof Number) value = ((Number)raw).doubleValue();
        else {
            try { value = Double.parseDouble(String.valueOf(raw).trim()); }
            catch (Exception e) { return null; }
        }
        if (Double.isNaN(value) || Double.isInfinite(value) || value < 0) return null;
        return value;
    }

    /**
     * Sums one field across records.
     *
     * @return the total, or null when no record carries that field (missing stays missing).
     */
    public static Double sum(JSONArray rows, String key) {
        if (rows == null) return null;
        double total = 0;
        boolean seen = false;
        for (int i = 0; i < rows.length(); i++) {
            Double value = finite(rows.optJSONObject(i), key);
            if (value == null) continue;
            total += value;
            seen = true;
        }
        return seen ? total : null;
    }

    /** Sums several fields at once; the caller decides what to do with a null component. */
    public static boolean hasAnyOf(JSONArray rows, String... keys) {
        if (rows == null) return false;
        for (int i = 0; i < rows.length(); i++) {
            JSONObject row = rows.optJSONObject(i);
            for (String key : keys) if (finite(row, key) != null) return true;
        }
        return false;
    }

    /** Rounded total for display, or null when nothing was recorded. */
    public static Double sumRounded(JSONArray rows, String key) {
        Double total = sum(rows, key);
        return total == null ? null : (double)Math.round(total);
    }

    /** True when the value reached the floor (and, when given, stayed under the ceiling). */
    public static boolean withinRange(Double value, Double floor, Double ceiling) {
        if (value == null) return false;
        if (floor != null && value < floor) return false;
        return ceiling == null || value <= ceiling;
    }

    /** Signed deficit as a percentage of maintenance; null when either side is unknown. */
    public static Double deficitPercent(Double intake, Double maintenance) {
        if (intake == null || maintenance == null || maintenance <= 0) return null;
        return Math.round((maintenance - intake) / maintenance * 1000) / 10.0;
    }
}

package cn.qingheng.health;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Incremental local migration: external sync records live in SQLite so source IDs, deletions and
 * conflict updates are explicit. Existing state.json remains the import/export compatibility layer.
 */
public final class SyncDatabase extends SQLiteOpenHelper {
    private static final String NAME = "qingheng_sync.db";
    private static final int VERSION = 2;
    private static final String TABLE = "external_records";
    /** Mirror of the JSON collections; state.json stays authoritative until a later round. */
    private static final String MIRROR = "mirror_records";
    private static final String MIRROR_META = "mirror_meta";
    private static final String[] MIRRORED = {"meals", "measurements", "habits", "chats"};

    public SyncDatabase(Context context) { super(context, NAME, null, VERSION); }

    @Override public void onCreate(SQLiteDatabase db) {
        db.execSQL("CREATE TABLE IF NOT EXISTS " + TABLE + " ("
                + "_id INTEGER PRIMARY KEY AUTOINCREMENT,"
                + "source TEXT NOT NULL,"
                + "source_id TEXT NOT NULL,"
                + "record_type TEXT NOT NULL,"
                + "record_date TEXT NOT NULL,"
                + "start_time INTEGER,"
                + "end_time INTEGER,"
                + "value REAL,"
                + "unit TEXT,"
                + "title TEXT,"
                + "updated_at INTEGER NOT NULL,"
                + "deleted INTEGER NOT NULL DEFAULT 0,"
                + "payload TEXT,"
                + "UNIQUE(source, source_id, record_type))");
        db.execSQL("CREATE INDEX IF NOT EXISTS external_records_date ON " + TABLE + "(record_date)");
        createMirror(db);
    }

    @Override public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
        if (oldVersion < 1) onCreate(db);
        else if (oldVersion < 2) createMirror(db);
    }

    private static void createMirror(SQLiteDatabase db) {
        // One row per record: the payload is the record itself, so a future read path can rebuild
        // every collection without guessing at columns.
        db.execSQL("CREATE TABLE IF NOT EXISTS " + MIRROR + " ("
                + "collection TEXT NOT NULL,"
                + "record_id TEXT NOT NULL,"
                + "record_date TEXT,"
                + "position INTEGER NOT NULL,"
                + "updated_at INTEGER NOT NULL,"
                + "payload TEXT NOT NULL,"
                + "PRIMARY KEY(collection, record_id))");
        db.execSQL("CREATE INDEX IF NOT EXISTS mirror_records_date ON " + MIRROR + "(collection, record_date)");
        db.execSQL("CREATE TABLE IF NOT EXISTS " + MIRROR_META + " (key TEXT PRIMARY KEY, value TEXT NOT NULL)");
    }

    /**
     * Brings the mirror in step with the current JSON snapshot inside one transaction. The table is
     * keyed by (collection, record_id), so a save only touches what actually changed: new and
     * modified records are upserted, records that disappeared are deleted, and rows whose payload
     * is byte-identical are left alone — a save no longer rewrites the whole table.
     */
    public void mirrorAll(org.json.JSONObject state) throws Exception {
        SQLiteDatabase db = getWritableDatabase();
        long now = System.currentTimeMillis();
        db.beginTransaction();
        try {
            ContentValues values = new ContentValues();
            for (String collection : MIRRORED) {
                JSONArray records = state == null ? null : state.optJSONArray(collection);
                int count = records == null ? 0 : records.length();
                // What this collection should hold after the pass; anything else is gone.
                java.util.Set<String> wantedIds = new java.util.HashSet<>(count);
                for (int i = 0; i < count; i++) {
                    JSONObject record = records.optJSONObject(i);
                    if (record == null) continue;
                    String id = record.optString("id", "");
                    if (id.isEmpty()) id = collection + "-" + i;
                    wantedIds.add(id);
                    String payload = record.toString();
                    String date = record.optString("date", record.optString("day", ""));
                    Cursor cursor = db.query(MIRROR, new String[]{"payload", "position"}, "collection=? AND record_id=?", new String[]{collection, id}, null, null, null);
                    boolean unchanged = false;
                    try { if (cursor.moveToFirst()) unchanged = payload.equals(cursor.getString(0)) && cursor.getInt(1) == i; } finally { cursor.close(); }
                    if (unchanged) continue;
                    values.clear();
                    values.put("collection", collection);
                    values.put("record_id", id);
                    values.put("record_date", date);
                    values.put("position", i);
                    values.put("updated_at", now);
                    values.put("payload", payload);
                    db.insertWithOnConflict(MIRROR, null, values, SQLiteDatabase.CONFLICT_REPLACE);
                }
                // Drop rows whose record no longer exists in the JSON.
                java.util.List<String> gone = new java.util.ArrayList<>();
                Cursor ids = db.query(MIRROR, new String[]{"record_id"}, "collection=?", new String[]{collection}, null, null, null);
                try { while (ids.moveToNext()) { String id = ids.getString(0); if (!wantedIds.contains(id)) gone.add(id); } } finally { ids.close(); }
                for (String id : gone) db.delete(MIRROR, "collection=? AND record_id=?", new String[]{collection, id});
            }
            db.setTransactionSuccessful();
        } finally {
            db.endTransaction();
        }
        ContentValues meta = new ContentValues();
        meta.put("key", "lastMirroredAt");
        meta.put("value", String.valueOf(System.currentTimeMillis()));
        db.insertWithOnConflict(MIRROR_META, null, meta, SQLiteDatabase.CONFLICT_REPLACE);
    }

    public long lastMirroredAt() {
        Cursor cursor = getReadableDatabase().query(MIRROR_META, new String[]{"value"}, "key=?", new String[]{"lastMirroredAt"}, null, null, null);
        try {return cursor.moveToFirst() ? parseLong(cursor.getString(0)) : 0L;}
        catch (Exception e) {return 0L;}
        finally {cursor.close();}
    }

    private static long parseLong(String value) {
        try {return Long.parseLong(value);} catch (Exception e) {return 0L;}
    }

    /** {meals: n, measurements: n, habits: n, chats: n} straight from the mirror table. */
    public org.json.JSONObject mirrorCounts() throws Exception {
        org.json.JSONObject out = new org.json.JSONObject();
        for (String collection : MIRRORED) {
            Cursor cursor = getReadableDatabase().rawQuery("SELECT COUNT(*) FROM " + MIRROR + " WHERE collection=?", new String[]{collection});
            try {out.put(collection, cursor.moveToFirst() ? cursor.getInt(0) : 0);}
            finally {cursor.close();}
        }
        return out;
    }

    public void upsert(JSONObject record) {
        if (record == null) return;
        ContentValues values = new ContentValues();
        values.put("source", text(record, "source", "health_connect"));
        values.put("source_id", text(record, "sourceId", ""));
        values.put("record_type", text(record, "type", ""));
        values.put("record_date", text(record, "date", ""));
        values.put("start_time", longOrNull(record, "startTime"));
        values.put("end_time", longOrNull(record, "endTime"));
        values.put("value", doubleOrNull(record, "value"));
        values.put("unit", text(record, "unit", ""));
        values.put("title", text(record, "title", ""));
        values.put("updated_at", longOrNull(record, "updatedAt") == null ? System.currentTimeMillis() : longOrNull(record, "updatedAt"));
        values.put("deleted", record.optBoolean("deleted", false) ? 1 : 0);
        values.put("payload", record.optString("payload", ""));
        getWritableDatabase().insertWithOnConflict(TABLE, null, values, SQLiteDatabase.CONFLICT_REPLACE);
    }

    public void delete(String source, String sourceId, String type) {
        getWritableDatabase().delete(TABLE, "source=? AND source_id=? AND record_type=?", new String[]{source, sourceId, type});
    }

    public JSONArray queryRecent(int limit) throws Exception {
        JSONArray out = new JSONArray();
        Cursor cursor = getReadableDatabase().query(TABLE, null, "deleted=0", null, null, null, "record_date DESC, updated_at DESC", String.valueOf(Math.max(1, Math.min(limit, 5000))));
        try {
            while (cursor.moveToNext()) {
                JSONObject row = new JSONObject();
                row.put("source", cursor.getString(cursor.getColumnIndexOrThrow("source")));
                row.put("sourceId", cursor.getString(cursor.getColumnIndexOrThrow("source_id")));
                row.put("type", cursor.getString(cursor.getColumnIndexOrThrow("record_type")));
                row.put("date", cursor.getString(cursor.getColumnIndexOrThrow("record_date")));
                if (!cursor.isNull(cursor.getColumnIndexOrThrow("startTime"))) row.put("startTime", cursor.getLong(cursor.getColumnIndexOrThrow("startTime")));
                if (!cursor.isNull(cursor.getColumnIndexOrThrow("endTime"))) row.put("endTime", cursor.getLong(cursor.getColumnIndexOrThrow("endTime")));
                if (!cursor.isNull(cursor.getColumnIndexOrThrow("value"))) row.put("value", cursor.getDouble(cursor.getColumnIndexOrThrow("value")));
                row.put("unit", cursor.getString(cursor.getColumnIndexOrThrow("unit")));
                row.put("title", cursor.getString(cursor.getColumnIndexOrThrow("title")));
                row.put("updatedAt", cursor.getLong(cursor.getColumnIndexOrThrow("updated_at")));
                row.put("payload", cursor.getString(cursor.getColumnIndexOrThrow("payload")));
                out.put(row);
            }
        } finally { cursor.close(); }
        return out;
    }

    public int count() {
        Cursor cursor = getReadableDatabase().rawQuery("SELECT COUNT(*) FROM " + TABLE + " WHERE deleted=0", null);
        try { return cursor.moveToFirst() ? cursor.getInt(0) : 0; }
        finally { cursor.close(); }
    }

    private static String text(JSONObject object, String key, String fallback) {
        String value = object.optString(key, fallback);
        return value == null ? fallback : value;
    }

    private static Long longOrNull(JSONObject object, String key) {
        Object value = object.opt(key);
        return value instanceof Number ? ((Number)value).longValue() : null;
    }

    private static Double doubleOrNull(JSONObject object, String key) {
        Object value = object.opt(key);
        return value instanceof Number && Double.isFinite(((Number)value).doubleValue()) ? ((Number)value).doubleValue() : null;
    }
}

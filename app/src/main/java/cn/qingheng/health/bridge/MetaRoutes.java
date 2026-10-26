package cn.qingheng.health.bridge;

import org.json.JSONObject;

/**
 * The first extracted route group: the small "meta" endpoints that describe the app rather than the
 * user's records.
 *
 * Why this shape: the activity is a 3k-line monolith, and the cheapest safe way to shrink it is to
 * move one cohesive group behind a narrow interface. {@link Host} is deliberately tiny -- five
 * operations, all already implemented by MainActivity -- so the extraction cannot drag the activity's
 * internals along with it. The next groups (records, media, ai) can follow the same pattern.
 *
 * Returning null means "this group does not own that path", which keeps the caller's dispatch a
 * simple if-null chain instead of a registry with implicit ordering.
 */
public final class MetaRoutes {
    private MetaRoutes() { }

    /** What the meta routes need from the app; implemented by the activity. */
    public interface Host {
        JSONObject versions() throws Exception;
        JSONObject backupStatus() throws Exception;
        JSONObject recordBackup(int records) throws Exception;
        JSONObject storedAnchors() throws Exception;
        JSONObject saveAnchors(String summary) throws Exception;
    }

    /**
     * Handles /api/versions, /api/backup and /api/anchors.
     *
     * @return the response, or null when the path belongs to another group.
     */
    public static JSONObject handle(String path, boolean get, boolean post, JSONObject body, Host host) throws Exception {
        if (path == null || host == null) return null;
        if (path.equals("/api/versions")) {
            if (!get) return null;
            return host.versions();
        }
        if (path.equals("/api/backup")) {
            if (get) return host.backupStatus();
            if (post) return host.recordBackup(Math.max(0, body == null ? 0 : body.optInt("records", 0)));
            return null;
        }
        if (path.equals("/api/anchors")) {
            if (get) return host.storedAnchors();
            if (post) {
                String summary = body == null ? "" : body.optString("summary", "").trim();
                if (summary.length() > 4000) throw new IllegalArgumentException("锚点文本过长（上限 4000 字符）");
                return host.saveAnchors(summary);
            }
        }
        return null;
    }
}

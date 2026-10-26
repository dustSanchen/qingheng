package cn.qingheng.health.bridge;

import org.json.JSONObject;

/**
 * Third extracted route group: the records the user owns — the four collections
 * (meals / measurements / habits / chats), the profile and the portable preferences.
 *
 * Same narrow-Host shape as {@link MetaRoutes} and {@link PushRoutes}: the dispatch leaves the
 * activity while the handler bodies stay behind until their own extraction round. Returning null
 * means "this group does not own that path", so a method mismatch falls through to the caller's
 * unsupported error exactly as before.
 */
public final class RecordsRoutes {
    private RecordsRoutes() { }

    /** What the record routes need from the app; implemented by the activity. */
    public interface Host {
        Object collections(String path, boolean get, boolean post, boolean del, JSONObject body) throws Exception;
        Object profile(boolean get, JSONObject body) throws Exception;
        Object prefs(boolean get, JSONObject body) throws Exception;
    }

    /** Handles /api/prefs, /api/profile and the four /api/<collection> CRUD paths. */
    public static Object handle(String path, boolean get, boolean post, boolean del, JSONObject body, Host host) throws Exception {
        if (path == null || host == null) return null;
        if (path.equals("/api/prefs")) {
            if (get || post) return host.prefs(get, body);
            return null;
        }
        if (path.equals("/api/profile")) {
            if (get || post) return host.profile(get, body);
            return null;
        }
        for (String collection : new String[]{"meals", "measurements", "habits", "chats"}) {
            String base = "/api/" + collection;
            if (path.equals(base) || path.startsWith(base + "/")) return host.collections(path, get, post, del, body);
        }
        return null;
    }
}

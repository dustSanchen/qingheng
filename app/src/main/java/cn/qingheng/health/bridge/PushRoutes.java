package cn.qingheng.health.bridge;

import org.json.JSONObject;

/**
 * Second extracted route group: the daily-push and notification endpoints.
 *
 * Same shape as {@link MetaRoutes}: a narrow Host interface over operations that already live in
 * the activity, and null meaning "this group does not own that path", so a method mismatch falls
 * through to the caller's final "unsupported" error exactly as before. The handler bodies (settings
 * storage, the scheduler, the notification manager) stay in the activity until their own
 * extraction round; only the dispatch leaves.
 */
public final class PushRoutes {
    private PushRoutes() { }

    /** What the push routes need from the app; implemented by the activity. */
    public interface Host {
        JSONObject pushSettings() throws Exception;
        JSONObject savePush(JSONObject body) throws Exception;
        JSONObject pushHistory() throws Exception;
        JSONObject notificationTest() throws Exception;
        JSONObject notificationPermissionState() throws Exception;
        JSONObject notificationPermissionStateAsync() throws Exception;
    }

    /** Handles /api/push, /api/push-history, /api/notification-test, /api/notification-permission. */
    public static JSONObject handle(String path, boolean get, boolean post, JSONObject body, Host host) throws Exception {
        if (path == null || host == null) return null;
        if (path.equals("/api/push")) {
            if (get) return host.pushSettings();
            if (post) return host.savePush(body);
            return null;
        }
        if (path.equals("/api/push-history")) {
            if (!get) return null;
            return host.pushHistory();
        }
        if (path.equals("/api/notification-test")) {
            if (!post) return null;
            return host.notificationTest();
        }
        if (path.equals("/api/notification-permission")) {
            if (get) return host.notificationPermissionState();
            if (post) return host.notificationPermissionStateAsync();
            return null;
        }
        return null;
    }
}

package cn.qingheng.health;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;

/**
 * One place that builds the daily-analysis notification, shared by the alarm receiver and the
 * bridge's notification self-test. Uses platform Notification.Builder only (minSdk 26), so no
 * AndroidX compat dependency is required.
 */
public final class PushNotify {
    public static final String CHANNEL_ID = "qingheng_daily";
    public static final String CHANNEL_NAME = "每日饮食分析";
    /** Stable per-slot ids so a repeated run replaces its own notification instead of stacking. */
    public static final int ID_MORNING = 7301, ID_EVENING = 7302, ID_TEST = 7303, ID_MEAL = 7304;
    public static final String ACTION_OPEN_CHAT = "cn.qingheng.health.OPEN_CHAT";

    private PushNotify() { }

    /** POST_NOTIFICATIONS only exists from API 33; older releases post without a runtime grant. */
    public static boolean notificationsGranted(Context context) {
        if (android.os.Build.VERSION.SDK_INT < 33) return true;
        return context.checkSelfPermission("android.permission.POST_NOTIFICATIONS") == PackageManager.PERMISSION_GRANTED;
    }

    public static void ensureChannel(Context context) {
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (manager == null || manager.getNotificationChannel(CHANNEL_ID) != null) return;
        NotificationChannel channel = new NotificationChannel(CHANNEL_ID, CHANNEL_NAME, NotificationManager.IMPORTANCE_HIGH);
        channel.setDescription("每日饮食分析提醒");
        channel.setShowBadge(true);
        manager.createNotificationChannel(channel);
    }

    public static int slotId(String slot) {
        if ("evening".equals(slot)) return ID_EVENING;
        if ("meal".equals(slot)) return ID_MEAL;
        return ID_MORNING;
    }

    public static String title(String slot) {
        if ("evening".equals(slot)) return "轻衡 · 晚间分析";
        if ("meal".equals(slot)) return "轻衡 · 这一餐的反馈";
        return "轻衡 · 早间分析";
    }

    /**
     * Post the analysis notification. {@code shortBody} is what the collapsed shade shows (one line
     * on MIUI); {@code fullBody} is revealed on expand and when the notification is long-pressed.
     * Returns false when there is no permission or no manager, so a caller in the background never
     * throws and never claims the user was notified.
     */
    public static boolean post(Context context, String slot, String shortBody) {
        return post(context, slot, shortBody, shortBody);
    }

    public static boolean post(Context context, String slot, String shortBody, String fullBody) {
        if (!notificationsGranted(context)) return false;
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (manager == null) return false;
        ensureChannel(context);
        String title = title(slot);
        Intent open = new Intent(context, MainActivity.class);
        open.setAction(ACTION_OPEN_CHAT);
        open.putExtra("tab", "chat");
        open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        int flags = PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT;
        PendingIntent contentIntent = PendingIntent.getActivity(context, slotId(slot), open, flags);
        CharSequence text = shortBody == null || shortBody.isEmpty() ? fullBody : shortBody;
        CharSequence expanded = fullBody == null || fullBody.isEmpty() ? text : fullBody;
        Notification.Builder builder = new Notification.Builder(context, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_launcher)
                .setContentTitle(title)
                .setContentText(text)
                .setStyle(new Notification.BigTextStyle().bigText(expanded))
                .setContentIntent(contentIntent)
                .setAutoCancel(true)
                .setCategory(Notification.CATEGORY_REMINDER);
        manager.notify(slotId(slot), builder.build());
        return true;
    }

    /** Sample notification used by the settings UI to confirm that push actually reaches the shade. */
    public static boolean postSelfTest(Context context) {
        return post(context, "test", "通知渠道正常，到点会给你一条简短建议。",
                "这是一条测试通知。到点后轻衡会用当天已记录的餐食做一次分析，展开这条通知可以看到完整内容，"
                        + "点开则进入问答页。");
    }
}

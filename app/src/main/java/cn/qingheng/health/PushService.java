package cn.qingheng.health;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.IBinder;

/**
 * Short foreground service that runs one push delivery, replacing the bare goAsync() thread.
 *
 * goAsync() only keeps a receiver alive for roughly ten seconds, while the model call inside
 * {@link AlarmReceiver#deliver} can legally take up to sixty; aggressive ROMs killed the process
 * mid-call and the reminder silently vanished. Since Android 14 every foreground service needs a
 * declared type, and shortService is designed exactly for this shape: startable from the
 * background, capped at about three minutes, no user grant beyond the normal FOREGROUND_SERVICE
 * permissions. Releases older than 34 keep the original receiver path, and a refused start
 * (background restriction) falls back to it as well.
 */
public class PushService extends Service {
    private static final String CHANNEL_ID = "qingheng_push_work";
    private static final int NOTIFICATION_ID = 7390;

    /** Entry used by the receiver; false means "run the legacy goAsync path instead". */
    public static boolean start(Context context, String slot) {
        if (Build.VERSION.SDK_INT < 34) return false;
        try {
            Intent intent = new Intent(context, PushService.class);
            intent.putExtra(AlarmScheduler.EXTRA_SLOT, slot);
            context.startForegroundService(intent);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    @Override public IBinder onBind(Intent intent) { return null; }

    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        String slot = intent == null ? "" : intent.getStringExtra(AlarmScheduler.EXTRA_SLOT);
        final String work = slot == null ? "" : slot;
        startInForeground();
        new Thread(() -> {
            try {
                if (AlarmScheduler.SLOT_MORNING.equals(work) || AlarmScheduler.SLOT_EVENING.equals(work)
                        || AlarmScheduler.SLOT_MEAL.equals(work) || AlarmScheduler.SLOT_WEEKLY.equals(work)) {
                    AlarmReceiver.deliver(PushService.this, work);
                }
            } catch (Exception ignored) {
            } finally {
                stopQuietly();
            }
        }, "qingheng-push-service").start();
        return START_NOT_STICKY;
    }

    private void startInForeground() {
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (Build.VERSION.SDK_INT >= 26 && manager != null && manager.getNotificationChannel(CHANNEL_ID) == null) {
            NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "后台整理提醒", NotificationManager.IMPORTANCE_MIN);
            channel.setDescription("生成每日提醒时短暂显示，完成后自动消失");
            channel.setShowBadge(false);
            manager.createNotificationChannel(channel);
        }
        Notification notification = new Notification.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_launcher)
                .setContentTitle("轻衡")
                .setContentText("正在生成今日提醒…")
                .setOngoing(true)
                .build();
        if (Build.VERSION.SDK_INT >= 34) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SHORT_SERVICE);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }
    }

    /** The system cap for shortService is a few minutes; leaving cleanly is required, not optional. */
    @Override public void onTimeout(int startId) { stopQuietly(); }

    @Override public void onTimeout(int startId, int fgsType) { stopQuietly(); }

    private void stopQuietly() {
        try { stopForeground(STOP_FOREGROUND_REMOVE); } catch (Exception ignored) { }
        try { stopSelf(); } catch (Exception ignored) { }
    }
}

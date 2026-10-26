package cn.qingheng.health;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Re-arms daily alarms after a reboot or app update without exposing the alarm tick receiver. */
public final class BootReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context, Intent intent) {
        if (context == null || intent == null) return;
        String action = intent.getAction();
        if (!Intent.ACTION_BOOT_COMPLETED.equals(action) && !Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)) return;
        try { AlarmScheduler.rescheduleIfEnabled(context.getApplicationContext()); }
        catch (Exception ignored) { }
    }
}

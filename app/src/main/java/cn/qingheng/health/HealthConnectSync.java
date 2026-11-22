package cn.qingheng.health;

import android.content.Context;
import android.content.pm.PackageManager;
import android.health.connect.HealthConnectException;
import android.health.connect.HealthConnectManager;
import android.health.connect.LocalTimeRangeFilter;
import android.health.connect.ReadRecordsRequestUsingFilters;
import android.health.connect.ReadRecordsResponse;
import android.health.connect.datatypes.ActiveCaloriesBurnedRecord;
import android.health.connect.datatypes.DistanceRecord;
import android.health.connect.datatypes.ExerciseSessionRecord;
import android.health.connect.datatypes.Record;
import android.health.connect.datatypes.SleepSessionRecord;
import android.health.connect.datatypes.StepsRecord;
import android.os.Build;
import android.os.OutcomeReceiver;
import org.json.JSONArray;
import org.json.JSONObject;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

/** Read-only Health Connect bridge for Redmi Watch data already synced by Mi Fitness. */
public final class HealthConnectSync {
    private static final String[] READ_PERMISSIONS = {
            "android.permission.health.READ_SLEEP",
            "android.permission.health.READ_STEPS",
            "android.permission.health.READ_EXERCISE",
            "android.permission.health.READ_ACTIVE_CALORIES_BURNED",
            "android.permission.health.READ_DISTANCE"
    };
    private static final ExecutorService EXECUTOR = Executors.newSingleThreadExecutor();

    private HealthConnectSync() { }

    /** The read permissions the app must request before any Health Connect read can succeed. */
    public static String[] readPermissions() { return READ_PERMISSIONS.clone(); }

    public static boolean supported() { return Build.VERSION.SDK_INT >= 34; }

    public static boolean available(Context context) {
        return supported() && context.getSystemService(HealthConnectManager.class) != null;
    }

    public static boolean hasPermissions(Context context) {
        if (!supported()) return false;
        for (String permission : READ_PERMISSIONS)
            if (context.checkSelfPermission(permission) != PackageManager.PERMISSION_GRANTED) return false;
        return true;
    }

    public static String[] missingPermissions(Context context) {
        List<String> missing = new ArrayList<>();
        for (String permission : READ_PERMISSIONS)
            if (context.checkSelfPermission(permission) != PackageManager.PERMISSION_GRANTED) missing.add(permission);
        return missing.toArray(new String[0]);
    }

    public static JSONObject sync(Context context, int days) throws Exception {
        JSONObject result = new JSONObject();
        result.put("supported", supported());
        if (!supported()) {
            result.put("available", false).put("reason", "Android 14 以上才提供系统 Health Connect 接口");
            return result;
        }
        HealthConnectManager manager = (HealthConnectManager)context.getSystemService(HealthConnectManager.class);
        result.put("available", manager != null);
        if (manager == null) {
            result.put("reason", "系统未安装 Health Connect");
            return result;
        }
        String[] missing = missingPermissions(context);
        result.put("permissionsGranted", missing.length == 0).put("missingPermissions", new JSONArray(missing));
        if (missing.length > 0) return result;

        LocalDateTime end = LocalDateTime.now().plusDays(1);
        LocalDateTime start = LocalDate.now().minusDays(Math.max(1, days) - 1L).atStartOfDay();
        LocalTimeRangeFilter filter = new LocalTimeRangeFilter.Builder().setStartTime(start).setEndTime(end).build();
        JSONArray records = new JSONArray();
        append(records, read(manager, StepsRecord.class, filter), "steps", "steps", 1.0);
        append(records, read(manager, SleepSessionRecord.class, filter), "sleep", "hours", 1.0 / 60.0);
        append(records, read(manager, ExerciseSessionRecord.class, filter), "exercise", "minutes", 1.0);
        append(records, read(manager, ActiveCaloriesBurnedRecord.class, filter), "activeCalories", "kcal", 1.0);
        append(records, read(manager, DistanceRecord.class, filter), "distance", "meters", 1.0);
        result.put("records", records).put("count", records.length()).put("windowDays", days);
        // Per-type counts make "0 because the watch never wrote this" visible instead of a blank result.
        JSONObject counts = new JSONObject();
        for (String type : new String[]{"steps", "sleep", "exercise", "activeCalories", "distance"}) {
            int n = 0;
            for (int i = 0; i < records.length(); i++) {
                JSONObject row = records.optJSONObject(i);
                if (row != null && type.equals(row.optString("type"))) n++;
            }
            counts.put(type, n);
        }
        result.put("counts", counts);
        return result;
    }

    private static <T extends Record> List<T> read(HealthConnectManager manager, Class<T> type, LocalTimeRangeFilter filter) throws Exception {
        CompletableFuture<List<T>> future = new CompletableFuture<>();
        ReadRecordsRequestUsingFilters<T> request = new ReadRecordsRequestUsingFilters.Builder<T>(type)
                .setTimeRangeFilter(filter).setPageSize(1000).setAscending(true).build();
        manager.readRecords(request, EXECUTOR, new OutcomeReceiver<ReadRecordsResponse<T>, HealthConnectException>() {
            @Override public void onResult(ReadRecordsResponse<T> response) { future.complete(response.getRecords()); }
            @Override public void onError(HealthConnectException error) { future.completeExceptionally(error); }
        });
        try {
            return future.get(20, TimeUnit.SECONDS);
        } catch (java.util.concurrent.ExecutionException wrapped) {
            // Unwrap, otherwise callers only ever see ExecutionException and lose the Health Connect
            // error code, which is the one piece of information that explains the failure.
            Throwable cause = wrapped.getCause();
            if (cause instanceof HealthConnectException) throw (HealthConnectException) cause;
            if (cause instanceof Exception) throw (Exception) cause;
            throw wrapped;
        }
    }

    private static void append(JSONArray out, List<? extends Record> records, String type, String unit, double scale) throws Exception {
        for (Record record : records) {
            JSONObject row = new JSONObject();
            row.put("source", "health_connect");
            row.put("sourceId", record.getMetadata().getId());
            row.put("type", type);
            row.put("unit", unit);
            row.put("updatedAt", record.getMetadata().getLastModifiedTime() == null ? System.currentTimeMillis() : record.getMetadata().getLastModifiedTime().toEpochMilli());
            if (record instanceof StepsRecord) {
                StepsRecord value = (StepsRecord)record;
                row.put("date", date(value.getStartTime())).put("startTime", value.getStartTime().toEpochMilli()).put("endTime", value.getEndTime().toEpochMilli()).put("value", value.getCount() * scale);
            } else if (record instanceof SleepSessionRecord) {
                SleepSessionRecord value = (SleepSessionRecord)record;
                row.put("date", date(value.getStartTime())).put("startTime", value.getStartTime().toEpochMilli()).put("endTime", value.getEndTime().toEpochMilli())
                        .put("value", Duration.between(value.getStartTime(), value.getEndTime()).toMinutes() * scale)
                        .put("title", value.getTitle() == null ? "" : value.getTitle().toString());
            } else if (record instanceof ExerciseSessionRecord) {
                ExerciseSessionRecord value = (ExerciseSessionRecord)record;
                row.put("date", date(value.getStartTime())).put("startTime", value.getStartTime().toEpochMilli()).put("endTime", value.getEndTime().toEpochMilli())
                        .put("value", Duration.between(value.getStartTime(), value.getEndTime()).toMinutes() * scale)
                        .put("exerciseType", value.getExerciseType()).put("title", value.getTitle() == null ? "" : value.getTitle().toString());
            } else if (record instanceof ActiveCaloriesBurnedRecord) {
                ActiveCaloriesBurnedRecord value = (ActiveCaloriesBurnedRecord)record;
                row.put("date", date(value.getStartTime())).put("startTime", value.getStartTime().toEpochMilli()).put("endTime", value.getEndTime().toEpochMilli())
                        .put("value", value.getEnergy().getInCalories() * scale);
            } else if (record instanceof DistanceRecord) {
                DistanceRecord value = (DistanceRecord)record;
                row.put("date", date(value.getStartTime())).put("startTime", value.getStartTime().toEpochMilli()).put("endTime", value.getEndTime().toEpochMilli())
                        .put("value", value.getDistance().getInMeters() * scale);
            }
            out.put(row);
        }
    }

    private static String date(java.time.Instant instant) {
        return instant.atZone(ZoneId.systemDefault()).toLocalDate().toString();
    }
}

package cn.qingheng.health;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

/**
 * AndroidKeyStore-backed storage for provider API keys.
 *
 * Storage format is unchanged from the original inline implementation: the ciphertext lives in
 * SharedPreferences "provider_secrets" under "key.&lt;provider&gt;" as "ivBase64:cipherBase64",
 * encrypted with AES/GCM/NoPadding under the non-exportable alias "qingheng.api.v1".
 * Keys are never written to state.json and never leave the device.
 */
public final class SecretStore {
    /** SharedPreferences file that holds both provider config and the encrypted keys. */
    public static final String PREFS = "provider_secrets";
    public static final String KEY_ALIAS = "qingheng.api.v1";

    private SecretStore() { }

    public static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    /** Encrypt a freshly supplied key for storage. */
    public static String encrypt(Context context, String value) throws Exception {
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.ENCRYPT_MODE, secretKey());
        byte[] bytes = cipher.doFinal(value.getBytes(StandardCharsets.UTF_8));
        return Base64.encodeToString(cipher.getIV(), Base64.NO_WRAP) + ":" + Base64.encodeToString(bytes, Base64.NO_WRAP);
    }

    /**
     * Normalise a pasted key. Copying from a web page frequently brings invisible characters
     * (NO-BREAK SPACE U+00A0, BOM U+FEFF, zero-width joiners) or wrapping quotes. Java's \s does
     * not match those, so an unclean key used to be stored and then rejected by the provider as
     * HTTP 401. Order matters: strip an optional "Bearer " prefix before removing spaces.
     */
    public static String sanitize(String raw) {
        if (raw == null) return "";
        String value = raw.replace("\uFEFF", "").replace("\u200B", "").replace("\u200C", "").replace("\u200D", "");
        value = value.replace("\u00A0", " ").replace("\u3000", " ").trim();
        if (value.regionMatches(true, 0, "Bearer", 0, 6)) value = value.substring(6).trim();
        if (value.length() >= 2) {
            char first = value.charAt(0), last = value.charAt(value.length() - 1);
            if ((first == '"' && last == '"') || (first == '\'' && last == '\'')) value = value.substring(1, value.length() - 1);
        }
        StringBuilder out = new StringBuilder(value.length());
        for (int i = 0; i < value.length(); i++) {
            char c = value.charAt(i);
            if (Character.isWhitespace(c) || Character.isSpaceChar(c)) continue;
            out.append(c);
        }
        return out.toString();
    }

    /** True when the stored value still contains characters sanitize() would remove. */
    public static boolean needsCleaning(String raw) {
        return raw != null && !raw.isEmpty() && !raw.equals(sanitize(raw));
    }

    /** Decrypt the stored key for the given provider. Error text is user-facing and key-free. */
    public static String decrypt(Context context, String provider) throws Exception {
        String stored = prefs(context).getString("key." + provider, "");
        if (stored == null || stored.isEmpty()) throw new PublicError("未配置 API 密钥，可使用前端离线估算");
        try {
            String[] parts = stored.split(":", -1);
            if (parts.length != 2) throw new IllegalArgumentException("bad record");
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, secretKey(), new GCMParameterSpec(128, Base64.decode(parts[0], Base64.NO_WRAP)));
            return new String(cipher.doFinal(Base64.decode(parts[1], Base64.NO_WRAP)), StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new PublicError("密钥不可用，请重新配置");
        }
    }

    private static SecretKey secretKey() throws Exception {
        KeyStore store = KeyStore.getInstance("AndroidKeyStore"); store.load(null);
        if (store.containsAlias(KEY_ALIAS)) return (SecretKey)store.getKey(KEY_ALIAS, null);
        KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
        generator.init(new KeyGenParameterSpec.Builder(KEY_ALIAS, KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setRandomizedEncryptionRequired(true).build());
        return generator.generateKey();
    }
}

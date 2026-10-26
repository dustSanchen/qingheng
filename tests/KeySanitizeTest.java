import cn.qingheng.health.SecretStore;

/** Runs the real sanitizer from the app, not a copy of it. */
public class KeySanitizeTest {
    private static int failed = 0;

    private static void check(String label, String input, String expected) {
        String actual = SecretStore.sanitize(input);
        boolean ok = expected.equals(actual);
        if (!ok) failed++;
        System.out.println((ok ? "OK   " : "FAIL ") + label + " -> [" + actual + "]");
    }

    public static void main(String[] args) {
        check("plain", "sk-abc123def", "sk-abc123def");
        check("ascii spaces trimmed", "  sk-abc123def \n", "sk-abc123def");
        check("nbsp removed", "sk-abc\u00A0123def", "sk-abc123def");
        check("bom removed", "\uFEFFsk-abc123def", "sk-abc123def");
        check("zero-width removed", "sk-abc\u200B123\u200Ddef", "sk-abc123def");
        check("ideographic space removed", "sk-abc\u3000123def", "sk-abc123def");
        check("bearer prefix", "Bearer sk-abc123def", "sk-abc123def");
        check("lowercase bearer", "bearer sk-abc123def", "sk-abc123def");
        check("double quotes", "\"sk-abc123def\"", "sk-abc123def");
        check("single quotes", "'sk-abc123def'", "sk-abc123def");
        check("bom plus bearer", "\uFEFFBearer sk-abc123def\n", "sk-abc123def");
        check("empty", "", "");
        check("null", null, "");
        check("internal ascii space", "sk-abc 123def", "sk-abc123def");

        boolean cleanPlain = SecretStore.needsCleaning("sk-abc123def");
        boolean cleanDirty = SecretStore.needsCleaning("sk-abc\u00A0123def");
        if (cleanPlain) { failed++; System.out.println("FAIL needsCleaning reported a clean key"); }
        else System.out.println("OK   clean key is not flagged");
        if (!cleanDirty) { failed++; System.out.println("FAIL needsCleaning missed an NBSP key"); }
        else System.out.println("OK   contaminated key is flagged");

        System.out.println(failed == 0 ? "SANITIZE TESTS PASSED" : "SANITIZE TESTS FAILED: " + failed);
        System.exit(failed == 0 ? 0 : 1);
    }
}

package cn.qingheng.health;

import org.json.JSONArray;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.URI;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import javax.net.ssl.HttpsURLConnection;

/**
 * Public web lookup for the Q&A feature. Only the search words leave the phone; no health record,
 * photo or API key is ever part of these requests.
 *
 * Fallback order (contracted open APIs first, HTML scraping last):
 *   1. Baidu Baike (official lemma-card API) and PubMed (NCBI E-utilities).
 *   2. If PubMed is unreachable: Europe PMC.
 *   3. Only when all of the above yield nothing: Bing web results (cn.bing.com). A failed request,
 *      a captcha/verification page, or a page that parses to zero results all count as "Bing failed".
 *   4. If everything fails the result is {connected:false}; callers must say so and must not
 *      invent sources.
 *
 * Contract status: Baike/PubMed/Europe PMC are documented open endpoints; Bing is HTML parsing
 * with NO API contract, so a page redesign can break it at any time — the failure is caught and
 * reported as a tried step, never fabricated results. That is why Bing runs last.
 *
 * Every entry carries a real title, https link and snippet taken from the response, nothing else.
 */
public final class WebSearch {
    private static final int LIMIT = 1024 * 1024;
    private static final int MAX_PER_SOURCE = 4;
    private static final int MAX_TOTAL = 6;
    private static final int SNIPPET = 360;
    /** Total time budget for one lookup, so the chat request never waits on a dead network. */
    private static final long BUDGET_MS = 30000;
    private static final String BROWSER_AGENT =
            "Mozilla/5.0 (Linux; Android 15; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36";
    private static final String API_AGENT = "Qingheng/1.0 (personal health journal)";
    private static final Pattern CAPTCHA = Pattern.compile(
            "captcha|unusual traffic|are you a robot|verify you are human|\u8bf7\u5b8c\u6210.{0,6}\u9a8c\u8bc1|\u5b89\u5168\u9a8c\u8bc1|\u4eba\u673a\u9a8c\u8bc1|\u5f02\u5e38\u6d41\u91cf",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern BING_ITEM = Pattern.compile("<li class=\"b_algo\".*?</li>", Pattern.DOTALL);
    private static final Pattern BING_HEAD = Pattern.compile(
            "<div class=\"b_algoheader\"><a href=\"([^\"]+)\"[^>]*>.*?<h2[^>]*>(.*?)</h2>", Pattern.DOTALL);
    private static final Pattern BING_SNIPPET = Pattern.compile("<p[^>]*class=\"b_lineclamp[^\"]*\"[^>]*>(.*?)</p>", Pattern.DOTALL);

    private WebSearch() { }

    /** One lookup. Network trouble is reported inside the result and never thrown. */
    public static JSONObject search(String query) {
        String q = query == null ? "" : query.trim();
        JSONArray tried = new JSONArray();
        if (q.length() > 200) q = q.substring(0, 200);
        if (q.isEmpty()) return outcome(false, "", new ArrayList<JSONObject>(), tried);
        final long start = System.currentTimeMillis();

        // Contracted open APIs first — they fail loudly and legally.
        List<JSONObject> baike = new ArrayList<>(), papers = new ArrayList<>();
        try {
            baike = baidu(q, start);
            tried.put(step("\u767e\u5ea6\u767e\u79d1", baike.isEmpty() ? "empty" : "ok", baike.isEmpty() ? "\u6ca1\u6709\u5bf9\u5e94\u8bcd\u6761" : ""));
        } catch (Exception e) {
            tried.put(step("\u767e\u5ea6\u767e\u79d1", "failed", "\u8fde\u63a5\u5931\u8d25"));
        }
        boolean pubmedFailed = false;
        try {
            papers = pubmed(q, start);
            tried.put(step("PubMed", papers.isEmpty() ? "empty" : "ok", papers.isEmpty() ? "\u6ca1\u6709\u5339\u914d\u6587\u732e" : ""));
        } catch (Exception e) {
            pubmedFailed = true;
            tried.put(step("PubMed", "failed", "\u8fde\u63a5\u5931\u8d25"));
        }
        if (pubmedFailed) {
            try {
                papers = europePmc(q, start);
                tried.put(step("Europe PMC", papers.isEmpty() ? "empty" : "ok", papers.isEmpty() ? "\u6ca1\u6709\u5339\u914d\u6587\u732e" : ""));
            } catch (Exception e) {
                papers = new ArrayList<>();
                tried.put(step("Europe PMC", "failed", "\u8fde\u63a5\u5931\u8d25"));
            }
        }
        List<JSONObject> merged = new ArrayList<>(baike);
        merged.addAll(papers);
        if (merged.size() > MAX_TOTAL) merged = new ArrayList<>(merged.subList(0, MAX_TOTAL));
        StringBuilder via = new StringBuilder();
        if (!baike.isEmpty()) via.append("\u767e\u5ea6\u767e\u79d1");
        if (!papers.isEmpty()) via.append(via.length() > 0 ? "\u3001" : "").append(papers.get(0).optString("source"));
        if (!merged.isEmpty()) return outcome(true, via.toString(), merged, tried);

        // Bing last: HTML parsing without an API contract, so a page redesign cannot break the
        // sources above — it can only ever affect this fallback.
        List<JSONObject> found = new ArrayList<>();
        try {
            found = bing(q, start);
            tried.put(step("\u5fc5\u5e94", found.isEmpty() ? "failed" : "ok", found.isEmpty() ? "\u672a\u89e3\u6790\u5230\u7ed3\u679c" : ""));
        } catch (Blocked e) {
            tried.put(step("\u5fc5\u5e94", "failed", e.getMessage() == null ? "\u9047\u5230\u9a8c\u8bc1\u9875\u9762" : e.getMessage()));
        } catch (Exception e) {
            tried.put(step("\u5fc5\u5e94", "failed", "\u8fde\u63a5\u5931\u8d25"));
        }
        if (!found.isEmpty()) return outcome(true, "\u5fc5\u5e94", found, tried);
        return outcome(false, via.toString(), merged, tried);
    }

    // ---- Bing -------------------------------------------------------------------------------

    private static List<JSONObject> bing(String q, long start) throws Exception {
        String url = "https://cn.bing.com/search?q=" + URLEncoder.encode(q, "UTF-8") + "&setlang=zh-Hans&count=8";
        String html = get(url, BROWSER_AGENT, "text/html,application/xhtml+xml", "zh-CN,zh;q=0.9", start);
        Matcher items = BING_ITEM.matcher(html);
        List<JSONObject> out = new ArrayList<>();
        while (items.find() && out.size() < MAX_PER_SOURCE) {
            String item = items.group();
            Matcher head = BING_HEAD.matcher(item);
            if (!head.find()) continue;
            String link = unescape(head.group(1));
            String title = clean(head.group(2));
            if (!safeLink(link) || title.isEmpty()) continue;
            Matcher snip = BING_SNIPPET.matcher(item);
            out.add(entry("\u5fc5\u5e94", title, link, snip.find() ? clean(snip.group(1)) : ""));
        }
        if (out.isEmpty() && CAPTCHA.matcher(html).find()) throw new Blocked();
        return out;
    }

    // ---- Baidu Baike: the official lemma-card API (the web pages answer 403 to apps) ---------

    private static List<JSONObject> baidu(String q, long start) throws Exception {
        String word = q.length() > 40 ? q.substring(0, 40) : q;
        String url = "https://baike.baidu.com/api/openapi/BaikeLemmaCardApi?scope=103&format=json&appid=379020&bk_length=360&bk_key="
                + URLEncoder.encode(word, "UTF-8");
        JSONObject card = new JSONObject(get(url, BROWSER_AGENT, "application/json", "zh-CN,zh;q=0.9", start));
        List<JSONObject> out = new ArrayList<>();
        String title = card.optString("title", card.optString("key", "")).trim();
        String abs = clean(card.optString("abstract", ""));
        String link = card.optString("url", "").trim().replace("http://", "https://");
        if (title.isEmpty() || abs.isEmpty() || !safeLink(link)) return out;
        out.add(entry("\u767e\u5ea6\u767e\u79d1", title, link, abs));
        return out;
    }

    // ---- PubMed (NCBI E-utilities) ------------------------------------------------------------

    private static List<JSONObject> pubmed(String q, long start) throws Exception {
        String base = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/";
        JSONObject search = new JSONObject(get(base + "esearch.fcgi?db=pubmed&retmode=json&sort=relevance&retmax=" + MAX_PER_SOURCE
                + "&term=" + URLEncoder.encode(q, "UTF-8"), API_AGENT, "application/json", null, start));
        JSONArray ids = search.getJSONObject("esearchresult").optJSONArray("idlist");
        List<JSONObject> out = new ArrayList<>();
        if (ids == null || ids.length() == 0) return out;
        StringBuilder csv = new StringBuilder();
        for (int i = 0; i < ids.length(); i++) {
            String id = ids.optString(i, "");
            if (!id.matches("\\d{1,10}")) continue;
            if (csv.length() > 0) csv.append(',');
            csv.append(id);
        }
        if (csv.length() == 0) return out;
        JSONObject summary = new JSONObject(get(base + "esummary.fcgi?db=pubmed&retmode=json&id=" + csv, API_AGENT,
                "application/json", null, start)).getJSONObject("result");
        for (String id : csv.toString().split(",")) {
            JSONObject row = summary.optJSONObject(id);
            if (row == null) continue;
            String title = clean(row.optString("title", ""));
            if (title.isEmpty()) continue;
            String date = row.optString("pubdate", "");
            String meta = clean(row.optString("fulljournalname", "")) + (date.isEmpty() ? "" : "\uff0c" + date);
            out.add(entry("PubMed", title, "https://pubmed.ncbi.nlm.nih.gov/" + id + "/", meta));
        }
        return out;
    }

    // ---- Europe PMC ---------------------------------------------------------------------------

    private static List<JSONObject> europePmc(String q, long start) throws Exception {
        JSONObject data = new JSONObject(get("https://www.ebi.ac.uk/europepmc/webservices/rest/search?format=json&resultType=core&pageSize="
                + MAX_PER_SOURCE + "&query=" + URLEncoder.encode(q, "UTF-8"), API_AGENT, "application/json", null, start));
        JSONObject list = data.optJSONObject("resultList");
        JSONArray rows = list == null ? null : list.optJSONArray("result");
        List<JSONObject> out = new ArrayList<>();
        for (int i = 0; rows != null && i < rows.length(); i++) {
            JSONObject row = rows.optJSONObject(i);
            if (row == null) continue;
            String id = row.optString("id", ""), source = row.optString("source", "");
            String title = clean(row.optString("title", ""));
            if (title.isEmpty() || !id.matches("[A-Za-z0-9]{1,24}") || !source.matches("[A-Za-z]{2,8}")) continue;
            String abs = clean(row.optString("abstractText", ""));
            String year = row.optString("pubYear", "");
            String meta = clean(row.optString("journalTitle", "")) + (year.isEmpty() ? "" : "\uff0c" + year);
            out.add(entry("Europe PMC", title, "https://europepmc.org/article/" + source + "/" + id, abs.isEmpty() ? meta : abs));
        }
        return out;
    }

    // ---- helpers ------------------------------------------------------------------------------

    /** The site refused or asked for verification (HTTP 403/429 or a captcha page). */
    static final class Blocked extends Exception {
        Blocked() { super(null, null, false, false); }
        Blocked(String why) { super(why, null, false, false); }
    }

    /** Replaceable by tests in the same package; the app always uses the real HTTPS fetch. */
    interface Fetcher { String get(String address, String agent, String accept, String language, long start) throws Exception; }
    static Fetcher fetcher = WebSearch::realGet;

    private static String get(String address, String agent, String accept, String language, long start) throws Exception {
        return fetcher.get(address, agent, accept, language, start);
    }

    private static String realGet(String address, String agent, String accept, String language, long start) throws Exception {
        if (System.currentTimeMillis() - start > BUDGET_MS) throw new Exception("budget");
        URL url = new URL(address);
        if (!"https".equals(url.getProtocol())) throw new Exception("https only");
        HttpsURLConnection conn = null;
        try {
            conn = (HttpsURLConnection) url.openConnection();
            conn.setConnectTimeout(6000); conn.setReadTimeout(8000);
            conn.setInstanceFollowRedirects(false);
            conn.setRequestMethod("GET");
            conn.setRequestProperty("User-Agent", agent);
            conn.setRequestProperty("Accept", accept);
            if (language != null) conn.setRequestProperty("Accept-Language", language);
            int code = conn.getResponseCode();
            if (code == 429) throw new Blocked("\u88ab\u9650\u6d41");
            if (code == 403) throw new Blocked("\u88ab\u62d2\u7edd\u8bbf\u95ee");
            if (code >= 300 && code < 400) throw new Exception("redirect");
            if (code < 200 || code >= 300) throw new Exception("http " + code);
            try (InputStream in = conn.getInputStream()) { return read(in); }
        } finally {
            if (conn != null) conn.disconnect();
        }
    }

    private static String read(InputStream in) throws Exception {
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        byte[] buffer = new byte[8192]; int n;
        while ((n = in.read(buffer)) != -1) {
            if (bytes.size() + n > LIMIT) break;
            bytes.write(buffer, 0, n);
        }
        return new String(bytes.toByteArray(), StandardCharsets.UTF_8);
    }

    /** Only plain https links without credentials are ever surfaced to the model or the UI. */
    private static boolean safeLink(String link) {
        try {
            URI uri = new URI(link);
            return "https".equals(uri.getScheme()) && uri.getHost() != null && uri.getRawUserInfo() == null && link.length() <= 600;
        } catch (Exception e) {
            return false;
        }
    }

    private static String unescape(String text) {
        return text.replace("&amp;", "&").replace("&quot;", "\"").replace("&#39;", "'").replace("&lt;", "<").replace("&gt;", ">");
    }

    private static String clean(String html) {
        String text = html == null ? "" : html.replaceAll("<[^>]*>", " ");
        text = unescape(text).replace("&#183;", "\u00b7").replace("&nbsp;", " ").replaceAll("&#\\d+;", " ");
        text = text.replaceAll("\\s+", " ").trim();
        return text.length() > SNIPPET ? text.substring(0, SNIPPET) : text;
    }

    private static JSONObject entry(String source, String title, String url, String snippet) {
        try {
            return new JSONObject().put("source", source).put("title", title).put("url", url).put("snippet", snippet);
        } catch (Exception e) {
            return new JSONObject();
        }
    }

    private static JSONObject step(String name, String status, String note) {
        try {
            return new JSONObject().put("source", name).put("status", status).put("note", note);
        } catch (Exception e) {
            return new JSONObject();
        }
    }

    private static JSONObject outcome(boolean connected, String via, List<JSONObject> results, JSONArray tried) {
        try {
            JSONArray rows = new JSONArray();
            for (JSONObject row : results) rows.put(row);
            return new JSONObject().put("connected", connected).put("via", via).put("results", rows).put("tried", tried);
        } catch (Exception e) {
            return new JSONObject();
        }
    }
}
package cn.qingheng.health;

/**
 * Message that is safe to show to the user. Anything thrown as a PublicError is rendered
 * verbatim by the bridge; every other exception is replaced by a generic message.
 * Never construct one of these with an API key, token or raw server body.
 */
public class PublicError extends Exception {
    public PublicError(String message) { super(message); }
}

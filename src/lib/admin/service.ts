import "server-only";

/**
 * Admin service surface. Functions take a trusted caller: route handlers and pages
 * call `requireAdmin()` / `requireAdminPage()` before invoking anything here.
 */
export * from "./orders";
export * from "./returns";
export * from "./merch";
export * from "./coupons";
export * from "./reviews";
export * from "./catalogue";
export * from "./ops";

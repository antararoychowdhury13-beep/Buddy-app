/**
 * Real analysis of how each planned integration would actually connect —
 * not a guess, a reflection of what each platform's developer program
 * genuinely offers today. Drives the Me page's per-app connection UI so the
 * "Coming soon" list is honest about *how* each one would work, not just
 * that it doesn't yet.
 *
 * authMethod meanings:
 *  - "oauth": the platform has a real OAuth2 API suitable for personal-data
 *    access. Connecting for real still needs a developer app registered on
 *    that platform (client id/secret), exactly like Google Calendar did.
 *  - "api_key": a simple API key is enough (no user consent flow), like
 *    the Weather connector.
 *  - "aggregator": Indian banks can't be OAuth'd directly — access requires
 *    going through an RBI-licensed Account Aggregator (Setu, Finvu,
 *    OneMoney), a regulated integration, not something a personal project
 *    can wire up directly.
 *  - "device_only": the data lives on-device with no server-side API
 *    (Apple HealthKit) — would need a native companion app, not a web OAuth
 *    flow at all.
 *  - "unofficial": only reverse-engineered/community APIs exist, nothing
 *    the platform actually supports or a legitimate app should rely on.
 *  - "deprecated": a public API existed but is closed to new integrations
 *    or the service itself is being discontinued.
 *  - "manual": no public API for personal data at all — the honest path is
 *    manual entry (which Buddy already supports via the facts system).
 */
export type AuthMethod = "oauth" | "api_key" | "aggregator" | "device_only" | "unofficial" | "deprecated" | "manual";

export interface IntegrationApp {
  name: string;
  authMethod: AuthMethod;
  /** Set only for authMethod "oauth" — which OAuth provider config this would use. */
  oauthProvider?: string;
  notes: string;
}

export interface IntegrationCategoryGroup {
  category: string;
  apps: IntegrationApp[];
}

export const INTEGRATION_REGISTRY: IntegrationCategoryGroup[] = [
  {
    category: "Work & Productivity",
    apps: [
      { name: "Outlook Calendar", authMethod: "oauth", oauthProvider: "microsoft", notes: "Microsoft Graph API — same OAuth2 pattern as Google Calendar." },
      { name: "Slack", authMethod: "oauth", oauthProvider: "slack", notes: "Slack Web API, standard OAuth2, widely used for exactly this." },
      { name: "Microsoft Teams", authMethod: "oauth", oauthProvider: "microsoft", notes: "Microsoft Graph API, same app registration as Outlook." },
      { name: "Zoom", authMethod: "oauth", oauthProvider: "zoom", notes: "Zoom API, OAuth2 for meeting/calendar data." },
      { name: "Notion", authMethod: "oauth", oauthProvider: "notion", notes: "Notion API, OAuth2 for integrations." },
      { name: "Asana", authMethod: "oauth", oauthProvider: "asana", notes: "Asana API, OAuth2." },
      { name: "Trello", authMethod: "api_key", notes: "Trello uses a simpler API key + token model, not full OAuth2." },
      { name: "Jira", authMethod: "oauth", oauthProvider: "atlassian", notes: "Atlassian API, OAuth2 (3LO)." },
      { name: "Monday.com", authMethod: "oauth", oauthProvider: "monday", notes: "Monday.com API, OAuth2." },
    ],
  },
  {
    category: "Email & Messaging",
    apps: [
      { name: "Gmail", authMethod: "oauth", oauthProvider: "google", notes: "Gmail API — same Google OAuth app as Calendar, different scope." },
      { name: "Outlook Mail", authMethod: "oauth", oauthProvider: "microsoft", notes: "Microsoft Graph API, same app as Outlook Calendar." },
      { name: "WhatsApp", authMethod: "manual", notes: "No public API for personal chats — WhatsApp Business API is for businesses messaging customers, not reading your own messages." },
      { name: "Telegram", authMethod: "unofficial", notes: "The Bot API can't read a personal account; real access needs the MTProto client API with a phone-number login — not a sanctioned OAuth flow." },
      { name: "Signal", authMethod: "manual", notes: "Deliberately has no public API by design (end-to-end encrypted, no server-side access)." },
      { name: "iMessage", authMethod: "manual", notes: "Apple exposes no API for iMessage data at all." },
      { name: "Discord", authMethod: "oauth", oauthProvider: "discord", notes: "Discord API, OAuth2, well documented." },
      { name: "Google Meet", authMethod: "oauth", oauthProvider: "google", notes: "Google Calendar/Meet API, same Google OAuth app." },
      { name: "Webex", authMethod: "oauth", oauthProvider: "webex", notes: "Cisco Webex API, OAuth2." },
      { name: "Skype", authMethod: "deprecated", notes: "Consumer Skype's API surface was largely folded into Teams; little left to integrate against." },
    ],
  },
  {
    category: "Commute & Maps",
    apps: [
      { name: "Google Maps", authMethod: "api_key", notes: "Google Maps Platform (Directions/Places) uses API keys, not user OAuth." },
      { name: "Apple Maps", authMethod: "api_key", notes: "Apple MapKit/Maps Server API uses signed tokens from an Apple Developer account." },
      { name: "Waze", authMethod: "manual", notes: "No public API for personal trip/traffic data." },
      { name: "Uber", authMethod: "oauth", oauthProvider: "uber", notes: "Uber API has OAuth2 for ride history, though app approval is tightly gated." },
      { name: "Ola", authMethod: "manual", notes: "No public developer API for personal ride data." },
      { name: "Rapido", authMethod: "manual", notes: "No public developer API." },
      { name: "IRCTC", authMethod: "manual", notes: "No official API for personal booking data; scraping would violate their terms." },
      { name: "Citymapper", authMethod: "manual", notes: "No public personal-data API (their API is enterprise-only)." },
      { name: "Moovit", authMethod: "manual", notes: "No public personal-data API." },
      { name: "MapmyIndia (Mappls)", authMethod: "api_key", notes: "Mappls APIs use API keys, similar to Google Maps." },
    ],
  },
  {
    category: "Finance & Banking",
    apps: [
      { name: "Google Pay", authMethod: "manual", notes: "No public API exposes personal transaction history." },
      { name: "PhonePe", authMethod: "manual", notes: "No public API for personal data." },
      { name: "Paytm", authMethod: "manual", notes: "No public API for personal data." },
      { name: "HDFC Bank", authMethod: "aggregator", notes: "Indian banks require going through an RBI-licensed Account Aggregator (Setu, Finvu, OneMoney) — a regulated integration, not a simple OAuth app." },
      { name: "ICICI Bank", authMethod: "aggregator", notes: "Same Account Aggregator framework as other Indian banks." },
      { name: "SBI YONO", authMethod: "aggregator", notes: "Same Account Aggregator framework." },
      { name: "Zerodha Kite", authMethod: "oauth", oauthProvider: "zerodha", notes: "Kite Connect API (API key + access token flow) — requires a paid Kite Connect developer subscription." },
      { name: "Groww", authMethod: "manual", notes: "No public developer API." },
      { name: "CRED", authMethod: "manual", notes: "No public developer API." },
      { name: "Splitwise", authMethod: "oauth", oauthProvider: "splitwise", notes: "Splitwise has a genuine public OAuth2 API for expense data." },
    ],
  },
  {
    category: "Health & Fitness",
    apps: [
      { name: "Apple Health", authMethod: "device_only", notes: "HealthKit data lives on-device only — needs a native iOS companion app, not a web OAuth flow." },
      { name: "Google Fit", authMethod: "oauth", oauthProvider: "google", notes: "Google Fit API (being phased into Health Connect), same Google OAuth app." },
      { name: "Fitbit", authMethod: "oauth", oauthProvider: "fitbit", notes: "Fitbit Web API, OAuth2, well documented." },
      { name: "Strava", authMethod: "oauth", oauthProvider: "strava", notes: "Strava API, OAuth2 — one of the most popular fitness integrations." },
      { name: "MyFitnessPal", authMethod: "deprecated", notes: "Their public API was closed to new developers years ago." },
      { name: "Practo", authMethod: "manual", notes: "No public developer API." },
      { name: "Tata 1mg", authMethod: "manual", notes: "No public developer API." },
      { name: "Cult.fit", authMethod: "manual", notes: "No public developer API." },
      { name: "Headspace", authMethod: "manual", notes: "No public personal-data API." },
      { name: "Calm", authMethod: "manual", notes: "No public personal-data API." },
    ],
  },
  {
    category: "Family & Home",
    apps: [
      { name: "Life360", authMethod: "manual", notes: "Explicitly no public developer API." },
      { name: "Google Family Link", authMethod: "manual", notes: "No public API for this product." },
      { name: "FamilyWall", authMethod: "manual", notes: "No public API." },
      { name: "Cozi", authMethod: "manual", notes: "No public API." },
      { name: "Amazon Alexa", authMethod: "oauth", oauthProvider: "amazon", notes: "Alexa Account Linking / Smart Home APIs use OAuth2." },
      { name: "Google Home", authMethod: "oauth", oauthProvider: "google", notes: "Google Home/Nest Device Access API, same Google identity, small one-time dev fee." },
      { name: "Ring", authMethod: "manual", notes: "No broad public developer API for personal account data." },
      { name: "Nest", authMethod: "oauth", oauthProvider: "google", notes: "Google Nest Device Access API — OAuth2, one-time developer registration fee." },
      { name: "myGate", authMethod: "manual", notes: "No public developer API." },
      { name: "NoBroker", authMethod: "manual", notes: "No public developer API." },
    ],
  },
  {
    category: "Shopping & Food",
    apps: [
      { name: "Amazon", authMethod: "manual", notes: "\"Login with Amazon\" covers identity only — order history isn't exposed via any consumer OAuth API." },
      { name: "Flipkart", authMethod: "manual", notes: "No public consumer-data API." },
      { name: "Swiggy", authMethod: "manual", notes: "No public API." },
      { name: "Zomato", authMethod: "manual", notes: "Their public API is for restaurant discovery, not personal order history." },
      { name: "BigBasket", authMethod: "manual", notes: "No public API." },
      { name: "Blinkit", authMethod: "manual", notes: "No public API." },
      { name: "Myntra", authMethod: "manual", notes: "No public API." },
      { name: "Ajio", authMethod: "manual", notes: "No public API." },
      { name: "Instacart", authMethod: "manual", notes: "Their partner API is for merchants, not personal order OAuth." },
      { name: "DoorDash", authMethod: "manual", notes: "Their developer API is merchant/business-facing, not personal order OAuth." },
    ],
  },
  {
    category: "Entertainment & Media",
    apps: [
      { name: "Spotify", authMethod: "oauth", oauthProvider: "spotify", notes: "Spotify Web API — excellent OAuth2 support, a very common integration." },
      { name: "YouTube Music", authMethod: "oauth", oauthProvider: "google", notes: "Limited official coverage via the YouTube Data API under the same Google OAuth app; most YT Music integrations are unofficial." },
      { name: "Netflix", authMethod: "manual", notes: "No public personal-data API." },
      { name: "Prime Video", authMethod: "manual", notes: "No public personal-data API." },
      { name: "Disney+ Hotstar", authMethod: "manual", notes: "No public API." },
      { name: "JioCinema", authMethod: "manual", notes: "No public API." },
      { name: "Audible", authMethod: "manual", notes: "No consumer OAuth API (owned by Amazon)." },
      { name: "Kindle", authMethod: "manual", notes: "No public API for personal library/highlights." },
      { name: "Goodreads", authMethod: "deprecated", notes: "Goodreads closed its public API to new developers in 2020." },
      { name: "Pocket", authMethod: "oauth", oauthProvider: "pocket", notes: "Pocket has a public OAuth API for saved articles, though the service itself is being discontinued by Mozilla." },
    ],
  },
  {
    category: "Travel",
    apps: [
      { name: "MakeMyTrip", authMethod: "manual", notes: "No public consumer API." },
      { name: "Booking.com", authMethod: "manual", notes: "Their API is for affiliates/partners, not personal booking OAuth." },
      { name: "Airbnb", authMethod: "manual", notes: "Their API is host/partner-facing, not guest personal-data OAuth." },
      { name: "Skyscanner", authMethod: "manual", notes: "Their API is for search/affiliate use, not personal booking history." },
      { name: "Google Flights", authMethod: "manual", notes: "No dedicated public API for personal flight data." },
      { name: "TripIt", authMethod: "oauth", oauthProvider: "tripit", notes: "TripIt has a genuine public API with OAuth for itinerary data." },
      { name: "ClearTrip", authMethod: "manual", notes: "No public API." },
      { name: "Yatra", authMethod: "manual", notes: "No public API." },
      { name: "ixigo", authMethod: "manual", notes: "No public API." },
      { name: "Expedia", authMethod: "manual", notes: "Partner API only, not personal-booking OAuth." },
    ],
  },
  {
    category: "Career & Learning",
    apps: [
      { name: "LinkedIn", authMethod: "oauth", oauthProvider: "linkedin", notes: "LinkedIn API, OAuth2 — though personal data scopes have been heavily restricted since 2015, mostly basic profile now." },
      { name: "Coursera", authMethod: "manual", notes: "No public personal-data API." },
      { name: "Udemy", authMethod: "manual", notes: "Their API is affiliate/business-facing, not personal course-progress OAuth." },
      { name: "Duolingo", authMethod: "unofficial", notes: "No official public API — only reverse-engineered community endpoints exist." },
      { name: "GitHub", authMethod: "oauth", oauthProvider: "github", notes: "GitHub API, OAuth2 — one of the most standard integrations there is." },
      { name: "Stack Overflow", authMethod: "oauth", oauthProvider: "stackexchange", notes: "Stack Exchange API has OAuth for user data." },
      { name: "Glassdoor", authMethod: "manual", notes: "No public API." },
      { name: "Naukri.com", authMethod: "manual", notes: "No public API." },
      { name: "Google Scholar", authMethod: "manual", notes: "Explicitly no official API; scraping violates their terms." },
      { name: "Medium", authMethod: "deprecated", notes: "Medium's public API has been largely closed to new integrations for years." },
    ],
  },
];

export const AUTH_METHOD_META: Record<AuthMethod, { label: string; short: string; chip: string }> = {
  oauth: { label: "OAuth available", short: "OAuth", chip: "good" },
  api_key: { label: "API key", short: "API key", chip: "iris" },
  aggregator: { label: "Regulated aggregator", short: "Aggregator", chip: "warn" },
  device_only: { label: "Device-only", short: "Device-only", chip: "violet" },
  unofficial: { label: "Unofficial only", short: "Unofficial", chip: "rose" },
  deprecated: { label: "API deprecated", short: "Deprecated", chip: "rose" },
  manual: { label: "No public API", short: "No API", chip: "" },
};

/** Fixed display order for per-category count summaries — most-actionable first. */
export const AUTH_METHOD_ORDER: AuthMethod[] = [
  "oauth",
  "api_key",
  "aggregator",
  "device_only",
  "unofficial",
  "deprecated",
  "manual",
];

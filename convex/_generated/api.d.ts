/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as audit from "../audit.js";
import type * as auth from "../auth.js";
import type * as checkins from "../checkins.js";
import type * as clerkActions from "../clerkActions.js";
import type * as crons from "../crons.js";
import type * as emailActions from "../emailActions.js";
import type * as gamification from "../gamification.js";
import type * as messages from "../messages.js";
import type * as plans from "../plans.js";
import type * as progress from "../progress.js";
import type * as push from "../push.js";
import type * as pushActions from "../pushActions.js";
import type * as rateLimit from "../rateLimit.js";
import type * as sessions from "../sessions.js";
import type * as subscriptions from "../subscriptions.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  audit: typeof audit;
  auth: typeof auth;
  checkins: typeof checkins;
  clerkActions: typeof clerkActions;
  crons: typeof crons;
  emailActions: typeof emailActions;
  gamification: typeof gamification;
  messages: typeof messages;
  plans: typeof plans;
  progress: typeof progress;
  push: typeof push;
  pushActions: typeof pushActions;
  rateLimit: typeof rateLimit;
  sessions: typeof sessions;
  subscriptions: typeof subscriptions;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};

/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  auth: {
    getUserId: FunctionReference<"query", "public">;
    getUserByClerkId: FunctionReference<"query", "public">;
    requireRole: FunctionReference<"query", "public">;
    syncUser: FunctionReference<"mutation", "public">;
    updateRole: FunctionReference<"mutation", "public">;
    assignCoach: FunctionReference<"mutation", "public">;
    deleteUser: FunctionReference<"mutation", "public">;
    listCoaches: FunctionReference<"query", "public">;
    listClients: FunctionReference<"query", "public">;
  };
  plans: {
    list: FunctionReference<"query", "public">;
    getByClient: FunctionReference<"query", "public">;
    getByCoach: FunctionReference<"query", "public">;
    create: FunctionReference<"mutation", "public">;
    update: FunctionReference<"mutation", "public">;
  };
  sessions: {
    list: FunctionReference<"query", "public">;
    getByClient: FunctionReference<"query", "public">;
    getByDate: FunctionReference<"query", "public">;
    create: FunctionReference<"mutation", "public">;
    complete: FunctionReference<"mutation", "public">;
  };
  progress: {
    list: FunctionReference<"query", "public">;
    getByClient: FunctionReference<"query", "public">;
    getCoachView: FunctionReference<"query", "public">;
    create: FunctionReference<"mutation", "public">;
  };
}>;

export declare const api: FilterApi<typeof fullApi, FunctionReference<any, "public">>;
export declare const internal: FilterApi<typeof fullApi, FunctionReference<any, "internal">>;

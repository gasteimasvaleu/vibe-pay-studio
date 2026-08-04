import { queryOptions } from "@tanstack/react-query";
import { listMySubscriptions } from "@/lib/monetization.functions";

export const subscriptionsQueryOptions = queryOptions({
  queryKey: ["mySubscriptions"],
  queryFn: () => listMySubscriptions(),
});

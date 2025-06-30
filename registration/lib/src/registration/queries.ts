import {
  RegistrationAPI,
  RegistrationListResponse,
  RegistrationResponse,
  RegistrationSearchOptions,
} from "#src/registration/types.js"
import {
  InfiniteData,
  QueryKey,
  UseInfiniteQueryOptions,
  UseSuspenseQueryOptions,
} from "@tanstack/react-query"

export const getRegistrationSearchQueryOptions = (
  registrationAPI: RegistrationAPI,
  eventId: string,
  query?: string,
  options?: RegistrationSearchOptions,
): UseInfiniteQueryOptions<
  RegistrationListResponse,
  Error,
  InfiniteData<RegistrationListResponse>,
  QueryKey,
  readonly [string, string] | null
> => {
  return {
    queryKey: [
      "events",
      eventId,
      "registrations",
      { query: query, ...options },
    ],
    async queryFn({ pageParam }) {
      const fullOpts = { ...options }
      if (pageParam) {
        fullOpts.before = pageParam
      }

      return await registrationAPI.listRegistrations(eventId, query, fullOpts)
    },
    initialPageParam: null,
    getNextPageParam: (prev) =>
      prev.registrations.length > 0
        ? [
            prev.registrations[prev.registrations.length - 1].registration
              .date_created,
            prev.registrations[prev.registrations.length - 1].registration.id,
          ]
        : null,
    placeholderData: (prev) => {
      return prev
    },
    staleTime: 5000,
  }
}

export const getRegistrationQueryOptions = (
  registrationAPI: RegistrationAPI,
  eventId: string,
  registrationId: string,
  cartId?: string | null,
): UseSuspenseQueryOptions<RegistrationResponse> => {
  return {
    queryKey: [
      "events",
      eventId,
      "registrations",
      registrationId,
      { cartId: cartId || null },
    ],
    async queryFn() {
      return await registrationAPI.readRegistration(
        eventId,
        registrationId,
        cartId || undefined,
      )
    },
  }
}

import { loadStripe, Stripe, StripeCheckout } from "@stripe/stripe-js"
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { useEffect, useMemo, useState } from "react"

const getStripeQueryKey = (publishableKey: string) =>
  ["payment-services", { service: "stripe", publishableKey }] as const

export const useStripe = (publishableKey: string): Stripe => {
  const query = useSuspenseQuery({
    queryKey: getStripeQueryKey(publishableKey),
    async queryFn() {
      const res = await loadStripe(publishableKey)
      if (!res) {
        throw new Error("Failed to load Stripe API")
      }
      return res
    },
    staleTime: Infinity,
  })

  return query.data
}

export const useStripeCheckout = (
  publishableKey: string,
  clientSecret: string,
): StripeCheckout => {
  const stripe = useStripe(publishableKey)
  const queryClient = useQueryClient()
  const query = useSuspenseQuery({
    queryKey: [...getStripeQueryKey(publishableKey), "checkout", clientSecret],
    async queryFn() {
      const res = await stripe.initCheckout({
        fetchClientSecret: async () => clientSecret,
      })
      return res
    },
    staleTime: Infinity,
  })

  useEffect(() => {
    return () => {
      queryClient.invalidateQueries({
        queryKey: [
          ...getStripeQueryKey(publishableKey),
          "checkout",
          clientSecret,
        ],
      })
    }
  }, [publishableKey, clientSecret])

  return query.data
}

export const useStripeContainer = (
  checkout: StripeCheckout,
): ((newEl: HTMLElement | null) => void) => {
  const [containerEl, setContainerEl] = useState<HTMLElement | null>(null)
  const element = useMemo(() => {
    return checkout.createPaymentElement()
  }, [checkout])

  useEffect(() => {
    if (element && containerEl) {
      element.mount(containerEl)
      return () => {
        element.unmount()
      }
    }
  }, [containerEl, element])

  useEffect(() => {
    return () => {
      element.destroy()
    }
  }, [element])

  return setContainerEl
}

export const useStripeTotal = (checkout: StripeCheckout): string => {
  return checkout.session().total.total.amount
}

export const useConfirmCheckout = (
  checkout: StripeCheckout,
  setError: (error: string | null) => void,
): (() => Promise<boolean>) => {
  const mutation = useMutation({
    mutationKey: ["payment-services", { service: "stripe" }, "confirm"],
    async mutationFn() {
      setError(null)
      const res = await checkout.confirm({
        returnUrl: window.location.href,
        redirect: "if_required",
      })
      if (res.type == "error") {
        setError(res.error.message)
        return false
      } else {
        return true
      }
    },
  })

  return mutation.mutateAsync
}

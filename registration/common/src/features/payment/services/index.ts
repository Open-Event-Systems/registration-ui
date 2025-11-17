import { PaymentPlaceholder } from "#src/features/payment/components/index.js"
import {
  PaymentServiceComponent,
  PaymentServiceComponentProps,
} from "#src/features/payment/index.js"
import { PaymentServiceID } from "@open-event-systems/registration-lib/payment"
import { useSuspenseQuery } from "@tanstack/react-query"
import { ComponentType, useEffect, useState } from "react"

const paymentComponents: Record<
  string,
  | (() => Promise<
      Readonly<{ Component: ComponentType<PaymentServiceComponentProps> }>
    >)
  | undefined
> = {
  async system() {
    const system = await import("./system/System.js")
    return { Component: system.SystemPaymentComponent }
  },
  async mock() {
    const mock = await import("./mock/Mock.js")
    return { Component: mock.MockPaymentComponent }
  },
  async suspend() {
    const suspend = await import("./suspend/Suspend.js")
    return { Component: suspend.SuspendPaymentComponent }
  },
  async square() {
    const square = await import("./square/Square.js")
    return { Component: square.SquarePaymentComponent }
  },
  async stripe() {
    const stripe = await import("./stripe/Stripe.js")
    return { Component: stripe.StripePaymentComponent }
  },
}

/**
 * Get the component for a payment service.
 */
export const getPaymentComponent = async <S extends PaymentServiceID>(
  service: S,
): Promise<
  Readonly<{
    service: S
    Component: ComponentType<PaymentServiceComponentProps>
  }>
> => {
  const loader = paymentComponents[service]
  if (!loader) {
    throw new Error(`Unsupported payment service: ${service}`)
  }
  const container = await loader()
  return { service, Component: container.Component }
}

/**
 * Hook to load a payment component.
 */
export function usePaymentComponent<S extends PaymentServiceID>(
  service: null | undefined,
): null
export function usePaymentComponent<S extends PaymentServiceID>(
  service: S,
): PaymentServiceComponent
export function usePaymentComponent<S extends PaymentServiceID>(
  service: S | null | undefined,
): PaymentServiceComponent | null
export function usePaymentComponent<S extends PaymentServiceID>(
  service: S | null | undefined,
): PaymentServiceComponent | null {
  const query = useSuspenseQuery({
    queryKey: ["payment-services", service, "component"],
    async queryFn() {
      if (service) {
        return await getPaymentComponent(service)
      } else {
        return null
      }
    },
    staleTime: Infinity,
  })
  return query.data?.Component ?? null
}

// /**
//  * Hook to load a payment component.
//  */
// export const usePaymentComponent = <S extends PaymentServiceID>(
//   service: S,
// ): PaymentServiceComponent => {
//   const [cur, setCur] = useState<{
//     service: PaymentServiceID
//     Component: PaymentServiceComponent
//   } | null>(null)

//   useEffect(() => {
//     getPaymentComponent(service).then((container) => {
//       setCur(container)
//     })
//   }, [service])

//   if (!cur || cur.service != service) {
//     return PaymentPlaceholder
//   }

//   return cur.Component
// }

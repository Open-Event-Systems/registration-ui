import { Button, Text } from "@mantine/core"
import { PaymentServiceComponentProps } from "#src/features/payment/index.js"
import {
  PaymentCloseButton,
  PaymentComplete,
  PaymentPlaceholder,
} from "#src/features/payment/components/index.js"
import { usePaymentManagerContext } from "@open-event-systems/registration-lib/payment"
import {
  useConfirmCheckout,
  useStripeCheckout,
  useStripeContainer,
  useStripeTotal,
} from "#src/features/payment/services/stripe/stripe.js"
import { getErrorMessage } from "#src/utils.js"

export type StripeCheckoutPaymentResultBody = {
  type?: "checkout" | null
  id: string
  publishable_key: string
  client_secret: string
  amount: number
  currency: string
}

export type StripeTerminalPaymentResultBody = {
  type: "terminal"
}

export type StripePaymentResultBody =
  | StripeCheckoutPaymentResultBody
  | StripeTerminalPaymentResultBody

declare module "@open-event-systems/registration-lib/payment" {
  export interface PaymentServiceMap {
    stripe: "stripe"
  }

  interface PaymentResultBodyMap {
    stripe: StripePaymentResultBody
  }
}

export const StripePaymentComponent = ({
  children,
}: PaymentServiceComponentProps) => {
  const ctx = usePaymentManagerContext<"stripe">()
  const { payment } = ctx

  if (payment?.status == "completed") {
    return children({
      content: <PaymentComplete />,
      controls: <PaymentCloseButton />,
    })
  } else if (payment?.status == "pending") {
    if (payment.body.type == "terminal") {
      return (
        <TerminalPaymentComponent body={payment.body}>
          {children}
        </TerminalPaymentComponent>
      )
    } else if (payment.body.type == "checkout" || !payment.body.type) {
      return (
        <CheckoutPaymentComponent body={payment.body}>
          {children}
        </CheckoutPaymentComponent>
      )
    }
  } else {
    return <PaymentPlaceholder>{children}</PaymentPlaceholder>
  }
}

const CheckoutPaymentComponent = ({
  children,
  body,
}: PaymentServiceComponentProps & {
  body: StripeCheckoutPaymentResultBody
}) => {
  const ctx = usePaymentManagerContext<"stripe">()
  const { update, setError, submitting, setSubmitting } = ctx

  const checkout = useStripeCheckout(body.publishable_key, body.client_secret)
  const ref = useStripeContainer(checkout)
  const total = useStripeTotal(checkout)
  const confirm = useConfirmCheckout(checkout, setError)

  const content = <div ref={ref} />
  const controls = (
    <Button
      variant="filled"
      onClick={() => {
        if (submitting) {
          return
        }
        setSubmitting(true)
        setError(null)

        confirm()
          .then((res) => {
            if (res) {
              return update({}).then(() => {
                setSubmitting(false)
              })
            } else {
              setSubmitting(false)
            }
          })
          .catch((err) => {
            setError(getErrorMessage(err))
            setSubmitting(false)
          })
      }}
    >
      Pay {total}
    </Button>
  )

  return children({
    content,
    controls,
  })
}

const TerminalPaymentComponent = ({
  children,
}: PaymentServiceComponentProps & {
  body: StripeTerminalPaymentResultBody
}) => {
  const ctx = usePaymentManagerContext<"stripe">()
  const { update, setError, submitting, setSubmitting } = ctx

  const content = (
    <Text>Take the payment on the reader, then click Complete.</Text>
  )
  const controls = (
    <Button
      variant="filled"
      onClick={() => {
        if (submitting) {
          return
        }
        setSubmitting(true)
        setError(null)

        update({})
          .then(() => {
            setSubmitting(false)
          })
          .catch((err) => {
            setError(getErrorMessage(err))
            setSubmitting(false)
          })
      }}
    >
      Complete
    </Button>
  )

  return children({
    content,
    controls,
  })
}

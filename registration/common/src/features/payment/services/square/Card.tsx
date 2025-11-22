import { Currency } from "#src/components/index.js"
import {
  PaymentCloseButton,
  PaymentComplete,
} from "#src/features/payment/components/index.js"
import { SquarePaymentResultBody } from "#src/features/payment/services/square/Square.js"
import {
  useCard,
  useSquare,
} from "#src/features/payment/services/square/square.js"
import { PaymentServiceComponentProps } from "#src/features/payment/types.js"
import { getErrorMessage } from "#src/utils.js"
import { Box, Button, Skeleton } from "@mantine/core"
import { usePaymentManagerContext } from "@open-event-systems/registration-lib/payment"
import { Card, Payments } from "@square/web-payments-sdk-types"
import { Suspense, useCallback, useLayoutEffect } from "react"

export const SquareCardPaymentComponent = ({
  children,
}: PaymentServiceComponentProps) => {
  const ctx = usePaymentManagerContext<"square">()
  const { payment, submitting, setSubmitting, update, setError } = ctx

  const onSubmit = useCallback(
    async (card: Card, payments: Payments) => {
      if (!payment || submitting) {
        return
      }

      setError(null)
      setSubmitting(true)
      try {
        const tokenRes = await card.tokenize()
        if (tokenRes.status == "OK") {
          const verifyRes = await payments.verifyBuyer(tokenRes.token, {
            amount: payment.body.total_price_str,
            billingContact: {},
            currencyCode: payment.body.currency,
            intent: "CHARGE",
          })

          await update({
            source_id: tokenRes.token,
            verification_token: verifyRes?.token,
          })

          setSubmitting(false)
        } else if (tokenRes.status == "Error") {
          if (tokenRes.errors.length > 0) {
            setError(tokenRes.errors[0].message)
            setSubmitting(false)
            return
          } else {
            setError("Payment failed")
            setSubmitting(false)
            return
          }
        }
      } catch (e) {
        setError(getErrorMessage(e))
        setSubmitting(false)
      }
    },
    [payment, submitting],
  )

  if (!payment) {
    return (
      <SquareCardComponent.Placeholder>
        {children}
      </SquareCardComponent.Placeholder>
    )
  } else if (payment.status == "completed") {
    return children({
      content: <PaymentComplete />,
      controls: <PaymentCloseButton />,
    })
  } else {
    return (
      <Suspense
        fallback={
          <SquareCardComponent.Placeholder>
            {children}
          </SquareCardComponent.Placeholder>
        }
      >
        <SquareCardComponent body={payment.body} onSubmit={onSubmit}>
          {children}
        </SquareCardComponent>
      </Suspense>
    )
  }
}

export const SquareCardComponent = ({
  body,
  onSubmit,
  children,
}: {
  body: SquarePaymentResultBody
  onSubmit?: (card: Card, payments: Payments) => void
} & PaymentServiceComponentProps) => {
  const payments = useSquare(
    body.application_id,
    body.location_id,
    body.environment == "sandbox",
  )

  const handleSubmit = useCallback(
    (card: Card) => {
      return onSubmit && onSubmit(card, payments)
    },
    [payments, onSubmit],
  )

  const { ref, card } = useCard(payments, handleSubmit)

  const show = !!card

  useLayoutEffect(() => {
    card?.recalculateSize()
  }, [show, card])

  const controls = show ? (
    <Button
      fullWidth
      onClick={() => {
        onSubmit && onSubmit(card, payments)
      }}
    >
      Pay <Currency amount={body.total_price} code={body.currency} />
    </Button>
  ) : (
    <Skeleton h={36} />
  )

  const content = (
    <>
      {!show && <Skeleton h={99} mb={41} />}
      <Box
        ref={ref}
        style={{
          display: show ? undefined : "none",
        }}
      ></Box>
    </>
  )

  return children({ content, controls })
}

const SquareCardComponentPlaceholder = ({
  children,
}: PaymentServiceComponentProps) =>
  children({
    content: <Skeleton h={99} mb={41} />,
    controls: <Skeleton h={36} />,
  })

SquareCardComponent.Placeholder = SquareCardComponentPlaceholder

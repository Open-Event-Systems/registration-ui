import { Suspense, useEffect, useRef, useState } from "react"
import { Anchor, Button, Grid, Text, Divider } from "@mantine/core"
import { IconPlus, IconShoppingCartCheck } from "@tabler/icons-react"
import { Link, useLocation, useRouter } from "@tanstack/react-router"
import {
  getChangedRegistrations,
  setChangedRegistrations,
} from "#src/features/selfservice/components/RegistrationsRoute.js"
import { Cart as CartView } from "#src/features/cart/components/Cart.js"
import { CurrencyContext, Spacer, Title } from "#src/components/index.js"
import { useInterviewOptionsDialog } from "#src/features/selfservice/hooks.js"
import { CartRegistration } from "#src/features/cart/components/CartRegistration.js"
import { LineItem } from "#src/features/cart/components/LineItem.js"
import { Modifier } from "#src/features/cart/components/Modifier.js"
import { selfServiceRegistrationsRoute } from "#src/app/routes/selfservice/registrations.js"
import { cartRoute } from "#src/app/routes/selfservice/cart.js"
import {
  Cart,
  useCartPricingResult,
  useRemoveFromCart,
  useStickyCurrentCart,
} from "@open-event-systems/registration-lib/cart"
import {
  handleConflict,
  PaymentManagerProvider,
  useCreatePayment,
  usePayment,
  usePaymentManager,
} from "@open-event-systems/registration-lib/payment"
import { usePaymentMethodsDialog } from "#src/features/payment/hooks.js"
import { PaymentModal } from "#src/features/payment/components/index.js"
import { useStickyData } from "@open-event-systems/registration-lib/utils"

declare module "@tanstack/react-router" {
  interface HistoryState {
    cartModal?: boolean
  }
}

export const CartNotFound = () => (
  <Title title="Cart" subtitle="Your current shopping cart">
    <Text component="p">
      Be sure to finish adding or changing all registrations before selecting
      Checkout.
    </Text>
    <Anchor component={Link} to={selfServiceRegistrationsRoute.to}>
      &laquo; View registrations
    </Anchor>
    <Divider />
    <CartView.Placeholder />
  </Title>
)

export const CartRoute = () => {
  const { eventId } = cartRoute.useParams()

  return (
    <Title title="Cart" subtitle="Your current shopping cart">
      <Text component="p">
        Be sure to finish adding or changing all registrations before selecting
        Checkout.
      </Text>
      <Anchor component={Link} to={selfServiceRegistrationsRoute.to}>
        &laquo; View registrations
      </Anchor>
      <Divider />
      <Suspense fallback={<CartView.Placeholder />}>
        <CartComponent eventId={eventId} />
      </Suspense>
    </Title>
  )
}

const CartComponent = ({ eventId }: { eventId: string }) => {
  const [currentCart, setCurrentCart] = useStickyCurrentCart(eventId)

  const [paymentId, setPaymentId] = useState<string | null>(null)
  const [stickyPaymentId, disposePaymentId] = useStickyData(paymentId)
  const [cartError, setCartError] = useState<string | string[] | null>(null)

  const pricingResult = useCartPricingResult(currentCart.id)

  const interviewOptions = useInterviewOptionsDialog(eventId, currentCart.id)
  const payment = usePayment(stickyPaymentId)
  const navigate = cartRoute.useNavigate()
  const router = useRouter()
  const loc = useLocation()
  const completeRef = useRef(false)
  const cancelRef = useRef(false)

  const paymentMethods = usePaymentMethodsDialog({
    cartId: currentCart.id,
    onShow() {
      setPaymentId(null)
      disposePaymentId()
      navigate({
        state: {
          cartModal: true,
        },
      })
    },
    onSelect(optionId) {
      setPaymentId(null)
      disposePaymentId()
      if (!loc.state.cartModal) {
        navigate({
          state: {
            cartModal: true,
          },
        })
      }
      createPayment(optionId)
        .then((res) => {
          setPaymentId(res.id)
        })
        .catch((err) => {
          const errInfo = handleConflict(err, pricingResult)
          setCartError(errInfo)
        })
        .catch(() => {
          setCartError("An error occurred")
        })
    },
  })

  const createPayment = useCreatePayment(currentCart.id)
  const manager = usePaymentManager({
    payment: payment,
    onUpdate(res) {
      if (res.status == "completed") {
        setCurrentCart(null)
        completeRef.current = true
        const curChanged = getChangedRegistrations() ?? []
        setChangedRegistrations([
          ...curChanged,
          ...pricingResult.registrations.map((r) => r.id),
        ])
      }
    },
    onClose(manager) {
      if (manager.payment?.status == "completed") {
        navigate({
          to: selfServiceRegistrationsRoute.to,
          params: {
            eventId: eventId,
          },
          replace: true,
        })
      } else {
        if (manager.payment?.status == "pending") {
          cancelRef.current = true
          manager.cancel()
        }
        router.history.go(-1)
      }
    },
  })

  useEffect(() => {
    if (!loc.state.cartModal && completeRef.current) {
      setCurrentCart(null, true)
    }
  }, [loc.state.cartModal])

  useEffect(() => {
    if (!loc.state.cartModal) {
      if (!cancelRef.current && payment?.status == "pending") {
        manager.cancel()
        cancelRef.current = true
      }
    }
  }, [loc.state.cartModal, payment?.status, manager.cancel])

  useEffect(() => {
    if (payment?.status == "pending") {
      cancelRef.current = false
    }
  }, [payment?.status])

  const showCheckout = pricingResult.registrations.length > 0

  return (
    <>
      {pricingResult.registrations.length > 0 ? (
        <CartPricingResultComponent
          cartId={currentCart.id}
          setCurrentCart={(c) => {
            setCurrentCart(c, true)
          }}
        />
      ) : (
        <CartView.Empty />
      )}
      <Spacer flex={{ base: "auto", xs: "auto", sm: "initial" }} />
      <Grid justify="space-between">
        {interviewOptions.options.length > 0 && (
          <Grid.Col span={{ base: 12, xs: 12, sm: "content" }}>
            <CartAddButton
              eventId={eventId}
              cartId={currentCart.id}
              showCheckout={showCheckout}
            />
          </Grid.Col>
        )}
        {showCheckout && (
          <Grid.Col span={{ base: 12, xs: 12, sm: "content" }}>
            <CartCheckoutButton onShow={paymentMethods.show} />
          </Grid.Col>
        )}
      </Grid>
      <PaymentManagerProvider value={manager}>
        <PaymentModal
          cartId={currentCart.id}
          methods={paymentMethods.methods}
          opened={!!loc.state.cartModal}
          onSelectMethod={(method) => {
            paymentMethods.select(method)
          }}
          cartError={cartError}
        />
      </PaymentManagerProvider>
    </>
  )
}

const CartPricingResultComponent = ({
  cartId,
  setCurrentCart,
}: {
  cartId: string
  setCurrentCart: (cart: Cart) => void
}) => {
  const pricingResult = useCartPricingResult(cartId)
  const removeFromCart = useRemoveFromCart(cartId)

  return (
    <CurrencyContext.Provider value={pricingResult.currency}>
      <CartView totalPrice={pricingResult.total_price}>
        {pricingResult.registrations.map((reg) => (
          <CartRegistration
            key={reg.id}
            name={reg.name}
            onRemove={() => {
              removeFromCart.mutate(reg.id, {
                onSuccess(cart) {
                  setCurrentCart(cart)
                },
              })
            }}
          >
            {reg.line_items.map((li, i) => (
              <LineItem
                key={i}
                name={li.name ?? ""}
                description={li.description}
                price={li.price}
                modifiers={li.modifiers.map((m, j) => (
                  <Modifier key={j} name={m.name ?? ""} amount={m.amount} />
                ))}
              />
            ))}
          </CartRegistration>
        ))}
      </CartView>
    </CurrencyContext.Provider>
  )
}

const CartAddButton = ({
  eventId,
  cartId,
  showCheckout,
}: {
  eventId: string
  cartId: string
  showCheckout?: boolean
}) => {
  const interviewOptions = useInterviewOptionsDialog(eventId, cartId)
  return (
    <Button
      fullWidth
      variant={showCheckout ? "outline" : "filled"}
      leftSection={<IconPlus />}
      onClick={() => interviewOptions.show()}
    >
      Add Registration
    </Button>
  )
}

const CartCheckoutButton = ({ onShow }: { onShow: () => void }) => {
  return (
    <Button
      fullWidth
      variant="filled"
      leftSection={<IconShoppingCartCheck />}
      onClick={onShow}
    >
      Checkout
    </Button>
  )
}

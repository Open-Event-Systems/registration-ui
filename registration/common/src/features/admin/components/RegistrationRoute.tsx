import {
  adminChangeRegistrationRoute,
  adminRegistrationRoute,
} from "#src/app/routes/admin/registrations.js"
import { Title } from "#src/components/index.js"
import { Documents } from "#src/features/admin/components/documents/Documents.js"
import { PaymentHistory } from "#src/features/admin/components/payment-history/PaymentHistory.js"
import { RegistrationComponent } from "#src/features/admin/components/registration/Registration.js"
import { SCOPE } from "#src/features/auth/scope.js"
import { useAuth } from "#src/hooks/auth.js"
import { getDefaultUpdateURL } from "#src/utils.js"
import { Grid } from "@mantine/core"
import { useAdminAPI } from "@open-event-systems/registration-lib/admin"
import { useCurrentCart } from "@open-event-systems/registration-lib/cart"
import {
  getInterviewStateQueryOptions,
  useInterviewAPI,
  useInterviewStore,
} from "@open-event-systems/registration-lib/interview"
import { useRegistrationPayments } from "@open-event-systems/registration-lib/payment"
import {
  useDocumentTypes,
  useRegistrationDocuments,
} from "@open-event-systems/registration-lib/print"
import {
  getRegistrationName,
  useCancelRegistration,
  useCompleteRegistration,
  useRegistration,
} from "@open-event-systems/registration-lib/registration"
import { useIsMutating, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { useCallback } from "react"

export const RegistrationRoute = () => {
  const { eventId, registrationId } = adminRegistrationRoute.useParams()
  const api = useAdminAPI()
  const navigate = useNavigate()
  const interviewAPI = useInterviewAPI()
  const interviewStore = useInterviewStore()
  const adminAPI = useAdminAPI()
  const queryClient = useQueryClient()
  const [currentCart] = useCurrentCart(eventId)

  const reg = useRegistration(eventId, registrationId, currentCart.id)
  const payments = useRegistrationPayments(eventId, registrationId)
  const documentTypes = useDocumentTypes(eventId)
  const documents = useRegistrationDocuments(eventId, registrationId)
  const complete = useCompleteRegistration(eventId, registrationId)
  const cancel = useCancelRegistration(eventId, registrationId)
  const mutating = useIsMutating({
    mutationKey: ["events", eventId, "registrations", registrationId],
  })
  const auth = useAuth()
  const scope = auth.token?.scope.split(" ") || []

  const action = useCallback(
    (actionId: string) => {
      api
        .startInterview(actionId)
        .then((response) => {
          return interviewAPI.update(response)
        })
        .then((response) => {
          const record = interviewStore.add(response)
          queryClient.setQueryData(
            getInterviewStateQueryOptions(
              interviewAPI,
              interviewStore,
              getDefaultUpdateURL(),
              record.response.state,
            ).queryKey,
            record,
          )

          navigate({
            to: adminChangeRegistrationRoute.to,
            params: {
              eventId,
              registrationId,
            },
            hash: `s=${record.response.state}`,
          })
        })
    },
    [
      api,
      interviewAPI,
      interviewStore,
      queryClient,
      navigate,
      eventId,
      registrationId,
      adminAPI,
    ],
  )

  return (
    <Title title={getRegistrationName(reg.registration)}>
      <Grid>
        <Grid.Col span={{ xs: 12, sm: 12, md: 6, xl: 4 }}>
          <RegistrationComponent
            registration={reg.registration}
            actions={reg.change_options?.map((o) => ({
              id: o.url,
              label: o.title,
            }))}
            summary={reg.summary}
            displayData={reg.display_data ?? undefined}
            canComplete={
              reg.registration.status == "pending" &&
              scope.includes(SCOPE.registrationWrite)
            }
            canCancel={
              reg.registration.status != "canceled" &&
              scope.includes(SCOPE.registrationWrite)
            }
            onComplete={() => mutating == 0 && complete()}
            onCancel={() => mutating == 0 && cancel()}
            onSelectAction={action}
          />
        </Grid.Col>

        {payments.length > 0 && (
          <Grid.Col span={{ xs: 12, sm: 12, md: 6, xl: 4 }}>
            <PaymentHistory results={payments} />
          </Grid.Col>
        )}
        {Object.keys(documents).length > 0 && (
          <Grid.Col span={{ xs: 12, sm: 12, md: 6, xl: 4 }}>
            <Documents documentTypes={documentTypes} documents={documents} />
          </Grid.Col>
        )}
      </Grid>
    </Title>
  )
}

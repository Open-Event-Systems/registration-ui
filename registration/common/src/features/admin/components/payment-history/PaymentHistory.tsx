import {
  PaymentSearchResult,
  PaymentStatus,
} from "@open-event-systems/registration-lib/payment"
import { Anchor, Divider, Paper, Stack, Table, Title } from "@mantine/core"
import { parseISO } from "date-fns"

export type PaymentHistoryProps = {
  results: PaymentSearchResult[]
}

export const PaymentHistory = (props: PaymentHistoryProps) => {
  const { results } = props
  return (
    <Paper shadow="xs" withBorder p="xs">
      <Stack gap="xs">
        <Title order={6}>Payments</Title>
        <Divider />
        <Table.ScrollContainer minWidth={500}>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Date</Table.Th>
                <Table.Th>Service</Table.Th>
                <Table.Th>ID</Table.Th>
                <Table.Th>Status</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {results.map((r) => (
                <PaymentHistoryRow key={r.id} payment={r} />
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Stack>
    </Paper>
  )
}

const PaymentHistoryRow = ({ payment }: { payment: PaymentSearchResult }) => {
  const date = parseISO(payment.date_closed || payment.date_created)

  return (
    <Table.Tr>
      <Table.Td>{date.toLocaleString()}</Table.Td>
      <Table.Td>{payment.service_name}</Table.Td>
      {payment.payment_url ? (
        <Table.Td>
          <Anchor target={payment.external_id} href={payment.payment_url}>
            {payment.external_id}
          </Anchor>
        </Table.Td>
      ) : (
        <Table.Td>{payment.id}</Table.Td>
      )}
      <Table.Td>{statusText[payment.status]}</Table.Td>
    </Table.Tr>
  )
}

const statusText: Record<PaymentStatus, string | undefined> = {
  pending: "Pending",
  canceled: "Canceled",
  completed: "Completed",
}

import { Anchor, Table, Text, TextInput } from "@mantine/core"
import {
  CartData,
  CartRegistration,
} from "@open-event-systems/registration-lib/cart"
import { PaymentSearchResult } from "@open-event-systems/registration-lib/payment"
import { getRegistrationName } from "@open-event-systems/registration-lib/registration"
import { IconSearch } from "@tabler/icons-react"
import { format } from "date-fns"
import { ChangeEvent, MouseEvent, useCallback, useRef } from "react"

const SEARCH_INTERVAL = 500

export type CartSearchFilterProps = {
  onSearch?: (query: string) => void
}

export const CartSearchFilter = (props: CartSearchFilterProps) => {
  const { onSearch } = props
  const valueRef = useRef("")
  const timerRef = useRef<number | null>(null)

  const onChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      valueRef.current = e.target.value

      if (timerRef.current == null) {
        timerRef.current = window.setTimeout(() => {
          timerRef.current = null
          onSearch && onSearch(valueRef.current)
        }, SEARCH_INTERVAL)
      }
    },
    [valueRef, timerRef, onSearch],
  )

  return (
    <>
      <TextInput
        leftSection={<IconSearch />}
        onChange={onChange}
        placeholder="Last name or email"
      />
    </>
  )
}

export type CartSearchResultsProps = {
  results?: PaymentSearchResult[]
  getHref?: (cartId: string, cartData: CartData) => string | null | undefined
  onClick?: (
    e: MouseEvent<HTMLAnchorElement>,
    cartId: string,
    cartData: CartData,
  ) => void
}

export const CartSearchResults = (props: CartSearchResultsProps) => {
  const { results, getHref, onClick } = props
  const rows = results?.map((r) => (
    <Table.Tr key={r.id}>
      <Table.Td>
        <Anchor
          className="CartSearch-link"
          href={
            getHref ? getHref(r.cart_id, r.cart_data) ?? undefined : undefined
          }
          onClick={
            onClick ? (e) => onClick(e, r.cart_id, r.cart_data) : undefined
          }
        >
          {r.cart_data.registrations.map((cr) => cartRegToName(cr)).join(", ")}
        </Anchor>
      </Table.Td>
      <Table.Td>{fmtDate(r.date_created)}</Table.Td>
    </Table.Tr>
  ))

  return (
    <Table.ScrollContainer minWidth={500}>
      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Name</Table.Th>
            <Table.Th>Date</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>{rows}</Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  )
}

CartSearchResults.Empty = () => {
  return (
    <Text c="dimmed" ta="center">
      No results
    </Text>
  )
}

const fmtDate = (d: string): string => {
  const date = new Date(d)
  if (isNaN(date.getTime())) {
    return "-"
  } else {
    return format(date, "eee HH:mm")
  }
}

const cartRegToName = (c: CartRegistration): string => {
  const name = getRegistrationName(c.new)
  const email = c.new.email

  if (name && email) {
    return `${name} <${email}>`
  } else if (!name && email) {
    return email
  } else if (name && !email) {
    return name
  } else {
    return "-"
  }
}

export type CartSearchProps = {
  results?: PaymentSearchResult[]
  onSearch?: (query: string) => void
  getHref?: (cartId: string, cartData: CartData) => string | null | undefined
  onClick?: (
    e: MouseEvent<HTMLAnchorElement>,
    cartId: string,
    cartData: CartData,
  ) => void
}

export const CartSearch = (props: CartSearchProps) => {
  const { onSearch, results, getHref, onClick } = props
  return (
    <>
      <CartSearchFilter onSearch={onSearch} />
      {results && results.length > 0 ? (
        <CartSearchResults
          results={results}
          getHref={getHref}
          onClick={onClick}
        />
      ) : (
        <CartSearchResults.Empty />
      )}
    </>
  )
}

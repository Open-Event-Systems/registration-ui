import {
  Anchor,
  AnchorProps,
  Box,
  Checkbox,
  Grid,
  Stack,
  Table,
  Text,
  TextInput,
} from "@mantine/core"
import {
  RegistrationSearchOptions,
  RegistrationStatus,
} from "@open-event-systems/registration-lib/registration"
import { IconBarcode, IconSearch } from "@tabler/icons-react"
import {
  ComponentPropsWithoutRef,
  createContext,
  MouseEvent,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react"
import { useDLIDInput, useSpecialCharInput } from "dlid-hid-js"

const SEARCH_INTERVAL = 500

export type RegistrationSearchProps = {
  results?: RegistrationSearchResult[] | null
  onSearch?: (query: string, options: RegistrationSearchOptions) => void
  onEnter?: (query: string, options: RegistrationSearchOptions) => void
  onClick?: ((e: MouseEvent, result: RegistrationSearchResult) => void) | null
  getHref?:
    | ((result: RegistrationSearchResult) => string | null | undefined)
    | null
}

export const RegistrationSearch = (props: RegistrationSearchProps) => {
  const { results, onSearch, onEnter, onClick, getHref } = props
  return (
    <Stack>
      <RegistrationSearch.Filters onSearch={onSearch} onEnter={onEnter} />
      {results != null ? (
        results.length == 0 ? (
          <NoResults />
        ) : (
          <RegistrationSearch.Results
            results={results}
            onClick={onClick}
            getHref={getHref}
          />
        )
      ) : null}
    </Stack>
  )
}

export type RegistrationSearchFiltersProps = {
  onSearch?: (query: string, options: RegistrationSearchOptions) => void
  onEnter?: (query: string, options: RegistrationSearchOptions) => void
}

const RegistrationSearchFilters = (props: RegistrationSearchFiltersProps) => {
  const { onSearch, onEnter } = props
  const firstRef = useRef(true)
  const showAllRef = useRef(false)
  const timerRef = useRef<number | null>(null)

  const [showAll, setShowAll] = useState(false)

  const { state, append, setValue: setQueryValue } = useDLIDInput()
  const { value: query } = state

  const { onKeyDown, onKeyUp } = useSpecialCharInput(append)

  const clearTimeout = useCallback(() => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const doSearch = useCallback(
    (query: string, opts: RegistrationSearchOptions) => {
      clearTimeout()
      if (onSearch) {
        onSearch(query, opts)
      }
    },
    [clearTimeout, onSearch],
  )

  const queueSearch = useCallback(
    (query: string, opts: RegistrationSearchOptions) => {
      clearTimeout()
      timerRef.current = window.setTimeout(
        () => doSearch(query, opts),
        SEARCH_INTERVAL,
      )
    },
    [doSearch, clearTimeout],
  )

  useEffect(() => {
    if (!firstRef.current) {
      if (!state.isCapturing) {
        queueSearch(query, { all: showAllRef.current })
      }
    }
    firstRef.current = false
  }, [query, state.isCapturing])

  useEffect(() => {
    if (state.result) {
      const sf =
        state.result.subfiles.get("DL") ?? state.result.subfiles.get("ID")
      if (sf) {
        const fname = firstSpaceSepField(sf.get("DAC") ?? "")
        const lname = firstSpaceSepField(sf.get("DCS") ?? "")
        const val = `${fname} ${lname}`
        setQueryValue(val)
        onEnter && onEnter(val, { all: showAllRef.current })
      }
    }
  }, [state.result, setQueryValue, onEnter])

  useEffect(() => {
    return () => {
      clearTimeout()
    }
  }, [doSearch, clearTimeout])

  return (
    <Box
      component="form"
      onSubmit={(e) => {
        e.preventDefault()
        clearTimeout()
        onEnter && onEnter(query, {})
      }}
    >
      <Grid align="center">
        <Grid.Col span={{ xs: 12, sm: "auto" }}>
          <TextInput
            leftSection={state.isParsingDLID ? <IconBarcode /> : <IconSearch />}
            variant={state.isParsingDLID ? "filled" : "default"}
            autoFocus
            value={query}
            onKeyDown={onKeyDown}
            onKeyUp={onKeyUp}
            onChange={(e) => {
              setQueryValue(e.target.value)
            }}
          />
        </Grid.Col>
        <Grid.Col span={{ xs: 12, sm: "content" }}>
          <Checkbox
            label="Show all"
            tabIndex={-1}
            checked={showAll}
            onChange={(e) => {
              setShowAll(e.target.checked)
              showAllRef.current = e.target.checked
              doSearch(query, { all: e.target.checked })
            }}
          />
        </Grid.Col>
      </Grid>
      <input type="submit" style={{ display: "none" }} />
    </Box>
  )
}

RegistrationSearch.Filters = RegistrationSearchFilters

export type RegistrationSearchResult = {
  id: string
  status: RegistrationStatus
  number?: number | null
  name?: string | null
  email?: string | null
  options?: string[] | null
  nickname?: string | null
}

export type RegistrationSearchResultsProps = {
  results: RegistrationSearchResult[]
  onClick?: ((e: MouseEvent, result: RegistrationSearchResult) => void) | null
  getHref?:
    | ((result: RegistrationSearchResult) => string | null | undefined)
    | null
}

const RegistrationSearchResults = (props: RegistrationSearchResultsProps) => {
  const { results, onClick, getHref } = props
  return (
    <Table.ScrollContainer minWidth={500}>
      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>#</Table.Th>
            <Table.Th>Name</Table.Th>
            <Table.Th>Email</Table.Th>
            <Table.Th>Nickname</Table.Th>
            <Table.Th>Options</Table.Th>
            <Table.Th>Status</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {results.map((r) => (
            <ResultRow
              key={r.id}
              result={r}
              onClick={onClick}
              getHref={getHref}
            />
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  )
}

RegistrationSearch.Results = RegistrationSearchResults

const NoResults = () => {
  return (
    <Text ta="center" c="dimmed">
      No results
    </Text>
  )
}

const ResultRow = ({
  result,
  onClick,
  getHref,
}: { result: RegistrationSearchResult } & Pick<
  RegistrationSearchResultsProps,
  "onClick" | "getHref"
>) => {
  const handleClick = useCallback(
    (e: MouseEvent) => {
      onClick && onClick(e, result)
    },
    [result, onClick],
  )
  const boundGetHref = useCallback(() => {
    return getHref ? getHref(result) : undefined
  }, [result, getHref])
  return (
    <HrefContext.Provider value={[handleClick, boundGetHref]}>
      <Table.Tr>
        <Table.Td>
          <RowLink tabIndex={result.number != null ? undefined : -1}>
            {result.number ?? "-"}
          </RowLink>
        </Table.Td>
        <Table.Td>
          <RowLink tabIndex={result.number != null ? -1 : undefined}>
            {result.name || "-"}
          </RowLink>
        </Table.Td>
        <Table.Td>
          <RowLink>{result.email || "-"}</RowLink>
        </Table.Td>
        <Table.Td>
          <RowLink>{result.nickname || "-"}</RowLink>
        </Table.Td>
        <Table.Td>
          <RowLink>{result.options?.join(", ") || "-"}</RowLink>
        </Table.Td>
        <Table.Td>
          <RowLink>{statusMap[result.status] ?? result.status}</RowLink>
        </Table.Td>
      </Table.Tr>
    </HrefContext.Provider>
  )
}

const RowLink = (props: AnchorProps & ComponentPropsWithoutRef<"a">) => {
  const [onClick, getHref] = useContext(HrefContext)
  return (
    <Anchor
      className="RegistrationSearch-link"
      tabIndex={-1}
      onClick={onClick ?? undefined}
      href={getHref ? getHref() ?? undefined : undefined}
      {...props}
    />
  )
}

const HrefContext = createContext<
  readonly [
    ((e: MouseEvent) => void) | null | undefined,
    (() => string | null | undefined) | null | undefined,
  ]
>([null, null])

const statusMap: Record<string, string | undefined> = {
  pending: "Pending",
  created: "Created",
  canceled: "Canceled",
}

const firstSpaceSepField = (s: string): string => {
  const parts = s.split(" ")
  return parts[0] ?? ""
}

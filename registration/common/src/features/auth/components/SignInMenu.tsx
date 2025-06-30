import { signInEmailRoute, signInMenuRoute } from "#src/app/routes/signin.js"
import {
  FullPageMenuLayout,
  FullPageMenuLayoutContentProps,
} from "#src/components/index.js"
import { Card, NavLink, Space, useProps } from "@mantine/core"
import { IconMail } from "@tabler/icons-react"
import { ReactNode } from "react"

export type SignInMenuProps = Omit<
  FullPageMenuLayoutContentProps,
  "children" | "onSelect"
> & {
  options?: {
    id: string
    label: string
    description?: string
    icon?: ReactNode
    error?: boolean
  }[]
  onSelect?: (id: string) => void
}

export const SignInMenu = (props: SignInMenuProps) => {
  const { options, onSelect, ...other } = useProps("SignInMenu", {}, props)

  return (
    <FullPageMenuLayout.Content title="Sign In" {...other}>
      <Card.Section>
        {options?.map((o) => (
          <NavLink
            key={o.id}
            label={o.label}
            description={o.error ? "Try again" : o.description}
            c={o.error ? "red" : undefined}
            leftSection={o.icon}
            component="button"
            onClick={() => onSelect && onSelect(o.id)}
          />
        ))}
      </Card.Section>
      <Space />
    </FullPageMenuLayout.Content>
  )
}

export const SignInMenuRoute = () => {
  const navigate = signInMenuRoute.useNavigate()

  const opts: SignInMenuProps["options"] = [
    { id: "email", label: "Sign in with email", icon: <IconMail /> },
  ]

  return (
    <SignInMenu
      options={opts}
      onSelect={(option) => {
        if (option == "email") {
          navigate({
            to: signInEmailRoute.to,
          })
        }
      }}
    />
  )
}

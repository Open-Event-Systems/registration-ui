import { LoadingOverlay, Modal, ModalProps, useProps } from "@mantine/core"
import clsx from "clsx"
import { Options, OptionsProps } from "./Options.js"
import { useRef } from "react"

export type OptionsDialogProps = Omit<ModalProps, "children" | "onSelect"> &
  OptionsProps & {
    loading?: boolean
  }

export const OptionsDialog = (props: OptionsDialogProps) => {
  const {
    className,
    options,
    onSelect,
    opened,
    loading = false,
    ...other
  } = useProps("OptionsDialog", {}, props)

  const prevOptionsRef = useRef<OptionsProps["options"]>(undefined)

  if (opened && options) {
    prevOptionsRef.current = options
  }

  return (
    <Modal
      className={clsx("OptionsDialog-root", className)}
      opened={opened}
      centered
      {...other}
    >
      <Options
        className="OptionsDialog-options"
        options={opened ? options : options ?? prevOptionsRef.current}
        onSelect={onSelect}
      />
      <LoadingOverlay visible={loading} />
    </Modal>
  )
}

"use client";

import { useTheme } from "next-themes";
import { X } from "lucide-react";
import { Toaster as Sonner, ToasterProps } from "sonner";

const Toaster = ({ closeButton = true, classNames, icons, toastOptions, ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      closeButton={closeButton}
      closeButtonAriaLabel="Close notification"
      classNames={{
        toast: "ct-toast",
        closeButton: "ct-toast-close",
        ...classNames,
      }}
      toastOptions={{
        classNames: {
          toast: "ct-toast",
          closeButton: "ct-toast-close",
          ...toastOptions?.classNames,
        },
        ...toastOptions,
      }}
      icons={{
        close: <X className="size-3.5" strokeWidth={2.5} aria-hidden />,
        ...icons,
      }}
      style={
        {
          zIndex: 100,
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--toast-close-button-start": "auto",
          "--toast-close-button-end": "0.75rem",
          "--toast-close-button-transform": "translateY(-50%)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };

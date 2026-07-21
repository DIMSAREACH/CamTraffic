"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { XIcon } from "lucide-react";

import { cn } from "./utils";
import { useLanguage } from "@shared/context/LanguageContext";

export type DialogAccent =
  | "blue"
  | "violet"
  | "teal"
  | "amber"
  | "success"
  | "rose"
  | "danger";

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn("ct-dialog-overlay", className)}
      {...props}
    />
  );
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-[length:1.0625rem] leading-snug font-semibold tracking-tight", className)}
      {...props}
    />
  );
}

function treeIncludesDialogTitle(node: React.ReactNode): boolean {
  let found = false;
  React.Children.forEach(node, (child) => {
    if (found || !React.isValidElement(child)) return;
    if (child.type === DialogTitle) {
      found = true;
      return;
    }
    const childProps = child.props as { children?: React.ReactNode };
    if (treeIncludesDialogTitle(childProps.children)) {
      found = true;
    }
  });
  return found;
}

function DialogContent({
  className,
  children,
  accent = "blue",
  accessibleTitle,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  accent?: DialogAccent;
  /** Used when the dialog has a custom visual header without DialogTitle */
  accessibleTitle?: string;
}) {
  const { t } = useLanguage();
  const hasTitle = treeIncludesDialogTitle(children);

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        data-dialog-accent={accent}
        className={cn(
          "ct-dialog-panel w-full max-w-[calc(100%-2rem)] sm:max-w-lg",
          className,
        )}
        aria-describedby={undefined}
        {...props}
      >
        {!hasTitle ? (
          <DialogTitle className="sr-only">{accessibleTitle || 'Dialog'}</DialogTitle>
        ) : null}
        {children}
        <DialogPrimitive.Close
          type="button"
          data-slot="dialog-close"
          className="ct-dialog-close"
          aria-label={t('a11y.closeDialog')}
        >
          <XIcon />
          <span className="sr-only">{t('common.close')}</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn(
        "ct-dialog-header flex flex-col gap-2 text-center sm:text-left",
        className,
      )}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "ct-dialog-footer flex flex-col-reverse sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-[length:0.8125rem] leading-relaxed text-[color:var(--dialog-subtitle-fg)]", className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};

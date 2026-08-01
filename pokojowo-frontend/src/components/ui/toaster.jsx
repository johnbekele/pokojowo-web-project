import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/useToast";

export function Toaster() {
  const { toasts } = useToast();
  const { t } = useTranslation('common');

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && <ToastDescription>{description}</ToastDescription>}
            </div>
            {action}
            <ToastClose label={t('actions.closeNotification', 'Close notification')} />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}

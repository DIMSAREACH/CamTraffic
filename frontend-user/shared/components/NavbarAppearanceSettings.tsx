import { useState } from 'react';
import { Settings } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@shared/components/ui/sheet';
import { AppearanceSettingsPanel } from '@shared/components/AppearanceSettingsPanel';
import { useLanguage } from '@shared/context/LanguageContext';

export function NavbarAppearanceSettings() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="app-navbar__icon-btn app-navbar__appearance-btn cursor-pointer p-2.5 rounded-xl"
          aria-label={t('appearance.settings')}
          title={t('appearance.settings')}
        >
          <Settings size={18} className="app-navbar__theme-icon" />
        </button>
      </SheetTrigger>
      <SheetContent
        side="right"
        closeClassName="appearance-sheet__close"
        closeLabel={t('appearance.close')}
        className="appearance-sheet !flex !flex-col !h-full !w-[340px] !max-w-[min(100vw,340px)] !min-w-[340px] !p-0 !gap-0 !bg-white shadow-2xl"
      >
        <AppearanceSettingsPanel />
      </SheetContent>
    </Sheet>
  );
}

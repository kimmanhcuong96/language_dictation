import { FileUp, Languages, Library } from "lucide-react";
import { adminTranslationT } from "../../adminTranslationI18n";
import { adminSystemT } from "../../adminSystemI18n";
import { useAuth } from "../../auth";
import { navigateToHash } from "../../router";
import type { UiLocale } from "../../types";
import { AdminLayout } from "./AdminLayout";

export function AdminDashboardPage({ locale, onSiteHome }: { locale: UiLocale; onSiteHome: () => void }) {
  const auth = useAuth();
  const title = adminSystemT(locale, "dashboardTitle");
  if (auth.loading) return <AdminLayout locale={locale} title={title} dashboard onSiteHome={onSiteHome}><div className="admin-state">{adminSystemT(locale, "loading")}</div></AdminLayout>;
  if (!auth.user?.isAdmin) return <AdminLayout locale={locale} title={title} dashboard onSiteHome={onSiteHome}><div className="admin-state">{adminSystemT(locale, "adminRequired")}</div></AdminLayout>;

  const cards = [
    { path: "/admin/listening", icon: FileUp, title: adminSystemT(locale, "importTitle"), description: adminSystemT(locale, "importDescription") },
    { path: "/admin/listening/manage", icon: Library, title: adminSystemT(locale, "lessonsTitle"), description: adminSystemT(locale, "lessonsDescription") },
    { path: "/admin/listening/translations", icon: Languages, title: adminTranslationT(locale,"title"), description: adminTranslationT(locale,"description") },
  ];

  return <AdminLayout locale={locale} title={title} dashboard onSiteHome={onSiteHome}>
    <p className="admin-dashboard-intro">{adminSystemT(locale, "dashboardIntro")}</p>
    <div className="admin-dashboard-grid">{cards.map(card => <button className="admin-feature-card" type="button" key={card.path} onClick={() => navigateToHash(card.path)}><span className="admin-feature-icon"><card.icon size={23} /></span><strong>{card.title}</strong><p>{card.description}</p><em>{adminSystemT(locale, "manage")}</em></button>)}</div>
  </AdminLayout>;
}

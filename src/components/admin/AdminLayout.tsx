import { ArrowLeft, LayoutDashboard, LogOut, Moon, ShieldCheck, Sun } from "lucide-react";
import { adminSystemT } from "../../adminSystemI18n";
import { useAuth } from "../../auth";
import { navigateToPath } from "../../router";
import { useTheme } from "../../theme";
import type { UiLocale } from "../../types";

export function AdminLayout({ locale, title, onSiteHome, dashboard = false, children }: { locale: UiLocale; title: string; onSiteHome: () => void; dashboard?: boolean; children: React.ReactNode }) {
  const auth = useAuth();
  const { theme, toggleTheme } = useTheme();
  const toggleLabel = adminSystemT(locale, theme === "dark" ? "lightTheme" : "darkTheme");
  const logout = async () => { await auth.logout(); onSiteHome(); };

  return <div className={`admin-system admin-theme-${theme}`}>
    <header className="admin-system-header">
      <div className="admin-system-heading"><span className="admin-system-mark"><ShieldCheck size={22} /></span><div><span>{adminSystemT(locale, "eyebrow")}</span><h1>{title}</h1></div></div>
      <div className="admin-system-actions">
        <button className="admin-icon-button" type="button" title={toggleLabel} aria-label={toggleLabel} aria-pressed={theme === "dark"} onClick={toggleTheme}>{theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}</button>
        {auth.user && <div className="admin-account" title={`${adminSystemT(locale, "account")}: ${auth.user.email}`}>{auth.user.avatarUrl ? <img alt="" referrerPolicy="no-referrer" src={auth.user.avatarUrl} /> : <span>{auth.user.displayName.slice(0, 1).toUpperCase()}</span>}<b>{auth.user.email}</b></div>}
        {!dashboard && <button type="button" onClick={() => navigateToPath("/admin")}><LayoutDashboard size={16} />{adminSystemT(locale, "adminHome")}</button>}
        <button type="button" onClick={onSiteHome}><ArrowLeft size={16} />{adminSystemT(locale, "siteHome")}</button>
        {auth.user && <button className="admin-logout" type="button" onClick={() => void logout()}><LogOut size={16} />{adminSystemT(locale, "logout")}</button>}
      </div>
    </header>
    <main className="admin-system-main">{children}</main>
  </div>;
}

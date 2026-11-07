import { Component, type ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import type { Lang } from "../lib/catalog";
import { translate, type Key } from "../lib/i18n";
import { Button } from "./ui";

/** Une page qui plante affiche ce message au lieu de vider toute la fenêtre ; changer de page repart de zéro. */
export class PageBoundary extends Component<{ lang: Lang; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error(error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    const t = (key: Key) => translate(this.props.lang, key);
    return (
      <section className="card page-error">
        <h3>{t("page.errorTitle")}</h3>
        <p className="muted small">{t("page.errorLead")}</p>
        <div className="share-actions">
          <Button size="sm" icon={<RefreshCw size={13} />} onClick={() => this.setState({ failed: false })}>
            {t("notice.retry")}
          </Button>
        </div>
      </section>
    );
  }
}

// Icônes de l'app, charte v5 « Match day » (22/11/2026).
// Même nom et mêmes props que lucide-react : `import { Zap } from "../components/ri"` donne l'icône imprimée
// (formes pleines, couche rouge décalée, penchée), et tout ce qui n'a pas d'équivalent imprimé (flèches, chevrons,
// croix, chargement, signes d'interface) reste l'icône au trait de lucide, réexportée telle quelle.
// Couleurs : --pf (face, papier par défaut) et --pb (dos, rouge) ; le CSS les change selon le fond (styles/v5.css).
import { forwardRef, useId, type CSSProperties, type SVGProps } from "react";
import type { LucideIcon } from "lucide-react";
import { PRINT_FILTERS, PRINTED } from "./printed";

export * from "lucide-react";

type Props = Omit<SVGProps<SVGSVGElement>, "ref"> & { size?: number | string; strokeWidth?: number | string; absoluteStrokeWidth?: boolean; color?: string };

/** Icône imprimée par son nom dans la charte (dashboard, latency, apply…). */
export const PrintIcon = forwardRef<SVGSVGElement, Props & { name: string }>(function PrintIcon(
  { name, size = 16, className, style, strokeWidth: _sw, absoluteStrokeWidth: _a, color, ...rest },
  ref,
) {
  const id = useId().replace(/:/g, "");
  const shape = PRINTED[name];
  if (!shape) return null;
  const [sh, cu] = shape;
  const st: CSSProperties | undefined = color ? { ...style, color } : style;
  return (
    <svg
      ref={ref}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      overflow="visible"
      aria-hidden="true"
      className={`pi${className ? ` ${className}` : ""}`}
      style={st}
      {...rest}
      dangerouslySetInnerHTML={{
        __html:
          `<defs><mask id="m${id}" maskUnits="userSpaceOnUse" x="-4" y="-4" width="32" height="32"><rect x="-4" y="-4" width="32" height="32" fill="#fff"/>${cu}</mask>` +
          `<g id="g${id}" mask="url(#m${id})">${sh}</g></defs><g transform="translate(2.55 0) skewX(-12)">` +
          `<use href="#g${id}" class="pb" transform="translate(1.3 1.5)" filter="url(#rgh-back-s)"/><use href="#g${id}" class="pf" filter="url(#rgh-face-s)"/></g>`,
      }}
    />
  );
});

/** Filtres partagés des icônes imprimées, posés une fois en haut de l'app (et de la barre en jeu). */
export function PrintDefs() {
  return <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" dangerouslySetInnerHTML={{ __html: `<defs>${PRINT_FILTERS}</defs>` }} />;
}

const p = (name: string) => {
  const C = forwardRef<SVGSVGElement, Props>(function Printed(props, ref) {
    return <PrintIcon ref={ref} name={name} {...props} />;
  });
  C.displayName = `Printed(${name})`;
  return C as unknown as LucideIcon;
};

// lucide → icône imprimée de la charte
export const Activity = p("pulse");
export const AlertTriangle = p("alert");
export const TriangleAlert = p("alert");
export const AppWindow = p("appwin");
export const Box = p("minecraft");
export const BrushCleaning = p("brush");
export const Check = p("check");
export const Copy = p("copy");
export const CornerDownLeft = p("enter");
export const Cpu = p("cpu");
export const Crosshair = p("hitreg");
export const Download = p("download");
export const ExternalLink = p("external");
export const Eye = p("eye");
export const EyeOff = p("eyeoff");
export const FileText = p("filetext");
export const FlaskConical = p("expert");
export const FolderOpen = p("folder");
export const Gamepad2 = p("games");
export const Gauge = p("latency");
export const Gift = p("gift");
export const Globe = p("globe");
export const Gpu = p("graphics");
export const HardDrive = p("drive");
export const Info = p("info");
export const LayoutDashboard = p("dashboard");
export const Lightbulb = p("bulb");
export const ListPlus = p("list");
export const ListTree = p("list");
export const Lock = p("lock");
export const LogOut = p("logout");
export const MemoryStick = p("ram");
export const MessagesSquare = p("chat");
export const Monitor = p("monitor");
export const MonitorCog = p("monitor");
export const Mouse = p("mouse");
export const MousePointer2 = p("mouse");
export const MousePointerClick = p("mouse");
export const Network = p("network");
export const Palette = p("display");
export const Pencil = p("pencil");
export const Pin = p("pin");
export const PinOff = p("pinoff");
export const Play = p("play");
export const Plus = p("plus");
export const Power = p("power");
export const PowerOff = p("power");
export const RefreshCw = p("refresh");
export const RotateCcw = p("rotate");
export const Route = p("route");
export const Router = p("network");
export const ScanSearch = p("analysis");
export const Search = p("search");
export const Settings = p("settings");
export const Share2 = p("share");
export const Shield = p("rbw");
export const ShieldAlert = p("shieldx");
export const ShieldCheck = p("rbw");
export const SlidersHorizontal = p("settings");
export const Sparkles = p("sparkles");
export const Star = p("star");
export const Trash2 = p("trash");
export const Undo2 = p("restore");
export const Upload = p("upload");
export const UserRound = p("user");
export const Wrench = p("tools");
export const Zap = p("apply");

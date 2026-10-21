import {
  Box, Crosshair, FlaskConical, Gamepad2, Gauge, Globe, Gpu, LayoutDashboard, Network, Settings, Shield, Undo2, AppWindow, Zap, type LucideIcon,
} from "lucide-react";
import { MarkIcon } from "./Logo";

export const MODULE_ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  network: Network,
  gauge: Gauge,
  gpu: Gpu,
  windows: AppWindow,
  crosshair: Crosshair,
  cube: Box,
  shield: Shield,
  bolt: Zap,
  flask: FlaskConical,
  undo: Undo2,
  settings: Settings,
  games: Gamepad2,
  nettest: Globe,
  // la marque de Rago, pas une icône au trait : même taille, même couleur que les autres
  os: MarkIcon as unknown as LucideIcon,
};

import type { GraphicsLevel } from "./api";
import { presetForGame, type I18n } from "./catalog";

/** Graphismes des jeux (gamecfg.rs) : comme OptiFine dans Minecraft (Sofiene, 11/11/2026), trois niveaux par jeu,
 * écrits dans les réglages du jeu lui-même. Ce fichier donne seulement les textes : les clés et leurs valeurs sont dans
 * gamecfg.rs, qui seul écrit. Les deux listes de jeux doivent rester les mêmes. */

export const GFX_LEVELS: GraphicsLevel[] = ["performance", "balanced", "quality"];

/** Jeu de gamecfg.rs, d'après le preset du catalogue reconnu par son nom. */
const BY_PRESET: Record<string, string> = {
  game_valorant: "valorant",
  game_fortnite: "fortnite",
  game_cs2: "cs2",
  game_apex: "apex",
  game_rivals: "rivals",
  game_finals: "finals",
};

export const graphicsForGame = (name: string): string | null => {
  const p = presetForGame(name);
  return p ? (BY_PRESET[p.id] ?? null) : null;
};

const UE: Record<GraphicsLevel, I18n> = {
  performance: { en: "Every quality group at its lowest, V-Sync off.", fr: "Tous les groupes de qualité au plus bas, V-Sync coupée." },
  balanced: {
    en: "High view distance, textures and anti-aliasing, medium shadows, lighting and effects, V-Sync off.",
    fr: "Distance d'affichage, textures et anti-crénelage hauts, ombres, éclairage et effets moyens, V-Sync coupée.",
  },
  quality: { en: "Every quality group at Epic.", fr: "Tous les groupes de qualité en Épique." },
};

/** Ce que chaque niveau change, jeu par jeu (les valeurs exactes : gamecfg.rs). */
export const GFX_DETAILS: Record<string, Record<GraphicsLevel, I18n>> = {
  valorant: {
    performance: { en: "Every quality setting at its lowest, V-Sync off.", fr: "Tous les réglages de qualité au plus bas, V-Sync coupée." },
    balanced: {
      en: "Low materials, shadows and effects, medium textures, anti-aliasing kept for clean edges, V-Sync off.",
      fr: "Matériaux, ombres et effets bas, textures moyennes, anti-crénelage gardé pour des contours nets, V-Sync coupée.",
    },
    quality: { en: "Every quality setting at its highest.", fr: "Tous les réglages de qualité au plus haut." },
  },
  fortnite: {
    performance: {
      en: "Performance mode, everything at its lowest, no grass, no motion blur, V-Sync off.",
      fr: "Mode Performance, tout au plus bas, sans herbe ni flou de mouvement, V-Sync coupée.",
    },
    balanced: {
      en: "Performance mode with max view distance, medium textures and meshes, no grass, no motion blur, V-Sync off.",
      fr: "Mode Performance avec la distance d'affichage au max, textures et modèles moyens, sans herbe ni flou, V-Sync coupée.",
    },
    quality: { en: "DirectX 12, everything at Epic, Nanite and grass on.", fr: "DirectX 12, tout en Épique, Nanite et herbe activés." },
  },
  cs2: {
    performance: {
      en: "Everything low, no anti-aliasing, sun shadows only, HDR on Performance, V-Sync off.",
      fr: "Tout en bas, sans anti-crénelage, ombres du soleil seulement, HDR en Performance, V-Sync coupée.",
    },
    balanced: {
      en: "The pro setup: high dynamic shadows to spot enemies sooner, 4x MSAA, 4x anisotropic filtering, the rest low, V-Sync off.",
      fr: "Le réglage des pros : ombres hautes et dynamiques pour voir les ennemis plus tôt, MSAA 4x, filtrage anisotrope 4x, le reste bas, V-Sync coupée.",
    },
    quality: {
      en: "High shaders, textures, particles and ambient occlusion, 8x MSAA, 16x filtering, HDR on Quality.",
      fr: "Shaders, textures, particules et occlusion ambiante hauts, MSAA 8x, filtrage 16x, HDR en Qualité.",
    },
  },
  apex: {
    performance: {
      en: "No anti-aliasing, 2 GB texture budget, no ambient occlusion, light shafts or spot shadows, low models and effects, V-Sync off.",
      fr: "Sans anti-crénelage, textures sur 2 Go, sans occlusion ambiante, rayons de lumière ni ombres des lampes, modèles et effets bas, V-Sync coupée.",
    },
    balanced: {
      en: "TSAA, 3 GB texture budget, 4x anisotropic filtering, low shadows, medium models and effects, V-Sync off.",
      fr: "TSAA, textures sur 3 Go, filtrage anisotrope 4x, ombres basses, modèles et effets moyens, V-Sync coupée.",
    },
    quality: {
      en: "TSAA, 4 GB texture budget, 16x filtering, ambient occlusion, light shafts, high shadows, models and effects.",
      fr: "TSAA, textures sur 4 Go, filtrage 16x, occlusion ambiante, rayons de lumière, ombres, modèles et effets hauts.",
    },
  },
  rivals: UE,
  finals: UE,
};

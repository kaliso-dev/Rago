/** Photo de profil du compte, ou la première lettre du nom (ou de l'email) sur un rond sombre. */
export function Avatar({ photo, name, size = 32 }: { photo: string | null | undefined; name: string | null | undefined; size?: number }) {
  const initial = [...(name ?? "").trim()][0]?.toUpperCase() ?? "?";
  return (
    <span className={`avatar${photo ? "" : " avatar-none"}`} style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }} aria-hidden="true">
      {photo ? <img src={photo} alt="" width={size} height={size} draggable={false} /> : initial}
    </span>
  );
}

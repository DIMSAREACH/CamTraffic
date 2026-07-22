type Props = {
  variant?: 'user' | 'admin';
};

/** Full-viewport MOI building photo — edge-to-edge width. */
export function AuthPageBackground({ variant = 'user' }: Props) {
  return (
    <div
      className={variant === 'admin' ? 'up-bg ap-bg' : 'up-bg'}
      aria-hidden
    >
      <img
        src="/moi-building.png"
        alt=""
        className="up-bg__img"
        decoding="async"
        fetchPriority="high"
      />
    </div>
  );
}

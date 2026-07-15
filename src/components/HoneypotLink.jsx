// Invisible to real visitors (off-screen, aria-hidden, unreachable by keyboard
// tab order) but present in the raw HTML/DOM for naive scrapers that follow
// every <a href> they find. Anyone who ends up on /__trap__ gets flagged.
export default function HoneypotLink() {
  return (
    <a
      href="/__trap__"
      tabIndex={-1}
      aria-hidden="true"
      rel="nofollow"
      style={{
        position: 'absolute',
        width: 1,
        height: 1,
        overflow: 'hidden',
        clip: 'rect(0 0 0 0)',
        whiteSpace: 'nowrap',
      }}
    >
      do not follow
    </a>
  );
}

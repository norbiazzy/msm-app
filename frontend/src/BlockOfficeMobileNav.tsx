export function BlockOfficeMobileNav() {
  function goSearch() {
    // PART_V064_K_CONTEXT_SEARCH
    const onTasks =
      window.location.hash.startsWith(
        '#tasks'
      );

    const targetId =
      onTasks
        ? 'bo-task-search'
        : 'bo-deal-search';

    if (
      !onTasks &&
      !window.location.hash.startsWith(
        '#home'
      )
    ) {
      window.location.hash =
        '#home';
    }

    window.setTimeout(
      () => {
        const input =
          document.getElementById(
            targetId,
          ) as HTMLInputElement | null;

        if (input) {
          input.focus();

          input.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
        }
      },
      80,
    );
  }

  return (
    <nav
      className="boMobileNav"
      aria-label="Основная навигация"
    >
      <a href="#files"><b>▤</b><span>Файлы</span></a>

      <button
        type="button"
        className="boMobileEmpty"
        aria-label="Свободная кнопка 2"
        disabled
      >
        <b>·</b>
        <span>&nbsp;</span>
      </button>

      <a href="#tasks">
        <b>✓</b>
        <span>Задачи</span>
      </a>

      <a href="#home">
        <b>▦</b>
        <span>Сделки</span>
      </a>

      <button
        type="button"
        onClick={goSearch}
      >
        <b>⌕</b>
        <span>Поиск</span>
      </button>
    </nav>
  );
}

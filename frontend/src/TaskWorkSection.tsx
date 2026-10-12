/* MSM_STEP31_ACCOUNTANT_WORK_FORMS */
import type { ReactNode } from 'react';

/** Visual wrapper only. The parent task owns saving, validation and completion. */
export function TaskWorkSection({
  title, description, children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="taskAccountantWork" aria-label={title}>
      <header className="taskAccountantWorkHead">
        <span className="taskAccountantWorkEyebrow">Бухгалтерия · В работе</span>
        <h3>{title}</h3>
        {description && <p>{description}</p>}
      </header>
      <div className="taskAccountantWorkBody">{children}</div>
    </section>
  );
}
/* END_MSM_STEP31_ACCOUNTANT_WORK_FORMS */

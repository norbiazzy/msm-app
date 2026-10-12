/* MSM_STEP29_UNIFIED_TASK_DATA_COMPONENT */
import type { ReactNode } from 'react';

type TaskDataItem = {
  label: string;
  value: ReactNode;
  wide?: boolean;
};

export function TaskDataSection({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle?: string;
  items: TaskDataItem[];
}) {
  return (
    <section className="taskUnifiedData" aria-label={title}>
      <div className="taskUnifiedDataHead">
        <h3>{title}</h3>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <div className="taskUnifiedDataGrid">
        {items.map((item, index) => (
          <div
            key={item.label + ':' + index}
            className={item.wide ? 'taskUnifiedDataField taskUnifiedDataField--wide' : 'taskUnifiedDataField'}
          >
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

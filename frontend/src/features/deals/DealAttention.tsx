import type { Deal } from '../../types';
import { taskStatus } from '../../shared/formatters';

export function DealAttention({ deal }: { deal: Deal }) {
  return (
          <div className="dealWorkspaceCAttention">

            <div className="dealWorkspaceCSectionTitle">
              Сейчас требует внимания
            </div>

            {
              deal.tasks.filter(
                (task) =>
                  ![
                    'DONE',
                    'CANCELLED',
                  ].includes(
                    task.status
                  )
              ).length > 0 ? (

              <div className="dealWorkspaceCAttentionList">
                {
                  deal.tasks
                    .filter(
                      (task) =>
                        ![
                          'DONE',
                          'CANCELLED',
                        ].includes(
                          task.status
                        )
                    )
                    .slice(0, 3)
                    .map(
                      (task) => (
                        <a
                          className="dealWorkspaceCAttentionRow"
                          key={task.id}
                          href={
                            '#tasks/' +
                            encodeURIComponent(
                              task.id
                            )
                          }
                        >
                          <div>
                            <strong>
                              {task.title}
                            </strong>

                            <span>
                              {
                                task.status ===
                                  'NEED_DATA'
                                  ? 'Нужно исправить'
                                  : taskStatus(
                                      task.status
                                    )
                              }
                            </span>
                          </div>

                          <b>→</b>
                        </a>
                      )
                    )
                }
              </div>

            ) : (

              <div className="dealWorkspaceCQuiet">
                Активных задач нет
              </div>

            )}
          </div>
  );
}

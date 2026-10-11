const fs = require('fs');
const path = require('path');

const root = __dirname;
const checkOnly = process.argv.includes('--check');

const appFile = path.join(root, 'frontend', 'src', 'App.tsx');
const stylesFile = path.join(root, 'frontend', 'src', 'styles.css');
const homeFile = path.join(root, 'frontend', 'src', 'BlockOfficeHome.tsx');
const navFile = path.join(root, 'frontend', 'src', 'BlockOfficeMobileNav.tsx');

const homeContent = "import {\n  useMemo,\n  useState,\n} from 'react';\n\nimport type {\n  Deal,\n} from './types';\n\ntype DealViewMode =\n  | 'cards'\n  | 'expanded';\n\ntype LooseTask = {\n  id: string;\n  title?: string;\n  type?: string;\n  status?: string;\n  urgent?: boolean;\n};\n\ntype LooseInvoice = {\n  id?: string;\n  number?: string;\n  invoiceNumber?: string;\n  amount?: number | string;\n  invoiceDate?: string;\n  createdAt?: string;\n  isCurrent?: boolean;\n  status?: string;\n};\n\nfunction money(\n  value: unknown,\n) {\n  const normalized =\n    typeof value === 'number'\n      ? value\n      : Number(\n          String(value ?? '')\n            .replace(/\\s/g, '')\n            .replace(',', '.')\n        );\n\n  if (!Number.isFinite(normalized)) {\n    return '—';\n  }\n\n  return new Intl.NumberFormat(\n    'ru-RU',\n    {\n      maximumFractionDigits: 2,\n    },\n  ).format(normalized) + ' ₽';\n}\n\nfunction shortDate(\n  value: unknown,\n) {\n  if (!value) {\n    return '—';\n  }\n\n  const date =\n    new Date(String(value));\n\n  if (\n    Number.isNaN(date.getTime())\n  ) {\n    return '—';\n  }\n\n  return date.toLocaleDateString(\n    'ru-RU',\n  );\n}\n\nfunction taskLabel(\n  task: LooseTask,\n) {\n  if (\n    task.title &&\n    task.title.trim()\n  ) {\n    return task.title;\n  }\n\n  return ({\n    ISSUE_CLIENT_INVOICE:\n      'Выставить счёт',\n    CORRECT_CLIENT_INVOICE:\n      'Исправить счёт',\n    SUPPLIER_PAYMENT:\n      'Оплатить поставщику',\n    POWER_OF_ATTORNEY:\n      'Сделать доверенность',\n    ETRN:\n      'Создать ЭТРН',\n    REALIZATION:\n      'Сделать реализацию',\n  } as Record<string, string>)[\n    task.type || ''\n  ] || task.type || 'Задача';\n}\n\nfunction taskState(\n  task: LooseTask,\n) {\n  if (task.urgent) {\n    return {\n      label: 'Срочно',\n      tone: 'urgent',\n    };\n  }\n\n  return ({\n    NEW: {\n      label: 'Новая',\n      tone: 'new',\n    },\n    IN_PROGRESS: {\n      label: 'В работе',\n      tone: 'work',\n    },\n    NEED_DATA: {\n      label: 'Исправить',\n      tone: 'fix',\n    },\n  } as Record<\n    string,\n    {\n      label: string;\n      tone: string;\n    }\n  >)[task.status || ''] || {\n    label:\n      task.status || 'Активна',\n    tone: 'new',\n  };\n}\n\nfunction dealState(\n  deal: Deal,\n  tasks: LooseTask[],\n) {\n  if (\n    tasks.some(\n      (task) =>\n        task.status === 'NEED_DATA'\n    )\n  ) {\n    return {\n      label: 'Нужно исправить',\n      tone: 'fix',\n    };\n  }\n\n  if (deal.status === 'CLOSED') {\n    return {\n      label: 'Закрыта',\n      tone: 'closed',\n    };\n  }\n\n  const paymentStatus =\n    String(\n      (deal as any).paymentStatus ||\n      ''\n    );\n\n  if (\n    paymentStatus === 'PAID'\n  ) {\n    return {\n      label: 'Оплачен',\n      tone: 'done',\n    };\n  }\n\n  if (\n    paymentStatus === 'WAITING'\n  ) {\n    return {\n      label: 'Ожидаем оплату',\n      tone: 'wait',\n    };\n  }\n\n  if (\n    paymentStatus === 'ADVANCE'\n  ) {\n    return {\n      label: 'Аванс',\n      tone: 'work',\n    };\n  }\n\n  if (\n    paymentStatus === 'DEFERRED'\n  ) {\n    return {\n      label: 'Отсрочка',\n      tone: 'closed',\n    };\n  }\n\n  return {\n    label: 'В работе',\n    tone: 'work',\n  };\n}\n\nfunction dealInvoice(\n  deal: Deal,\n) {\n  const invoices =\n    Array.isArray(\n      (deal as any).invoices\n    )\n      ? (\n          (deal as any)\n            .invoices as LooseInvoice[]\n        )\n      : [];\n\n  return (\n    invoices.find(\n      (invoice) =>\n        invoice.isCurrent\n    ) ||\n    invoices[0] ||\n    null\n  );\n}\n\nfunction activeTasks(\n  deal: Deal,\n) {\n  const tasks =\n    Array.isArray(\n      (deal as any).tasks\n    )\n      ? (\n          (deal as any)\n            .tasks as LooseTask[]\n        )\n      : [];\n\n  return tasks.filter(\n    (task) =>\n      ![\n        'DONE',\n        'CANCELLED',\n      ].includes(\n        String(task.status || '')\n      )\n  );\n}\n\nfunction DealTaskRow({\n  task,\n}: {\n  task: LooseTask;\n}) {\n  const state =\n    taskState(task);\n\n  return (\n    <a\n      className={\n        'boTaskRow boTask-' +\n        state.tone\n      }\n      href={\n        '#tasks/' +\n        encodeURIComponent(\n          task.id,\n        )\n      }\n      onClick={(event) =>\n        event.stopPropagation()\n      }\n    >\n      <span className=\"boTaskBar\" />\n\n      <span className=\"boTaskText\">\n        <strong>\n          {taskLabel(task)}\n        </strong>\n\n        <small>\n          {\n            task.status ===\n              'NEED_DATA'\n              ? 'Возвращено менеджеру'\n              : 'Активная задача'\n          }\n        </small>\n      </span>\n\n      <span\n        className={\n          'boTaskBadge boTaskBadge-' +\n          state.tone\n        }\n      >\n        {state.label}\n      </span>\n    </a>\n  );\n}\n\nexport function BlockOfficeHome({\n  deals,\n  onNew,\n  onOpen,\n}: {\n  deals: Deal[];\n  onNew: () => void;\n  onOpen:\n    (id: string) => void;\n}) {\n  const [\n    mode,\n    setMode,\n  ] = useState<DealViewMode>(\n    () =>\n      localStorage.getItem(\n        'msm.deals.view.v063',\n      ) === 'expanded'\n        ? 'expanded'\n        : 'cards',\n  );\n\n  const [\n    query,\n    setQuery,\n  ] = useState('');\n\n  function changeMode(\n    next:\n      DealViewMode,\n  ) {\n    setMode(next);\n\n    localStorage.setItem(\n      'msm.deals.view.v063',\n      next,\n    );\n  }\n\n  const filteredDeals =\n    useMemo(\n      () => {\n        const needle =\n          query\n            .trim()\n            .toLowerCase();\n\n        if (!needle) {\n          return deals;\n        }\n\n        return deals.filter(\n          (deal) => {\n            const invoice =\n              dealInvoice(deal);\n\n            const tasks =\n              activeTasks(deal);\n\n            const haystack = [\n              deal.internalNumber,\n              deal.clientName,\n              invoice?.number,\n              invoice\n                ?.invoiceNumber,\n              deal.managerComment,\n              ...tasks.map(\n                taskLabel,\n              ),\n            ]\n              .filter(Boolean)\n              .join(' ')\n              .toLowerCase();\n\n            return haystack.includes(\n              needle,\n            );\n          },\n        );\n      },\n      [deals, query],\n    );\n\n  return (\n    <section className=\"boDealsHome\">\n      <div className=\"boToolbar\">\n        <label className=\"boSearch\">\n          <span>⌕</span>\n\n          <input\n            id=\"bo-deal-search\"\n            value={query}\n            onChange={(event) =>\n              setQuery(\n                event.target.value,\n              )\n            }\n            placeholder=\"Поиск по сделке, счёту, клиенту, задаче...\"\n          />\n        </label>\n\n        <div className=\"boToolbarActions\">\n          <div\n            className=\"boViewToggle\"\n            aria-label=\"Вид списка сделок\"\n          >\n            <button\n              type=\"button\"\n              className={\n                mode === 'cards'\n                  ? 'active'\n                  : ''\n              }\n              title=\"Карточки\"\n              onClick={() =>\n                changeMode(\n                  'cards',\n                )\n              }\n            >\n              ▦\n            </button>\n\n            <button\n              type=\"button\"\n              className={\n                mode ===\n                'expanded'\n                  ? 'active'\n                  : ''\n              }\n              title=\"Развёрнутый список\"\n              onClick={() =>\n                changeMode(\n                  'expanded',\n                )\n              }\n            >\n              ≡\n            </button>\n          </div>\n\n          <button\n            type=\"button\"\n            className=\"boCreateDeal\"\n            onClick={onNew}\n          >\n            + Новая сделка\n          </button>\n        </div>\n      </div>\n\n      {filteredDeals.length === 0 ? (\n        <div className=\"boEmpty\">\n          Сделок не найдено.\n        </div>\n      ) : mode === 'cards' ? (\n        <div className=\"boDealGrid\">\n          {filteredDeals.map(\n            (deal) => {\n              const invoice =\n                dealInvoice(deal);\n\n              const tasks =\n                activeTasks(deal);\n\n              const state =\n                dealState(\n                  deal,\n                  tasks,\n                );\n\n              return (\n                <article\n                  key={deal.id}\n                  className={\n                    'boDealCard boTone-' +\n                    state.tone\n                  }\n                  onClick={() =>\n                    onOpen(deal.id)\n                  }\n                >\n                  <div className=\"boDealTop\">\n                    <div>\n                      <strong className=\"boInternalNumber\">\n                        №{\n                          deal\n                            .internalNumber\n                        }\n                      </strong>\n\n                      <span className=\"boInvoiceNumber\">\n                        {\n                          invoice\n                            ? 'Счёт №' +\n                              (\n                                invoice.number ||\n                                invoice\n                                  .invoiceNumber ||\n                                '—'\n                              )\n                            : 'Счёт ещё не создан'\n                        }\n                      </span>\n                    </div>\n\n                    <strong className=\"boAmount\">\n                      {money(\n                        invoice?.amount,\n                      )}\n                    </strong>\n                  </div>\n\n                  <div className=\"boClientName\">\n                    {\n                      deal.clientName ||\n                      'Клиент не указан'\n                    }\n                  </div>\n\n                  <div className=\"boStateRow\">\n                    <span\n                      className={\n                        'boStatus boStatus-' +\n                        state.tone\n                      }\n                    >\n                      <i />\n                      {\n                        state.label\n                      }\n                    </span>\n\n                    <span className=\"boDealDate\">\n                      {shortDate(\n                        invoice\n                          ?.invoiceDate ||\n                        invoice\n                          ?.createdAt ||\n                        deal.createdAt,\n                      )}\n                    </span>\n                  </div>\n\n                  {deal.managerComment && (\n                    <div className=\"boManagerNote\">\n                      <span>\n                        Мой комментарий\n                      </span>\n\n                      <strong>\n                        {\n                          deal.managerComment\n                        }\n                      </strong>\n                    </div>\n                  )}\n\n                  {tasks.length > 0 && (\n                    <div className=\"boTasksBlock\">\n                      <div className=\"boTasksTitle\">\n                        {\n                          tasks.length === 1\n                            ? 'АКТИВНАЯ ЗАДАЧА'\n                            : `АКТИВНЫЕ ЗАДАЧИ · ${tasks.length}`\n                        }\n                      </div>\n\n                      <div className=\"boTaskStack\">\n                        {tasks.map(\n                          (task) => (\n                            <DealTaskRow\n                              key={\n                                task.id\n                              }\n                              task={\n                                task\n                              }\n                            />\n                          ),\n                        )}\n                      </div>\n                    </div>\n                  )}\n                </article>\n              );\n            },\n          )}\n        </div>\n      ) : (\n        <div className=\"boExpanded\">\n          <div className=\"boExpandedHead\">\n            <span>\n              Внутр. №\n            </span>\n            <span>\n              Счёт\n            </span>\n            <span>\n              Сумма\n            </span>\n            <span>\n              Статус\n            </span>\n            <span>\n              Задачи\n            </span>\n            <span>\n              Комментарий\n            </span>\n          </div>\n\n          {filteredDeals.map(\n            (deal) => {\n              const invoice =\n                dealInvoice(deal);\n\n              const tasks =\n                activeTasks(deal);\n\n              const state =\n                dealState(\n                  deal,\n                  tasks,\n                );\n\n              return (\n                <div\n                  key={deal.id}\n                  className=\"boExpandedRow\"\n                  onClick={() =>\n                    onOpen(deal.id)\n                  }\n                >\n                  <strong>\n                    №{\n                      deal\n                        .internalNumber\n                    }\n                  </strong>\n\n                  <span>\n                    {\n                      invoice\n                        ? '№' +\n                          (\n                            invoice.number ||\n                            invoice\n                              .invoiceNumber ||\n                            '—'\n                          )\n                        : '—'\n                    }\n                  </span>\n\n                  <strong className=\"boExpandedAmount\">\n                    {money(\n                      invoice?.amount,\n                    )}\n                  </strong>\n\n                  <span\n                    className={\n                      'boStatus boStatus-' +\n                      state.tone\n                    }\n                  >\n                    <i />\n                    {\n                      state.label\n                    }\n                  </span>\n\n                  <div className=\"boExpandedTasks\">\n                    {\n                      tasks.length\n                        ? tasks.map(\n                            (task) => (\n                              <a\n                                key={\n                                  task.id\n                                }\n                                href={\n                                  '#tasks/' +\n                                  encodeURIComponent(\n                                    task.id,\n                                  )\n                                }\n                                onClick={(\n                                  event,\n                                ) =>\n                                  event\n                                    .stopPropagation()\n                                }\n                              >\n                                {\n                                  taskLabel(\n                                    task,\n                                  )\n                                }\n                              </a>\n                            ),\n                          )\n                        : (\n                          <span className=\"boMuted\">\n                            —\n                          </span>\n                        )\n                    }\n                  </div>\n\n                  <span className=\"boExpandedComment\">\n                    {\n                      deal.managerComment ||\n                      '—'\n                    }\n                  </span>\n                </div>\n              );\n            },\n          )}\n        </div>\n      )}\n    </section>\n  );\n}\n";
const navContent = "export function BlockOfficeMobileNav() {\n  function goSearch() {\n    if (\n      !window.location.hash ||\n      !window.location.hash.startsWith(\n        '#home',\n      )\n    ) {\n      window.location.hash =\n        '#home';\n    }\n\n    window.setTimeout(\n      () => {\n        const input =\n          document.getElementById(\n            'bo-deal-search',\n          ) as HTMLInputElement | null;\n\n        if (input) {\n          input.focus();\n\n          input.scrollIntoView({\n            behavior: 'smooth',\n            block: 'center',\n          });\n        }\n      },\n      80,\n    );\n  }\n\n  return (\n    <nav\n      className=\"boMobileNav\"\n      aria-label=\"Основная навигация\"\n    >\n      <button\n        type=\"button\"\n        className=\"boMobileEmpty\"\n        aria-label=\"Свободная кнопка 1\"\n        disabled\n      >\n        <b>·</b>\n        <span>&nbsp;</span>\n      </button>\n\n      <button\n        type=\"button\"\n        className=\"boMobileEmpty\"\n        aria-label=\"Свободная кнопка 2\"\n        disabled\n      >\n        <b>·</b>\n        <span>&nbsp;</span>\n      </button>\n\n      <a href=\"#tasks\">\n        <b>✓</b>\n        <span>Задачи</span>\n      </a>\n\n      <a href=\"#home\">\n        <b>▦</b>\n        <span>Сделки</span>\n      </a>\n\n      <button\n        type=\"button\"\n        onClick={goSearch}\n      >\n        <b>⌕</b>\n        <span>Поиск</span>\n      </button>\n    </nav>\n  );\n}\n";
const cssContent = "/* PART_V063_BLOCK_OFFICE */\n.boDealsHome,\n.boMobileNav {\n  --bo-panel: #ffffff;\n  --bo-panel-2: #e9ece4;\n  --bo-text: #1d211c;\n  --bo-muted: #71786d;\n  --bo-line: #d8ddd2;\n  --bo-accent: #6e8758;\n  --bo-shadow: 0 8px 24px rgba(25, 30, 20, .07);\n  --bo-stone: #8b9187;\n  --bo-blue: #5e9fc8;\n  --bo-gold: #c59a35;\n  --bo-red: #bd5d50;\n  --bo-green: #648f51;\n  --bo-purple: #655775;\n  --bo-lava: #d06e36;\n}\n\nhtml[data-theme='dark'] .boDealsHome,\nhtml[data-theme='dark'] .boMobileNav {\n  --bo-panel: #1d2228;\n  --bo-panel-2: #252b32;\n  --bo-text: #eef1f4;\n  --bo-muted: #9aa3ad;\n  --bo-line: #343b44;\n  --bo-accent: #74879b;\n  --bo-shadow: 0 10px 28px rgba(0, 0, 0, .24);\n  --bo-stone: #9aa3ad;\n  --bo-blue: #72a9d0;\n  --bo-gold: #d4aa50;\n  --bo-red: #d27368;\n  --bo-green: #78a86b;\n  --bo-purple: #8b7a9d;\n  --bo-lava: #e1834d;\n}\n\n.boDealsHome {\n  color: var(--bo-text);\n}\n\n.boToolbar {\n  display: flex;\n  align-items: center;\n  gap: 10px;\n  justify-content: space-between;\n  margin-bottom: 14px;\n}\n\n.boSearch {\n  flex: 1 1 360px;\n  min-width: 0;\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  border: 1px solid var(--bo-line);\n  border-radius: 7px;\n  background: var(--bo-panel);\n  color: var(--bo-muted);\n  padding: 0 12px;\n}\n\n.boSearch input {\n  width: 100%;\n  border: 0;\n  outline: 0;\n  background: transparent;\n  color: var(--bo-text);\n  padding: 11px 0;\n}\n\n.boToolbarActions {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n}\n\n.boViewToggle {\n  display: flex;\n  align-items: center;\n  gap: 3px;\n  padding: 3px;\n  border: 1px solid var(--bo-line);\n  border-radius: 8px;\n  background: var(--bo-panel-2);\n}\n\n.boViewToggle button {\n  min-width: 42px;\n  min-height: 38px;\n  border: 1px solid transparent;\n  border-radius: 6px;\n  background: transparent;\n  color: var(--bo-text);\n  cursor: pointer;\n}\n\n.boViewToggle button.active {\n  border-color: var(--bo-line);\n  background: var(--bo-panel);\n  box-shadow: var(--bo-shadow);\n}\n\n.boCreateDeal {\n  min-height: 44px;\n  border: 0;\n  border-radius: 7px;\n  background: var(--bo-accent);\n  color: #fff;\n  font-weight: 800;\n  padding: 9px 13px;\n  cursor: pointer;\n}\n\n.boDealGrid {\n  display: grid;\n  grid-template-columns: repeat(3, minmax(0, 1fr));\n  gap: 12px;\n}\n\n.boDealCard {\n  position: relative;\n  overflow: hidden;\n  border: 1px solid var(--bo-line);\n  border-radius: 8px;\n  background: var(--bo-panel);\n  color: var(--bo-text);\n  padding: 15px;\n  box-shadow: var(--bo-shadow);\n  cursor: pointer;\n}\n\n.boDealCard::before {\n  content: '';\n  position: absolute;\n  inset: 0 auto 0 0;\n  width: 5px;\n  background: var(--bo-stone);\n}\n\n.boDealCard.boTone-done::before { background: var(--bo-green); }\n.boDealCard.boTone-work::before { background: var(--bo-blue); }\n.boDealCard.boTone-wait::before { background: var(--bo-gold); }\n.boDealCard.boTone-fix::before { background: var(--bo-red); }\n.boDealCard.boTone-closed::before { background: var(--bo-purple); }\n\n.boDealTop {\n  display: flex;\n  align-items: flex-start;\n  justify-content: space-between;\n  gap: 12px;\n}\n\n.boInternalNumber {\n  display: block;\n  font-size: 18px;\n  font-weight: 900;\n}\n\n.boInvoiceNumber {\n  display: block;\n  margin-top: 3px;\n  color: var(--bo-muted);\n  font-size: 13px;\n}\n\n.boAmount {\n  font-size: 20px;\n  font-weight: 900;\n  white-space: nowrap;\n}\n\n.boClientName {\n  margin: 13px 0 9px;\n  font-weight: 750;\n}\n\n.boStateRow {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 8px;\n}\n\n.boStatus {\n  display: inline-flex;\n  align-items: center;\n  gap: 7px;\n  border-radius: 4px;\n  padding: 5px 8px;\n  font-size: 12px;\n  font-weight: 900;\n  white-space: nowrap;\n}\n\n.boStatus i {\n  width: 9px;\n  height: 9px;\n  border-radius: 1px;\n  background: currentColor;\n}\n\n.boStatus-done { color: var(--bo-green); }\n.boStatus-work,\n.boStatus-new { color: var(--bo-blue); }\n.boStatus-wait { color: var(--bo-gold); }\n.boStatus-fix { color: var(--bo-red); }\n.boStatus-closed { color: var(--bo-purple); }\n\n.boDealDate {\n  color: var(--bo-muted);\n  font-size: 12px;\n}\n\n.boManagerNote {\n  margin-top: 10px;\n  padding: 9px 10px;\n  border-radius: 5px;\n  background: var(--bo-panel-2);\n  color: var(--bo-muted);\n  font-size: 13px;\n}\n\n.boManagerNote span {\n  display: block;\n  margin-bottom: 3px;\n  font-size: 10px;\n  font-weight: 800;\n  letter-spacing: .04em;\n  text-transform: uppercase;\n}\n\n.boManagerNote strong {\n  color: var(--bo-text);\n  font-weight: 650;\n}\n\n.boTasksBlock {\n  margin-top: 13px;\n}\n\n.boTasksTitle {\n  margin-bottom: 7px;\n  color: var(--bo-muted);\n  font-size: 11px;\n  font-weight: 900;\n  letter-spacing: .04em;\n}\n\n.boTaskStack {\n  display: flex;\n  flex-direction: column;\n  gap: 7px;\n}\n\n.boTaskRow {\n  display: grid;\n  grid-template-columns: 5px minmax(0, 1fr) auto;\n  align-items: stretch;\n  gap: 10px;\n  min-height: 54px;\n  overflow: hidden;\n  border: 1px solid var(--bo-line);\n  border-radius: 6px;\n  background: var(--bo-panel);\n  color: var(--bo-text);\n  text-decoration: none;\n}\n\n.boTaskBar { background: var(--bo-blue); }\n.boTask-new .boTaskBar { background: var(--bo-stone); }\n.boTask-work .boTaskBar { background: var(--bo-blue); }\n.boTask-fix .boTaskBar { background: var(--bo-red); }\n.boTask-urgent .boTaskBar { background: var(--bo-lava); }\n\n.boTaskText {\n  min-width: 0;\n  align-self: center;\n  padding: 8px 0;\n}\n\n.boTaskText strong,\n.boTaskText small {\n  display: block;\n  min-width: 0;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n\n.boTaskText strong {\n  font-size: 13px;\n}\n\n.boTaskText small {\n  margin-top: 3px;\n  color: var(--bo-muted);\n  font-size: 11px;\n}\n\n.boTaskBadge {\n  align-self: center;\n  margin-right: 8px;\n  border-radius: 4px;\n  background: var(--bo-panel-2);\n  color: var(--bo-muted);\n  font-size: 11px;\n  font-weight: 800;\n  padding: 5px 7px;\n  white-space: nowrap;\n}\n\n.boTaskBadge-fix {\n  color: var(--bo-red);\n}\n\n.boTaskBadge-urgent {\n  color: var(--bo-lava);\n}\n\n.boExpanded {\n  overflow: hidden;\n  border: 1px solid var(--bo-line);\n  border-radius: 8px;\n  background: var(--bo-panel);\n}\n\n.boExpandedHead,\n.boExpandedRow {\n  display: grid;\n  grid-template-columns:\n    95px\n    105px\n    140px\n    150px\n    minmax(220px, 1.2fr)\n    minmax(190px, 1fr);\n  align-items: center;\n  gap: 10px;\n}\n\n.boExpandedHead {\n  padding: 9px 12px;\n  background: var(--bo-panel-2);\n  color: var(--bo-muted);\n  font-size: 11px;\n  font-weight: 800;\n}\n\n.boExpandedRow {\n  min-height: 62px;\n  padding: 10px 12px;\n  border-top: 1px solid var(--bo-line);\n  cursor: pointer;\n}\n\n.boExpandedAmount {\n  white-space: nowrap;\n}\n\n.boExpandedTasks {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 5px;\n}\n\n.boExpandedTasks a {\n  border: 1px solid var(--bo-line);\n  border-radius: 4px;\n  background: var(--bo-panel-2);\n  color: var(--bo-text);\n  font-size: 11px;\n  padding: 4px 6px;\n  text-decoration: none;\n}\n\n.boExpandedComment {\n  min-width: 0;\n  overflow: hidden;\n  color: var(--bo-muted);\n  font-size: 12px;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n\n.boMuted {\n  color: var(--bo-muted);\n}\n\n.boEmpty {\n  border: 1px dashed var(--bo-line);\n  border-radius: 8px;\n  background: var(--bo-panel);\n  color: var(--bo-muted);\n  padding: 28px;\n  text-align: center;\n}\n\n.boMobileNav {\n  display: none;\n}\n\n@media (max-width: 980px) {\n  .boDealGrid {\n    grid-template-columns: repeat(2, minmax(0, 1fr));\n  }\n\n  .boExpandedHead,\n  .boExpandedRow {\n    grid-template-columns:\n      80px\n      90px\n      125px\n      135px\n      minmax(180px, 1fr);\n  }\n\n  .boExpandedHead > :last-child,\n  .boExpandedRow > :last-child {\n    display: none;\n  }\n}\n\n@media (max-width: 640px) {\n  body {\n    padding-bottom: 78px;\n  }\n\n  .boToolbar {\n    display: grid;\n    grid-template-columns: 1fr;\n    gap: 8px;\n  }\n\n  .boToolbarActions {\n    display: grid;\n    grid-template-columns: auto 1fr;\n  }\n\n  .boViewToggle {\n    width: max-content;\n  }\n\n  .boCreateDeal {\n    width: 100%;\n    min-height: 46px;\n  }\n\n  .boDealGrid {\n    grid-template-columns: 1fr;\n  }\n\n  .boDealCard {\n    padding: 14px;\n  }\n\n  .boAmount {\n    font-size: 18px;\n  }\n\n  .boTaskBadge {\n    max-width: 96px;\n    overflow: hidden;\n    text-overflow: ellipsis;\n  }\n\n  .boExpandedHead {\n    display: none;\n  }\n\n  .boExpanded {\n    border: 0;\n    background: transparent;\n  }\n\n  .boExpandedRow {\n    grid-template-columns: 1fr auto;\n    min-height: 64px;\n    margin-bottom: 7px;\n    border: 1px solid var(--bo-line);\n    border-radius: 7px;\n    background: var(--bo-panel);\n  }\n\n  .boExpandedRow > :nth-child(2),\n  .boExpandedRow > :nth-child(4),\n  .boExpandedRow > :nth-child(5),\n  .boExpandedRow > :nth-child(6) {\n    display: none;\n  }\n\n  .boExpandedAmount {\n    text-align: right;\n  }\n\n  .boMobileNav {\n    position: fixed;\n    z-index: 1000;\n    right: 0;\n    bottom: 0;\n    left: 0;\n    display: grid;\n    grid-template-columns: repeat(5, 1fr);\n    padding:\n      7px\n      max(8px, env(safe-area-inset-right))\n      calc(7px + env(safe-area-inset-bottom))\n      max(8px, env(safe-area-inset-left));\n    border-top: 1px solid var(--bo-line);\n    background: var(--bo-panel);\n    box-shadow: 0 -8px 20px rgba(0, 0, 0, .08);\n  }\n\n  .boMobileNav a,\n  .boMobileNav button {\n    display: block;\n    min-width: 0;\n    min-height: 48px;\n    border: 0;\n    background: transparent;\n    color: var(--bo-muted);\n    font: inherit;\n    font-size: 11px;\n    text-align: center;\n    text-decoration: none;\n    padding: 6px 2px;\n    cursor: pointer;\n  }\n\n  .boMobileNav b {\n    display: block;\n    margin-bottom: 4px;\n    color: var(--bo-text);\n    font-size: 18px;\n    line-height: 18px;\n  }\n\n  .boMobileEmpty {\n    pointer-events: none;\n  }\n\n  .boMobileEmpty b {\n    color: var(--bo-line);\n  }\n}\n/* END_PART_V063_BLOCK_OFFICE */";

function fail(message) {
  console.error('');
  console.error('ОШИБКА: ' + message);
  process.exit(1);
}

function read(file) {
  if (!fs.existsSync(file)) {
    fail('Не найден файл: ' + file);
  }

  const raw = fs.readFileSync(file, 'utf8');

  return {
    raw,
    crlf: raw.includes('\r\n'),
    text: raw.replace(/\r\n/g, '\n'),
  };
}

function writePreserve(file, source, next, suffix) {
  const current = source ? source.text : null;

  if (current !== null && current === next) {
    return false;
  }

  if (source && fs.existsSync(file)) {
    const stamp = new Date()
      .toISOString()
      .replace(/[:.]/g, '-');

    fs.copyFileSync(
      file,
      file + '.' + suffix + '-' + stamp
    );
  }

  const output =
    source && source.crlf
      ? next.replace(/\n/g, '\r\n')
      : next;

  fs.writeFileSync(file, output, 'utf8');
  return true;
}

const appSource = read(appFile);
const stylesSource = read(stylesFile);

let app = appSource.text;
let styles = stylesSource.text;

const HOME_IMPORT =
  "import { BlockOfficeHome } from './BlockOfficeHome';";
const NAV_IMPORT =
  "import { BlockOfficeMobileNav } from './BlockOfficeMobileNav';";

if (!app.includes(HOME_IMPORT)) {
  const firstFrom = app.indexOf("from './");

  if (firstFrom < 0) {
    fail('Не найден import из локального файла в App.tsx');
  }

  const importEnd = app.indexOf('\n', firstFrom);

  if (importEnd < 0) {
    fail('Не удалось определить конец import в App.tsx');
  }

  app =
    app.slice(0, importEnd + 1) +
    HOME_IMPORT + '\n' +
    NAV_IMPORT + '\n' +
    app.slice(importEnd + 1);
} else if (!app.includes(NAV_IMPORT)) {
  app = app.replace(
    HOME_IMPORT,
    HOME_IMPORT + '\n' + NAV_IMPORT
  );
}

if (!app.includes('<BlockOfficeHome')) {
  const homePattern =
    /(\{view\s*===\s*['"]home['"]\s*\?\s*\(\s*)<Home\b/m;

  if (!homePattern.test(app)) {
    fail('Не найден вызов <Home> для списка сделок в App.tsx');
  }

  app = app.replace(
    homePattern,
    '$1<BlockOfficeHome'
  );
}

if (!app.includes('<BlockOfficeMobileNav')) {
  const appStart = app.indexOf('function App()');

  if (appStart < 0) {
    fail('Не найден function App()');
  }

  const mainStart = app.indexOf('<main', appStart);
  const mainEnd = app.indexOf('</main>', mainStart);

  if (mainStart < 0 || mainEnd < 0) {
    fail('Не удалось найти границы <main> внутри App()');
  }

  app =
    app.slice(0, mainEnd) +
    '\n      <BlockOfficeMobileNav />\n    ' +
    app.slice(mainEnd);
}

if (!styles.includes('PART_V063_BLOCK_OFFICE')) {
  styles =
    styles.replace(/\s*$/, '') +
    '\n\n' +
    cssContent +
    '\n';
}

const checks = [
  [app.includes(HOME_IMPORT), 'import BlockOfficeHome'],
  [app.includes(NAV_IMPORT), 'import BlockOfficeMobileNav'],
  [app.includes('<BlockOfficeHome'), 'новый список сделок подключён'],
  [app.includes('<BlockOfficeMobileNav'), 'мобильная навигация подключена'],
  [styles.includes('PART_V063_BLOCK_OFFICE'), 'стили Block Office добавлены'],
  [!homeContent.includes("'compact'") && !homeContent.includes('"compact"'), 'короткий режим отсутствует'],
  [homeContent.includes("'cards'") && homeContent.includes("'expanded'"), 'есть карточки и развёрнутый список'],
  [navContent.includes('Свободная кнопка 1') && navContent.includes('Свободная кнопка 2'), 'две пустые кнопки сохранены'],
];

console.log('');
console.log('v063 — Block Office');
console.log('===================');

for (const [ok, label] of checks) {
  console.log((ok ? 'OK   ' : 'FAIL ') + label);

  if (!ok) {
    fail('Проверка не пройдена: ' + label);
  }
}

if (checkOnly) {
  console.log('');
  console.log('CHECK ONLY — файлы не изменены.');
  process.exit(0);
}

let count = 0;

if (writePreserve(
  appFile,
  appSource,
  app,
  'before-v063-block-office'
)) count++;

if (writePreserve(
  stylesFile,
  stylesSource,
  styles,
  'before-v063-block-office'
)) count++;

const homeSource =
  fs.existsSync(homeFile)
    ? read(homeFile)
    : null;

const navSource =
  fs.existsSync(navFile)
    ? read(navFile)
    : null;

if (writePreserve(
  homeFile,
  homeSource,
  homeContent,
  'before-v063-block-office'
)) count++;

if (writePreserve(
  navFile,
  navSource,
  navContent,
  'before-v063-block-office'
)) count++;

console.log('');
console.log('v063 применён. Изменено файлов: ' + count);

import type * as React from 'react';

export function Field({ title, children }: { title: string; children: React.ReactNode }) { return <label className="field"><span>{title}</span>{children}</label>; }

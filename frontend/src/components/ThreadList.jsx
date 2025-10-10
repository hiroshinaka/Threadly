import React from 'react';
import ThreadCard from './ThreadCard';

export default function ThreadList({ threads }) {
    if (!threads.length) return <p className="text-slate-600">No threads yet.</p>;
    return (
        <ul className="space-y-4">
            {threads.map(t => (
                <li key={t.id}>
                    <ThreadCard thread={t} />
                </li>
            ))}
        </ul>
    );
}
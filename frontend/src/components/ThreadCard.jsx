import React from 'react';

export default function ThreadCard({ thread }) {
    const dt = new Date(thread.createdAt);
    const since = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
    const mins = Math.round((Date.now() - dt.getTime()) / 60000);
    const rel = mins < 60 ? since.format(-mins, 'minute') : since.format(-Math.round(mins/60), 'hour');

    return (
        <article className="w-full flex items-start gap-4 p-3 bg-white border border-slate-200 rounded-md">
            <div className="flex-1">
                <div className="flex items-center gap-3 text-sm text-slate-500 mb-1">
                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-semibold">
                        <a href={`/t/${thread.categorySlug}`}>t/{thread.categorySlug}</a></span>
                    <span>by {thread.author}</span>
                    <span>•</span>
                    <time dateTime={dt.toISOString()}>{rel}</time>
                </div>

                <h3 className="text-slate-900 text-lg font-medium">{thread.title}</h3>

                <div className="mt-2 flex items-center gap-4 text-sm text-slate-600">
                    <span title="Likes">❤ {thread.likes}</span>
                    <span title="Comments">💬 {thread.commentCount}</span>
                    <span title="Views">👁 {thread.views}</span>
                </div>
            </div>
        </article>
    );
}